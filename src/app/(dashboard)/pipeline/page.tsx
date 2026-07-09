'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Kanban, ArrowRight } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface Lead {
  id: string;
  name: string;
  serviceInterest: string | null;
  status: string;
  priority: string;
  assignedUser: { name: string } | null;
}

const STAGES = [
  { id: 'New', title: 'New Leads', color: 'border-t-indigo-500 bg-indigo-50/10' },
  { id: 'Contacted', title: 'Contacted', color: 'border-t-blue-500 bg-blue-50/10' },
  { id: 'Qualified', title: 'Qualified', color: 'border-t-emerald-500 bg-emerald-50/10' },
  { id: 'Follow-up', title: 'Follow-up', color: 'border-t-amber-500 bg-amber-50/10' },
  { id: 'Interested', title: 'Interested', color: 'border-t-purple-500 bg-purple-50/10' },
  { id: 'Converted', title: 'Converted', color: 'border-t-teal-500 bg-teal-50/20' },
  { id: 'Lost', title: 'Lost/Declined', color: 'border-t-rose-400 bg-rose-50/10' },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const toast = useToast();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed to load pipeline leads');
      const data = await res.json();
      setLeads(data.leads);
    } catch (e: any) {
      toast.error(e.message || 'Error loading leads for pipeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
    // Add visual styling for dragging element
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingId(null);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (!id) return;

    // Find lead details
    const leadToMove = leads.find((l) => l.id === id);
    if (!leadToMove) return;

    // If status didn't change, skip
    if (leadToMove.status === targetStatus) return;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: targetStatus } : l))
    );

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update stage on database');
      }

      toast.success(`Moved ${leadToMove.name} to ${targetStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stage');
      // Rollback on fail
      fetchLeads();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
        <p className="text-xs font-semibold text-slate-500">Loading Pipeline Board...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display">Sales Pipeline Board</h1>
        <p className="text-sm text-slate-500 mt-1">
          Drag and drop prospect cards to move them through stage conversions.
        </p>
      </div>

      {/* Kanban Grid Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[65vh] select-none items-start">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.id);
          
          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`w-72 shrink-0 rounded-2xl border-t-4 border border-slate-105 flex flex-col p-4 space-y-4 ${stage.color} min-h-[500px]`}
            >
              {/* Header column */}
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-800">{stage.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200/70 text-slate-600">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards wrapper */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px] pr-1">
                {stageLeads.length === 0 ? (
                  <div className="h-20 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-semibold">
                    No leads in stage
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      className="premium-card p-4 rounded-xl bg-white space-y-3 cursor-grab active:cursor-grabbing border border-slate-100 hover:scale-[1.02] transform transition-all duration-150"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-xs font-bold text-slate-800 hover:text-indigo-600 line-clamp-1 truncate"
                        >
                          {lead.name}
                        </Link>
                        <PriorityBadge priority={lead.priority} />
                      </div>

                      {lead.serviceInterest && (
                        <p className="text-[10px] font-semibold text-slate-500 leading-snug line-clamp-2">
                          Interest: {lead.serviceInterest}
                        </p>
                      )}

                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-50 text-[10px] text-slate-400">
                        <span className="truncate max-w-[120px] font-semibold">
                          Rep: {lead.assignedUser?.name || 'Unassigned'}
                        </span>
                        <Link
                          href={`/leads/${lead.id}`}
                          className="flex items-center gap-0.5 text-indigo-600 font-extrabold"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
