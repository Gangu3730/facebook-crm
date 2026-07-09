'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Loader2,
  Trash2,
  AlertTriangle,
  UserCheck,
  Shield,
  Clock,
  TrendingUp,
  X,
  Lock,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  metrics: {
    totalAssigned: number;
    converted: number;
    pendingTasks: number;
    missedTasks: number;
    conversionRate: number;
  };
}

export default function TeamPage() {
  const router = useRouter();
  const toast = useToast();

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');

  // Creation form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALES_EXECUTIVE',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const checkAccessAndFetch = async () => {
    try {
      setLoading(true);
      // Fetch session
      const resMe = await fetch('/api/auth/me');
      if (!resMe.ok) throw new Error('Unauthenticated');
      const me = await resMe.json();
      
      setUserRole(me.user.role);
      setUserId(me.user.id);

      // Block Sales Reps from team roster access
      if (me.user.role === 'SALES_EXECUTIVE') {
        toast.error('Access Forbidden. Relocating...');
        router.push('/dashboard');
        return;
      }

      // Fetch team metrics
      const resTeam = await fetch('/api/team');
      if (!resTeam.ok) throw new Error('Failed to fetch team list');
      const teamData = await resTeam.json();
      
      const mappedTeam = (teamData.users || []).map((u: any) => {
        const total = u.totalAssigned || 0;
        const conv = u.converted || 0;
        const conversionRate = total > 0 ? Math.round((conv / total) * 100) : 0;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          metrics: {
            totalAssigned: total,
            converted: conv,
            pendingTasks: u.pendingTasks || 0,
            missedTasks: u.missedTasks || 0,
            conversionRate,
          }
        };
      });
      setTeam(mappedTeam);
    } catch (e: any) {
      toast.error(e.message || 'Error occurred');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setFormError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    try {
      setFormLoading(true);
      setFormError('');
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to add team member');

      toast.success('Team member registered successfully');
      setFormData({ name: '', email: '', password: '', role: 'SALES_EXECUTIVE' });
      setIsAddModalOpen(false);
      
      // Refresh list
      checkAccessAndFetch();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (memberId === userId) {
      toast.error('You cannot delete your own account.');
      return;
    }

    if (!window.confirm('Delete this team member entirely? All their lead assignments will become unassigned.')) return;

    try {
      const res = await fetch(`/api/team/${memberId}`, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Failed to delete member');

      toast.success('Team member removed');
      checkAccessAndFetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ADMIN':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MANAGER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
        <p className="text-xs font-semibold text-slate-500">Retrieving team analytics...</p>
      </div>
    );
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Title banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display">Sales Roster & Performance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review agent conversion rates, pending workloads, and system actions.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:shadow-indigo-150 transition-all cursor-pointer"
          >
            <UserPlus className="w-4.5 h-4.5" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Roster Table card */}
      <div className="premium-card rounded-2xl bg-white overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="p-4">Agent Name</th>
              <th className="p-4">Role Badge</th>
              <th className="p-4">Assigned Leads</th>
              <th className="p-4">Pending Tasks</th>
              <th className="p-4">Missed Tasks</th>
              <th className="p-4">Conversion Rate</th>
              {isAdmin && <th className="p-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50 text-xs font-semibold text-slate-600">
            {team.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/10 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">{member.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{member.email}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${getRoleBadge(member.role)}`}>
                    {member.role.replace('_', ' ').toLowerCase()}
                  </span>
                </td>
                <td className="p-4 font-bold text-slate-700">{member.metrics.totalAssigned}</td>
                <td className="p-4 text-amber-600 font-bold">{member.metrics.pendingTasks}</td>
                <td className="p-4 text-rose-500 font-bold">{member.metrics.missedTasks}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${member.metrics.conversionRate}%` }}
                      />
                    </div>
                    <span className="font-bold text-emerald-600 text-[11px]">{member.metrics.conversionRate}%</span>
                  </div>
                </td>
                {isAdmin && (
                  <td className="p-4 text-right">
                    {member.id !== userId && (
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Add Team Member</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-6 space-y-4">
              {formError && (
                <div className="flex gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Clark Kent"
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
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Access Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  System Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="SALES_EXECUTIVE">Sales Representative</option>
                  <option value="MANAGER">Sales Manager</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  <span>Save Agent</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
