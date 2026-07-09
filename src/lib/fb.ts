const META_API_VERSION = process.env.META_API_VERSION || 'v20.0';

export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLeadResponse {
  id: string;
  created_time: string;
  field_data: MetaLeadField[];
  form_id?: string;
  page_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  ad_id?: string;
  ad_name?: string;
}

export interface ParsedLead {
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  serviceInterest: string | null;
  message: string | null;
  facebookLeadgenId: string;
  facebookFormId: string | null;
  campaignName: string | null;
  campaignId: string | null;
  adName: string | null;
  adId: string | null;
}

// Fetch lead details from Meta Graph API
export async function fetchMetaLeadDetails(
  leadgenId: string,
  pageAccessToken: string
): Promise<MetaLeadResponse> {
  // If it's a mock token or starts with 'mock', return a mock response immediately to allow local development testing.
  if (pageAccessToken.startsWith('mock') || leadgenId.startsWith('mock_') || leadgenId === 'test_lead_id_101') {
    return getMockMetaLeadResponse(leadgenId);
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/${leadgenId}?fields=id,created_time,field_data,form_id,page_id,campaign_name,campaign_id,ad_name,ad_id&access_token=${pageAccessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Meta Graph API returned ${res.status}: ${errText}`);
  }

  return res.json() as Promise<MetaLeadResponse>;
}

// Parse field_data array from Meta and map to standard CRM fields
export function parseMetaLead(rawLead: MetaLeadResponse): ParsedLead {
  const fields = rawLead.field_data || [];
  
  let name = '';
  let email: string | null = null;
  let phone: string | null = null;
  let city: string | null = null;
  let serviceInterest: string | null = null;
  const messageParts: string[] = [];

  for (const field of fields) {
    const key = field.name.toLowerCase();
    const val = field.values && field.values.length > 0 ? field.values[0] : '';

    if (!val) continue;

    // Direct mapping rules
    if (key.includes('full_name') || key === 'name') {
      name = val;
    } else if (key.includes('first_name')) {
      name = val + (name ? ' ' + name : '');
    } else if (key.includes('last_name')) {
      name = (name ? name + ' ' : '') + val;
    } else if (key.includes('email')) {
      email = val;
    } else if (key.includes('phone') || key.includes('tel') || key.includes('contact')) {
      phone = val;
    } else if (key.includes('city') || key.includes('town')) {
      city = val;
    } else if (key.includes('product') || key.includes('service') || key.includes('interest')) {
      serviceInterest = val;
    } else {
      // Append other custom fields to message
      messageParts.push(`${field.name}: ${val}`);
    }
  }

  // Fallback name if empty
  if (!name) {
    name = email ? email.split('@')[0] : `FB Lead (${rawLead.id})`;
  }

  return {
    name,
    email,
    phone,
    city,
    serviceInterest,
    message: messageParts.length > 0 ? messageParts.join('\n') : 'Lead captured automatically from Facebook Lead Ads form.',
    facebookLeadgenId: rawLead.id,
    facebookFormId: rawLead.form_id || null,
    campaignName: rawLead.campaign_name || null,
    campaignId: rawLead.campaign_id || null,
    adName: rawLead.ad_name || null,
    adId: rawLead.ad_id || null,
  };
}

// Generates a mock lead response matching Meta API schema
function getMockMetaLeadResponse(leadgenId: string): MetaLeadResponse {
  const names = ['Clark Kent', 'Selina Kyle', 'Hal Jordan', 'Barry Allen', 'Arthur Curry'];
  const emails = ['clark@dailyplanet.com', 'selina@cat.org', 'hal@greenlantern.space', 'barry@ccpd.gov', 'arthur@atlantis.gov'];
  const phones = ['+15550777', '+15550911', '+15551111', '+15559999', '+15558888'];
  const cities = ['Metropolis', 'Gotham', 'Coast City', 'Central City', 'Atlantis'];
  const products = ['Custom Cloud Solutions', 'CRM Software Training', 'Sales Force Analytics', 'Lead Generation Audit', 'SaaS Trial Suite'];

  const randIdx = Math.abs(hashCode(leadgenId)) % names.length;

  return {
    id: leadgenId,
    created_time: new Date().toISOString(),
    form_id: '8877665544',
    campaign_name: 'Summer Enterprise Leads 2026',
    campaign_id: 'camp_2026_summer',
    ad_name: 'Video Ad - Automate Today',
    ad_id: 'ad_998880',
    field_data: [
      {
        name: 'full_name',
        values: [names[randIdx]],
      },
      {
        name: 'email',
        values: [emails[randIdx]],
      },
      {
        name: 'phone_number',
        values: [phones[randIdx]],
      },
      {
        name: 'city',
        values: [cities[randIdx]],
      },
      {
        name: 'what_service_are_you_looking_for',
        values: [products[randIdx]],
      },
      {
        name: 'comments',
        values: ['Sent via automated test webhook script.'],
      },
    ],
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
