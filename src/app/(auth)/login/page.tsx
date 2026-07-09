'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      toast.success('Welcome back!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <div className="w-full max-w-md">
        {/* Brand Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-linear-to-tr from-indigo-600 to-indigo-500 text-white font-black text-xl shadow-xl shadow-indigo-200/50 mb-3">
            A
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome to ApexCRM</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Manage leads, automate workflows, close deals.</p>
        </div>

        {/* Card */}
        <div className="premium-card rounded-3xl p-8 bg-white">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Sign In</h3>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-sm placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-sm placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-150 hover:bg-indigo-700 hover:shadow-indigo-200 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 disabled:opacity-50 transition-all duration-200 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Seed accounts notice */}
          <div className="mt-6 pt-5 border-t border-slate-50 text-center">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2">
              Demo Credentials
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                <span className="font-bold text-slate-700 block">Super Admin</span>
                admin@apexcrm.io / admin123
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                <span className="font-bold text-slate-700 block">Acme Admin</span>
                admin@acmecorp.com / acme123
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 font-semibold mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-indigo-600 hover:text-indigo-800 font-bold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
