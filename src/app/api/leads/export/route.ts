import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const source = searchParams.get('source');
    const assignedUserId = searchParams.get('assignedUserId');
    const search = searchParams.get('search');

    const where: any = {};

    if (user.role === 'SALES_EXECUTIVE') {
      where.assignedUserId = user.id;
    } else if (assignedUserId) {
      where.assignedUserId = assignedUserId === 'unassigned' ? null : assignedUserId;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (source) where.source = source;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV contents
    const headers = [
      'Lead ID',
      'Name',
      'Phone',
      'Email',
      'City',
      'Product Interest',
      'Message',
      'Source',
      'Status',
      'Priority',
      'Assigned User',
      'Facebook Leadgen ID',
      'Facebook Form ID',
      'Campaign Name',
      'Ad Name',
      'Follow-up Date',
      'Last Contacted Date',
      'Created At',
    ];

    const escapeCsv = (str: string | null | undefined) => {
      if (str === null || str === undefined) return '';
      const text = String(str).replace(/"/g, '""');
      return text.includes(',') || text.includes('\n') || text.includes('"') ? `"${text}"` : text;
    };

    const rows = leads.map((l) => [
      l.id,
      escapeCsv(l.name),
      escapeCsv(l.phone),
      escapeCsv(l.email),
      escapeCsv(l.city),
      escapeCsv(l.serviceInterest),
      escapeCsv(l.message),
      escapeCsv(l.source),
      escapeCsv(l.status),
      escapeCsv(l.priority),
      escapeCsv(l.assignedUser?.name || 'Unassigned'),
      escapeCsv(l.facebookLeadgenId),
      escapeCsv(l.facebookFormId),
      escapeCsv(l.campaignName),
      escapeCsv(l.adName),
      l.followUpDate ? l.followUpDate.toISOString() : '',
      l.lastContactedAt ? l.lastContactedAt.toISOString() : '',
      l.createdAt.toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="crm_leads_export_${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
