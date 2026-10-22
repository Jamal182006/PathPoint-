import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { apiAdapter } from '../services/apiAdapter';
import PinButton from '../components/common/PinButton';
import StatusBadge from '../components/common/StatusBadge';
import { formatDateDisplay, formatDateTimeDisplay } from '../utils/dateUtils';
import { Archive, BriefcaseBusiness, Building2, ChevronDown, Download, Eye, FileText, Loader2, Search, Trash2, Undo2, X } from 'lucide-react';

const MyApplications = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);
  const [rejectedPreview, setRejectedPreview] = useState([]);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [count, setCount] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('updated_desc');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [noteEditor, setNoteEditor] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const load = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) setLoading(true);
    setError('');
    try {
      const params = { status, kind: type, search, sort, page, limit: 10 };
      const result = await apiAdapter.getApplicationSubmissions(params);
      setApplications(result.data || []);
      setCount(result.count || 0);
      setPages(Math.max(1, result.pages || 1));
      if (status === 'active') {
        const rejected = await apiAdapter.getApplicationSubmissions({ status: 'rejected', kind: type, search, sort: 'updated_desc', limit: 5 });
        setRejectedPreview(rejected.data || []);
        setRejectedCount(rejected.count || 0);
      } else setRejectedPreview([]);
    } catch (loadError) {
      if (!silent) setError(loadError.message || 'Unable to load your applications.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [status, type, search, sort, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const intervalId = setInterval(() => {
      load({ silent: true });
    }, 30000);
    const handleFocus = () => {
      load({ silent: true });
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [load]);

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const updateFilter = (setter, value) => { setter(value); setPage(1); };

  const mutate = async (application, payload) => {
    const key = `${application.kind}-${application.id}`;
    setBusyKey(key);
    try {
      await apiAdapter.updateApplicationSubmission(application.kind, application.id, payload);
      toast(payload.action === 'archive' ? 'Application archived.' : payload.action === 'restore' ? 'Application restored.' : 'Application updated.', 'success');
      if (noteEditor === key) setNoteEditor('');
      await load();
    } catch (mutationError) {
      toast(mutationError.message || 'Unable to update this application.', 'error');
    } finally { setBusyKey(''); }
  };

  const deleteApplication = async (application) => {
    if (!window.confirm(`Permanently delete your ${application.title} application at ${application.organization}?`)) return;
    const key = `${application.kind}-${application.id}`;
    setBusyKey(key);
    try {
      await apiAdapter.deleteApplicationSubmission(application.kind, application.id);
      toast('Application permanently deleted.', 'success');
      await load();
    } catch (deleteError) {
      toast(deleteError.message || 'Unable to delete this application.', 'error');
    } finally { setBusyKey(''); }
  };

  const fileAction = async (application, file, download = false) => {
    try {
      const blob = application.kind === 'company'
        ? await apiAdapter.getCompanyApplicationFile(application.id, file.id, !download)
        : file.kind === 'resume'
          ? await apiAdapter.getJobApplicationResume(application.id, !download)
          : await apiAdapter.getJobApplicationFile(application.id, file.id, !download);
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      } else setPreview({ url, name: file.fileName });
    } catch (fileError) {
      toast(fileError.message || 'Unable to retrieve this document.', 'error');
    }
  };

  const responsesFor = (application) => application.kind === 'company'
    ? Object.entries(application.formData || {}).filter(([, value]) => String(value || '').trim()).map(([key, value]) => ({ id: key, title: 'Application response', value }))
    : (application.responses || []).filter((response) => response.responseType !== 'file');
  const filesFor = (application) => application.kind === 'company'
    ? application.submittedFiles || []
    : (application.responses || []).filter((response) => response.responseType === 'file');

  const reapplyLink = (application) => application.kind === 'job'
    ? `/jobs/${application.jobId}`
    : `/companies/${application.companyId}?resubmit=${application.id}`;

  const renderApplication = (application) => {
    const key = `${application.kind}-${application.id}`;
    const files = filesFor(application);
    const archived = Boolean(application.archivedAt);
    const busy = busyKey === key;
    return <article key={key} className="space-y-3 border-b border-slate-200 py-5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {application.kind === 'company' ? <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" /> : <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />}
          <div className="min-w-0">
            <h2 className="truncate font-bold text-slate-900">{application.title}</h2>
            <p className="mt-1 text-xs text-slate-600">{application.organization} · {application.kind === 'job' ? 'Job' : 'Company'}</p>
            <p className="mt-1 text-xs text-slate-500">Applied {formatDateDisplay(application.dateApplied || application.submittedAt || application.createdAt)} · Updated {formatDateTimeDisplay(application.updatedAt || application.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2"><StatusBadge status={application.displayStatus} showDot={false} /><PinButton itemType="application" itemId={application.id} applicationKind={application.kind} details={{ title: application.title, subtitle: application.organization, status: application.displayStatus, latestUpdate: `Updated ${formatDateDisplay(application.updatedAt || application.createdAt)}`, href: '/my-applications' }} /></div>
      </div>
      {application.status === 'rejected' && <div className="ui-alert ui-alert-danger flex-col items-start gap-1 text-xs"><p className="font-semibold">Rejected {formatDateDisplay(application.rejectedAt || application.updatedAt || application.createdAt)}</p>{application.providerNote && <p className="mt-1 whitespace-pre-wrap">Employer feedback: {application.providerNote}</p>}</div>}
      {application.applicantNote && <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">Your note: {application.applicantNote}</p>}
      {application.interviewDate && <p className="text-xs font-semibold text-brand-700">Interview: {formatDateTimeDisplay(application.interviewDate)}</p>}
      {responsesFor(application).map((response) => <p key={response.id} className="text-xs text-slate-600"><span className="font-semibold text-slate-800">{response.title || response.requirementTitle}:</span> {String(response.value)}</p>)}
      {files.length > 0 && <div className="flex flex-wrap gap-2">{files.map((file) => <div key={file.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><FileText className="h-4 w-4 text-brand-700" /><span className="max-w-48 truncate text-xs font-semibold text-slate-800">{file.requirementTitle || file.fileName}</span><button type="button" title="Preview document" onClick={() => fileAction(application, file)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></button><button type="button" title="Download document" onClick={() => fileAction(application, file, true)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Download className="h-4 w-4" /></button></div>)}</div>}
      {application.status === 'draft' && application.kind === 'job' && <Link to={`/jobs/${application.jobId}`} className="ui-btn ui-btn-secondary ui-btn-sm">Continue draft</Link>}
      <div className="flex flex-wrap items-center gap-2">
        {application.status === 'rejected' && <><Link to={application.kind === 'company' ? reapplyLink(application) : `/jobs/${application.jobId}?reapply=true`} className="ui-btn ui-btn-primary ui-btn-sm">Reapply</Link><Link to="/jobs" className="ui-btn ui-btn-secondary ui-btn-sm">Find similar jobs</Link></>}
        {['applied', 'under_review', 'interview'].includes(application.status) && <button type="button" disabled={busy} onClick={() => { if (window.confirm('Withdraw this application? You can still view it in your history.')) mutate(application, { action: 'withdraw' }); }} className="ui-btn ui-btn-secondary ui-btn-sm"><Undo2 className="h-3.5 w-3.5" />Withdraw</button>}
        <button type="button" disabled={busy} onClick={() => mutate(application, { action: archived ? 'restore' : 'archive' })} className="ui-btn ui-btn-secondary ui-btn-sm">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}{archived ? 'Restore' : 'Archive'}</button>
        <button type="button" disabled={busy} onClick={() => { setNoteEditor(noteEditor === key ? '' : key); setNoteDraft(application.applicantNote || ''); }} className="ui-btn ui-btn-secondary ui-btn-sm">{application.applicantNote ? 'Edit note' : 'Add note'}</button>
        <button type="button" disabled={busy} onClick={() => deleteApplication(application)} className="ui-btn ui-btn-danger ui-btn-sm"><Trash2 className="h-3.5 w-3.5" />Delete</button>
      </div>
      {noteEditor === key && <form onSubmit={(event) => { event.preventDefault(); mutate(application, { applicantNote: noteDraft }); }} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"><label className="block text-xs font-semibold text-slate-700">Private note<textarea rows={2} maxLength={2000} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} className="ui-input mt-1 font-normal" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setNoteEditor('')} className="ui-btn ui-btn-secondary ui-btn-sm">Cancel</button><button type="submit" disabled={busy} className="ui-btn ui-btn-primary ui-btn-sm">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save note</button></div></form>}
    </article>;
  };

  return <div className="ui-container space-y-6 py-8">
    <header className="border-b border-slate-200 pb-5"><h1 className="ui-page-title mt-1">My Applications</h1><p className="mt-1 text-sm text-slate-500">Review submissions, statuses, and employer feedback.</p></header>
    <section aria-label="Filter applications" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_160px_180px_180px]">
      <label className="relative"><span className="sr-only">Search applications</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} placeholder="Search company or role" className="ui-input pl-9" /></label>
      <label className="sr-only" htmlFor="my-applications-type">Application type</label><select id="my-applications-type" value={type} onChange={(event) => updateFilter(setType, event.target.value)} className="ui-input text-xs"><option value="all">All types</option><option value="job">Jobs</option><option value="company">Companies</option></select>
      <label className="sr-only" htmlFor="my-applications-status">Status</label><select id="my-applications-status" value={status} onChange={(event) => updateFilter(setStatus, event.target.value)} className="ui-input text-xs"><option value="active">Active applications</option><option value="all">All statuses</option><option value="applied">Applied</option><option value="under_review">Under Review</option><option value="interview">Interview</option><option value="offer">Offer</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option><option value="draft">Drafts</option><option value="archived">Archived</option></select>
      <label className="sr-only" htmlFor="my-applications-sort">Sort applications</label><select id="my-applications-sort" value={sort} onChange={(event) => updateFilter(setSort, event.target.value)} className="ui-input text-xs"><option value="updated_desc">Recently updated</option><option value="date_desc">Newest applied</option><option value="date_asc">Oldest applied</option><option value="company_asc">Company A–Z</option></select>
      <button type="button" onClick={load} disabled={loading} className="ui-btn ui-btn-secondary ui-btn-sm">Refresh</button>
    </section>
    {error && <p role="alert" className="ui-alert ui-alert-danger">{error}<button type="button" onClick={load} className="ml-3 font-semibold underline">Try again</button></p>}
    {loading ? <div className="space-y-3" aria-label="Loading applications">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div>
      : !error && applications.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{applications.map(renderApplication)}</div>
        : !error && <div className="ui-empty"><FileText className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-sm font-semibold text-slate-900">No applications found</h2><p className="mt-1 text-xs text-slate-500">Try another filter or explore open jobs.</p><Link to="/jobs" className="ui-btn ui-btn-primary ui-btn-sm mt-4">Browse Jobs</Link></div>}
    {!loading && !error && status === 'active' && <details className="group border-y border-slate-200">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold text-slate-800"><span>Rejected applications <span className="ml-1 text-xs font-normal text-slate-500">({rejectedCount})</span></span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
      {rejectedPreview.length ? <div className="divide-y divide-slate-200">{rejectedPreview.map(renderApplication)}{rejectedCount > rejectedPreview.length && <button type="button" onClick={() => updateFilter(setStatus, 'rejected')} className="inline-flex py-3 text-xs font-semibold text-brand-700">View all rejected applications</button>}</div> : <p className="pb-4 text-xs text-slate-500">No rejected applications.</p>}
    </details>}
    {!loading && !error && pages > 1 && <nav aria-label="Application pages" className="flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-xs text-slate-500">{count.toLocaleString()} applications · Page {page} of {pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Previous</button><button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Next</button></div></nav>}
    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Submitted document preview"><div className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-popover"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="truncate text-sm font-semibold text-slate-900">{preview.name}</h2><button type="button" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} aria-label="Close preview" className="rounded p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><iframe title={`Preview ${preview.name}`} src={preview.url} className="min-h-0 flex-1 bg-slate-100" /></div></div>}
  </div>;
};

export default MyApplications;