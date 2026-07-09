import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { requireRole, assertClientAccess } from '@/lib/permissions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/clients/[id] – Get a single client with stats
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const user = getSessionUserFromRequest(req);
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);
    const { id } = await ctx.params;
    assertClientAccess(user!, id);

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
        },
        fbConnections: {
          select: { id: true, fbAccountName: true, connectionStatus: true, tokenExpiresAt: true },
          include: {
            pages: {
              select: { id: true, pageName: true, pageId: true, status: true },
              include: { forms: { select: { id: true, formName: true, formId: true, status: true } } },
            },
          },
        },
        _count: {
          select: { leads: true, tasks: true },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/clients/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/clients/[id] – Update client info
export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const user = getSessionUserFromRequest(req);
    requireRole(user, ['SUPER_ADMIN']);
    const { id } = await ctx.params;

    const body = await req.json();
    const {
      companyName, contactPerson, email, phone, website,
      industry, address, status, packageName,
    } = body;

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(companyName && { companyName }),
        ...(contactPerson && { contactPerson }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
        ...(industry !== undefined && { industry }),
        ...(address !== undefined && { address }),
        ...(status && { status }),
        ...(packageName && { packageName }),
      },
    });

    return NextResponse.json({ message: 'Client updated', client: updated });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PUT /api/clients/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/clients/[id] – Deactivate (soft delete) or hard delete a client
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const user = getSessionUserFromRequest(req);
    requireRole(user, ['SUPER_ADMIN']);
    const { id } = await ctx.params;

    const { searchParams } = req.nextUrl;
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      await prisma.client.delete({ where: { id } });
      return NextResponse.json({ message: 'Client permanently deleted' });
    } else {
      await prisma.client.update({ where: { id }, data: { status: 'Inactive' } });
      return NextResponse.json({ message: 'Client deactivated' });
    }
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('DELETE /api/clients/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
