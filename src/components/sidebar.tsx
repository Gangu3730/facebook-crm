'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Calendar,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  Globe,
  FileText,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { UserSession } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';

interface SidebarProps {
  user: UserSession | null;
  isOpen: boolean;
  onClose: () => void;
}

const AGENCY_NAV = [
  { label: 'Agency Dashboard', path: '/agency', icon: LayoutDashboard },
  { label: 'Clients', path: '/agency/clients', icon: Building2 },
  { label: 'All Leads', path: '/agency/leads', icon: Users },
  { label: 'Facebook Logs', path: '/agency/facebook-logs', icon: FileText },
  { label: 'Unmapped Leads', path: '/agency/unmapped', icon: AlertCircle },
  { label: 'Agency Reports', path: '/agency/reports', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

const CLIENT_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['CLIENT_ADMIN', 'CLIENT_MANAGER', 'SALES_EXECUTIVE'] },
  { label: 'Leads', path: '/leads', icon: Users, roles: ['CLIENT_ADMIN', 'CLIENT_MANAGER', 'SALES_EXECUTIVE'] },
  { label: 'Pipeline', path: '/pipeline', icon: Kanban, roles: ['CLIENT_ADMIN', 'CLIENT_MANAGER', 'SALES_EXECUTIVE'] },
  { label: 'Follow-ups', path: '/followups', icon: CheckSquare, roles: ['CLIENT_ADMIN', 'CLIENT_MANAGER', 'SALES_EXECUTIVE'] },
  { label: 'Calendar', path: '/calendar', icon: Calendar, roles: ['CLIENT_ADMIN', 'CLIENT_MANAGER', 'SALES_EXECUTIVE'] },
  { label: 'Team', path: '/team', icon: UserCog, roles: ['CLIENT_ADMIN', 'CLIENT_MANAGER'] },
  { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['CLIENT_ADMIN', 'CLIENT_MANAGER'] },
  { label: 'Facebook Settings', path: '/settings/facebook', icon: Globe, roles: ['CLIENT_ADMIN'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['CLIENT_ADMIN', 'CLIENT_MANAGER', 'SALES_EXECUTIVE'] },
];

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        toast.success('Logged out successfully');
        router.push('/login');
        router.refresh();
      } else {
        toast.error('Logout failed');
      }
    } catch {
      toast.error('An error occurred during logout');
    }
  };

  const navItems = isSuperAdmin
    ? AGENCY_NAV
    : CLIENT_NAV.filter(item => !item.roles || item.roles.includes(user?.role || ''));

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      SUPER_ADMIN: 'Agency Super Admin',
      CLIENT_ADMIN: 'Client Admin',
      CLIENT_MANAGER: 'Manager',
      SALES_EXECUTIVE: 'Sales Executive',
    };
    return labels[role] || role;
  };

  const isActive = (path: string) => {
    if (path === '/dashboard' || path === '/agency') return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 z-30 bg-white border-r border-slate-100 flex flex-col shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}>
            A
          </div>
          <div className="min-w-0">
            <span className="text-sm font-black text-slate-800 tracking-tight">ApexCRM</span>
            {isSuperAdmin ? (
              <p className="text-[9px] font-semibold text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5 inline-block ml-1">Agency</p>
            ) : null}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                  active
                    ? 'bg-[#005F73] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* User Profile + Logout */}
        <div className="border-t border-slate-100 p-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0"
              style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
              <span className="text-[9px] font-semibold text-slate-400">
                {getRoleLabel(user?.role || '')}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
