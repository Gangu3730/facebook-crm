import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { assertClientAccess } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { leadIds, status } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty leadIds list' }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const leadsToUpdate = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
    });

    if (leadsToUpdate.length === 0) {
      return NextResponse.json({ error: 'No valid leads found' }, { status: 404 });
    }

    // Role and client boundary validation
    for (const lead of leadsToUpdate) {
      if (user.role !== 'SUPER_ADMIN') {
        assertClientAccess(user, lead.clientId);
      }
      if (user.role === 'SALES_EXECUTIVE' && lead.assignedUserId !== user.id) {
        return NextResponse.json({ error: 'Forbidden. You can only update your own leads.' }, { status: 403 });
      }
    }

    // Update statuses
    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: { status },
    });

    // Create activity logs
    for (const l of leadsToUpdate) {
      if (l.status !== status) {
        await prisma.leadActivity.create({
          data: {
            clientId: l.clientId,
            leadId: l.id,
            userId: user.id,
            type: 'STATUS_CHANGE',
            description: `Lead status bulk-updated from '${l.status}' to '${status}' by ${user.name}.`,
          },
        });
      }
    }

    return NextResponse.json({
      message: `Successfully updated status to '${status}' for ${leadIds.length} leads.`,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Bulk status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
