import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { requireRole } from '@/lib/permissions';
import * as bcrypt from 'bcryptjs';

// GET /api/clients – List all clients (Super Admin only)
export async function GET(req: NextRequest) {
  try {
    const user = getSessionUserFromRequest(req);
    requireRole(user, ['SUPER_ADMIN']);

    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: 'CLIENT_ADMIN' },
          select: { id: true, name: true, email: true, status: true },
        },
        _count: {
          select: {
            leads: true,
            users: true,
            fbConnections: true,
          },
        },
      },
    });

    return NextResponse.json({ clients });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('GET /api/clients error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clients – Create a new client + client admin (Super Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = getSessionUserFromRequest(req);
    requireRole(user, ['SUPER_ADMIN']);

    const body = await req.json();
    const {
      companyName, contactPerson, email, phone, website,
      industry, address, status = 'Active', packageName = 'Standard',
      adminName, adminEmail, adminPassword,
    } = body;

    if (!companyName || !email || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'companyName, email, adminName, adminEmail, and adminPassword are required' },
        { status: 400 }
      );
    }

    // Check for duplicate client email
    const existingClient = await prisma.client.findUnique({ where: { email } });
    if (existingClient) {
      return NextResponse.json({ error: 'A client with this email already exists' }, { status: 409 });
    }

    // Check for duplicate admin email
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingAdmin) {
      return NextResponse.json({ error: 'A user with this admin email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Create client + admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          companyName, contactPerson, email, phone, website,
          industry, address, status, packageName,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          clientId: client.id,
          name: adminName,
          email: adminEmail.toLowerCase().trim(),
          passwordHash,
          role: 'CLIENT_ADMIN',
          status: 'Active',
        },
      });

      // Create default client routing rule
      await tx.leadRoutingRule.create({
        data: {
          clientId: client.id,
          ruleType: 'round_robin',
          userIds: JSON.stringify([adminUser.id]),
          currentIndex: 0,
          isActive: false,
        },
      });

      return { client, adminUser };
    });

    return NextResponse.json(
      {
        message: 'Client created successfully',
        client: result.client,
        adminUser: {
          id: result.adminUser.id,
          name: result.adminUser.name,
          email: result.adminUser.email,
          role: result.adminUser.role,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('POST /api/clients error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
