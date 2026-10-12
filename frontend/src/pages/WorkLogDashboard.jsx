import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleAlert, Clock3, DollarSign, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import WorkLogWizardModal from '../components/forms/WorkLogWizardModal';

const emptySummary = { totalEarnings: 0, totalHours: 0, unpaidBalance: 0, unpaidCount: 0 };
const displayWorkDate = (value) => {
  if (!value) return '';
  const dateKey = new Date(value).toISOString().slice(0, 10);
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString();
};

const WorkLogDashboard = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [filters, setFilters] = useState({ from: '', to: '', status: 'all', paymentStatus: 'all', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalRecord, setModalRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const result = await apiAdapter.getWorkLogs({
        ...filters,
        status: filters.status === 'all' ? undefined : filters.status,
        paymentStatus: filters.paymentStatus === 'all' ? undefined : filters.paymentStatus,
      });
      setRecords(result.data || []);
      setSummary(result.summary || emptySummary);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load work records.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handleShortcut = (event) => {
      const target = event.target;
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'l' && !target?.isContentEditable && !['input', 'textarea', 'select'].includes(target?.tagName?.toLowerCase())) {
        event.preventDefault();
        setModalRecord(null);
        setModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const openNew = () => { setModalRecord(null); setModalOpen(true); };
  const openEdit = (record) => { setModalRecord(record); setModalOpen(true); };

  const saveRecord = async (payload, id) => {
    setBusyId(id || 'new');
    try {
      if (id) await apiAdapter.updateWorkLog(id, payload);
      else await apiAdapter.createWorkLog(payload);
      toast(id ? 'Work record updated.' : 'Work log saved.', 'success');
      setModalOpen(false);
      setModalRecord(null);
      await load();
    } catch (saveError) {
      throw new Error(saveError.message || 'Unable to save work record.');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (record) => {
    if (!window.confirm(`Delete work record “${record.title}”?`)) return;
    setBusyId(String(record._id));
    try {
      await apiAdapter.deleteWorkLog(record._id);
      toast('Work record deleted.', 'success');
      await load();
    } catch (deleteError) {
      toast(deleteError.message || 'Unable to delete work record.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const amount = useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }), []);
  const recentRecord = records[0];

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
      <div><p className="text-xs font-semibold uppercase text-indigo-700">Private to your account</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Work log</h1><p className="mt-1 text-sm text-slate-500">Track shifts, projects, time, and payment.</p></div>
      <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800"><Plus className="h-4 w-4" />Log Work <kbd className="ml-1 hidden rounded border border-white/30 px-1.5 py-0.5 text-[10px] font-medium sm:inline">Ctrl+Shift+L</kbd></button>
    </header>

    <section aria-label="Work totals" className="grid gap-4 sm:grid-cols-3">
      <div className="flex items-center justify-between border-b border-slate-200 py-3"><div><p className="text-xs font-semibold uppercase text-slate-500">Total logged pay</p><p className="mt-1 text-2xl font-bold">{amount.format(summary.totalEarnings)}</p></div><DollarSign className="h-5 w-5 text-emerald-700" /></div>
      <div className="flex items-center justify-between border-b border-slate-200 py-3"><div><p className="text-xs font-semibold uppercase text-slate-500">Total hours</p><p className="mt-1 text-2xl font-bold">{summary.totalHours}</p></div><Clock3 className="h-5 w-5 text-indigo-700" /></div>
      <div className="flex items-center justify-between border-b border-slate-200 py-3"><div><p className="text-xs font-semibold uppercase text-slate-500">Unpaid balance</p><p className="mt-1 text-2xl font-bold">{amount.format(summary.unpaidBalance)}</p></div><DollarSign className="h-5 w-5 text-amber-700" /></div>
    </section>

    <section aria-label="Filter work records" className="grid gap-3 border-y border-slate-200 py-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto] lg:items-end">
      <label className="relative text-xs font-semibold text-slate-600"><span className="sr-only">Search work logs</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search project, client, or location" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">From<input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="ml-2 rounded-md border border-slate-300 px-2 py-2 font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">To<input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="ml-2 rounded-md border border-slate-300 px-2 py-2 font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">Work status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-2 font-normal"><option value="all">All</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
      <label className="text-xs font-semibold text-slate-600">Payment<select value={filters.paymentStatus} onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value }))} className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-2 font-normal"><option value="all">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="pending">Pending</option></select></label>
      <button type="button" onClick={() => load()} disabled={loading} aria-label="Refresh work logs" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </section>

    {error && <p role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}<button type="button" onClick={() => load()} className="ml-auto font-semibold underline">Try again</button></p>}
    {loading ? <div aria-label="Loading work records" className="space-y-3">{[0, 1, 2].map((key) => <div key={key} className="h-20 animate-pulse border-b border-slate-200 bg-slate-50" />)}</div>
      : !error && records.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{records.map((record) => <article key={record._id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{record.title}</h2><span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-600">{record.status}</span><span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${record.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{record.paymentStatus}</span><span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] uppercase text-indigo-800">{record.category || 'general'}</span></div><p className="mt-1 text-xs text-slate-600">{record.clientName || 'Independent work'}{record.location ? ` · ${record.location}` : ''}</p><p className="mt-1 text-[11px] text-slate-500">{displayWorkDate(record.startedAt)}{record.endedAt ? ` – ${displayWorkDate(record.endedAt)}` : ''} · {record.hours} hours · {record.days} days · {amount.format(record.payAmount)}</p>{record.notes && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-xs text-slate-600">{record.notes}</p>}</div><div className="flex gap-1"><button type="button" disabled={Boolean(busyId)} onClick={() => openEdit(record)} aria-label={`Edit work record ${record.title}`} className="rounded p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><Pencil className="h-4 w-4" /></button><button type="button" disabled={Boolean(busyId)} onClick={() => remove(record)} aria-label={`Delete work record ${record.title}`} className="rounded p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50">{busyId === String(record._id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div></article>)}</div>
      : !error && <div className="border-y border-dashed border-slate-300 py-12 text-center"><Clock3 className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-3 text-sm font-semibold text-slate-900">No work records found</h2><p className="mt-1 text-xs text-slate-500">Log a shift, task, or project to start your work history.</p><button type="button" onClick={openNew} className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-700 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Log Work</button></div>}

    {modalOpen && <WorkLogWizardModal key={modalRecord?._id || 'new'} record={modalRecord} recentRecord={recentRecord} onClose={() => { setModalOpen(false); setModalRecord(null); }} onSave={saveRecord} />}
  </div>;
};

export default WorkLogDashboard;
