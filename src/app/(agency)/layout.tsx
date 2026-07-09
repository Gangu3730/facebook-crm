import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import DashboardLayoutShell from '@/components/dashboard-layout-shell';

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'SUPER_ADMIN') redirect('/dashboard');

  return (
    <DashboardLayoutShell user={user}>
      {children}
    </DashboardLayoutShell>
  );
}
