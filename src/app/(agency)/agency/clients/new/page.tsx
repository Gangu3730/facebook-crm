'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, Mail, Phone, Globe, MapPin, Package, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function NewClientPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    address: '',
    status: 'Active',
    packageName: 'Standard',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client');
      toast.success(`Client "${form.companyName}" created successfully!`);
      router.push('/agency/clients');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005F73]/20 focus:border-[#005F73]/50 transition-all';
  const labelCls = 'block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Add New Client</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create a new client account with a dedicated admin login.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Details */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-[#005F73]" />
            <h2 className="text-sm font-extrabold text-slate-800">Company Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Company Name *</label>
              <input type="text" className={inputCls} placeholder="Acme Corporation" value={form.companyName} onChange={e => set('companyName', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Contact Person *</label>
              <input type="text" className={inputCls} placeholder="John Smith" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Company Email *</label>
              <input type="email" className={inputCls} placeholder="contact@company.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" className={inputCls} placeholder="+1-555-0100" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input type="url" className={inputCls} placeholder="https://company.com" value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Industry</label>
              <select className={inputCls} value={form.industry} onChange={e => set('industry', e.target.value)}>
                <option value="">Select industry</option>
                <option>Technology</option>
                <option>Real Estate</option>
                <option>Healthcare</option>
                <option>Finance</option>
                <option>Education</option>
                <option>Retail</option>
                <option>Manufacturing</option>
                <option>Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address</label>
              <textarea className={`${inputCls} resize-none`} rows={2} placeholder="123 Business Ave, New York, NY 10001" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Package</label>
              <select className={inputCls} value={form.packageName} onChange={e => set('packageName', e.target.value)}>
                <option value="Standard">Standard</option>
                <option value="Professional">Professional</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Client Admin Account */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-[#005F73]" />
            <h2 className="text-sm font-extrabold text-slate-800">Client Admin Account</h2>
          </div>
          <p className="text-[11px] text-slate-500">This account will be the primary admin for this client's CRM panel.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Admin Full Name *</label>
              <input type="text" className={inputCls} placeholder="Jane Doe" value={form.adminName} onChange={e => set('adminName', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Admin Email *</label>
              <input type="email" className={inputCls} placeholder="admin@company.com" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Admin Password *</label>
              <input type="password" className={inputCls} placeholder="Minimum 8 characters" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} required minLength={8} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #005F73 0%, #0A6F85 100%)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
            {loading ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  );
}
