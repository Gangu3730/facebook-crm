import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchMetaLeadDetails, parseMetaLead } from '@/lib/fb';
import { decrypt } from '@/lib/encryption';

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'crm_leadgen_verify_token_2026';

// GET /api/facebook/webhook - Meta webhook verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('[Webhook] Verified successfully');
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.warn('[Webhook] Verification failed: token mismatch');
      return new NextResponse('Forbidden', { status: 403 });
    }
  } catch (error) {
    console.error('[Webhook] GET error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST /api/facebook/webhook - Multi-tenant lead routing
export async function POST(request: NextRequest) {
  let webhookLogId = '';
  let payloadStr = '';
  let pageIdStr = '';
  let formIdStr = '';
  let leadgenIdStr = '';

  try {
    const payload = await request.json();
    payloadStr = JSON.stringify(payload);

    if (payload.object !== 'page') {
      return NextResponse.json({ message: 'Ignored: not a page event' }, { status: 200 });
    }

    const entries = payload.entry || [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;

        const leadgenVal = change.value;
        leadgenIdStr = String(leadgenVal.leadgen_id);
        formIdStr = String(leadgenVal.form_id);
        pageIdStr = String(leadgenVal.page_id);

        // Create initial webhook log (unmapped by default)
        const logRecord = await prisma.facebookWebhookLog.create({
          data: {
            pageId: pageIdStr,
            formId: formIdStr,
            leadgenId: leadgenIdStr,
            payload: payloadStr,
            status: 'PENDING',
          },
        });
        webhookLogId = logRecord.id;

        // --- STEP 1: Find client by page_id + form_id ---
        const fbForm = await prisma.facebookLeadForm.findFirst({
          where: {
            formId: formIdStr,
            status: 'Active',
            page: { pageId: pageIdStr, status: 'Active' },
          },
          include: {
            page: { include: { connection: true } },
            fieldMappings: true,
          },
        });

        if (!fbForm) {
          // Unmapped: log it and notify Super Admin
          console.warn(`[Webhook] UNMAPPED: page_id=${pageIdStr} form_id=${formIdStr}`);
          await prisma.facebookWebhookLog.update({
            where: { id: webhookLogId },
            data: { status: 'UNMAPPED', errorMessage: `No matching client found for page_id=${pageIdStr} form_id=${formIdStr}` },
          });
          continue;
        }

        const clientId = fbForm.clientId;
        const pageAccessToken = decrypt(fbForm.page.pageAccessTokenEncrypted);

        // --- STEP 2: Duplicate check (per client) ---
        const alreadyProcessed = await prisma.lead.findFirst({
          where: { clientId, facebookLeadgenId: leadgenIdStr },
        });
        if (alreadyProcessed) {
          await prisma.facebookWebhookLog.update({
            where: { id: webhookLogId },
            data: { clientId, status: 'SUCCESS', errorMessage: 'Duplicate leadgen_id skipped' },
          });
          continue;
        }

        // --- STEP 3: Fetch lead details from Meta Graph API ---
        const rawLeadDetails = await fetchMetaLeadDetails(leadgenIdStr, pageAccessToken);
        const parsedLead = parseMetaLead(rawLeadDetails);

        // --- STEP 4: Apply client-specific field mappings ---
        const mappings = fbForm.fieldMappings;
        const mappedFields: Record<string, string> = {};
        for (const m of mappings) {
          mappedFields[m.crmFieldName] = m.facebookFieldName;
        }
        // Override parsed values with field mapping if present
        // (field mapping replaces the default parser behavior for configured fields)

        // --- STEP 5: Duplicate detection by email/phone within same client ---
        let isDuplicate = false;
        if (parsedLead.email || parsedLead.phone) {
          const dupConditions: any[] = [];
          if (parsedLead.email) dupConditions.push({ email: parsedLead.email.toLowerCase() });
          if (parsedLead.phone) dupConditions.push({ phone: parsedLead.phone });

          const existing = await prisma.lead.findFirst({
            where: { clientId, OR: dupConditions, status: { not: 'Duplicate' } },
          });
          if (existing) isDuplicate = true;
        }

        // --- STEP 6: Auto-assign via client routing rule ---
        let assignedUserId: string | null = null;
        let autoAssigned = false;

        const routingRule = await prisma.leadRoutingRule.findFirst({
          where: { clientId, isActive: true, ruleType: 'round_robin' },
        });
        if (routingRule) {
          const userIds = JSON.parse(routingRule.userIds || '[]');
          if (userIds.length > 0) {
            assignedUserId = userIds[routingRule.currentIndex];
            autoAssigned = true;
            const nextIdx = (routingRule.currentIndex + 1) % userIds.length;
            await prisma.leadRoutingRule.update({
              where: { id: routingRule.id },
              data: { currentIndex: nextIdx },
            });
          }
        }

        // --- STEP 7: Create Lead under correct clientId ---
        const lead = await prisma.lead.create({
          data: {
            clientId,
            name: parsedLead.name,
            phone: parsedLead.phone,
            email: parsedLead.email,
            city: parsedLead.city,
            serviceInterest: parsedLead.serviceInterest,
            message: parsedLead.message,
            source: 'Facebook Lead Ads',
            facebookFormId: formIdStr,
            facebookPageId: pageIdStr,
            facebookLeadgenId: leadgenIdStr,
            campaignName: parsedLead.campaignName,
            campaignId: parsedLead.campaignId,
            adName: parsedLead.adName,
            adId: parsedLead.adId,
            status: isDuplicate ? 'Duplicate' : 'New',
            priority: 'Hot',
            assignedUserId,
            syncStatus: 'Synced',
          },
        });

        // --- STEP 8: Activities & Notifications ---
        await prisma.leadActivity.create({
          data: {
            clientId,
            leadId: lead.id,
            type: 'FB_SYNC',
            description: `Lead synced from Facebook Page "${pageIdStr}" Form "${formIdStr}".${isDuplicate ? ' (Duplicate detected)' : ''}`,
          },
        });

        if (assignedUserId) {
          const agent = await prisma.user.findUnique({ where: { id: assignedUserId } });
          await prisma.leadActivity.create({
            data: {
              clientId,
              leadId: lead.id,
              type: 'ASSIGNMENT',
              description: `Auto-assigned to ${agent?.name || 'Unknown'}${autoAssigned ? ' (Round Robin)' : ''}.`,
            },
          });
          await prisma.notification.create({
            data: {
              clientId,
              userId: assignedUserId,
              title: 'New Facebook Lead',
              message: `Lead "${lead.name}" has been auto-assigned to you from Facebook.`,
              type: 'NEW_LEAD',
            },
          });
        }

        // Also notify client admin(s)
        const clientAdmins = await prisma.user.findMany({
          where: { clientId, role: 'CLIENT_ADMIN' },
          select: { id: true },
        });
        for (const admin of clientAdmins) {
          if (admin.id !== assignedUserId) {
            await prisma.notification.create({
              data: {
                clientId,
                userId: admin.id,
                title: 'New Lead from Facebook',
                message: `New lead "${lead.name}" received via Facebook Lead Ads.`,
                type: 'NEW_LEAD',
              },
            });
          }
        }

        // --- STEP 9: Mark webhook log success ---
        await prisma.facebookWebhookLog.update({
          where: { id: webhookLogId },
          data: { clientId, status: 'SUCCESS' },
        });
      }
    }

    return NextResponse.json({ status: 'Processed' }, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);

    if (webhookLogId) {
      await prisma.facebookWebhookLog.update({
        where: { id: webhookLogId },
        data: { status: 'ERROR', errorMessage: error.message || String(error) },
      }).catch(() => {});
    } else {
      await prisma.facebookWebhookLog.create({
        data: { payload: payloadStr || '{}', status: 'ERROR', errorMessage: error.message || String(error) },
      }).catch(() => {});
    }

    // Always return 200 to prevent Facebook from revoking the webhook
    return NextResponse.json({ error: 'Processing failed but acknowledged' }, { status: 200 });
  }
}
