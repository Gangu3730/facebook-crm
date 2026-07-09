'use client';

import React, { useState, useEffect } from 'react';
import { Globe, CheckCircle, XCircle, AlertCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface WebhookLog {
  id: string;
  clientId: string | null;
  pageId: string | null;
  formId: string | null;
  leadgenId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  client?: { companyName: string } | null;
}

export default function FacebookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/facebook/logs');
      if (!res.ok) throw new Error('Failed to load logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'ALL' ? logs : logs.filter(l => l.status === filter);

  const statusIcon = (status: string) => {
    if (status === 'SUCCESS') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === 'ERROR') return <XCircle className="w-4 h-4 text-rose-500" />;
    if (status === 'UNMAPPED') return <AlertCircle className="w-4 h-4 text-amber-500" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      SUCCESS: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      ERROR: 'bg-rose-50 border-rose-100 text-rose-700',
      UNMAPPED: 'bg-amber-50 border-amber-100 text-amber-700',
      PENDING: 'bg-slate-50 border-slate-200 text-slate-500',
    };
    return map[status] || map.PENDING;
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#005F73]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Facebook Webhook Logs</h1>
          <p className="text-sm text-slate-500 mt-1">All incoming Facebook Lead Ads webhook events across all clients.</p>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {['ALL', 'SUCCESS', 'ERROR', 'UNMAPPED', 'PENDING'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              filter === tab
                ? 'border-[#005F73] text-[#005F73]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-500">
              {tab === 'ALL' ? logs.length : logs.filter(l => l.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Globe className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-400">No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Client</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hidden md:table-cell">Page ID</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Form ID</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Leadgen ID</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {statusIcon(log.status)}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                      {log.errorMessage && (
                        <p className="text-[9px] text-rose-500 mt-1 max-w-[180px] truncate">{log.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-slate-700">
                        {log.client?.companyName || <span className="text-amber-500 italic">Unmapped</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <code className="text-[10px] font-mono text-slate-500">{log.pageId || '—'}</code>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <code className="text-[10px] font-mono text-slate-500">{log.formId || '—'}</code>
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <code className="text-[10px] font-mono text-slate-500">{log.leadgenId || '—'}</code>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(log.createdAt).toISOString().replace('T', ' ').split('.')[0]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
