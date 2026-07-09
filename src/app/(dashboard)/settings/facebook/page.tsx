'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe, CheckCircle, XCircle, Link2, Plus, ChevronDown,
  RefreshCw, Loader2, AlertCircle, Zap, Settings, ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Connection {
  id: string;
  fbUserId: string;
  fbAccountName: string;
  connectionStatus: string;
  tokenExpiresAt: string | null;
  pages: Page[];
}

interface Page {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
  forms: Form[];
}

interface Form {
  id: string;
  formId: string;
  formName: string;
  status: string;
}

export default function FacebookSettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const toast = useToast();

  // Demo: manually connect state
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [connectForm, setConnectForm] = useState({
    fbUserId: '',
    fbAccountName: '',
    accessToken: '',
    tokenExpiresAt: '',
  });
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/facebook/connections');
      if (!res.ok) throw new Error('Failed to load connections');
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await fetch('/api/facebook/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      toast.success('Facebook account connected!');
      setShowManualConnect(false);
      setConnectForm({ fbUserId: '', fbAccountName: '', accessToken: '', tokenExpiresAt: '' });
      fetchConnections();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConnecting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#005F73]" />
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005F73]/20 focus:border-[#005F73]/50 transition-all';
  const labelCls = 'block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Facebook Lead Ads Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Connect your Facebook account to automatically sync leads into this CRM.</p>
        </div>
        <button
          onClick={() => setShowManualConnect(!showManualConnect)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity shrink-0"
          style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}
        >
          <Link2 className="w-4 h-4" />
          Connect Facebook
        </button>
      </div>

      {/* How it works banner */}
      <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-extrabold text-teal-800">How Facebook Lead Ads Sync Works</p>
            <p className="text-[11px] text-teal-700 mt-1 leading-relaxed">
              Connect your Facebook account → Select your Facebook Page → Choose a Lead Form → 
              Map fields to CRM fields. New leads will be automatically synced in real-time via webhook.
            </p>
          </div>
        </div>
      </div>

      {/* Manual Connect Form */}
      {showManualConnect && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="text-sm font-extrabold text-slate-800 mb-4">Connect Facebook Account</h2>
          <p className="text-[11px] text-slate-500 mb-4">
            Enter your Facebook User ID and a long-lived access token obtained from the Meta Developer Console.
            Your token will be encrypted before storage.
          </p>
          <form onSubmit={handleConnect} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Facebook User ID *</label>
              <input type="text" className={inputCls} placeholder="123456789" value={connectForm.fbUserId}
                onChange={e => setConnectForm(p => ({ ...p, fbUserId: e.target.value }))} required />
            </div>
            <div>
              <label className={labelCls}>Account Name *</label>
              <input type="text" className={inputCls} placeholder="My Facebook Account" value={connectForm.fbAccountName}
                onChange={e => setConnectForm(p => ({ ...p, fbAccountName: e.target.value }))} required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Long-Lived Access Token *</label>
              <input type="password" className={inputCls} placeholder="EAAd..." value={connectForm.accessToken}
                onChange={e => setConnectForm(p => ({ ...p, accessToken: e.target.value }))} required />
              <p className="text-[10px] text-slate-400 mt-1">
                Generate a long-lived token via <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-[#005F73] underline">Meta Graph API Explorer</a>.
              </p>
            </div>
            <div>
              <label className={labelCls}>Token Expires At (optional)</label>
              <input type="datetime-local" className={inputCls} value={connectForm.tokenExpiresAt}
                onChange={e => setConnectForm(p => ({ ...p, tokenExpiresAt: e.target.value }))} />
            </div>
            <div className="flex items-end gap-3">
              <button type="submit" disabled={connecting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}>
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {connecting ? 'Connecting...' : 'Save Connection'}
              </button>
              <button type="button" onClick={() => setShowManualConnect(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connected Accounts */}
      {connections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center justify-center text-center">
          <Globe className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-sm font-bold text-slate-600">No Facebook Account Connected</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Click "Connect Facebook" above and enter your access token to start syncing leads automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map(conn => (
            <div key={conn.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {/* Connection Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{conn.fbAccountName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">User ID: {conn.fbUserId || '—'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border ${
                  conn.connectionStatus === 'Active'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}>
                  {conn.connectionStatus}
                </span>
              </div>

              {/* Pages & Forms */}
              <div className="p-5">
                {conn.pages.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-slate-400 font-semibold">No pages selected yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Use the API or contact your agency admin to add a Facebook Page.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conn.pages.map(page => (
                      <div key={page.id} className="border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Settings className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-800">{page.pageName}</span>
                            <code className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{page.pageId}</code>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            page.status === 'Active' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'
                          }`}>{page.status}</span>
                        </div>
                        {page.forms.length > 0 && (
                          <div className="mt-3 space-y-1.5 pl-5 border-l-2 border-slate-100">
                            {page.forms.map(form => (
                              <div key={form.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ArrowRight className="w-3 h-3 text-slate-300" />
                                  <span className="text-[11px] font-semibold text-slate-700">{form.formName}</span>
                                  <code className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{form.formId}</code>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                                  form.status === 'Active' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'
                                }`}>{form.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
