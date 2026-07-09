'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Loader2,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  LineChart as LineIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useToast } from '@/components/ui/toast';

interface AnalyticsData {
  summary: {
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
  };
  leadsBySource: { name: string; value: number }[];
  leadsByStatus: { name: string; value: number }[];
  leadsByDate: { date: string; count: number }[];
  teamPerformance: { name: string; assigned: number; converted: number; pending: number; conversionRate: number }[];
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#64748b'];

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const toast = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/analytics');
      if (!res.ok) throw new Error('Failed to retrieve analytics reports');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'An error occurred loading reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchReports();
  }, []);

  const handleExportAll = () => {
    window.open('/api/leads/export', '_blank');
    toast.success('Downloading complete leads database...');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
        <p className="text-xs font-semibold text-slate-500">Generating analytics reports...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-100 p-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Failed to Load Reports</h3>
        <button
          onClick={fetchReports}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-xs font-bold text-white rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display">CRM Analytics Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze acquisition channels, team conversions, and pipeline trends.
          </p>
        </div>
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:shadow-indigo-150 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Master CSV</span>
        </button>
      </div>

      {mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trends line chart */}
          <div className="premium-card p-5 rounded-2xl bg-white space-y-4">
            <h3 className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
              <LineIcon className="w-4.5 h-4.5 text-indigo-500" />
              <span>Acquisition Velocity Trend</span>
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.leadsByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#f1f5f9" />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#f1f5f9" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: '600' }} />
                  <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} name="New Leads" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sources pie chart */}
          <div className="premium-card p-5 rounded-2xl bg-white space-y-4">
            <h3 className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
              <PieIcon className="w-4.5 h-4.5 text-indigo-500" />
              <span>Lead Distribution by Source</span>
            </h3>
            <div className="h-64 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.leadsBySource}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.leadsBySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: '600' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-wrap justify-center gap-3 bottom-0 w-full">
                {data.leadsBySource.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span>{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status Bar Chart */}
          <div className="premium-card p-5 rounded-2xl bg-white space-y-4">
            <h3 className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
              <BarChart3 className="w-4.5 h-4.5 text-indigo-500" />
              <span>Leads Funnel Stage Breakdown</span>
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.leadsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#f1f5f9" />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#f1f5f9" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: '600' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Leads Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Team performance comparison bar chart */}
          {data.teamPerformance && data.teamPerformance.length > 0 && (
            <div className="premium-card p-5 rounded-2xl bg-white space-y-4">
              <h3 className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
                <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
                <span>Agent Conversion Output</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#f1f5f9" />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} stroke="#f1f5f9" allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: '600' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                    <Bar dataKey="assigned" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Leads Assigned" />
                    <Bar dataKey="converted" fill="#10b981" radius={[4, 4, 0, 0]} name="Leads Converted" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
