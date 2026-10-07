import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { Archive, BriefcaseBusiness, ChevronRight, CircleAlert, FilePlus2, Loader2, Search } from 'lucide-react';

const reviewStyle = { pending: 'border-amber-200 bg-amber-50 text-amber-800', approved: 'border-emerald-200 bg-emerald-50 text-emerald-800', rejected: 'border-rose-200 bg-rose-50 text-rose-800' };

const ProviderJobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');

  const selectedCompanyId = searchParams.get('companyId') || '';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [jobList, companyList] = await Promise.all([
        apiAdapter.getProviderJobs(status === 'all' ? { search } : { status, search }),
        apiAdapter.getMyCompanies(),
      ]);
      setJobs(jobList);
      setCompanies(companyList.filter((company) => company.status === 'approved'));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load job listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, search]);

  const visibleJobs = useMemo(() => selectedCompanyId
    ? jobs.filter((job) => String(job.companyId?._id || job.companyId) === selectedCompanyId)
    : jobs, [jobs, selectedCompanyId]);
  const summary = useMemo(() => jobs.reduce((totals, job) => ({
    listings: totals.listings + 1,
    applicants: totals.applicants + (job.applicantCount || 0),
    pending: totals.pending + (job.pendingApplicationCount || 0),
    review: totals.review + (job.reviewStatus === 'pending' ? 1 : 0),
  }), { listings: 0, applicants: 0, pending: 0, review: 0 }), [jobs]);

  const updateStatus = async (job, nextStatus) => {
    setPending(String(job._id));
    try {
      await apiAdapter.updateProviderJobStatus(job._id, nextStatus);
      toast(`Job ${nextStatus}.`, 'success');
      await load();
    } catch (error) {
      toast(error.message || 'Unable to change job status.', 'error');
    } finally {
      setPending('');
    }
  };

  const archiveJob = async (job) => {
    if (!window.confirm(`Archive “${job.title}”? The listing will close and applications will be retained.`)) return;
    setPending(String(job._id));
    try {
      await apiAdapter.archiveProviderJob(job._id);
      toast('Job archived; application history retained.', 'success');
      await load();
    } catch (error) {
      toast(error.message || 'Unable to archive job.', 'error');
    } finally {
      setPending('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5"><div><p className="text-xs font-semibold uppercase text-indigo-700">Provider portal</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Job listings</h1><p className="mt-1 text-sm text-slate-500">Manage drafts, open positions, and applicant review.</p></div><div className="flex gap-2"><Link to="/provider/companies" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Companies</Link>{companies.length ? <Link to={`/provider/jobs/new?companyId=${selectedCompanyId || companies[0]._id}`} className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white"><FilePlus2 className="h-4 w-4" />New job</Link> : <span className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-500">An approved company is required to add jobs</span>}</div></header>
      <section aria-label="Job dashboard metrics" className="grid gap-4 border-b border-slate-200 pb-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs font-semibold uppercase text-slate-500">Listings</p><p className="mt-1 text-2xl font-bold">{summary.listings}</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Applicants</p><p className="mt-1 text-2xl font-bold">{summary.applicants}</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Applications pending</p><p className="mt-1 text-2xl font-bold">{summary.pending}</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Awaiting admin review</p><p className="mt-1 text-2xl font-bold text-amber-700">{summary.review}</p></div></section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search jobs" placeholder="Search job title or location" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label>
        <div className="flex gap-2"><select value={selectedCompanyId} onChange={(event) => { const next = new URLSearchParams(searchParams); if (event.target.value) next.set('companyId', event.target.value); else next.delete('companyId'); setSearchParams(next); }} aria-label="Filter company" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"><option value="">All companies</option>{companies.map((company) => <option key={company._id} value={company._id}>{company.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter job status" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"><option value="all">All statuses</option><option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option></select></div>
      </section>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        : error ? <div role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="h-4 w-4" />{error}</div>
                : visibleJobs.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{visibleJobs.map((job) => <article key={job._id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex items-start gap-3"><BriefcaseBusiness className="mt-1 h-5 w-5 text-indigo-700" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{job.title}</h2><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${reviewStyle[job.reviewStatus]}`}>{job.reviewStatus}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{job.status}</span></div><p className="mt-1 text-xs text-slate-600">{job.companyId?.name || 'Company'} · {job.location || 'Location not listed'} · {job.employmentType?.replaceAll('_', ' ')}</p><p className="mt-1 text-[11px] text-slate-500">{job.applicantCount || 0} applicants · {job.slots} slot{job.slots === 1 ? '' : 's'}</p>{job.reviewReason && <p className="mt-2 text-xs text-rose-700">Review note: {job.reviewReason}</p>}</div></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><Link to={`/provider/jobs/${job._id}/applicants`} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Applicants ({job.applicantCount || 0})</Link><Link to={`/provider/jobs/${job._id}/edit`} className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800">Edit</Link>{job.reviewStatus === 'approved' && <button type="button" disabled={pending === String(job._id)} onClick={() => updateStatus(job, job.status === 'open' ? 'closed' : 'open')} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{job.status === 'open' ? 'Close' : 'Open'}</button>}<button type="button" disabled={pending === String(job._id)} onClick={() => archiveJob(job)} aria-label={`Archive ${job.title}`} title="Archive job and retain applications" className="rounded-md border border-rose-200 p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Archive className="h-4 w-4" /></button><ChevronRight className="hidden h-4 w-4 text-slate-400 sm:block" /></div></article>)}</div>
            : <div className="border-y border-dashed border-slate-300 py-14 text-center"><BriefcaseBusiness className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-3 text-sm font-semibold text-slate-900">No job listings</h2><p className="mt-1 text-xs text-slate-500">Select an approved company to create your first draft.</p></div>}
    </div>
  );
};

export default ProviderJobs;
