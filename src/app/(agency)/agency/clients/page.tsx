'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2, Plus, Search, ArrowRight, CheckCircle,
  XCircle, Globe, Users, Loader2, MoreHorizontal,
  Edit, Trash2, ExternalLink
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  packageName: string;
  createdAt: string;
  users: { id: string; name: string; email: string; status: string }[];
  _count: { leads: number; users: number; fbConnections: number };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to load clients');
      const data = await res.json();
      setClients(data.clients);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this client?')) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to deactivate');
      toast.success('Client deactivated');
      fetchClients();
    } catch (e: any) {
      toast.error(e.message);
    }
    setActiveMenu(null);
  };

  const filtered = clients.filter(c =>
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#005F73]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all agency clients. Each client has their own isolated CRM panel.
          </p>
        </div>
        <Link
          href="/agency/clients/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity shrink-0"
          style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}
        >
          <Plus className="w-4 h-4" />
          Add New Client
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 max-w-sm px-3 py-2 rounded-xl bg-white border border-slate-200 focus-within:border-[#005F73]/40 focus-within:ring-2 focus-within:ring-[#005F73]/10 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-xs font-semibold bg-transparent text-slate-700 placeholder-slate-400 border-none outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Company</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Leads</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Team</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-400">No clients found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Try a different search term.' : 'Add your first client to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl text-white font-extrabold text-sm flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}>
                          {client.companyName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{client.companyName}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-xs font-semibold text-slate-700">{client.contactPerson}</p>
                      <p className="text-[10px] text-slate-400">{client.industry}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-xs font-bold text-slate-700">{client._count.leads}</span>
                      <span className="text-[10px] text-slate-400 ml-1">leads</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-xs font-bold text-slate-700">{client._count.users}</span>
                      <span className="text-[10px] text-slate-400 ml-1">users</span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        client.status === 'Active'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/agency/clients/${client.id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#005F73] bg-teal-50 border border-teal-100 hover:bg-teal-100 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                          View
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === client.id ? null : client.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {activeMenu === client.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-100 rounded-xl shadow-lg z-10 py-1">
                              <Link href={`/agency/clients/${client.id}/edit`}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                                <Edit className="w-3.5 h-3.5" /> Edit Client
                              </Link>
                              <button
                                onClick={() => handleDeactivate(client.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Deactivate
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
