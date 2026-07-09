import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { assertClientAccess } from '@/lib/permissions';

// GET /api/leads/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        client: { select: { id: true, companyName: true } },
        notes: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: { assignedUser: { select: { id: true, name: true } } },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // Tenant boundary check
    if (user.role !== 'SUPER_ADMIN') {
      assertClientAccess(user, lead.clientId);
    }
    // Sales Executive can only see their assigned leads
    if (user.role === 'SALES_EXECUTIVE' && lead.assignedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ lead });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/leads/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/leads/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const existingLead = await prisma.lead.findUnique({ where: { id } });
    if (!existingLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // Tenant & role checks
    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, existingLead.clientId);
    if (user.role === 'SALES_EXECUTIVE' && existingLead.assignedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, phone, email, city, serviceInterest, message, status, priority, assignedUserId, followUpDate, lastContactedAt } = body;

    const activities: any[] = [];
    const clientId = existingLead.clientId;

    if (status && status !== existingLead.status) {
      activities.push({ clientId, leadId: id, userId: user.id, type: 'STATUS_CHANGE', description: `Status changed from '${existingLead.status}' to '${status}' by ${user.name}.` });
    }
    if (priority && priority !== existingLead.priority) {
      activities.push({ clientId, leadId: id, userId: user.id, type: 'PRIORITY_CHANGE', description: `Priority changed from '${existingLead.priority}' to '${priority}' by ${user.name}.` });
    }
    if (assignedUserId !== undefined && assignedUserId !== existingLead.assignedUserId) {
      const oldAgent = existingLead.assignedUserId ? await prisma.user.findUnique({ where: { id: existingLead.assignedUserId } }) : null;
      const newAgent = assignedUserId ? await prisma.user.findUnique({ where: { id: assignedUserId } }) : null;
      activities.push({ clientId, leadId: id, userId: user.id, type: 'ASSIGNMENT', description: `Assignment changed from '${oldAgent?.name || 'Unassigned'}' to '${newAgent?.name || 'Unassigned'}' by ${user.name}.` });
      if (assignedUserId) {
        await prisma.notification.create({
          data: { clientId, userId: assignedUserId, title: 'Lead Assigned to You', message: `Lead "${existingLead.name}" was assigned to you by ${user.name}.`, type: 'LEAD_ASSIGNED' },
        });
      }
    }

    let finalLastContactedAt = lastContactedAt ? new Date(lastContactedAt) : existingLead.lastContactedAt;
    if (status && ['Contacted', 'Follow-up', 'Qualified'].includes(status) && existingLead.status !== status) {
      finalLastContactedAt = new Date();
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existingLead.name,
        phone: phone !== undefined ? (phone?.trim() || null) : existingLead.phone,
        email: email !== undefined ? (email ? email.toLowerCase().trim() : null) : existingLead.email,
        city: city !== undefined ? (city?.trim() || null) : existingLead.city,
        serviceInterest: serviceInterest !== undefined ? (serviceInterest?.trim() || null) : existingLead.serviceInterest,
        message: message !== undefined ? (message?.trim() || null) : existingLead.message,
        status: status ?? existingLead.status,
        priority: priority ?? existingLead.priority,
        assignedUserId: assignedUserId !== undefined ? assignedUserId : existingLead.assignedUserId,
        followUpDate: followUpDate !== undefined ? (followUpDate ? new Date(followUpDate) : null) : existingLead.followUpDate,
        lastContactedAt: finalLastContactedAt,
      },
    });

    for (const activity of activities) {
      await prisma.leadActivity.create({ data: activity });
    }

    return NextResponse.json({ message: 'Lead updated successfully', lead: updatedLead });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PUT /api/leads/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/leads/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['SUPER_ADMIN', 'CLIENT_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    const existingLead = await prisma.lead.findUnique({ where: { id } });
    if (!existingLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, existingLead.clientId);

    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('DELETE /api/leads/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
