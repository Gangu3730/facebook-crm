import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserFromRequest } from '@/lib/auth';
import { clientScopeFilter, requireRole } from '@/lib/permissions';

// GET /api/settings - Fetch client routing rules & client settings
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const clientIdOverride = searchParams.get('clientId');
    const scopeFilter = clientScopeFilter(user, clientIdOverride);
    const clientId = scopeFilter.clientId;

    if (!clientId) {
      // Super admin global/agency settings
      const agencyRecords = await prisma.agencySetting.findMany();
      const settings: Record<string, any> = {};
      for (const r of agencyRecords) {
        try {
          settings[r.key] = JSON.parse(r.value);
        } catch {
          settings[r.key] = r.value;
        }
      }
      return NextResponse.json({ settings });
    }

    // Tenant specific settings & routing rules
    const settingsRecords = await prisma.clientSetting.findMany({ where: { clientId } });
    const settings: Record<string, any> = {};
    for (const r of settingsRecords) {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    }

    const routingRule = await prisma.leadRoutingRule.findFirst({
      where: { clientId, ruleType: 'round_robin' },
    });

    settings['auto_assign_mode'] = {
      mode: routingRule?.isActive ? 'round_robin' : 'manual',
      userIds: routingRule ? JSON.parse(routingRule.userIds) : [],
      currentIndex: routingRule ? routingRule.currentIndex : 0,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/settings - Update client settings / routing rules
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { key, value, clientId: bodyClientId } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    // Determine target client
    const targetClientId = user.role === 'SUPER_ADMIN' ? bodyClientId : user.clientId;

    if (!targetClientId) {
      // Super admin saving agency setting
      requireRole(user, ['SUPER_ADMIN']);
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const record = await prisma.agencySetting.upsert({
        where: { key },
        update: { value: valueStr },
        create: { key, value: valueStr },
      });
      return NextResponse.json({ message: 'Agency setting saved', setting: record });
    }

    // Client admin / manager saving client setting
    requireRole(user, ['SUPER_ADMIN', 'CLIENT_ADMIN', 'CLIENT_MANAGER']);

    if (key === 'auto_assign_mode') {
      const { mode, userIds } = value;
      const isActive = mode === 'round_robin';
      const uIds = Array.isArray(userIds) ? userIds : [];

      const existingRule = await prisma.leadRoutingRule.findFirst({
        where: { clientId: targetClientId, ruleType: 'round_robin' },
      });

      let rule;
      if (existingRule) {
        rule = await prisma.leadRoutingRule.update({
          where: { id: existingRule.id },
          data: {
            userIds: JSON.stringify(uIds),
            isActive,
            currentIndex: 0, // Reset when updated
          },
        });
      } else {
        rule = await prisma.leadRoutingRule.create({
          data: {
            clientId: targetClientId,
            ruleType: 'round_robin',
            userIds: JSON.stringify(uIds),
            isActive,
            currentIndex: 0,
          },
        });
      }
      return NextResponse.json({ message: 'Routing rules saved successfully', setting: rule });
    }

    // Other general settings
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const record = await prisma.clientSetting.upsert({
      where: { clientId_key: { clientId: targetClientId, key } },
      update: { value: valueStr },
      create: { clientId: targetClientId, key, value: valueStr },
    });

    return NextResponse.json({ message: 'Setting updated successfully', setting: record });
  } catch (error) {
    console.error('POST /api/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
