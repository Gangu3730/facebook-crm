import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { assertClientAccess, requireRole } from '@/lib/permissions';

const META_API_VERSION = process.env.META_API_VERSION || 'v20.0';

// GET /api/facebook/forms - Fetch lead forms for a Facebook Page
export async function GET(req: NextRequest) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);

    const { searchParams } = req.nextUrl;
    const facebookPageId = searchParams.get('facebookPageId'); // Our DB page ID
    const fromMeta = searchParams.get('fromMeta') === 'true';

    if (!facebookPageId) return NextResponse.json({ error: 'facebookPageId is required' }, { status: 400 });

    const page = await prisma.facebookPage.findUnique({
      where: { id: facebookPageId },
      include: { connection: true, forms: { include: { fieldMappings: true } } },
    });

    if (!page) return NextResponse.json({ error: 'Facebook page not found' }, { status: 404 });
    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, page.clientId);

    if (fromMeta) {
      const { decrypt } = await import('@/lib/encryption');
      const token = decrypt(page.pageAccessTokenEncrypted);
      const res = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${page.pageId}/leadgen_forms?fields=id,name,status&access_token=${token}`
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Meta API error: ${errText}`);
      }
      const data = await res.json();
      return NextResponse.json({ forms: data.data || [] });
    }

    return NextResponse.json({ forms: page.forms });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/facebook/forms error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/facebook/forms - Save a selected lead form
export async function POST(req: NextRequest) {
  try {
    const user = getSessionUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN']);

    const body = await req.json();
    const { facebookPageId, formId, formName } = body;

    if (!facebookPageId || !formId || !formName) {
      return NextResponse.json({ error: 'facebookPageId, formId, and formName are required' }, { status: 400 });
    }

    const page = await prisma.facebookPage.findUnique({ where: { id: facebookPageId } });
    if (!page) return NextResponse.json({ error: 'Facebook page not found' }, { status: 404 });
    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, page.clientId);

    const form = await prisma.facebookLeadForm.upsert({
      where: { clientId_formId: { clientId: page.clientId, formId } },
      create: { clientId: page.clientId, facebookPageId, formId, formName, status: 'Active' },
      update: { formName, status: 'Active' },
    });

    return NextResponse.json({ message: 'Lead form saved', form }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/facebook/forms error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
