'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Phone,
  Mail,
  MapPin,
  Tag,
  Globe as Facebook,
  User,
  ArrowLeft,
  Calendar,
  MessageSquare,
  History,
  CheckCircle,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface Note {
  id: string;
  note: string;
  createdAt: string;
  user: { name: string };
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user: { name: string } | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
}

interface LeadDetails {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  serviceInterest: string | null;
  message: string | null;
  source: string;
  status: string;
  priority: string;
  facebookLeadgenId: string | null;
  facebookFormId: string | null;
  campaignName: string | null;
  adName: string | null;
  assignedUserId: string | null;
  assignedUser: { id: string; name: string } | null;
  createdAt: string;
  notes: Note[];
  activities: Activity[];
  tasks: Task[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export default function LeadDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const toast = useToast();

  const [lead, setLead] = useState<LeadDetails | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'activities' | 'tasks'>('notes');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');

  // Note Input
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  // Edit details form inline
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    serviceInterest: '',
    status: '',
    priority: '',
    assignedUserId: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Task Form inside Tasks Tab
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });
  const [taskLoading, setTaskLoading] = useState(false);

  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Lead not found');
        throw new Error('Failed to load lead details');
      }
      const data = await res.json();
      setLead(data.lead);
      setEditForm({
        name: data.lead.name || '',
        email: data.lead.email || '',
        phone: data.lead.phone || '',
        city: data.lead.city || '',
        serviceInterest: data.lead.serviceInterest || '',
        status: data.lead.status || '',
        priority: data.lead.priority || '',
        assignedUserId: data.lead.assignedUserId || '',
      });
    } catch (e: any) {
      toast.error(e.message || 'Error loading lead details');
      router.push('/leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAndSession = async () => {
    try {
      const resTeam = await fetch('/api/team');
      if (resTeam.ok) {
        const teamData = await resTeam.json();
        setTeam(teamData.users || []);
      }
      const resMe = await fetch('/api/auth/me');
      if (resMe.ok) {
        const me = await resMe.json();
        setUserRole(me.user.role);
        setUserId(me.user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
    fetchTeamAndSession();
  }, [id]);

  // WhatsApp formattings
  const getWhatsAppLink = (phone: string | null) => {
    if (!phone) return '#';
    // Strip non-numbers
    const cleanNum = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanNum}`;
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setNoteLoading(true);
      const res = await fetch(`/api/leads/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });

      if (!res.ok) throw new Error('Failed to add note');
      
      toast.success('Note added successfully');
      setNewNote('');
      fetchLeadDetails(); // Reload
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setNoteLoading(false);
    }
  };

  // Edit Lead
  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          assignedUserId: editForm.assignedUserId || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update lead');

      toast.success('Lead details updated');
      setIsEditing(false);
      fetchLeadDetails();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.dueDate) return;

    try {
      setTaskLoading(true);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: id,
          title: taskForm.title,
          description: taskForm.description,
          dueDate: taskForm.dueDate,
          assignedUserId: lead?.assignedUserId,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to schedule task');

      toast.success('Follow-up task scheduled successfully');
      setTaskForm({ title: '', description: '', dueDate: '' });
      setIsAddingTask(false);
      fetchLeadDetails();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTaskLoading(false);
    }
  };

  // Resolve Task
  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' }),
      });

      if (!res.ok) throw new Error('Failed to resolve task');
      toast.success('Task marked as Completed');
      fetchLeadDetails();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteLead = async () => {
    if (!window.confirm('Delete this lead entirely from database? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Lead deleted successfully');
        router.push('/leads');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Authorization limit check
  const isSelfAssigned = lead?.assignedUserId === userId;
  const isAuthorizedToEdit = userRole !== 'SALES_EXECUTIVE' || isSelfAssigned;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
        <p className="text-xs font-semibold text-slate-500">Retrieving profile file...</p>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6">
      {/* Top Navigator */}
      <div className="flex items-center justify-between">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </Link>

        {userRole !== 'SALES_EXECUTIVE' && (
          <button
            onClick={handleDeleteLead}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 hover:bg-rose-50 rounded-xl text-xs font-bold text-rose-600 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Lead</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side Pane: Contact details & Meta Metadata */}
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="premium-card p-6 rounded-2xl bg-white space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">{lead.name}</h2>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                  Added on {new Date(lead.createdAt).toLocaleDateString()} via {lead.source}
                </span>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <StatusBadge status={lead.status} />
                <PriorityBadge priority={lead.priority} />
              </div>
            </div>

            {/* Quick action triggers */}
            <div className="grid grid-cols-3 gap-2">
              <a
                href={lead.phone ? `tel:${lead.phone}` : '#'}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  lead.phone
                    ? 'border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 text-indigo-700'
                    : 'border-slate-100 text-slate-350 pointer-events-none'
                }`}
              >
                <Phone className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-bold">Call Agent</span>
              </a>
              <a
                href={lead.email ? `mailto:${lead.email}` : '#'}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  lead.email
                    ? 'border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 text-indigo-700'
                    : 'border-slate-100 text-slate-350 pointer-events-none'
                }`}
              >
                <Mail className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-bold">Send Mail</span>
              </a>
              <a
                href={lead.phone ? getWhatsAppLink(lead.phone) : '#'}
                target="_blank"
                rel="noreferrer"
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  lead.phone
                    ? 'border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/20 text-emerald-700'
                    : 'border-slate-100 text-slate-350 pointer-events-none'
                }`}
              >
                {/* SVG for WhatsApp icon or basic chat bubble */}
                <MessageSquare className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-bold">WhatsApp</span>
              </a>
            </div>

            {/* Details Specs */}
            <div className="space-y-3 pt-3 border-t border-slate-50 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Email</span>
                <span className="font-semibold text-slate-700">{lead.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Phone</span>
                <span className="font-semibold text-slate-700">{lead.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">City</span>
                <span className="font-semibold text-slate-700 inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.city || '—'}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Interest</span>
                <span className="font-semibold text-indigo-600 inline-flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{lead.serviceInterest || '—'}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Owner</span>
                <span className="font-bold text-slate-700 inline-flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.assignedUser?.name || <span className="text-slate-400 italic font-medium">Unassigned</span>}</span>
                </span>
              </div>
            </div>

            {/* Edit details form trigger */}
            {isAuthorizedToEdit && (
              <div className="pt-2">
                {isEditing ? (
                  <form onSubmit={handleUpdateLead} className="space-y-3 border-t border-slate-50 pt-4 text-xs">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                      >
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
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                      >
                        <option value="Hot">Hot</option>
                        <option value="Warm">Warm</option>
                        <option value="Cold">Cold</option>
                      </select>
                    </div>

                    {userRole !== 'SALES_EXECUTIVE' && (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Rep</label>
                        <select
                          value={editForm.assignedUserId}
                          onChange={(e) => setEditForm({ ...editForm, assignedUserId: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                        >
                          <option value="">Unassigned</option>
                          {team.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editLoading}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {editLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2 rounded-xl border border-slate-200 text-center text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Modify Lead Status / Owner
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Facebook Sync Metadata details */}
          {lead.facebookLeadgenId && (
            <div className="premium-card p-6 rounded-2xl bg-white space-y-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Facebook className="w-4 h-4 text-indigo-600" />
                <span>Facebook Leadgen Data</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Lead ID</span>
                  <span className="font-mono text-[10px] text-slate-600 select-all">{lead.facebookLeadgenId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Form ID</span>
                  <span className="font-mono text-[10px] text-slate-600">{lead.facebookFormId || '—'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 font-semibold mb-0.5">Campaign Name</span>
                  <span className="font-bold text-slate-700 truncate max-w-full">{lead.campaignName || '—'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 font-semibold mb-0.5">Ad Name</span>
                  <span className="font-bold text-slate-700 truncate max-w-full">{lead.adName || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Pane: Timeline notes, logs, scheduled follow-up tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Initial Message / Query */}
          {lead.message && (
            <div className="premium-card p-5 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
              <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">Prospect Original Message / Payload</h4>
              <p className="text-xs text-slate-700 leading-relaxed font-semibold italic">
                &ldquo;{lead.message}&rdquo;
              </p>
            </div>
          )}

          {/* Navigation tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
                activeTab === 'notes'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Notes & Timeline ({lead.notes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
                activeTab === 'activities'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Activity History ({lead.activities.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
                activeTab === 'tasks'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Schedules & Tasks ({lead.tasks.length})</span>
            </button>
          </div>

          {/* Tabs Content */}
          <div className="space-y-4">
            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-5">
                {/* Note Editor */}
                {isAuthorizedToEdit && (
                  <form onSubmit={handleAddNote} className="premium-card p-4 rounded-2xl bg-white space-y-3">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a new update note regarding client call, feedback..."
                      rows={3}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 resize-none text-slate-700 bg-slate-50/30"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={noteLoading || !newNote.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {noteLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Add Note</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Notes Timeline feed list */}
                <div className="space-y-4">
                  {lead.notes.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-xs font-semibold text-slate-400">No notes written for this lead yet.</p>
                    </div>
                  ) : (
                    lead.notes.map((note) => (
                      <div key={note.id} className="premium-card p-4.5 rounded-2xl bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            {note.user?.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {new Date(note.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-line">
                          {note.note}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Activity Logs Tab */}
            {activeTab === 'activities' && (
              <div className="premium-card p-6 rounded-2xl bg-white">
                <div className="relative pl-6 border-l border-slate-100 space-y-6">
                  {lead.activities.map((act) => (
                    <div key={act.id} className="relative">
                      {/* Timeline dot marker */}
                      <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full border border-white bg-indigo-500 shadow-sm" />
                      <div className="text-xs font-semibold text-slate-800">
                        {act.description}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                        {act.user ? `Logged by: ${act.user.name} • ` : ''}
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {/* Add task button */}
                {isAuthorizedToEdit && !isAddingTask && (
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-dashed border-indigo-300 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50/50 transition-colors w-full justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule Follow-up Task</span>
                  </button>
                )}

                {/* Add Task Form Inline */}
                {isAddingTask && (
                  <form onSubmit={handleAddTask} className="premium-card p-4 rounded-2xl bg-white space-y-3">
                    <h4 className="text-xs font-bold text-slate-800">New Follow-up Schedule</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task Title</label>
                        <input
                          type="text"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          placeholder="e.g. Call back customer to discuss quote"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date & Time</label>
                        <input
                          type="datetime-local"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Short Description</label>
                        <textarea
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                          placeholder="Add detail notes for what to prepare..."
                          rows={2}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden resize-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingTask(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={taskLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                      >
                        {taskLoading ? 'Scheduling...' : 'Schedule'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Tasks List */}
                <div className="space-y-3">
                  {lead.tasks.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                      <p className="text-xs font-semibold text-slate-400">No follow-ups scheduled for this client.</p>
                    </div>
                  ) : (
                    lead.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`premium-card p-4 rounded-2xl bg-white flex justify-between items-center gap-4 ${
                          task.status === 'Completed' ? 'opacity-65 bg-slate-50/50' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {task.title}
                            </span>
                            {task.status === 'Missed' && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 border border-rose-100 text-rose-600 uppercase">
                                Overdue
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-1">{task.description}</p>
                          )}
                          <span className="text-[10px] text-slate-400 font-semibold block mt-1.5">
                            Due: {new Date(task.dueDate).toLocaleString()}
                          </span>
                        </div>

                        {task.status !== 'Completed' && isAuthorizedToEdit && (
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-50 text-xs font-bold text-indigo-600 transition-colors shrink-0 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Done</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
