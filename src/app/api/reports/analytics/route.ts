import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { clientScopeFilter, leadScopeFilter } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const clientIdOverride = searchParams.get('clientId');

    const scopeFilter = clientScopeFilter(user, clientIdOverride);
    const leadFilter = leadScopeFilter(user, clientIdOverride);
    const taskFilter: any = { ...scopeFilter };
    if (user.role === 'SALES_EXECUTIVE') taskFilter.assignedUserId = user.id;

    const now = new Date();

    // Auto-update overdue tasks to 'Missed'
    await prisma.task.updateMany({
      where: { ...scopeFilter, status: 'Pending', dueDate: { lt: now } },
      data: { status: 'Missed' },
    });

    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

    const [totalLeads, newLeadsToday, facebookLeads, convertedLeads, pendingTasks, missedTasks, hotLeads] = await Promise.all([
      prisma.lead.count({ where: leadFilter }),
      prisma.lead.count({ where: { ...leadFilter, createdAt: { gte: startOfToday } } }),
      prisma.lead.count({ where: { ...leadFilter, source: 'Facebook Lead Ads' } }),
      prisma.lead.count({ where: { ...leadFilter, status: 'Converted' } }),
      prisma.task.count({ where: { ...taskFilter, status: 'Pending' } }),
      prisma.task.count({ where: { ...taskFilter, status: 'Missed' } }),
      prisma.lead.count({ where: { ...leadFilter, priority: 'Hot' } }),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    const rawSources = await prisma.lead.groupBy({ by: ['source'], where: leadFilter, _count: { _all: true } });
    const leadsBySource = rawSources.map(s => ({ name: s.source, value: s._count._all }));

    const rawStatuses = await prisma.lead.groupBy({ by: ['status'], where: leadFilter, _count: { _all: true } });
    const leadsByStatus = rawStatuses.map(s => ({ name: s.status, value: s._count._all }));

    // Last 7 days lead counts (by ISO date string for SSR safety)
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0);
    const recentLeads = await prisma.lead.findMany({
      where: { ...leadFilter, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const leadsByDateMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0]; // "2026-07-06" – locale-safe
      leadsByDateMap[key] = 0;
    }
    recentLeads.forEach(l => {
      const key = l.createdAt.toISOString().split('T')[0];
      if (leadsByDateMap[key] !== undefined) leadsByDateMap[key]++;
    });
    const leadsByDate = Object.entries(leadsByDateMap).map(([date, count]) => ({ date, count }));

    // Team performance (managers/admins only)
    let teamPerformance: any[] = [];
    if (user.role !== 'SALES_EXECUTIVE') {
      const teamWhere: any = { role: 'SALES_EXECUTIVE' };
      if (scopeFilter.clientId) teamWhere.clientId = scopeFilter.clientId;

      const team = await prisma.user.findMany({ where: teamWhere, select: { id: true, name: true } });

      teamPerformance = await Promise.all(team.map(async t => {
        const baseFilter = scopeFilter.clientId ? { clientId: scopeFilter.clientId } : {};
        const assigned = await prisma.lead.count({ where: { ...baseFilter, assignedUserId: t.id } });
        const converted = await prisma.lead.count({ where: { ...baseFilter, assignedUserId: t.id, status: 'Converted' } });
        const pending = await prisma.task.count({ where: { ...baseFilter, assignedUserId: t.id, status: 'Pending' } });
        return { name: t.name, assigned, converted, pending, conversionRate: assigned > 0 ? Math.round((converted / assigned) * 100) : 0 };
      }));
    }

    const upcomingTasks = await prisma.task.findMany({
      where: { ...taskFilter, status: 'Pending' },
      include: { lead: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    const recentLeadsList = await prisma.lead.findMany({
      where: leadFilter,
      include: { assignedUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      summary: { totalLeads, newLeadsToday, facebookLeads, convertedLeads, pendingTasks, missedTasks, hotLeads, conversionRate },
      leadsBySource,
      leadsByStatus,
      leadsByDate,
      teamPerformance,
      upcomingTasks,
      recentLeads: recentLeadsList,
    });
  } catch (error) {
    console.error('GET /api/reports/analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
