import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CircleAlert, Clock3, DollarSign, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { apiAdapter } from '../services/apiAdapter';
import { workLogRemindersApi } from '../api/workLogRemindersApi';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import WorkLogWizardModal from '../components/forms/WorkLogWizardModal';

const emptySummary = { totalEarnings: 0, totalHours: 0, unpaidBalance: 0, unpaidCount: 0 };
const reminderDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const displayWorkDate = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const dateKey = d.toISOString().slice(0, 10);
    return new Date(`${dateKey}T00:00:00`).toLocaleDateString();
  } catch {
    return '';
  }
};

const WorkLogDashboard = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [filters, setFilters] = useState({ from: '', to: '', status: 'all', paymentStatus: 'all' });
  // The search box stays responsive while the request waits for a pause.
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalRecord, setModalRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, record: null });
  const [reminder, setReminder] = useState({ enabled: false, dayOfWeek: 5 });
  const [reminderBusy, setReminderBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const result = await apiAdapter.getWorkLogs({
        ...filters,
        search: debouncedSearch,
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
  }, [filters, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let active = true;
    workLogRemindersApi.get().then((result) => {
      if (active && result?.data) setReminder({ enabled: result.data.enabled, dayOfWeek: result.data.dayOfWeek });
    }).catch(() => {
      // Keep the reminder controls usable if the API is temporarily unavailable.
    });
    return () => { active = false; };
  }, []);

  const saveReminder = async () => {
    setReminderBusy(true);
    try {
      const result = await workLogRemindersApi.save(reminder);
      if (result?.data) setReminder({ enabled: result.data.enabled, dayOfWeek: result.data.dayOfWeek });
      toast(reminder.enabled ? `Weekly reminder set for ${reminderDays[reminder.dayOfWeek]} at about 9:00 AM.` : 'Weekly work log reminder turned off.', 'success');
    } catch (saveError) {
      toast(saveError.message || 'Unable to save reminder.', 'error');
    } finally {
      setReminderBusy(false);
    }
  };

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

  const confirmDelete = async () => {
    const { record } = deleteDialog;
    if (!record) return;
    setBusyId(String(record._id));
    try {
      await apiAdapter.deleteWorkLog(record._id);
      toast('Work record deleted.', 'success');
      setDeleteDialog({ open: false, record: null });
      await load();
    } catch (deleteError) {
      toast(deleteError.message || 'Unable to delete work record.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const amount = useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }), []);
  const recentRecord = records[0];

  return <div className="ui-container space-y-6 py-8">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
      <div><h1 className="ui-page-title mt-1">Work log</h1>
        <p className="mt-1 text-sm text-slate-500">Track shifts, projects, time, and payment.</p></div>
      <button type="button" onClick={openNew} className="ui-btn ui-btn-primary ui-btn-sm"><Plus className="h-4 w-4" />Log work</button>
    </header>

    <section aria-label="Work totals" className="grid gap-4 sm:grid-cols-3">
      <div className="flex items-center justify-between border-b border-slate-200 py-3"><div><p className="ui-eyebrow">Total logged pay</p><p className="mt-1 text-2xl font-bold">{amount.format(summary.totalEarnings)}</p></div><DollarSign className="h-5 w-5 text-success-700" /></div>
      <div className="flex items-center justify-between border-b border-slate-200 py-3"><div><p className="ui-eyebrow">Total hours</p><p className="mt-1 text-2xl font-bold">{summary.totalHours}</p></div><Clock3 className="h-5 w-5 text-brand-700" /></div>
      <div className="flex items-center justify-between border-b border-slate-200 py-3"><div><p className="ui-eyebrow">Unpaid balance</p><p className="mt-1 text-2xl font-bold">{amount.format(summary.unpaidBalance)}</p></div><DollarSign className="h-5 w-5 text-warning-700" /></div>
    </section>

    <section aria-label="Weekly work log reminder" className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-brand-50 p-2 text-brand-700"><BellRing className="h-5 w-5" /></span>
        <div><h2 className="text-sm font-semibold text-slate-900">Weekly work log reminder</h2><p className="mt-1 text-xs text-slate-500">Get an in-app notification around 9:00 AM Philippines time on your chosen day.</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={reminder.enabled} onChange={(event) => setReminder((current) => ({ ...current, enabled: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />Send reminder weekly</label>
        <label className="sr-only" htmlFor="work-log-reminder-day">Reminder day</label>
        <select id="work-log-reminder-day" value={reminder.dayOfWeek} onChange={(event) => setReminder((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))} className="ui-input w-auto py-2 text-sm">{reminderDays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select>
        <button type="button" onClick={saveReminder} disabled={reminderBusy} className="ui-btn ui-btn-primary ui-btn-sm">{reminderBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save reminder</button>
      </div>
    </section>

    <section aria-label="Filter work records" className="grid gap-3 border-y border-slate-200 py-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto] lg:items-end">
      <label className="relative text-xs font-semibold text-slate-600"><span className="sr-only">Search work logs</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search project, client, or location" className="ui-input pl-9 font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">From<input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="ui-input ml-2 w-auto font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">To<input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="ui-input ml-2 w-auto font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">Work status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="ui-input ml-2 w-auto font-normal"><option value="all">All</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
      <label className="text-xs font-semibold text-slate-600">Payment<select value={filters.paymentStatus} onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value }))} className="ui-input ml-2 w-auto font-normal"><option value="all">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="pending">Pending</option></select></label>
      <button type="button" onClick={() => load()} disabled={loading} aria-label="Refresh work logs" className="ui-btn ui-btn-secondary ui-btn-sm"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </section>

    {error && <p role="alert" className="ui-alert ui-alert-danger"><CircleAlert className="h-4 w-4 shrink-0" />{error}<button type="button" onClick={() => load()} className="ml-auto font-semibold underline">Try again</button></p>}
    {loading ? <div aria-label="Loading work records" className="space-y-3">{[0, 1, 2].map((key) => <div key={key} className="h-20 animate-pulse border-b border-slate-200 bg-slate-50" />)}</div>
      : !error && records.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{records.map((record) => <article key={record._id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{record.title}</h2><span className="ui-badge ui-badge-neutral">{record.status}</span><span className={`ui-badge ${record.paymentStatus === 'paid' ? 'ui-badge-success' : 'ui-badge-warning'}`}>{record.paymentStatus}</span><span className="ui-badge ui-badge-brand">{record.category || 'general'}</span></div><p className="mt-1 text-xs text-slate-600">{record.clientName || 'Independent work'}{record.location ? ` · ${record.location}` : ''}</p><p className="mt-1 text-xs text-slate-500">{displayWorkDate(record.startedAt)}{record.endedAt ? ` – ${displayWorkDate(record.endedAt)}` : ''} · {record.hours} hours · {record.days} days · {amount.format(record.payAmount)}</p>{record.notes && <p className="mt-2 max-w-measure whitespace-pre-wrap text-xs text-slate-600">{record.notes}</p>}</div><div className="flex gap-1"><button type="button" disabled={Boolean(busyId)} onClick={() => openEdit(record)} aria-label={`Edit work record ${record.title}`} className="rounded p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><Pencil className="h-4 w-4" /></button><button type="button" disabled={Boolean(busyId)} onClick={() => setDeleteDialog({ open: true, record })} aria-label={`Delete work record ${record.title}`} className="rounded p-2 text-danger-700 hover:bg-danger-50 disabled:opacity-50">{busyId === String(record._id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div></article>)}</div>
      : !error && <div className="ui-empty"><Clock3 className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-3 text-sm font-semibold text-slate-900">No work records found</h2><p className="mt-1 text-xs text-slate-500">Log a shift, task, or project to start your work history.</p><button type="button" onClick={openNew} className="ui-btn ui-btn-primary ui-btn-sm mt-4"><Plus className="h-4 w-4" />Log Work</button></div>}

    {!loading && !error && records.length > 0 && <div className="flex justify-end pt-1"><button type="button" onClick={openNew} className="ui-btn ui-btn-primary ui-btn-sm"><Plus className="h-4 w-4" />Log Work</button></div>}

    {modalOpen && <WorkLogWizardModal key={modalRecord?._id || 'new'} record={modalRecord} recentRecord={recentRecord} onClose={() => { setModalOpen(false); setModalRecord(null); }} onSave={saveRecord} />}

    {/* Delete Confirmation Modal */}
    <Modal
      isOpen={deleteDialog.open}
      onClose={() => setDeleteDialog({ open: false, record: null })}
      title="Delete work record"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-3.5 text-xs text-danger-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-danger-600" />
          <p>
            Are you sure you want to delete <strong className="font-semibold">{deleteDialog.record?.title}</strong>? Any logged hours ({deleteDialog.record?.hours}h) and earnings records will be permanently removed.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setDeleteDialog({ open: false, record: null })}
            className="ui-btn ui-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={Boolean(busyId)}
            className="ui-btn ui-btn-danger"
          >
            {busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete record
          </button>
        </div>
      </div>
    </Modal>
  </div>;
};

export default WorkLogDashboard;
