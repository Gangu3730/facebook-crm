import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import DashboardLayoutShell from '@/components/dashboard-layout-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // Middleware secures this, but as double security/guard redirect if not set
  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardLayoutShell user={user}>
      {children}
    </DashboardLayoutShell>
  );
}
