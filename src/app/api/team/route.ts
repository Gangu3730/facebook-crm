import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { clientScopeFilter, requireRole } from '@/lib/permissions';
import * as bcrypt from 'bcryptjs';

// GET /api/team - List team members (scoped per client)
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN', 'CLIENT_MANAGER']);

    const { searchParams } = request.nextUrl;
    const clientIdOverride = searchParams.get('clientId');
    const scopeFilter = clientScopeFilter(user, clientIdOverride);

    const users = await prisma.user.findMany({
      where: scopeFilter,
      select: { id: true, name: true, email: true, role: true, status: true, clientId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const withStats = await Promise.all(
      users.map(async (u) => {
        const clientFilter = scopeFilter.clientId ? { clientId: scopeFilter.clientId } : {};
        const totalAssigned = await prisma.lead.count({ where: { ...clientFilter, assignedUserId: u.id } });
        const converted = await prisma.lead.count({ where: { ...clientFilter, assignedUserId: u.id, status: 'Converted' } });
        const pendingTasks = await prisma.task.count({ where: { ...clientFilter, assignedUserId: u.id, status: 'Pending' } });
        const missedTasks = await prisma.task.count({ where: { ...clientFilter, assignedUserId: u.id, status: 'Missed' } });
        return { ...u, totalAssigned, converted, pendingTasks, missedTasks };
      })
    );

    return NextResponse.json({ users: withStats });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/team error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/team - Create a new team member
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);

    const body = await request.json();
    const { name, email, password, role, clientId: bodyClientId } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'name, email, password, and role are required' }, { status: 400 });
    }

    // Determine which client this user belongs to
    let targetClientId: string | null = null;
    if (user.role === 'SUPER_ADMIN') {
      targetClientId = bodyClientId || null; // null = agency user
    } else {
      targetClientId = user.clientId!;
      // Client Admins can only create CLIENT_MANAGER and SALES_EXECUTIVE
      if (!['CLIENT_MANAGER', 'SALES_EXECUTIVE'].includes(role)) {
        return NextResponse.json({ error: 'You can only create Manager or Sales Executive roles' }, { status: 403 });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        clientId: targetClientId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        status: 'Active',
      },
    });

    return NextResponse.json({
      message: 'Team member created',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status },
    }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/team error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
