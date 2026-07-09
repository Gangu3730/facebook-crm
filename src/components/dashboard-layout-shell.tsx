'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { UserSession } from '@/lib/auth';

interface DashboardLayoutShellProps {
  children: React.ReactNode;
  user: UserSession | null;
}

export default function DashboardLayoutShell({ children, user }: DashboardLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Navigation Sidebar */}
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Header
          user={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Dashboard Main Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
