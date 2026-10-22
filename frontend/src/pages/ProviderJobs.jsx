import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatDateDisplay } from '../utils/dateUtils';
import {
  Archive,
  BriefcaseBusiness,
  CircleAlert,
  Copy,
  FilePlus2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Users,
} from 'lucide-react';

const reviewBadge = { draft: 'ui-badge-neutral', pending: 'ui-badge-warning', approved: 'ui-badge-success', rejected: 'ui-badge-danger' };
const statusBadge = { draft: 'ui-badge-neutral', pending_verification: 'ui-badge-warning', open: 'ui-badge-success', verified: 'ui-badge-success', closed: 'ui-badge-neutral', rejected: 'ui-badge-danger' };
const statusLabel = { draft: 'Draft', pending_verification: 'Awaiting review', open: 'Open', verified: 'Open', closed: 'Closed', rejected: 'Rejected' };
const applicationBadge = {
  submitted: 'ui-badge-info',
  under_review: 'ui-badge-warning',
  shortlisted: 'ui-badge-brand',
  interview_scheduled: 'ui-badge-brand',
  accepted: 'ui-badge-success',
  hired: 'ui-badge-success',
  rejected: 'ui-badge-danger',
  withdrawn: 'ui-badge-neutral',
};
const applicationLabel = {
  submitted: 'Submitted',
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview',
  accepted: 'Accepted',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};
const employmentTypes = [
  ['full_time', 'Full-time'],
  ['part_time', 'Part-time'],
  ['contract', 'Contract'],
  ['temporary', 'Temporary'],
  ['internship', 'Internship'],
  ['casual', 'Casual'],
];
const PAGE_SIZE = 12;

const initialsOf = (name) => String(name || '?')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

const JobRowMenu = ({ onDuplicate, onArchive, disabled }) => (
  <details className="relative">
    <summary
      aria-label="More listing actions"
      className="ui-btn ui-btn-ghost ui-btn-sm list-none px-2 [&::-webkit-details-marker]:hidden"
    >
      <MoreHorizontal className="h-4 w-4" />
    </summary>
    <div className="ui-popover absolute right-0 z-20 mt-1 w-48 overflow-hidden p-1">
      <button
        type="button"
        onClick={onDuplicate}
        disabled={disabled}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        Duplicate listing
      </button>
      <button
        type="button"
        onClick={onArchive}
        disabled={disabled}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
      >
        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
        Archive listing
      </button>
    </div>
  </details>
);

const ProviderJobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);

  const [activeView, setActiveView] = useState(searchParams.get('view') === 'applications' ? 'applications' : 'jobs');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);

  const [applicationSearch, setApplicationSearch] = useState('');
  const [applicationStatus, setApplicationStatus] = useState('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');

  const debouncedSearch = useDebouncedValue(search, 300);
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

  // The list stays on screen while a new request runs: only the toolbar shows
  // that something is refreshing, so filtering never flashes an empty page.
  const loadJobs = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const params = {};
      if (status !== 'all') params.status = status;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedCompanyId) params.companyId = selectedCompanyId;
      const list = await apiAdapter.getProviderJobs(params);
      setJobs(list.map((job) => ({ ...job, status: job.status === 'verified' ? 'open' : job.status })));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load job listings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, debouncedSearch, selectedCompanyId]);

  const loadApplications = useCallback(async () => {
    setApplicationsLoading(true);
    try {
      const list = await apiAdapter.getProviderJobApplicationsOverview();
      setApplications(list);
      setApplicationsLoaded(true);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load applications.');
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { setPage(1); }, [status, debouncedSearch, type, selectedCompanyId]);

  // Organizations change rarely, so they are fetched once instead of on every
  // keystroke in the search field.
  useEffect(() => {
    let active = true;
    apiAdapter.getMyCompanies()
      .then((list) => { if (active) setCompanies(list); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load your companies.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (activeView === 'applications' && !applicationsLoaded && !applicationsLoading) loadApplications();
  }, [activeView, applicationsLoaded, applicationsLoading, loadApplications]);

  const filteredJobs = useMemo(() => jobs.filter((job) => type === 'all' || job.employmentType === type), [jobs, type]);
  const pageCount = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const visibleJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filteredApplications = useMemo(() => {
    const query = applicationSearch.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesStatus = applicationStatus === 'all' || application.status === applicationStatus;
      if (!matchesStatus) return false;
      if (!query) return true;
      return [application.applicant?.name, application.applicant?.email, application.jobTitle, application.companyName]
        .some((field) => String(field || '').toLowerCase().includes(query));
    });
  }, [applications, applicationSearch, applicationStatus]);

  const approvedCompanies = companies.filter((company) => company.status === 'approved');

  const updateStatus = async (job) => {
    const nextStatus = ['open', 'verified'].includes(job.status) ? 'closed' : 'open';
    setPending(String(job._id));
    try {
      await apiAdapter.updateProviderJobStatus(job._id, nextStatus);
      toast(`Job ${nextStatus}.`, 'success');
      await loadJobs();
    } catch (statusError) {
      toast(statusError.message || 'Unable to change job status.', 'error');
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
      await loadJobs();
    } catch (archiveError) {
      toast(archiveError.message || 'Unable to archive job.', 'error');
    } finally {
      setPending('');
    }
  };

  const duplicateJob = (job) => {
    const companyId = job.companyId?._id || job.companyId;
    navigate(`/provider/jobs/new?companyId=${companyId}&duplicateJobId=${job._id}`);
  };

  // With a company filter active the listing is scoped to that organization;
  // otherwise the job form asks which of the provider's companies owns it.
  const newJobHref = selectedCompanyId
    ? `/provider/jobs/new?companyId=${selectedCompanyId}`
    : '/provider/jobs/new';

  return (
    <div className="ui-container space-y-5 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="ui-page-title">Jobs &amp; applications</h1>
          <p className="mt-1 text-sm text-slate-500">Your listings and every applicant they received.</p>
        </div>
        {approvedCompanies.length ? (
          <Link to={newJobHref} className="ui-btn ui-btn-primary ui-btn-sm">
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            New job
          </Link>
        ) : (
          <span className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">An approved company is required to add jobs</span>
        )}
      </header>

      <div role="tablist" aria-label="Provider job and application views" className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'jobs'}
          onClick={() => selectView('jobs')}
          className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors duration-200 ${activeView === 'jobs' ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Job listings
          <span className="ui-badge ui-badge-neutral">{jobs.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'applications'}
          onClick={() => selectView('applications')}
          className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors duration-200 ${activeView === 'applications' ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Applications
          {applicationsLoaded ? <span className="ui-badge ui-badge-neutral">{applications.length}</span> : null}
        </button>
      </div>

      {error ? <div role="alert" className="ui-alert ui-alert-danger"><CircleAlert className="h-4 w-4" aria-hidden="true" />{error}</div> : null}

      {activeView === 'jobs' ? (
        <section role="tabpanel" aria-label="Job listings" className="space-y-3">
          <div className="ui-panel flex flex-wrap items-center gap-2 p-2">
            <label className="relative block min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search job listings"
                placeholder="Search title or location"
                className="ui-input py-2 pl-9 text-sm"
              />
            </label>
            <select
              value={selectedCompanyId}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value) next.set('companyId', event.target.value);
                else next.delete('companyId');
                setSearchParams(next);
              }}
              aria-label="Filter by company"
              className="ui-input w-auto py-2 text-xs"
            >
              <option value="">All companies</option>
              {companies.map((company) => <option key={company._id} value={company._id}>{company.name}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status" className="ui-input w-auto py-2 text-xs">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_verification">Awaiting review</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by employment type" className="ui-input w-auto py-2 text-xs">
              <option value="all">All types</option>
              {employmentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <span className="ml-auto flex items-center gap-2 px-1 text-xs text-slate-500">
              {refreshing ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" />Updating</> : `${filteredJobs.length} ${filteredJobs.length === 1 ? 'listing' : 'listings'}`}
            </span>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-200 border-y border-slate-200" aria-hidden="true">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3 py-3">
                  <div className="h-4 w-4 rounded bg-slate-100" />
                  <div className="h-3 w-2/5 rounded bg-slate-100" />
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : visibleJobs.length ? (
            <>
              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {visibleJobs.map((job) => {
                  const jobPending = pending === String(job._id);
                  return (
                    <article key={job._id} className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h2 className="truncate text-sm font-semibold text-slate-900">{job.title}</h2>
                            <span className={`ui-badge ${statusBadge[job.status] || 'ui-badge-neutral'}`}>{statusLabel[job.status] || job.status}</span>
                            {job.reviewStatus && job.reviewStatus !== 'approved' ? (
                              <span className={`ui-badge ${reviewBadge[job.reviewStatus] || 'ui-badge-neutral'}`}>
                                {job.reviewStatus === 'pending' ? 'Needs review' : job.reviewStatus}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {job.companyId?.name || 'Company'} · {job.location || 'Location not listed'} · {String(job.employmentType || '').replaceAll('_', ' ')} · {job.applicantCount || 0} applicant{job.applicantCount === 1 ? '' : 's'}
                            {job.pendingApplicationCount ? ` (${job.pendingApplicationCount} pending)` : ''} · {job.slots} slot{job.slots === 1 ? '' : 's'}
                          </p>
                          {job.reviewReason ? <p className="mt-1 text-xs text-rose-700">Review note: {job.reviewReason}</p> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 pl-7 sm:justify-end sm:pl-0">
                        <Link to={`/provider/jobs/${job._id}/applicants`} className="ui-btn ui-btn-secondary ui-btn-sm">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">Applicants</span>
                          <span className="tabular-nums">{job.applicantCount || 0}</span>
                        </Link>
                        <Link to={`/provider/jobs/${job._id}/edit`} className="ui-btn ui-btn-ghost ui-btn-sm" aria-label={`Edit ${job.title}`}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">Edit</span>
                        </Link>
                        {job.reviewStatus === 'approved' ? (
                          <button type="button" disabled={jobPending} onClick={() => updateStatus(job)} className="ui-btn ui-btn-ghost ui-btn-sm disabled:opacity-50">
                            {job.status === 'open' ? 'Close' : 'Open'}
                          </button>
                        ) : null}
                        <JobRowMenu onDuplicate={() => duplicateJob(job)} onArchive={() => archiveJob(job)} disabled={jobPending} />
                      </div>
                    </article>
                  );
                })}
              </div>

              {pageCount > 1 ? (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="tabular-nums">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredJobs.length)} of {filteredJobs.length}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="ui-btn ui-btn-secondary ui-btn-sm disabled:opacity-40">Previous</button>
                    <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="ui-btn ui-btn-secondary ui-btn-sm disabled:opacity-40">Next</button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="ui-empty">
              <BriefcaseBusiness className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold text-slate-900">
                {approvedCompanies.length ? (jobs.length ? 'No listings match these filters' : 'No job listings yet') : 'No job listings'}
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                {approvedCompanies.length
                  ? (jobs.length ? 'Clear the filters to see every listing again.' : 'Post your first opening to start receiving applications from candidates.')
                  : 'Add an organization and get it approved, then you can create your first draft.'}
              </p>
              {approvedCompanies.length ? (
                jobs.length ? null : <Link to={newJobHref} className="ui-btn ui-btn-primary ui-btn-sm mt-4"><FilePlus2 className="h-4 w-4" aria-hidden="true" />New job</Link>
              ) : <Link to="/provider/companies/new?type=company" className="ui-btn ui-btn-primary ui-btn-sm mt-4">Add organization</Link>}
            </div>
          )}
        </section>
      ) : (
        <section role="tabpanel" aria-label="Applications" className="space-y-3">
          <div className="ui-panel flex flex-wrap items-center gap-2 p-2">
            <label className="relative block min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={applicationSearch}
                onChange={(event) => setApplicationSearch(event.target.value)}
                aria-label="Search applications"
                placeholder="Search applicant, job or company"
                className="ui-input py-2 pl-9 text-sm"
              />
            </label>
            <select value={applicationStatus} onChange={(event) => setApplicationStatus(event.target.value)} aria-label="Filter by application status" className="ui-input w-auto py-2 text-xs">
              <option value="all">All statuses</option>
              {Object.entries(applicationLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <span className="ml-auto flex items-center gap-2 px-1 text-xs text-slate-500">
              {applicationsLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" />Loading</> : `${filteredApplications.length} application${filteredApplications.length === 1 ? '' : 's'}`}
            </span>
          </div>

          {applicationsLoading && !applications.length ? (
            <div className="divide-y divide-slate-200 border-y border-slate-200" aria-hidden="true">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3 py-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100" />
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredApplications.length ? (
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {filteredApplications.map((application) => (
                <article key={application.id} className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                      {initialsOf(application.applicant?.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 className="truncate text-sm font-semibold text-slate-900">{application.applicant?.name || 'Applicant'}</h2>
                        <span className={`ui-badge ${applicationBadge[application.status] || 'ui-badge-neutral'}`}>{applicationLabel[application.status] || application.status}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {application.jobTitle} · {application.companyName} · applied {formatDateDisplay(application.submittedAt, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pl-11 sm:justify-end sm:pl-0">
                    <Link to={`/provider/jobs/${application.jobId}/applicants`} className="ui-btn ui-btn-secondary ui-btn-sm">Review</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ui-empty">
              <Users className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold text-slate-900">
                {applicationsLoaded ? (applications.length ? 'No applications match these filters' : 'No applications yet') : 'Loading applications'}
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                {applicationsLoaded
                  ? (applications.length ? 'Clear the filters to see every applicant again.' : 'Applications appear here as soon as a candidate applies to one of your listings.')
                  : 'Fetching the applicants for your listings.'}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ProviderJobs;
