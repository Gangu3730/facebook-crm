'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);

    // Simulate link dispatch
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success('Simulation: Password reset link generated.');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-100 to-slate-200/50 p-4">
      <div className="w-full max-w-md">
        {/* Brand Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-2xl shadow-xl shadow-indigo-100 mb-3">
            Ω
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Reset Password</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">We will send a password recovery link to your inbox.</p>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100/50">
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold mx-auto mb-4">
                ✓
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Check Your Email</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                We have sent password recovery instructions to <span className="font-bold text-slate-700">{email}</span>.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Resend link
              </button>
            </div>
          ) : (
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

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-150 hover:bg-indigo-700 hover:shadow-indigo-200 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 disabled:opacity-50 transition-all duration-200 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <span>Send Reset Instructions</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 font-semibold mt-6">
          <Link href="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
