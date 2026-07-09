'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2, Users, TrendingUp, Activity, Globe, AlertCircle,
  Plus, ArrowRight, CheckCircle, XCircle, Loader2
} from 'lucide-react';

interface AgencyStats {
  totalClients: number;
  activeClients: number;
  totalLeads: number;
  totalUsers: number;
  facebookConnections: number;
  recentClients: any[];
}

export default function AgencyDashboard() {
  const [stats, setStats] = useState<AgencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/clients');
        if (!res.ok) throw new Error('Failed to load clients');
        const data = await res.json();
        const clients: any[] = data.clients || [];
        setStats({
          totalClients: clients.length,
          activeClients: clients.filter((c: any) => c.status === 'Active').length,
          totalLeads: clients.reduce((sum: number, c: any) => sum + (c._count?.leads || 0), 0),
          totalUsers: clients.reduce((sum: number, c: any) => sum + (c._count?.users || 0), 0),
          facebookConnections: clients.reduce((sum: number, c: any) => sum + (c._count?.fbConnections || 0), 0),
          recentClients: clients.slice(0, 5),
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#005F73]" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Clients', value: stats?.totalClients ?? 0, icon: Building2, color: 'bg-teal-50 text-teal-700 border-teal-100' },
    { label: 'Active Clients', value: stats?.activeClients ?? 0, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Total Leads', value: stats?.totalLeads ?? 0, icon: Users, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { label: 'Team Members', value: stats?.totalUsers ?? 0, icon: Activity, color: 'bg-violet-50 text-violet-700 border-violet-100' },
    { label: 'FB Connections', value: stats?.facebookConnections ?? 0, icon: Globe, color: 'bg-blue-50 text-blue-700 border-blue-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Agency Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Master overview of all clients, leads, and Facebook connections.</p>
        </div>
        <Link
          href="/agency/clients/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}
        >
          <Plus className="w-4 h-4" />
          Add New Client
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-2xl border p-4 ${card.color} space-y-2`}>
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black">{card.value}</p>
                <p className="text-[10px] font-semibold opacity-70 mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Clients Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <span className="text-sm font-extrabold text-slate-800">Recent Clients</span>
          <Link href="/agency/clients" className="text-xs font-bold text-[#005F73] hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {stats?.recentClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-400">No clients yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your first client to get started.</p>
            </div>
          ) : (
            stats?.recentClients.map((client: any) => (
              <div key={client.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl text-white font-extrabold text-sm flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}>
                    {client.companyName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{client.companyName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex gap-3 text-[10px] font-semibold text-slate-500">
                    <span>{client._count?.leads || 0} leads</span>
                    <span>{client._count?.users || 0} users</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    client.status === 'Active'
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    {client.status}
                  </span>
                  <Link href={`/agency/clients/${client.id}`} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/agency/facebook-logs"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-[#005F73]/30 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Facebook Webhook Logs</p>
            <p className="text-[10px] text-slate-400">View all sync events</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[#005F73] transition-colors" />
        </Link>
        <Link href="/agency/unmapped"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-amber-300 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Unmapped Leads</p>
            <p className="text-[10px] text-slate-400">Unassigned webhook events</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-amber-500 transition-colors" />
        </Link>
        <Link href="/agency/leads"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">All Leads</p>
            <p className="text-[10px] text-slate-400">Cross-client lead view</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-indigo-500 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
