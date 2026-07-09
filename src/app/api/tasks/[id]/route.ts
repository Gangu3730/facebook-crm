import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { assertClientAccess } from '@/lib/permissions';

// PUT /api/tasks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { title, description, dueDate, status } = body;

    const task = await prisma.task.findUnique({ where: { id }, include: { lead: true } });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, task.clientId);
    if (user.role === 'SALES_EXECUTIVE' && task.assignedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nextDueDate = dueDate ? new Date(dueDate) : task.dueDate;
    const clientId = task.clientId;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : task.title,
        description: description !== undefined ? (description?.trim() || null) : task.description,
        dueDate: nextDueDate,
        status: status ?? task.status,
      },
    });

    if (status === 'Completed' && task.status !== 'Completed') {
      await prisma.leadActivity.create({
        data: { clientId, leadId: task.leadId, userId: user.id, type: 'TASK_COMPLETED', description: `Completed task: "${updatedTask.title}" by ${user.name}.` },
      });

      const nextPending = await prisma.task.findFirst({
        where: { leadId: task.leadId, status: 'Pending' },
        orderBy: { dueDate: 'asc' },
      });
      await prisma.lead.update({
        where: { id: task.leadId },
        data: { followUpDate: nextPending?.dueDate ?? null, lastContactedAt: new Date() },
      });
    } else if (dueDate && new Date(dueDate).getTime() !== task.dueDate.getTime()) {
      const nextPending = await prisma.task.findFirst({
        where: { leadId: task.leadId, status: 'Pending' },
        orderBy: { dueDate: 'asc' },
      });
      await prisma.lead.update({
        where: { id: task.leadId },
        data: { followUpDate: nextPending?.dueDate ?? null },
      });
    }

    return NextResponse.json({ message: 'Task updated', task: updatedTask });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PUT /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, task.clientId);
    if (user.role === 'SALES_EXECUTIVE' && task.assignedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.task.delete({ where: { id } });

    const nextPending = await prisma.task.findFirst({
      where: { leadId: task.leadId, status: 'Pending' },
      orderBy: { dueDate: 'asc' },
    });
    await prisma.lead.update({
      where: { id: task.leadId },
      data: { followUpDate: nextPending?.dueDate ?? null },
    });

    return NextResponse.json({ message: 'Task deleted' });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('DELETE /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
