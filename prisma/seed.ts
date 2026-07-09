import { prisma } from '../src/lib/db';
import * as bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding multi-tenant ApexCRM database...');

  // ─── Clear tables in dependency order ───────────────
  await prisma.facebookWebhookLog.deleteMany();
  await prisma.facebookFieldMapping.deleteMany();
  await prisma.facebookLeadForm.deleteMany();
  await prisma.facebookPage.deleteMany();
  await prisma.facebookConnection.deleteMany();
  await prisma.leadRoutingRule.deleteMany();
  await prisma.clientSetting.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();
  await prisma.agencySetting.deleteMany();

  console.log('✅ Cleared all tables');

  // ─── 1. Agency Super Admin ─────────────────────────
  const superAdminHash = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.create({
    data: {
      clientId: null, // No client = Agency Super Admin
      name: 'Agency Super Admin',
      email: 'admin@apexcrm.io',
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      status: 'Active',
    },
  });
  console.log(`✅ Created Super Admin: ${superAdmin.email}`);

  // ─── 2. Client A: Acme Corp ────────────────────────
  const acme = await prisma.client.create({
    data: {
      companyName: 'Acme Corp',
      contactPerson: 'John Smith',
      email: 'john@acmecorp.com',
      phone: '+1-555-0100',
      website: 'https://acmecorp.com',
      industry: 'Technology',
      address: '123 Business Ave, New York, NY 10001',
      status: 'Active',
      packageName: 'Enterprise',
    },
  });

  const acmeAdminHash = await bcrypt.hash('acme123', 12);
  const acmeAdmin = await prisma.user.create({
    data: {
      clientId: acme.id,
      name: 'Acme Admin',
      email: 'admin@acmecorp.com',
      passwordHash: acmeAdminHash,
      role: 'CLIENT_ADMIN',
      status: 'Active',
    },
  });

  const acmeManagerHash = await bcrypt.hash('manager123', 12);
  const acmeManager = await prisma.user.create({
    data: {
      clientId: acme.id,
      name: 'Sarah Connor',
      email: 'sarah@acmecorp.com',
      passwordHash: acmeManagerHash,
      role: 'CLIENT_MANAGER',
      status: 'Active',
    },
  });

  const acmeSales1Hash = await bcrypt.hash('sales123', 12);
  const acmeSales1 = await prisma.user.create({
    data: {
      clientId: acme.id,
      name: 'Alex Mercer',
      email: 'alex@acmecorp.com',
      passwordHash: acmeSales1Hash,
      role: 'SALES_EXECUTIVE',
      status: 'Active',
    },
  });

  const acmeSales2Hash = await bcrypt.hash('sales223', 12);
  const acmeSales2 = await prisma.user.create({
    data: {
      clientId: acme.id,
      name: 'Diana Prince',
      email: 'diana@acmecorp.com',
      passwordHash: acmeSales2Hash,
      role: 'SALES_EXECUTIVE',
      status: 'Active',
    },
  });

  // Routing rule for Acme
  await prisma.leadRoutingRule.create({
    data: {
      clientId: acme.id,
      ruleType: 'round_robin',
      userIds: JSON.stringify([acmeSales1.id, acmeSales2.id]),
      currentIndex: 0,
      isActive: true,
    },
  });

  console.log(`✅ Created Client: ${acme.companyName} with 4 users`);

  // ─── 3. Client B: Stark Industries ────────────────
  const stark = await prisma.client.create({
    data: {
      companyName: 'Stark Industries',
      contactPerson: 'Tony Stark',
      email: 'tony@starkindustries.com',
      phone: '+1-555-0200',
      website: 'https://starkindustries.com',
      industry: 'Defense & Technology',
      address: '10880 Malibu Point, Malibu, CA 90265',
      status: 'Active',
      packageName: 'Enterprise',
    },
  });

  const starkAdminHash = await bcrypt.hash('stark123', 12);
  const starkAdmin = await prisma.user.create({
    data: {
      clientId: stark.id,
      name: 'Tony Stark',
      email: 'admin@starkindustries.com',
      passwordHash: starkAdminHash,
      role: 'CLIENT_ADMIN',
      status: 'Active',
    },
  });

  const starkSales1Hash = await bcrypt.hash('pepper123', 12);
  const starkSales1 = await prisma.user.create({
    data: {
      clientId: stark.id,
      name: 'Pepper Potts',
      email: 'pepper@starkindustries.com',
      passwordHash: starkSales1Hash,
      role: 'SALES_EXECUTIVE',
      status: 'Active',
    },
  });

  await prisma.leadRoutingRule.create({
    data: {
      clientId: stark.id,
      ruleType: 'round_robin',
      userIds: JSON.stringify([starkSales1.id, starkAdmin.id]),
      currentIndex: 0,
      isActive: true,
    },
  });

  console.log(`✅ Created Client: ${stark.companyName} with 2 users`);

  // ─── 4. Leads for Acme Corp ───────────────────────
  const now = new Date();

  const acmeLeads = [
    {
      name: 'John Doe',
      phone: '+15550199',
      email: 'john.doe@example.com',
      city: 'New York',
      serviceInterest: 'SaaS Enterprise Suite',
      message: 'Looking for a CRM for 25 sales reps. Need Facebook Lead Ads sync.',
      source: 'Facebook Lead Ads',
      facebookFormId: '8877665544',
      facebookPageId: '1029384756',
      facebookLeadgenId: 'fb_leadgen_acme_101',
      campaignName: 'Summer Enterprise Leads 2026',
      status: 'New',
      priority: 'Hot',
      assignedUserId: acmeSales1.id,
    },
    {
      name: 'Jane Smith',
      phone: '+15550244',
      email: 'jane.smith@example.com',
      city: 'Los Angeles',
      serviceInterest: 'Professional Consulting',
      message: 'Interested in a 1-hour sales automation workshop.',
      source: 'Manual',
      status: 'Contacted',
      priority: 'Warm',
      assignedUserId: acmeSales2.id,
      lastContactedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      name: 'Bruce Wayne',
      phone: '+15550999',
      email: 'bruce@wayneenterprises.com',
      city: 'Gotham',
      serviceInterest: 'Custom Cloud Architecture',
      message: 'Need high-grade security cloud dashboard. Budget not an issue.',
      source: 'Website',
      status: 'Qualified',
      priority: 'Hot',
      assignedUserId: acmeSales1.id,
    },
    {
      name: 'Peter Parker',
      phone: '+15550444',
      email: 'peter@dailybugle.com',
      city: 'Queens',
      serviceInterest: 'Photography CRM Add-on',
      message: 'Need to track client shoots and invoices.',
      source: 'Facebook Lead Ads',
      facebookFormId: '8877665544',
      facebookPageId: '1029384756',
      facebookLeadgenId: 'fb_leadgen_acme_102',
      status: 'Converted',
      priority: 'Warm',
      assignedUserId: acmeSales1.id,
    },
  ];

  for (const leadData of acmeLeads) {
    const lead = await prisma.lead.create({
      data: { clientId: acme.id, ...leadData },
    });
    await prisma.leadActivity.create({
      data: {
        clientId: acme.id,
        leadId: lead.id,
        userId: acmeAdmin.id,
        type: 'STATUS_CHANGE',
        description: `Lead created via ${lead.source}. Status: ${lead.status}.`,
      },
    });
  }
  console.log(`✅ Created ${acmeLeads.length} leads for Acme Corp`);

  // ─── 5. Leads for Stark Industries ────────────────
  const starkLeads = [
    {
      name: 'Nick Fury',
      phone: '+15553000',
      email: 'fury@shield.gov',
      city: 'Washington DC',
      serviceInterest: 'Defense Analytics Platform',
      message: 'Require advanced threat analysis integration.',
      source: 'Facebook Lead Ads',
      facebookFormId: '7766554433',
      facebookPageId: '9988776655',
      facebookLeadgenId: 'fb_leadgen_stark_101',
      status: 'New',
      priority: 'Hot',
      assignedUserId: starkSales1.id,
    },
    {
      name: 'Steve Rogers',
      phone: '+15554000',
      email: 'captain@avengers.org',
      city: 'Brooklyn',
      serviceInterest: 'Leadership Training Suite',
      message: 'Team productivity tools for the squad.',
      source: 'Manual',
      status: 'Follow-up',
      priority: 'Warm',
      assignedUserId: starkSales1.id,
      followUpDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    },
  ];

  for (const leadData of starkLeads) {
    const lead = await prisma.lead.create({
      data: { clientId: stark.id, ...leadData },
    });
    await prisma.leadActivity.create({
      data: {
        clientId: stark.id,
        leadId: lead.id,
        userId: starkAdmin.id,
        type: 'STATUS_CHANGE',
        description: `Lead created via ${lead.source}. Status: ${lead.status}.`,
      },
    });
  }
  console.log(`✅ Created ${starkLeads.length} leads for Stark Industries`);

  // ─── 6. Agency Settings ────────────────────────────
  await prisma.agencySetting.create({
    data: {
      key: 'agency_name',
      value: JSON.stringify({ name: 'ApexCRM Agency', supportEmail: 'support@apexcrm.io' }),
    },
  });

  console.log('\n🎉 Multi-tenant seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('─────────────────────────────────────────');
  console.log('Agency Super Admin: admin@apexcrm.io / admin123');
  console.log('Acme Admin:         admin@acmecorp.com / acme123');
  console.log('Stark Admin:        admin@starkindustries.com / stark123');
  console.log('Acme Sales:         alex@acmecorp.com / sales123');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
