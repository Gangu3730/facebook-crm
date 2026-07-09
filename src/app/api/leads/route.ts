import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { clientScopeFilter, leadScopeFilter } from '@/lib/permissions';

// GET /api/leads - List leads with filters, search, and tenant scoping
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const source = searchParams.get('source');
    const assignedUserId = searchParams.get('assignedUserId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const clientIdOverride = searchParams.get('clientId'); // Super Admin switching context

    // Build scoped where clause
    const scopeFilter = leadScopeFilter(user, clientIdOverride);
    const where: any = { ...scopeFilter };

    // For non-sales roles, allow explicit assignee filtering
    if (user.role !== 'SALES_EXECUTIVE') {
      if (assignedUserId) {
        where.assignedUserId = assignedUserId === 'unassigned' ? null : assignedUserId;
      }
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (source) where.source = source;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
        { serviceInterest: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        client: { select: { id: true, companyName: true } },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('GET /api/leads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/leads - Add lead manually (with duplicate detection & auto-assignment)
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, phone, email, city, serviceInterest, message, source, priority, assignedUserId } = body;

    if (!name) return NextResponse.json({ error: 'Lead name is required' }, { status: 400 });

    // Determine clientId for this lead
    const clientId = user.clientId;
    if (!clientId) {
      return NextResponse.json({ error: 'Super Admin must specify a clientId when creating leads via API' }, { status: 400 });
    }

    // 1. Duplicate detection (scoped to same client)
    let isDuplicate = false;
    if (email || phone) {
      const duplicateConditions: any[] = [];
      if (email) duplicateConditions.push({ email: email.toLowerCase().trim() });
      if (phone) duplicateConditions.push({ phone: phone.trim() });

      const existingLead = await prisma.lead.findFirst({
        where: {
          clientId,
          OR: duplicateConditions,
          status: { not: 'Duplicate' },
        },
      });
      if (existingLead) isDuplicate = true;
    }

    // 2. Auto-assignment via Lead Routing Rule (per client)
    let finalAssignedUserId = assignedUserId || null;
    let autoAssigned = false;

    if (!finalAssignedUserId) {
      const routingRule = await prisma.leadRoutingRule.findFirst({
        where: { clientId, isActive: true, ruleType: 'round_robin' },
      });

      if (routingRule) {
        const userIds = JSON.parse(routingRule.userIds || '[]');
        if (userIds.length > 0) {
          finalAssignedUserId = userIds[routingRule.currentIndex];
          autoAssigned = true;
          const nextIdx = (routingRule.currentIndex + 1) % userIds.length;
          await prisma.leadRoutingRule.update({
            where: { id: routingRule.id },
            data: { currentIndex: nextIdx },
          });
        }
      }
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        clientId,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email ? email.toLowerCase().trim() : null,
        city: city?.trim() || null,
        serviceInterest: serviceInterest?.trim() || null,
        message: message?.trim() || null,
        source: source || 'Manual',
        status: isDuplicate ? 'Duplicate' : 'New',
        priority: priority || 'Warm',
        assignedUserId: finalAssignedUserId,
      },
    });

    // Activity: creation
    await prisma.leadActivity.create({
      data: {
        clientId,
        leadId: lead.id,
        userId: user.id,
        type: 'STATUS_CHANGE',
        description: `Lead created manually by ${user.name}. Initial status: '${lead.status}'.${isDuplicate ? ' (Duplicate detected)' : ''}`,
      },
    });

    if (finalAssignedUserId) {
      const assignedUser = await prisma.user.findUnique({ where: { id: finalAssignedUserId } });
      if (assignedUser) {
        await prisma.leadActivity.create({
          data: {
            clientId,
            leadId: lead.id,
            userId: user.id,
            type: 'ASSIGNMENT',
            description: `Lead assigned to ${assignedUser.name}${autoAssigned ? ' (Auto Round-Robin)' : ''}.`,
          },
        });
        await prisma.notification.create({
          data: {
            clientId,
            userId: finalAssignedUserId,
            title: 'New Lead Assigned',
            message: `Lead "${lead.name}" has been assigned to you.`,
            type: 'LEAD_ASSIGNED',
          },
        });
      }
    }

    return NextResponse.json({ message: 'Lead created successfully', lead }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/leads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
