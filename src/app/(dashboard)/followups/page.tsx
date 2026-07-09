'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  CheckSquare,
  User,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  leadId: string;
  lead: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  assignedUser: {
    name: string;
  };
}

export default function FollowupsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'today' | 'overdue' | 'upcoming' | 'completed'>('today');
  const toast = useToast();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let statusParam = 'Pending';
      let dueFilterParam = 'today';

      if (tab === 'overdue') {
        dueFilterParam = 'overdue';
      } else if (tab === 'upcoming') {
        dueFilterParam = 'upcoming';
      } else if (tab === 'completed') {
        statusParam = 'Completed';
        dueFilterParam = 'all';
      }

      const res = await fetch(`/api/tasks?status=${statusParam}&dueFilter=${dueFilterParam}`);
      if (!res.ok) throw new Error('Failed to retrieve follow-up items');
      const data = await res.json();
      setTasks(data.tasks);
    } catch (e: any) {
      toast.error(e.message || 'Error loading follow-ups checklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [tab]);

  const handleResolveTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' }),
      });

      if (!res.ok) throw new Error('Failed to complete task');
      toast.success('Task marked as Completed');
      fetchTasks(); // Reload
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display">Sales Follow-ups Checklist</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and resolve outstanding follow-ups, scheduled calls, and reminders.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab('today')}
          className={`flex items-center gap-1.5 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
            tab === 'today'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Due Today</span>
        </button>
        <button
          onClick={() => setTab('overdue')}
          className={`flex items-center gap-1.5 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
            tab === 'overdue'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-450 hover:text-slate-600'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Overdue Tasks</span>
        </button>
        <button
          onClick={() => setTab('upcoming')}
          className={`flex items-center gap-1.5 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
            tab === 'upcoming'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming Schedules</span>
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`flex items-center gap-1.5 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
            tab === 'completed'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Completed</span>
        </button>
      </div>

      {/* Checklist List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs font-semibold text-slate-500">Syncing follow-up checklist...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 text-center px-4">
            <CheckSquare className="w-12 h-12 text-slate-350 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Clear Schedule!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">You do not have any follow-up tasks in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="premium-card p-5 rounded-2xl bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-105"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{task.title}</span>
                    {task.status === 'Missed' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 border border-rose-100 text-rose-600 uppercase">
                        Overdue
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Meta Details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-400 font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Due: {new Date(task.dueDate).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Client: </span>
                      <Link href={`/leads/${task.leadId}`} className="text-indigo-600 hover:underline flex items-center gap-0.5 font-bold">
                        <span>{task.lead?.name}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Owner: {task.assignedUser?.name}</span>
                    </span>
                  </div>
                </div>

                {/* Check action hook */}
                {task.status !== 'Completed' && (
                  <button
                    onClick={() => handleResolveTask(task.id)}
                    className="flex items-center gap-1 px-4.5 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-750 transition-colors shrink-0 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark Done</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
