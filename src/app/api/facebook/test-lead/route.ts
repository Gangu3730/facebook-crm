import { NextRequest, NextResponse } from 'next/server';

// POST /api/facebook/test-lead - Simulate an incoming Facebook webhook lead event
export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {}

    const { leadgenId, formId, pageId } = body as any;

    const finalLeadgenId = leadgenId || `mock_lead_${Math.floor(100000 + Math.random() * 900000)}`;
    const finalFormId = formId || '8877665544';
    const finalPageId = pageId || '1029384756';

    // Construct mock payload matching Meta's structure
    const payload = {
      object: 'page',
      entry: [
        {
          id: finalPageId,
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: finalLeadgenId,
                form_id: finalFormId,
                page_id: finalPageId,
                created_time: Math.floor(Date.now() / 1000),
              },
            },
          ],
        },
      ],
    };

    // Retrieve host details from headers to hit our own webhook route
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const webhookUrl = `${protocol}://${host}/api/facebook/webhook`;

    console.log(`Forwarding test lead to local webhook: ${webhookUrl}`);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({
        error: `Webhook returned status ${res.status}: ${errText}`,
      }, { status: 500 });
    }

    const result = await res.json();

    return NextResponse.json({
      message: 'Mock lead webhook dispatched successfully',
      leadgenId: finalLeadgenId,
      webhookResponse: result,
    });
  } catch (error: any) {
    console.error('Test lead simulation failed:', error);
    return NextResponse.json({
      error: 'Failed to simulate test lead webhook',
      details: error.message || String(error),
    }, { status: 500 });
  }
}
