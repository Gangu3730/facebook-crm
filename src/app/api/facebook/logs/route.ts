import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { clientScopeFilter, requireRole } from '@/lib/permissions';

// GET /api/facebook/logs – Webhook log listing (scoped by role)
export async function GET(req: NextRequest) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const statusFilter = searchParams.get('status');
    const unmappedOnly = searchParams.get('unmapped') === 'true';

    let where: any = {};

    if (user.role === 'SUPER_ADMIN') {
      // Super Admin sees all logs; can filter unmapped specifically
      if (unmappedOnly) {
        where.clientId = null;
        where.status = 'UNMAPPED';
      } else if (statusFilter) {
        where.status = statusFilter;
      }
    } else {
      // Client-level users see only their client's logs
      requireRole(user, ['CLIENT_ADMIN', 'CLIENT_MANAGER']);
      where.clientId = user.clientId;
      if (statusFilter) where.status = statusFilter;
    }

    const logs = await prisma.facebookWebhookLog.findMany({
      where,
      include: {
        client: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ logs });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/facebook/logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
