'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, Menu, Check, User } from 'lucide-react';
import { UserSession } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';

interface HeaderProps {
  user: UserSession | null;
  onToggleSidebar: () => void;
}

interface DbNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function Header({ user, onToggleSidebar }: HeaderProps) {
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds for a real-time feel
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PUT' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');
      }
    } catch (e) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PUT' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (e) {
      console.error('Failed to read notification:', e);
    }
  };

  const getNotifColor = (type: string) => {
    switch (type) {
      case 'NEW_LEAD':
        return 'bg-emerald-100 text-emerald-700';
      case 'LEAD_ASSIGNED':
        return 'bg-indigo-100 text-indigo-700';
      case 'TASK_REMINDER':
        return 'bg-amber-100 text-amber-700';
      case 'MISSED_TASK':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 bg-white/80 border-b border-slate-100 backdrop-blur-md">
      {/* Search & Sidebar Trigger */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 max-w-xs w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 focus-within:border-indigo-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-50 transition-all duration-200">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search CRM..."
            className="w-full text-xs font-semibold bg-transparent text-slate-700 placeholder-slate-400 border-none outline-hidden"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2.5 rounded-xl border border-slate-200/60 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[9px] font-extrabold bg-rose-500 text-white border border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 overflow-hidden transform origin-top-right transition-all duration-200 animate-slide-up">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                <span className="text-xs font-extrabold text-slate-800">Recent Alerts</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs font-bold text-slate-400">All caught up!</p>
                    <span className="text-[10px] text-slate-400 mt-0.5">No notifications found</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markSingleRead(n.id)}
                      className={`flex gap-3 p-3.5 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-indigo-50/10' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${getNotifColor(n.type)}`}>
                        {n.title.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <span className="text-[9px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge Profile info */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
            <div className="w-8.5 h-8.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm shadow-inner shadow-indigo-100">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">{user.name}</p>
              <span className="text-[9px] font-semibold text-slate-400 capitalize">{user.role.replace('_', ' ').toLowerCase()}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
