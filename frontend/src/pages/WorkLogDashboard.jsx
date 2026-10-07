import React, { useEffect, useMemo, useState } from 'react';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { CircleAlert, Clock3, DollarSign, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

const emptyEntry = { title: '', clientName: '', location: '', startedAt: new Date().toISOString().slice(0, 10), endedAt: '', hours: '', days: '', payAmount: '', paymentStatus: 'pending', status: 'ongoing', notes: '' };
const WorkLogDashboard = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ totalEarnings: 0, totalHours: 0, unpaidBalance: 0, unpaidCount: 0 });
  const [form, setForm] = useState(emptyEntry);
  const [editingId, setEditingId] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '', status: 'all', paymentStatus: 'all' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiAdapter.getWorkLogs({ ...filters, status: filters.status === 'all' ? undefined : filters.status, paymentStatus: filters.paymentStatus === 'all' ? undefined : filters.paymentStatus });
      setRecords(result.data || []);
      setSummary(result.summary || { totalEarnings: 0, totalHours: 0, unpaidBalance: 0, unpaidCount: 0 });
    } catch (loadError) { setError(loadError.message || 'Unable to load work records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.from, filters.to, filters.status, filters.paymentStatus]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, hours: Number(form.hours || 0), days: Number(form.days || 0), payAmount: Number(form.payAmount || 0), endedAt: form.endedAt || undefined };
      if (editingId) await apiAdapter.updateWorkLog(editingId, payload);
      else await apiAdapter.createWorkLog(payload);
      toast(editingId ? 'Work record updated.' : 'Work record added.', 'success');
      setEditingId('');
      setForm({ ...emptyEntry, startedAt: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (saveError) { toast(saveError.message || 'Unable to save work record.', 'error'); }
    finally { setSaving(false); }
  };

  const edit = (record) => {
    setEditingId(record._id);
    setForm({ ...record, startedAt: new Date(record.startedAt).toISOString().slice(0, 10), endedAt: record.endedAt ? new Date(record.endedAt).toISOString().slice(0, 10) : '', hours: record.hours, days: record.days, payAmount: record.payAmount });
  };

  const remove = async (record) => {
    if (!window.confirm(`Delete work record “${record.title}”?`)) return;
    try { await apiAdapter.deleteWorkLog(record._id); toast('Work record deleted.', 'success'); await load(); }
    catch (deleteError) { toast(deleteError.message || 'Unable to delete work record.', 'error'); }
  };

  const amount = useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }), []);

  return <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-5"><p className="text-xs font-semibold uppercase text-indigo-700">Private to your account</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Local work tracker</h1><p className="mt-1 text-sm text-slate-500">Track neighborhood jobs, shifts, and independent gigs.</p></header>
    <section aria-label="Work totals" className="grid gap-4 sm:grid-cols-3"><div className="flex items-center justify-between border-b border-slate-200 py-3"><div><p className="text-xs font-semibold uppercase text-slate-500">Paid earnings</p><p className="mt-1 text-2xl font-bold">{amount.format(summary.totalEarnings)}</p></div><DollarSign className="h-5 w-5 text-emerald-700" /></div><div className="flex items-center justify-between border-b border-slate-200 py-3"><div><p className="text-xs font-semibold uppercase text-slate-500">Total hours</p><p className="mt-1 text-2xl font-bold">{summary.totalHours}</p></div><Clock3 className="h-5 w-5 text-indigo-700" /></div><div className="flex items-center justify-between border-b border-slate-200 py-3"><div><p className="text-xs font-semibold uppercase text-slate-500">Unpaid balance</p><p className="mt-1 text-2xl font-bold">{amount.format(summary.unpaidBalance)}</p></div><DollarSign className="h-5 w-5 text-amber-700" /></div></section>

    <section className="border-y border-slate-200 py-5"><h2 className="text-base font-bold text-slate-900">{editingId ? 'Edit work record' : 'Add work record'}</h2><form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-slate-700">Work title/type *<input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Employer/client<input maxLength={160} value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Location<input maxLength={200} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Start date *<input type="date" required value={form.startedAt} onChange={(event) => setForm({ ...form, startedAt: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">End date<input type="date" min={form.startedAt} value={form.endedAt} onChange={(event) => setForm({ ...form, endedAt: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Hours<input type="number" min="0" step="0.25" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Days<input type="number" min="0" step="0.25" value={form.days} onChange={(event) => setForm({ ...form, days: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Pay amount<input type="number" min="0" step="0.01" value={form.payAmount} onChange={(event) => setForm({ ...form, payAmount: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Payment status<select value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="pending">Pending</option></select></label><label className="text-xs font-semibold text-slate-700">Work status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label className="text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-4">Notes<textarea rows={2} maxLength={3000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><div className="flex gap-2 sm:col-span-2 lg:col-span-4"><button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{editingId ? 'Save changes' : 'Add work'}</button>{editingId && <button type="button" onClick={() => { setEditingId(''); setForm(emptyEntry); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel edit</button>}</div></form></section>

    <section className="flex flex-wrap gap-3"><label className="text-xs font-semibold text-slate-600">From<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="ml-2 rounded-md border border-slate-300 px-2 py-1.5 font-normal" /></label><label className="text-xs font-semibold text-slate-600">To<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="ml-2 rounded-md border border-slate-300 px-2 py-1.5 font-normal" /></label><label className="text-xs font-semibold text-slate-600">Work status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 font-normal"><option value="all">All</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label className="text-xs font-semibold text-slate-600">Payment<select value={filters.paymentStatus} onChange={(event) => setFilters({ ...filters, paymentStatus: event.target.value })} className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 font-normal"><option value="all">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="pending">Pending</option></select></label></section>

    {loading ? <div className="flex justify-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div> : error ? <p role="alert" className="border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800">{error}</p> : records.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{records.map((record) => <article key={record._id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{record.title}</h2><span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-600">{record.status}</span><span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${record.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{record.paymentStatus}</span></div><p className="mt-1 text-xs text-slate-600">{record.clientName || 'Independent work'}{record.location ? ` · ${record.location}` : ''}</p><p className="mt-1 text-[11px] text-slate-500">{new Date(record.startedAt).toLocaleDateString()}{record.endedAt ? ` – ${new Date(record.endedAt).toLocaleDateString()}` : ''} · {record.hours} hours · {record.days} days · {amount.format(record.payAmount)}</p>{record.notes && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-xs text-slate-600">{record.notes}</p>}</div><div className="flex gap-1"><button type="button" onClick={() => edit(record)} aria-label="Edit work record" className="rounded p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => remove(record)} aria-label="Delete work record" className="rounded p-2 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></article>)}</div> : <div className="border-y border-dashed border-slate-300 py-12 text-center"><CircleAlert className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 text-sm text-slate-500">No work records for these filters.</p></div>}</div>;
};

export default WorkLogDashboard;
