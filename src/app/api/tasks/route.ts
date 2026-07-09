import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { clientScopeFilter, assertClientAccess } from '@/lib/permissions';

// GET /api/tasks
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const dueFilter = searchParams.get('dueFilter');
    const assignedUserId = searchParams.get('assignedUserId');
    const clientIdOverride = searchParams.get('clientId');

    const scopeFilter = clientScopeFilter(user, clientIdOverride);
    const where: any = { ...scopeFilter };

    if (user.role === 'SALES_EXECUTIVE') {
      where.assignedUserId = user.id;
    } else if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    if (status) where.status = status;

    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

    if (dueFilter === 'today') {
      where.dueDate = { gte: startOfToday, lte: endOfToday };
    } else if (dueFilter === 'overdue') {
      where.dueDate = { lt: startOfToday };
      where.status = 'Pending';
    } else if (dueFilter === 'upcoming') {
      where.dueDate = { gt: endOfToday };
      where.status = 'Pending';
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true, status: true, priority: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { leadId, title, description, dueDate, assignedUserId } = body;

    if (!leadId || !title || !dueDate) {
      return NextResponse.json({ error: 'leadId, title, and dueDate are required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, lead.clientId);
    if (user.role === 'SALES_EXECUTIVE' && lead.assignedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const finalAssignedUserId = assignedUserId || lead.assignedUserId;
    if (!finalAssignedUserId) {
      return NextResponse.json({ error: 'Task must be assigned to a user' }, { status: 400 });
    }

    const dateVal = new Date(dueDate);
    if (isNaN(dateVal.getTime())) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }

    const clientId = lead.clientId;

    const task = await prisma.task.create({
      data: {
        clientId,
        leadId,
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dateVal,
        assignedUserId: finalAssignedUserId,
        createdUserId: user.id,
        status: 'Pending',
      },
    });

    await prisma.lead.update({ where: { id: leadId }, data: { followUpDate: dateVal } });

    await prisma.leadActivity.create({
      data: { clientId, leadId, userId: user.id, type: 'TASK_ADDED', description: `Follow-up task "${title.trim()}" scheduled by ${user.name}.` },
    });

    if (finalAssignedUserId !== user.id) {
      await prisma.notification.create({
        data: { clientId, userId: finalAssignedUserId, title: 'New Task Assigned', message: `Task "${title.trim()}" for lead "${lead.name}" was assigned to you.`, type: 'TASK_REMINDER' },
      });
    }

    return NextResponse.json({ message: 'Task created successfully', task }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
