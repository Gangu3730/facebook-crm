import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { assertClientAccess } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role === 'SALES_EXECUTIVE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { leadIds, assignedUserId } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty leadIds list' }, { status: 400 });
    }

    const targetUser = assignedUserId 
      ? await prisma.user.findUnique({ where: { id: assignedUserId } }) 
      : null;

    const targetName = targetUser ? targetUser.name : 'Unassigned';

    // Verify all target leads and enforce tenant boundary
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
    });

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No valid leads found' }, { status: 404 });
    }

    // Check client permission for each lead
    const firstLeadClientId = leads[0].clientId;
    for (const lead of leads) {
      if (user.role !== 'SUPER_ADMIN') {
        assertClientAccess(user, lead.clientId);
      }
      if (lead.clientId !== firstLeadClientId) {
        return NextResponse.json({ error: 'All bulk assigned leads must belong to the same client' }, { status: 400 });
      }
    }

    // Verify agent belongs to the same client if assigned
    if (targetUser && targetUser.clientId && user.role !== 'SUPER_ADMIN') {
      assertClientAccess(user, targetUser.clientId);
    }

    // Update leads
    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: { assignedUserId: assignedUserId || null },
    });

    // Create activity logs and notifications
    for (const lead of leads) {
      await prisma.leadActivity.create({
        data: {
          clientId: lead.clientId,
          leadId: lead.id,
          userId: user.id,
          type: 'ASSIGNMENT',
          description: `Lead bulk-assigned to '${targetName}' by ${user.name}.`,
        },
      });

      if (assignedUserId) {
        await prisma.notification.create({
          data: {
            clientId: lead.clientId,
            userId: assignedUserId,
            title: 'Lead Bulk Assigned',
            message: `Lead "${lead.name}" has been bulk-assigned to you.`,
            type: 'LEAD_ASSIGNED',
          },
        });
      }
    }

    return NextResponse.json({
      message: `Successfully assigned ${leadIds.length} leads to ${targetName}.`,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Bulk assign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
