import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  let styles = 'bg-slate-50 text-slate-700 border-slate-200';

  switch (status) {
    case 'New':
      styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'Contacted':
      styles = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'Qualified':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'Follow-up':
      styles = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'Interested':
      styles = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'Not Interested':
      styles = 'bg-slate-100 text-slate-600 border-slate-300';
      break;
    case 'Converted':
      styles = 'bg-teal-50 text-teal-700 border-teal-200';
      break;
    case 'Lost':
      styles = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'Duplicate':
      styles = 'bg-orange-50 text-orange-700 border-orange-200';
      break;
  }

  return <Badge className={styles}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  let styles = 'bg-slate-50 text-slate-700 border-slate-200';

  switch (priority) {
    case 'Hot':
      styles = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'Warm':
      styles = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'Cold':
      styles = 'bg-sky-50 text-sky-700 border-sky-200';
      break;
  }

  return <Badge className={styles}>{priority}</Badge>;
}
