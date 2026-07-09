import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { assertClientAccess, requireRole } from '@/lib/permissions';
import { encrypt, decrypt } from '@/lib/encryption';

const META_API_VERSION = process.env.META_API_VERSION || 'v20.0';

// GET /api/facebook/pages - Fetch available pages for a connection (from Meta API or DB)
export async function GET(req: NextRequest) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);

    const { searchParams } = req.nextUrl;
    const connectionId = searchParams.get('connectionId');
    const fromMeta = searchParams.get('fromMeta') === 'true';

    if (!connectionId) return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });

    const connection = await prisma.facebookConnection.findUnique({
      where: { id: connectionId },
      include: { pages: { include: { forms: true } } },
    });

    if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, connection.clientId);

    if (fromMeta) {
      // Fetch live pages from Meta Graph API
      const token = decrypt(connection.accessTokenEncrypted);
      const res = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,name,access_token&access_token=${token}`
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Meta API error: ${err}`);
      }
      const data = await res.json();
      return NextResponse.json({ pages: data.data || [] });
    }

    // Return saved pages from DB
    return NextResponse.json({
      pages: connection.pages.map(p => ({
        id: p.id,
        pageId: p.pageId,
        pageName: p.pageName,
        status: p.status,
        forms: p.forms,
      })),
    });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/facebook/pages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/facebook/pages - Save a selected Facebook page for a client
export async function POST(req: NextRequest) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);

    const body = await req.json();
    const { connectionId, pageId, pageName, pageAccessToken } = body;

    if (!connectionId || !pageId || !pageName || !pageAccessToken) {
      return NextResponse.json({ error: 'connectionId, pageId, pageName, and pageAccessToken are required' }, { status: 400 });
    }

    const connection = await prisma.facebookConnection.findUnique({ where: { id: connectionId } });
    if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, connection.clientId);

    const page = await prisma.facebookPage.upsert({
      where: { clientId_pageId: { clientId: connection.clientId, pageId } },
      create: {
        clientId: connection.clientId,
        facebookConnectionId: connectionId,
        pageId,
        pageName,
        pageAccessTokenEncrypted: encrypt(pageAccessToken),
        status: 'Active',
      },
      update: {
        pageName,
        pageAccessTokenEncrypted: encrypt(pageAccessToken),
        status: 'Active',
      },
    });

    return NextResponse.json({
      message: 'Facebook page saved',
      page: { ...page, pageAccessTokenEncrypted: '[HIDDEN]' },
    }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/facebook/pages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
