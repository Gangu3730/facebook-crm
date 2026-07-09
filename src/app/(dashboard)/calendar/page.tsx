'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Loader2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  leadId: string;
  lead: {
    name: string;
  };
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Date states
  const [currentDate, setCurrentDate] = useState(new Date());
  const toast = useToast();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Fetch all tasks and filter in memory for calendar
      const res = await fetch('/api/tasks?status=Pending&dueFilter=all');
      if (!res.ok) throw new Error('Failed to retrieve follow-up items');
      const data = await res.json();
      setTasks(data.tasks);
    } catch (e: any) {
      toast.error(e.message || 'Error loading follow-ups for calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchTasks();
  }, []);

  // Calendar calculations
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getMonthName = (m: number) => {
    return new Date(2026, m, 1).toLocaleString('default', { month: 'long' });
  };

  // Build grid calendar items
  const calendarCells = [];
  
  // Fill blank cells for previous month padding
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, date: null });
  }

  // Fill current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      day: d,
      date: new Date(year, month, d),
    });
  }

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Find tasks scheduled on a specific day
  const getTasksForDay = (day: number | null) => {
    if (!day) return [];
    return tasks.filter((task) => {
      const d = new Date(task.dueDate);
      return (
        d.getDate() === day &&
        d.getMonth() === month &&
        d.getFullYear() === year
      );
    });
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display">Schedules Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visual month planner for call schedules and workflow assignments.
          </p>
        </div>

        {/* Date controllers */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-xs">
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-extrabold text-slate-800 tracking-tight min-w-[120px] text-center">
            {getMonthName(month)} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!mounted || loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-100 shadow-xs">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-500">Syncing calendar schedules...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center py-3">
            {weekdays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Month Day grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-l border-t border-slate-100">
            {calendarCells.map((cell, idx) => {
              const dayTasks = getTasksForDay(cell.day);
              const cellIsToday = isToday(cell.date);
              
              return (
                <div
                  key={idx}
                  className={`min-h-[105px] p-2.5 flex flex-col justify-between transition-all ${
                    cell.day === null
                      ? 'bg-slate-50/40 pointer-events-none'
                      : 'hover:bg-slate-50/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    {cell.day !== null ? (
                      <span
                        className={`text-xs font-extrabold flex items-center justify-center w-6 h-6 rounded-lg ${
                          cellIsToday
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700'
                        }`}
                      >
                        {cell.day}
                      </span>
                    ) : (
                      <span />
                    )}
                    {dayTasks.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700">
                        {dayTasks.length} task(s)
                      </span>
                    )}
                  </div>

                  {/* Cell scheduled items */}
                  <div className="flex-1 mt-2.5 space-y-1 overflow-y-auto max-h-[70px]">
                    {dayTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/leads/${task.leadId}`}
                        className="group flex flex-col p-1 rounded-md bg-slate-50 hover:bg-indigo-50/30 border border-slate-100 hover:border-indigo-100 transition-all text-left text-[9px]"
                      >
                        <span className="font-bold text-slate-700 group-hover:text-indigo-700 truncate">
                          {task.title}
                        </span>
                        <span className="text-slate-400 font-semibold truncate">
                          Lead: {task.lead?.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
