import React, { useEffect, useState } from 'react';
import { TableLoadingRow } from '../components/common/Loading';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { FileText, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';

const typeLabels = { tracker: 'Tracker', company: 'Company', job: 'Job' };

export const AdminApplications = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState({ type: 'all', status: '', search: '' });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await apiAdapter.getAdminApplications({ ...query, page, limit: 30 });
        if (active) {
          setRows(result.data || []);
          setCount(result.count || 0);
          setPages(Math.max(1, result.pages || 1));
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load applications.');
      } finally {
        if (active) setLoading(false);
      }
    }, query.search ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, page, reload]);

  const updateFilter = (field, value) => {
    setPage(1);
    setQuery((current) => ({ ...current, [field]: value }));
  };

  const removeApplication = async (application) => {
    const confirmed = window.confirm(`Delete this ${typeLabels[application.type].toLowerCase()} application from ${application.candidate}? Uploaded files will also be removed.`);
    if (!confirmed) return;
    setBusyId(application.id);
    try {
      await apiAdapter.deleteAdminApplication(application.type, application.id);
      toast('Application deleted.', 'success');
      setReload((value) => value + 1);
    } catch (deleteError) {
      toast(deleteError.message || 'Unable to delete this application.', 'error');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="ui-page-title mt-1 flex items-center gap-2"><FileText className="h-6 w-6 text-brand-600" />Applications</h1>
        <p className="mt-1 text-sm text-slate-500">Review applicant submissions and legacy tracker records across the platform.</p>
      </header>

      <section className="flex flex-wrap items-center gap-3" aria-label="Filter applications">
        <label className="relative min-w-56 flex-1 sm:max-w-md"><span className="sr-only">Search applications</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search applicant, company, or role" className="ui-input pl-9" /></label>
        <label className="text-xs font-semibold text-slate-600">Type <select value={query.type} onChange={(event) => updateFilter('type', event.target.value)} className="ui-input ml-2 w-auto font-normal"><option value="all">All applications</option><option value="job">Job submissions</option><option value="company">Company submissions</option><option value="tracker">Personal tracker</option></select></label>
        <label className="text-xs font-semibold text-slate-600">Status <select value={query.status} onChange={(event) => updateFilter('status', event.target.value)} className="ui-input ml-2 w-auto font-normal"><option value="">All statuses</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="interview_scheduled">Interview scheduled</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="Saved">Saved</option><option value="Applied">Applied</option><option value="Interviewing">Interviewing</option><option value="Offered">Offered</option></select></label>
        <button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading} className="ui-btn ui-btn-secondary"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </section>

      {error ? <div role="alert" className="ui-alert ui-alert-danger">{error}</div> : (
        <div className="ui-table-shell">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="ui-th">Applicant</th><th className="ui-th">Application</th><th className="ui-th">Status</th><th className="ui-th">Submitted</th><th className="ui-th text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <TableLoadingRow colSpan={5} label="Loading applications…" /> : rows.length ? rows.map((application) => (
                  <tr key={`${application.type}-${application.id}`} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4"><p className="font-semibold text-slate-900">{application.candidate}</p><p className="mt-1 text-xs text-slate-500">{application.email || 'Email unavailable'}</p></td>
                    <td className="px-4 py-4"><p className="font-semibold text-slate-800">{application.position}</p><p className="mt-1 text-xs text-slate-500">{application.organization} · {typeLabels[application.type]}</p></td>
                    <td className="px-4 py-4"><span className="ui-badge ui-badge-neutral uppercase">{application.status.replaceAll('_', ' ')}</span></td>
                    <td className="px-4 py-4 text-xs text-slate-600">{application.createdAt ? new Date(application.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-4 text-right"><button type="button" onClick={() => removeApplication(application)} disabled={busyId === application.id} aria-label={`Delete application from ${application.candidate}`} className="ui-btn ui-btn-ghost ui-btn-sm text-danger-700 hover:bg-danger-50 hover:text-danger-700">{busyId === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></td>
                  </tr>
                )) : <tr><td colSpan="5" className="py-14 text-center text-sm text-slate-500">No matching applications.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>{count.toLocaleString()} application{count === 1 ? '' : 's'}</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Next</button></div></div>
    </div>
  );
};

export default AdminApplications;
