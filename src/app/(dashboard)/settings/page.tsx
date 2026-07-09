'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Globe as Facebook,
  UserCheck,
  Send,
  Loader2,
  Trash2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  History,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface WebhookLog {
  id: string;
  leadgenId: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [team, setTeam] = useState<TeamMember[]>([]);
  
  const [autoAssign, setAutoAssign] = useState({
    mode: 'manual',
    userIds: [] as string[],
    currentIndex: 0,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [simData, setSimData] = useState({
    leadgenId: '',
    formId: '',
    pageId: '',
  });
  const [simLoading, setSimLoading] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const resMe = await fetch('/api/auth/me');
      if (resMe.ok) {
        const me = await resMe.json();
        setUserRole(me.user.role);
      }

      const resTeam = await fetch('/api/team');
      if (resTeam.ok) {
        const teamData = await resTeam.json();
        setTeam(teamData.users || []);
      }

      const resSettings = await fetch('/api/settings');
      if (resSettings.ok) {
        const setJson = await resSettings.json();
        if (setJson.settings?.auto_assign_mode) {
          setAutoAssign(setJson.settings.auto_assign_mode);
        }
      }

      fetchLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const resLogs = await fetch('/api/facebook/logs');
      if (resLogs.ok) {
        const logsJson = await resLogs.json();
        setLogs(logsJson.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsLoading(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'auto_assign_mode',
          value: autoAssign,
        }),
      });

      if (!res.ok) throw new Error('Failed to update settings');
      toast.success('Auto-assignment rules saved successfully.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const toggleUserInPool = (uid: string) => {
    setAutoAssign((prev) => {
      const exists = prev.userIds.includes(uid);
      const newUserIds = exists
        ? prev.userIds.filter((id) => id !== uid)
        : [...prev.userIds, uid];
      return { ...prev, userIds: newUserIds };
    });
  };

  const handleSimulateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSimLoading(true);
      const res = await fetch('/api/facebook/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object: 'page',
          entry: [
            {
              changes: [
                {
                  field: 'leadgen',
                  value: {
                    leadgen_id: simData.leadgenId || `mock_lead_${Date.now()}`,
                    form_id: simData.formId || '8877665544',
                    page_id: simData.pageId || '1029384756',
                    created_time: Math.floor(Date.now() / 1000),
                  },
                },
              ],
            },
          ],
        }),
      });

      const result = await res.json();
      toast.success(`Mock Webhook Dispatched!`);
      setSimData({ leadgenId: '', formId: '', pageId: '' });
      setTimeout(fetchLogs, 1000);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-[#005F73] animate-spin mb-2" />
        <p className="text-xs font-semibold text-slate-500">Syncing system configs...</p>
      </div>
    );
  }

  const isEditable = userRole !== 'SALES_EXECUTIVE';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure lead distribution algorithms and test Facebook webhook events.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Routing pool */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#005F73]" />
              <span>Lead Distribution Rules</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assignment Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={autoAssign.mode === 'manual'}
                      onChange={() => setAutoAssign({ ...autoAssign, mode: 'manual' })}
                      disabled={!isEditable}
                      className="text-[#005F73] focus:ring-[#005F73]"
                    />
                    <span>Manual / Unassigned (Default)</span>
                  </label>
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={autoAssign.mode === 'round_robin'}
                      onChange={() => setAutoAssign({ ...autoAssign, mode: 'round_robin' })}
                      disabled={!isEditable}
                      className="text-[#005F73] focus:ring-[#005F73]"
                    />
                    <span>Round-Robin Pool Assignment</span>
                  </label>
                </div>
              </div>

              {autoAssign.mode === 'round_robin' && (
                <div className="space-y-2 border-t border-slate-50 pt-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Active Sales Agents Pool
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {team
                      .filter((t) => t.role === 'SALES_EXECUTIVE' || t.role === 'CLIENT_MANAGER' || t.role === 'CLIENT_ADMIN')
                      .map((t) => {
                        const active = autoAssign.userIds.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => isEditable && toggleUserInPool(t.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              active
                                ? 'bg-teal-50/50 border-teal-200 text-teal-800 font-bold'
                                : 'bg-slate-50/20 border-slate-205/65 text-slate-500'
                            }`}
                          >
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? 'bg-[#005F73]' : 'bg-slate-300'}`} />
                            <span className="truncate">{t.name}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {isEditable && (
                <div className="flex justify-end pt-2 border-t border-slate-50">
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}
                  >
                    {settingsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Distribution Rules</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Facebook Settings Shortcut */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Facebook className="w-4 h-4 text-blue-600" />
                <span>Facebook Integration Settings</span>
              </h3>
              <p className="text-[11px] text-slate-550 mt-1">Configure pages, lead forms, and field mappings for real-time lead sync.</p>
            </div>
            <Link href="/settings/facebook" className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-[#005F73] bg-teal-50 border border-teal-100 hover:bg-teal-100 transition-colors">
              Go to Facebook Settings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Side: Simulator & Webhook logs */}
        <div className="space-y-6">
          {isEditable && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[#005F73]" />
                <span>Mock Lead Ads Simulator</span>
              </h3>

              <div className="p-3 bg-teal-50/40 border border-teal-100/50 rounded-xl text-[10px] text-teal-800 leading-relaxed font-semibold">
                Simulates an incoming Facebook Webhook ping. It resolves locally to test parsing rules, duplicate validation, and round-robin routing.
              </div>

              <form onSubmit={handleSimulateLead} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1">Simulated Leadgen ID</label>
                  <input
                    type="text"
                    value={simData.leadgenId}
                    onChange={(e) => setSimData({ ...simData, leadgenId: e.target.value })}
                    placeholder="Randomly generated if blank"
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005F73]/20"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1">Meta Form ID *</label>
                  <input
                    type="text"
                    value={simData.formId}
                    onChange={(e) => setSimData({ ...simData, formId: e.target.value })}
                    placeholder="e.g. 8877665544"
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1">Meta Page ID *</label>
                  <input
                    type="text"
                    value={simData.pageId}
                    onChange={(e) => setSimData({ ...simData, pageId: e.target.value })}
                    placeholder="e.g. 1029384756"
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={simLoading}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-white font-bold transition-all cursor-pointer shadow-md shadow-teal-100 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}
                >
                  {simLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Dispatch Mock Webhook</span>
                </button>
              </form>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#005F73]" />
                <span>Client Webhook Logs</span>
              </h3>
              <button
                onClick={fetchLogs}
                disabled={logsLoading}
                className="p-1 rounded-lg text-slate-405 hover:bg-slate-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 divide-y divide-slate-50 text-[10px]">
              {logs.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  No webhook logs found.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="py-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-700 truncate max-w-[120px]">
                        ID: {log.leadgenId || '—'}
                      </span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[8px] font-bold border ${
                        log.status === 'SUCCESS' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-600'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    {log.errorMessage && (
                      <p className="text-rose-600 bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/50 mt-1">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
