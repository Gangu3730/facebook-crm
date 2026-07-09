'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserCheck,
  Globe as Facebook,
  Calendar,
  AlertTriangle,
  Flame,
  TrendingUp,
  Clock,
  ChevronRight,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';

interface AnalyticsData {
  summary: {
    totalLeads: number;
    newLeadsToday: number;
    facebookLeads: number;
    convertedLeads: number;
    pendingTasks: number;
    missedTasks: number;
    hotLeads: number;
    conversionRate: number;
  };
  leadsBySource: { name: string; value: number }[];
  leadsByStatus: { name: string; value: number }[];
  leadsByDate: { date: string; count: number }[];
  teamPerformance: { name: string; assigned: number; converted: number; pending: number; conversionRate: number }[];
  upcomingTasks: any[];
  recentLeads: any[];
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#64748b'];

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/analytics');
      if (!res.ok) {
        throw new Error('Failed to load dashboard statistics');
      }
      const analytics = await res.json();
      setData(analytics);
    } catch (e: any) {
      setError(e.message || 'An error occurred while loading dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white rounded-2xl border border-slate-100 shadow-xs">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Failed to Load Dashboard</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">{error || 'Unable to connect to CRM services'}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, leadsBySource, leadsByStatus, leadsByDate, teamPerformance, upcomingTasks, recentLeads } = data;

  const cardConfig = [
    { label: 'Total Leads', val: summary.totalLeads, desc: 'All CRM records', icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'New Leads Today', val: summary.newLeadsToday, desc: 'Captured today', icon: Clock, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { label: 'Facebook Leads', val: summary.facebookLeads, desc: 'From Meta Lead Ads', icon: Facebook, color: 'text-indigo-700 bg-indigo-50/70 border-indigo-100' },
    { label: 'Converted Leads', val: summary.convertedLeads, desc: 'Sales closed successfully', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Pending Follow-ups', val: summary.pendingTasks, desc: 'Assigned checklist items', icon: Calendar, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'Missed Follow-ups', val: summary.missedTasks, desc: 'Overdue schedules', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { label: 'Hot Leads', val: summary.hotLeads, desc: 'High-priority leads', icon: Flame, color: 'text-orange-600 bg-orange-50 border-orange-105' },
    { label: 'Conversion Rate', val: `${summary.conversionRate}%`, desc: 'Leads converted to sales', icon: TrendingUp, color: 'text-teal-600 bg-teal-50 border-teal-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Title Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display">Sales Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Here is a summary of lead pipeline health and recent sales operations.</p>
        </div>
        <Link
          href="/leads?openModal=true"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:shadow-indigo-150 transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Lead</span>
        </Link>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {cardConfig.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="premium-card p-5 rounded-2xl bg-white flex flex-col justify-between min-h-32">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-slate-800 tracking-tight">{card.val}</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1 leading-none">{card.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Recharts Section */}
      {mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Line Chart (Leads Trend) */}
          <div className="lg:col-span-2 premium-card p-5 rounded-2xl bg-white flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Lead Generation Trend (Last 7 Days)</h3>
            <div className="h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={leadsByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#e2e8f0" />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#e2e8f0" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '12px', fontWeight: '600' }} />
                  <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} name="Leads Sycned" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart (Sources Split) */}
          <div className="premium-card p-5 rounded-2xl bg-white flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4">Leads by Capture Source</h3>
            </div>
            <div className="h-56 relative flex items-center justify-center">
              {leadsBySource.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400">No source data available</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadsBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {leadsBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: '600' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
              {leadsBySource.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row: Recent Leads & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="premium-card p-5 rounded-2xl bg-white flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800">Recent Leads</h3>
            <Link href="/leads" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-50">
            {recentLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-xs font-bold text-slate-400">No leads captured yet</span>
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-3.5">
                  <div className="min-w-0">
                    <Link href={`/leads/${lead.id}`} className="text-xs font-bold text-slate-800 hover:text-indigo-600 truncate block">
                      {lead.name}
                    </Link>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                      {lead.source} • {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={lead.priority} />
                    <StatusBadge status={lead.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="premium-card p-5 rounded-2xl bg-white flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800">Upcoming Follow-up Tasks</h3>
            <Link href="/followups" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <span>View Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-50">
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-xs font-bold text-slate-400">No scheduled follow-ups pending</span>
              </div>
            ) : (
              upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-3.5">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate">{task.title}</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                      Lead: <Link href={`/leads/${task.leadId}`} className="text-indigo-600 hover:underline">{task.lead?.name}</Link>
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700">
                      {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Team Performance - Group View (Only Managers/Admins/SuperAdmins) */}
      {mounted && teamPerformance && teamPerformance.length > 0 && (
        <div className="premium-card p-5 rounded-2xl bg-white">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Sales Team Performance Overview</h3>
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#e2e8f0" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#e2e8f0" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: '600' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                <Bar dataKey="assigned" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Leads Assigned" />
                <Bar dataKey="converted" fill="#10b981" radius={[4, 4, 0, 0]} name="Converted Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// Skeletons loader during fetch
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-10 w-28 bg-slate-200 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, idx) => (
          <div key={idx} className="h-32 bg-slate-200 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-slate-200 rounded-2xl" />
        <div className="h-80 bg-slate-200 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );
}
