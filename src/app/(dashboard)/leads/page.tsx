'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  Download,
  CheckSquare,
  Users,
  ChevronDown,
  Trash2,
  Eye,
  Loader2,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  serviceInterest: string | null;
  source: string;
  status: string;
  priority: string;
  assignedUserId: string | null;
  assignedUser: { name: string } | null;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  // Create Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    serviceInterest: '',
    message: '',
    source: 'Manual Input',
    status: 'New',
    priority: 'Warm',
    assignedUserId: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch leads on mount / filter change
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      if (assigneeFilter) params.append('assignedUserId', assigneeFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load leads');
      const data = await res.json();
      setLeads(data.leads);
    } catch (e: any) {
      toast.error(e.message || 'Error loading leads list');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAndSession = async () => {
    try {
      // Fetch team
      const resTeam = await fetch('/api/team');
      if (resTeam.ok) {
        const teamData = await resTeam.json();
        setTeam(teamData.users || []);
      }
      // Fetch current session details
      const resMe = await fetch('/api/auth/me');
      if (resMe.ok) {
        const me = await resMe.json();
        setCurrentUserRole(me.user.role);
        setCurrentUserId(me.user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTeamAndSession();
  }, []);

  useEffect(() => {
    fetchLeads();
    setSelectedLeadIds([]); // Reset selection
  }, [search, statusFilter, priorityFilter, sourceFilter, assigneeFilter]);

  // Open modal if page query contains openModal
  useEffect(() => {
    if (searchParams.get('openModal') === 'true') {
      setIsCreateModalOpen(true);
      // Remove query parameter
      router.replace('/leads');
    }
  }, [searchParams]);

  // Export CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);
    if (sourceFilter) params.append('source', sourceFilter);
    if (assigneeFilter) params.append('assignedUserId', assigneeFilter);

    // Trigger download
    window.open(`/api/leads/export?${params.toString()}`, '_blank');
    toast.success('Generating and downloading CSV export...');
  };

  // Selection togglers
  const toggleSelectAll = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk updates
  const handleBulkAssign = async () => {
    if (selectedLeadIds.length === 0 || !bulkAssignee) return;
    try {
      const res = await fetch('/api/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          assignedUserId: bulkAssignee === 'unassigned' ? null : bulkAssignee,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed bulk reassign');

      toast.success(result.message || 'Leads reassigned successfully');
      setBulkAssignee('');
      setSelectedLeadIds([]);
      fetchLeads();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedLeadIds.length === 0 || !bulkStatus) return;
    try {
      const res = await fetch('/api/leads/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          status: bulkStatus,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed status update');

      toast.success(result.message || 'Leads status updated');
      setBulkStatus('');
      setSelectedLeadIds([]);
      fetchLeads();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Manual Lead Creation
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedUserId: formData.assignedUserId || null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create lead');
      }

      toast.success('Lead created successfully');
      setIsCreateModalOpen(false);
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        city: '',
        serviceInterest: '',
        message: '',
        source: 'Manual Input',
        status: 'New',
        priority: 'Warm',
        assignedUserId: '',
      });
      fetchLeads();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lead? This action is permanent.')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Lead deleted successfully');
        fetchLeads();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display">CRM Leads Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage pipeline prospects, sync sources, and reassign owners.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer bg-white"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:shadow-indigo-150 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="premium-card p-4.5 rounded-2xl bg-white space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Interested">Interested</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
              <option value="Duplicate">Duplicate</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="Hot">Hot</option>
              <option value="Warm">Warm</option>
              <option value="Cold">Cold</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Source Filter */}
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="Facebook Lead Ads">Facebook Lead Ads</option>
              <option value="Website Form">Website Form</option>
              <option value="Manual Input">Manual Input</option>
              <option value="Inbound Call">Inbound Call</option>
              <option value="Referral">Referral</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Assignee Filter */}
          <div className="relative">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Bulk Action Panel (Active when leads are selected) */}
        {selectedLeadIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-indigo-100 animate-slide-up">
            <span className="text-xs font-bold text-slate-600">
              {selectedLeadIds.length} lead(s) selected
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {/* Bulk status selection */}
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-white focus:outline-hidden"
                >
                  <option value="">Update Status</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Interested">Interested</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {/* Bulk reassign selection (Admins/Managers only) */}
              {currentUserRole !== 'SALES_EXECUTIVE' && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={bulkAssignee}
                    onChange={(e) => setBulkAssignee(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-white focus:outline-hidden"
                  >
                    <option value="">Reassign Owner</option>
                    <option value="unassigned">Unassign</option>
                    {team.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAssign}
                    disabled={!bulkAssignee}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Assign
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Leads Table */}
      <div className="premium-card rounded-2xl bg-white overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs font-semibold text-slate-500">Retrieving directory records...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Users className="w-12 h-12 text-slate-350 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Leads Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">No leads match your filter parameters, or you have not generated any records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.length === leads.length}
                      onChange={toggleSelectAll}
                      className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Product/Service</th>
                  <th className="p-4">Sync Source</th>
                  <th className="p-4">Assignee</th>
                  <th className="p-4">Status & Priority</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 text-xs font-medium text-slate-600">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                        className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="min-w-0">
                        <Link href={`/leads/${lead.id}`} className="font-bold text-slate-800 hover:text-indigo-600 transition-colors block">
                          {lead.name}
                        </Link>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {lead.email || 'No Email'} • {lead.phone || 'No Phone'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-700 truncate block max-w-[150px]">
                        {lead.serviceInterest || 'Not specified'}
                      </span>
                      {lead.city && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          City: {lead.city}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        {lead.source}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] font-bold text-slate-700">
                        {lead.assignedUser?.name || <span className="text-slate-400 italic">Unassigned</span>}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <StatusBadge status={lead.status} />
                        <PriorityBadge priority={lead.priority} />
                      </div>
                    </td>
                    <td className="p-4 text-[10px] text-slate-400 font-semibold">
                      {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {currentUserRole !== 'SALES_EXECUTIVE' && (
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Creation Modal Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Add New Prospect Lead</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="flex gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Lead Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter name"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 555 0000"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    City Location
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. New York"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Product Interest
                  </label>
                  <input
                    type="text"
                    value={formData.serviceInterest}
                    onChange={(e) => setFormData({ ...formData, serviceInterest: e.target.value })}
                    placeholder="e.g. SaaS Suite"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Source
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="Manual Input">Manual Input</option>
                    <option value="Website Form">Website Form</option>
                    <option value="Inbound Call">Inbound Call</option>
                    <option value="Referral">Referral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Lead Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assigned Agent (Optional)
                  </label>
                  <select
                    value={formData.assignedUserId}
                    onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Auto-Assign (Round Robin) or Unassigned</option>
                    {team.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.role.replace('_', ' ').toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Background Notes / Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter additional lead notes..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-55 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Prospect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
