import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { Archive, BriefcaseBusiness, Building2, ChevronRight, CircleAlert, Clock3, FilePlus2, Loader2, Search, Store, Users } from 'lucide-react';

const reviewStyle = { draft: 'border-slate-200 bg-slate-50 text-slate-700', pending: 'border-amber-200 bg-amber-50 text-amber-800', approved: 'border-emerald-200 bg-emerald-50 text-emerald-800', rejected: 'border-rose-200 bg-rose-50 text-rose-800' };

const ProviderJobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [activeView, setActiveView] = useState(searchParams.get('view') === 'applications' ? 'applications' : 'jobs');
  const [companySearch, setCompanySearch] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [duplicateSourceId, setDuplicateSourceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');

  const selectedCompanyId = searchParams.get('companyId') || '';

  useEffect(() => {
    setActiveView(searchParams.get('view') === 'applications' ? 'applications' : 'jobs');
  }, [searchParams]);

  const selectView = (view) => {
    const next = new URLSearchParams(searchParams);
    if (view === 'applications') next.set('view', view);
    else next.delete('view');
    setSearchParams(next);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [jobList, companyList] = await Promise.all([
        apiAdapter.getProviderJobs(status === 'all' ? { search } : { status, search }),
        apiAdapter.getMyCompanies(),
      ]);
      setJobs(jobList.map((job) => ({ ...job, status: job.status === 'verified' ? 'open' : job.status })));
      setCompanies(companyList);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load job listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, search]);
  useEffect(() => { setPage(1); }, [status, search, type, location, selectedCompanyId]);

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const matchesCompany = !selectedCompanyId || String(job.companyId?._id || job.companyId) === selectedCompanyId;
    const matchesType = type === 'all' || job.employmentType === type;
    const matchesLocation = !location.trim() || (job.location || '').toLowerCase().includes(location.trim().toLowerCase());
    return matchesCompany && matchesType && matchesLocation;
  }), [jobs, selectedCompanyId, type, location]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const visibleJobs = filteredJobs.slice((page - 1) * pageSize, page * pageSize);
  const approvedCompanies = companies.filter((company) => company.status === 'approved');
  const visibleApplicationCompanies = companies.filter((company) => {
    const query = companySearch.trim().toLowerCase();
    return !query || company.name?.toLowerCase().includes(query) || company.category?.toLowerCase().includes(query);
  });
  const updateStatus = async (job) => {
    const nextStatus = ['open', 'verified'].includes(job.status) ? 'closed' : 'open';
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

  const duplicateJob = (job) => {
    const companyId = job.companyId?._id || job.companyId;
    navigate(`/provider/jobs/new?companyId=${companyId}&duplicateJobId=${job._id}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5"><div><h1 className="mt-1 text-2xl font-bold text-slate-900">Jobs &amp; applications</h1><p className="mt-1 text-sm text-slate-500">Manage job listings and organization applicants.</p></div><div className="flex gap-2">{approvedCompanies.length ? <Link to={`/provider/jobs/new?companyId=${selectedCompanyId || approvedCompanies[0]._id}`} className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white"><FilePlus2 className="h-4 w-4" />New job</Link> : <span className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-500">An approved company is required to add jobs</span>}</div></header>
      <div role="tablist" aria-label="Provider job and application views" className="flex gap-1 border-b border-slate-200"><button type="button" role="tab" aria-selected={activeView === 'jobs'} onClick={() => selectView('jobs')} className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${activeView === 'jobs' ? 'border-indigo-700 text-indigo-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Job listings</button><button type="button" role="tab" aria-selected={activeView === 'applications'} onClick={() => selectView('applications')} className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${activeView === 'applications' ? 'border-indigo-700 text-indigo-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Applications</button></div>
      <div key={activeView} className="animate-tab-panel space-y-6">
      {activeView === 'applications' ? <section role="tabpanel" aria-label="Company applications" className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-base font-bold text-slate-900">Applications by company or business</h2><p className="mt-1 text-xs text-slate-500">Open an organization to review its applicants and update their statuses.</p></div><label className="relative block w-full sm:max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} aria-label="Search companies and businesses" placeholder="Search organizations" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label></div>{visibleApplicationCompanies.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{visibleApplicationCompanies.map((company) => { const Icon = company.organizationType === 'business' ? Store : Building2; return <article key={company._id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700"><Icon className="h-4 w-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-slate-900">{company.name}</h3><span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{company.organizationType || 'company'}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${reviewStyle[company.status] || reviewStyle.pending}`}>{company.status === 'approved' ? 'Verified' : company.status === 'pending' ? 'Awaiting review' : company.status}</span></div><p className="mt-1 text-xs text-slate-500">{company.category}{company.location ? ` · ${company.location}` : ''}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="flex gap-4 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-indigo-700" /><strong className="text-slate-900">{company.applicantCount || 0}</strong> applicants</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-amber-700" /><strong className="text-slate-900">{company.pendingApplicationCount || 0}</strong> pending</span></div><Link to={`/provider/companies/${company._id}`} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">View applications <ChevronRight className="h-3.5 w-3.5" /></Link></div></article>; })}</div> : <div className="border-y border-dashed border-slate-300 py-10 text-center"><Users className="mx-auto h-5 w-5 text-slate-400" /><h3 className="mt-2 text-sm font-semibold text-slate-900">No organizations found</h3><p className="mt-1 text-xs text-slate-500">Add a company or business to manage its applicants here.</p></div>}</section> : <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search jobs" placeholder="Search job title or location" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label>
        <div className="flex gap-2"><select value={selectedCompanyId} onChange={(event) => { const next = new URLSearchParams(searchParams); if (event.target.value) next.set('companyId', event.target.value); else next.delete('companyId'); setSearchParams(next); }} aria-label="Filter company" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"><option value="">All companies</option>{companies.map((company) => <option key={company._id} value={company._id}>{company.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter job status" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"><option value="all">All statuses</option><option value="draft">Draft</option><option value="pending_verification">Awaiting review</option><option value="open">Open</option><option value="closed">Closed</option><option value="rejected">Rejected</option></select></div>
      </section>

      <section className="grid gap-3 border-b border-slate-200 pb-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-xs font-semibold text-slate-600">Employment type<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option value="all">All types</option>{[['full_time', 'Full-time'], ['part_time', 'Part-time'], ['contract', 'Contract'], ['temporary', 'Temporary'], ['internship', 'Internship'], ['casual', 'Casual']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or address" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><div className="flex items-center gap-2 text-xs text-slate-600"><span>{filteredJobs.length} jobs · Page {page} of {pageCount}</span><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-md border border-slate-300 p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4 rotate-180" /></button><button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-slate-300 p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></section>
      {jobs.length > 0 && <div className="flex flex-wrap items-end gap-2"><label className="text-xs font-semibold text-slate-600">Duplicate a job<select value={duplicateSourceId} onChange={(event) => setDuplicateSourceId(event.target.value)} className="mt-1 block min-w-64 rounded-md border border-slate-300 bg-white px-3 py-2"><option value="">Choose a listing</option>{jobs.map((job) => <option key={job._id} value={job._id}>{job.title} · {job.companyId?.name || 'Company'}</option>)}</select></label><button type="button" disabled={!duplicateSourceId} onClick={() => { const selected = jobs.find((job) => String(job._id) === duplicateSourceId); if (selected) duplicateJob(selected); }} className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 disabled:opacity-40">Duplicate</button></div>}

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        : error ? <div role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="h-4 w-4" />{error}</div>
                : visibleJobs.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{visibleJobs.map((job) => <article key={job._id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex items-start gap-3"><BriefcaseBusiness className="mt-1 h-5 w-5 text-indigo-700" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{job.title}</h2><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${reviewStyle[job.reviewStatus]}`}>{job.reviewStatus}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{job.status}</span></div><p className="mt-1 text-xs text-slate-600">{job.companyId?.name || 'Company'} · {job.location || 'Location not listed'} · {job.employmentType?.replaceAll('_', ' ')}</p><p className="mt-1 text-[11px] text-slate-500">{job.applicantCount || 0} applicants · {job.slots} slot{job.slots === 1 ? '' : 's'}</p>{job.reviewReason && <p className="mt-2 text-xs text-rose-700">Review note: {job.reviewReason}</p>}</div></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><Link to={`/provider/jobs/${job._id}/applicants`} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Applicants ({job.applicantCount || 0})</Link><Link to={`/provider/jobs/${job._id}/edit`} className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800">Edit</Link>{job.reviewStatus === 'approved' && <button type="button" disabled={pending === String(job._id)} onClick={() => updateStatus(job, job.status === 'open' ? 'closed' : 'open')} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{job.status === 'open' ? 'Close' : 'Open'}</button>}<button type="button" disabled={pending === String(job._id)} onClick={() => archiveJob(job)} aria-label={`Archive ${job.title}`} title="Archive job and retain applications" className="rounded-md border border-rose-200 p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Archive className="h-4 w-4" /></button><ChevronRight className="hidden h-4 w-4 text-slate-400 sm:block" /></div></article>)}</div>
            : <div className="border-y border-dashed border-slate-300 py-14 text-center"><BriefcaseBusiness className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-3 text-sm font-semibold text-slate-900">No job listings</h2><p className="mt-1 text-xs text-slate-500">Select an approved company to create your first draft.</p></div>}
          </>}
      </div>
    </div>
  );
};

export default ProviderJobs;
