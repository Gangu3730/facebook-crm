import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { assertClientAccess, requireRole } from '@/lib/permissions';
import { encrypt, decrypt } from '@/lib/encryption';

// GET /api/facebook/connections - List connections for current client
export async function GET(req: NextRequest) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);

    const clientIdParam = req.nextUrl.searchParams.get('clientId');
    const targetClientId = user.role === 'SUPER_ADMIN' ? clientIdParam : user.clientId;

    if (!targetClientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const connections = await prisma.facebookConnection.findMany({
      where: { clientId: targetClientId },
      include: {
        pages: {
          include: { forms: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Never expose raw tokens to the frontend
    const safe = connections.map(c => ({
      ...c,
      accessTokenEncrypted: '[HIDDEN]',
      pages: c.pages.map(p => ({
        ...p,
        pageAccessTokenEncrypted: '[HIDDEN]',
      })),
    }));

    return NextResponse.json({ connections: safe });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/facebook/connections error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/facebook/connections - Save a new Facebook connection
// Called after successful Meta OAuth flow
export async function POST(req: NextRequest) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);

    const body = await req.json();
    const { clientId: bodyClientId, fbUserId, fbAccountName, accessToken, tokenExpiresAt } = body;

    if (!fbUserId || !fbAccountName || !accessToken) {
      return NextResponse.json({ error: 'fbUserId, fbAccountName, and accessToken are required' }, { status: 400 });
    }

    const targetClientId = user.role === 'SUPER_ADMIN' ? bodyClientId : user.clientId!;
    if (!targetClientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 });

    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, targetClientId);

    const connection = await prisma.facebookConnection.create({
      data: {
        clientId: targetClientId,
        fbUserId,
        fbAccountName,
        accessTokenEncrypted: encrypt(accessToken),
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        connectionStatus: 'Active',
      },
    });

    return NextResponse.json({
      message: 'Facebook account connected',
      connection: { ...connection, accessTokenEncrypted: '[HIDDEN]' },
    }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/facebook/connections error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
