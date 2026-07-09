import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { assertClientAccess } from '@/lib/permissions';

// POST /api/leads/[id]/notes - Add a note to a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const noteText = body.content || body.note;

    if (!noteText?.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // Tenant & role checks
    if (user.role !== 'SUPER_ADMIN') assertClientAccess(user, lead.clientId);
    if (user.role === 'SALES_EXECUTIVE' && lead.assignedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const clientId = lead.clientId;

    const leadNote = await prisma.leadNote.create({
      data: { clientId, leadId: id, userId: user.id, note: noteText.trim() },
      include: { user: { select: { id: true, name: true } } },
    });

    await prisma.leadActivity.create({
      data: {
        clientId,
        leadId: id,
        userId: user.id,
        type: 'NOTE_ADDED',
        description: `Note added by ${user.name}: "${noteText.trim().substring(0, 60)}${noteText.trim().length > 60 ? '...' : ''}"`,
      },
    });

    await prisma.lead.update({
      where: { id },
      data: { lastContactedAt: new Date() },
    });

    return NextResponse.json({ message: 'Note added successfully', note: leadNote }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/leads/[id]/notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
