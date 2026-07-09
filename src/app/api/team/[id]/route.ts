import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { requireRole, assertClientAccess } from '@/lib/permissions';
import * as bcrypt from 'bcryptjs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/team/[id]
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN', 'CLIENT_MANAGER']);
    const { id } = await ctx.params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, status: true, clientId: true, createdAt: true },
    });

    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.role !== 'SUPER_ADMIN' && targetUser.clientId) {
      assertClientAccess(user, targetUser.clientId);
    }

    return NextResponse.json({ user: targetUser });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/team/[id]
export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);
    const { id } = await ctx.params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.role !== 'SUPER_ADMIN' && targetUser.clientId) {
      assertClientAccess(user, targetUser.clientId);
    }

    const body = await req.json();
    const { name, email, password, role, status } = body;

    if (email && email !== targetUser.email) {
      const exist = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (exist) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const updateData: any = {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.toLowerCase().trim() }),
      ...(role && { role }),
      ...(status && { status }),
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({ where: { id }, data: updateData });

    return NextResponse.json({
      message: 'User updated',
      user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.status },
    });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PUT /api/team/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/team/[id]
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);
    const { id } = await ctx.params;

    if (user.id === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.role !== 'SUPER_ADMIN' && targetUser.clientId) {
      assertClientAccess(user, targetUser.clientId);
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: 'User deleted' });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('DELETE /api/team/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
