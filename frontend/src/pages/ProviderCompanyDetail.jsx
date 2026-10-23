import React, { useEffect, useMemo, useState } from 'react';
import { LoadingState } from '../components/common/Loading';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import AddressMap from '../components/common/AddressMap';
import { safeDateTimeString, safeIsoString, formatDateTimeDisplay } from '../utils/dateUtils';
import {
  ArrowDownToLine,
  ArrowLeft,
  Archive,
  CalendarClock,
  CircleAlert,
  Download,
  Eye,
  FileText,
  BriefcaseBusiness,
  Check,
  FilePlus2,
  Loader2,
  Search,
  UserRound,
  X,
} from 'lucide-react';

const applicationStatuses = ['submitted', 'under_review', 'changes_requested', 'interview_scheduled', 'accepted', 'approved', 'rejected'];

const ProviderCompanyDetail = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [busyStatus, setBusyStatus] = useState('');
  const [preview, setPreview] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [interviewDrafts, setInterviewDrafts] = useState({});
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [busyJobId, setBusyJobId] = useState('');
  const [activeTab, setActiveTab] = useState('jobs');
  const [mapVisible, setMapVisible] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
      setError('');
    }
    try {
      const [companyData, applicationsData, jobData] = await Promise.all([
        apiAdapter.getMyCompany(companyId),
        apiAdapter.getProviderCompanyApplications(companyId),
        apiAdapter.getProviderJobs({ companyId }),
      ]);
      setCompany(companyData);
      setApplications(applicationsData);
      setJobs(jobData);
      setNoteDrafts(Object.fromEntries(applicationsData.map((application) => [application.id, application.providerNote || ''])));
      setInterviewDrafts(Object.fromEntries(applicationsData.map((application) => [
        application.id,
        safeDateTimeString(application.interviewDate),
      ])));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load company applicants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [companyId]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const visibleApplications = useMemo(() => applications.filter((application) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || application.applicant?.name?.toLowerCase().includes(query) || application.applicant?.email?.toLowerCase().includes(query);
    return matchesSearch && (statusFilter === 'all' || application.status === statusFilter);
  }), [applications, search, statusFilter]);

  const updateStatus = async (application, status) => {
    if (['changes_requested', 'rejected'].includes(status) && !noteDrafts[application.id]?.trim()) {
      toast('Add a comment before requesting changes or rejecting an application.', 'error');
      return;
    }
    setBusyId(application.id);
    setBusyStatus(status);
    try {
      const updated = await apiAdapter.updateCompanyApplicationStatus(application.id, {
        status,
        interviewDate: status === 'interview_scheduled' && interviewDrafts[application.id]
          ? safeIsoString(interviewDrafts[application.id]) || undefined
          : undefined,
        providerNote: noteDrafts[application.id] ?? application.providerNote ?? '',
      });
      setApplications((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setNoteDrafts((current) => ({ ...current, [updated.id]: updated.providerNote || '' }));
      toast('Applicant status updated.', 'success');
    } catch (updateError) {
      toast(updateError.message || 'Unable to update applicant status.', 'error');
    } finally {
      setBusyId('');
      setBusyStatus('');
    }
  };

  const archiveCompany = async () => {
    if (!window.confirm(`Archive ${company.name}? Applicant records and files will be retained.`)) return;
    try {
      await apiAdapter.archiveMyCompany(companyId);
      toast('Company archived.', 'success');
      navigate('/provider/companies');
    } catch (archiveError) {
      toast(archiveError.message || 'Unable to archive this company.', 'error');
    }
  };

  const changeJobStatus = async (job) => {
    const nextStatus = job.status === 'open' || job.status === 'verified' ? 'closed' : 'open';
    setBusyJobId(String(job._id));
    try {
      await apiAdapter.updateProviderJobStatus(job._id, nextStatus);
      toast(`Job ${nextStatus}.`, 'success');
      await load(true);
    } catch (jobError) {
      toast(jobError.message || 'Unable to change job status.', 'error');
    } finally {
      setBusyJobId('');
    }
  };

  const archiveJob = async (job) => {
    if (!window.confirm(`Archive “${job.title}”? Applications will be retained.`)) return;
    setBusyJobId(String(job._id));
    try {
      await apiAdapter.archiveProviderJob(job._id);
      toast('Job archived; application history retained.', 'success');
      await load(true);
    } catch (jobError) {
      toast(jobError.message || 'Unable to archive this job.', 'error');
    } finally {
      setBusyJobId('');
    }
  };

  const visibleJobs = jobs.filter((job) => jobStatusFilter === 'all' || job.status === jobStatusFilter);

  const openFile = async (application, file, download = false) => {
    try {
      const blob = await apiAdapter.getCompanyApplicationFile(application.id, file.id, !download);
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        setPreview({ url, fileName: file.fileName, mimeType: file.mimeType });
      }
    } catch (fileError) {
      toast(fileError.message || 'Unable to retrieve the document.', 'error');
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <div className="ui-container py-10"><div role="alert" className="ui-alert ui-alert-danger"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div></div>;

  return (
    <div className="ui-container space-y-4 py-5">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link to="/provider/companies" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> Companies</Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ui-page-title">{company.name}</h1>
            <span className="ui-badge ui-badge-neutral">{company.organizationType || 'company'}</span>
            <span className={`ui-badge ${company.status === 'approved' ? 'ui-badge-success' : company.status === 'rejected' ? 'ui-badge-danger' : 'ui-badge-warning'}`}>{company.status}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{company.category} · {applications.length} applicant{applications.length === 1 ? '' : 's'}</p>
          {mapVisible ? (
            <div className="mt-2 max-w-sm">
              <AddressMap readOnly compact className="h-28" location={company.location} formattedAddress={company.formattedAddress} latitude={company.latitude} longitude={company.longitude} />
            </div>
          ) : (
            <button type="button" onClick={() => setMapVisible(true)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Show location map
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/provider/companies/${companyId}/edit`} className="ui-btn ui-btn-secondary ui-btn-sm">Edit listing</Link>
          {company.status === 'approved' ? <Link to={`/provider/jobs/new?companyId=${companyId}&from=company`} className="ui-btn ui-btn-primary ui-btn-sm"><FilePlus2 className="h-4 w-4" />Add job</Link> : <span className="self-center text-xs text-slate-500">Company approval is required to post jobs</span>}
          <button type="button" onClick={archiveCompany} className="ui-btn ui-btn-danger ui-btn-sm"><Archive className="h-4 w-4" />Archive</button>
        </div>
      </header>

      {company.status === 'rejected' && company.rejectionReason && <p className="ui-alert ui-alert-danger">Review note: {company.rejectionReason}</p>}

      <div role="tablist" aria-label="Company sections" className="flex gap-1 border-b border-slate-200">
        <button type="button" role="tab" aria-selected={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors duration-200 ${activeTab === 'jobs' ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Jobs <span className="ui-badge ui-badge-neutral">{jobs.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'applicants'} onClick={() => setActiveTab('applicants')} className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors duration-200 ${activeTab === 'applicants' ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Applicants <span className="ui-badge ui-badge-neutral">{applications.length}</span>
        </button>
      </div>

      {activeTab === 'jobs' ? (
      <section aria-labelledby="company-jobs-heading" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{jobs.length} listing{jobs.length === 1 ? '' : 's'} · {jobs.reduce((total, job) => total + (job.applicantCount || 0), 0)} applicants</p>
          <label className="text-xs font-semibold text-slate-600">Status <select value={jobStatusFilter} onChange={(event) => setJobStatusFilter(event.target.value)} className="ui-input ml-2 w-auto py-2 text-xs"><option value="all">All statuses</option><option value="draft">Draft</option><option value="pending_verification">Pending review</option><option value="verified">Published</option><option value="closed">Closed</option><option value="rejected">Rejected</option></select></label>
        </div>
        {visibleJobs.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{visibleJobs.map((job) => <article key={job._id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{job.title}</h3><span className="ui-badge ui-badge-neutral">{job.status === 'verified' ? 'Published' : job.status?.replaceAll('_', ' ')}</span><span className="ui-badge ui-badge-warning">{job.reviewStatus === 'pending' ? 'Awaiting admin review' : job.reviewStatus}</span></div><p className="mt-1 text-xs text-slate-500">{job.location || company.location || 'Location not listed'} · {job.applicantCount || 0} applicants · {job.slots} opening{job.slots === 1 ? '' : 's'}</p>{job.reviewReason && <p className="mt-1 text-xs text-rose-700">Review note: {job.reviewReason}</p>}</div><div className="flex flex-wrap gap-2"><Link to={`/provider/jobs/${job._id}/applicants`} className="ui-btn ui-btn-secondary ui-btn-sm">Applicants</Link><Link to={`/provider/jobs/${job._id}/edit`} className="ui-btn ui-btn-secondary ui-btn-sm">Edit</Link>{job.reviewStatus === 'approved' && <button type="button" disabled={busyJobId === String(job._id)} onClick={() => changeJobStatus(job)} className="ui-btn ui-btn-secondary ui-btn-sm">{job.status === 'closed' ? 'Reopen' : 'Close'}</button>}<button type="button" disabled={busyJobId === String(job._id)} onClick={() => archiveJob(job)} aria-label={`Archive ${job.title}`} title="Archive job and retain applications" className="ui-btn ui-btn-ghost ui-btn-sm text-danger-700 disabled:opacity-50"><Archive className="h-4 w-4" /></button></div></article>)}</div> : <div className="py-6 text-center"><BriefcaseBusiness className="mx-auto h-5 w-5 text-slate-400" /><h3 className="mt-2 text-sm font-semibold text-slate-900">{jobs.length ? 'No jobs match this filter' : 'No jobs yet'}</h3><p className="mt-1 text-xs text-slate-500">{jobs.length ? 'Choose another status to see listings.' : company.status === 'approved' ? 'Add a job to start building your team.' : 'Company approval is required before jobs can be posted.'}</p></div>}
      </section>
      ) : (
      <>
      <section className="ui-panel grid gap-2 p-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input aria-label="Search applicants" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search applicants by name or email" className="ui-input py-2 pl-9 text-sm" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by application status" className="ui-input w-auto py-2 text-xs">
          <option value="all">All statuses</option>{applicationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select>
        <button type="button" onClick={() => load()} className="ui-btn ui-btn-secondary ui-btn-sm"><ArrowDownToLine className="h-4 w-4" aria-hidden="true" />Refresh</button>
      </section>

      {visibleApplications.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">
        {visibleApplications.map((application) => (
          <article key={application.id} className="space-y-3 py-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
                <div>
                  <h2 className="font-semibold text-slate-900">{application.applicant?.name || 'Applicant'}</h2>
                  <a href={`mailto:${application.applicant?.email}`} className="text-xs text-brand-700 hover:underline">{application.applicant?.email}</a>
                  <p className="mt-1 text-xs text-slate-500">Applied {formatDateTimeDisplay(application.createdAt)}</p>
                  {application.interviewDate && <p className="mt-1 flex items-center gap-1 text-xs text-brand-700"><CalendarClock className="h-3 w-3" />{formatDateTimeDisplay(application.interviewDate)}</p>}
                  {Object.entries(application.formData || {}).filter(([, value]) => String(value || '').trim()).map(([requirementId, value]) => {
                    const requirement = company.requirements?.find((item) => String(item._id) === requirementId);
                    return <p key={requirementId} className="mt-2 text-xs text-slate-600"><span className="font-semibold text-slate-800">{requirement?.title || 'Response'}:</span> {String(value)}</p>;
                  })}
                </div>
              </div>
              <label className="text-xs font-semibold text-slate-600">Status
                <select disabled={busyId === application.id} value={application.status} onChange={(event) => updateStatus(application, event.target.value)} className="ui-input ml-2 w-auto text-xs">
                  {applicationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(application.submittedFiles || []).map((file) => (
                  <div key={file.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <FileText className="h-4 w-4 text-brand-700" />
                  <div className="min-w-0"><p className="max-w-48 truncate text-xs font-semibold text-slate-800">{file.requirementTitle || file.fileName}</p><p className="max-w-48 truncate text-xs text-slate-500">{file.fileName} · {(file.fileSize / 1024 / 1024).toFixed(2)} MB</p></div>
                  <button type="button" onClick={() => openFile(application, file)} title="Preview document" className="ui-btn ui-btn-ghost ui-btn-sm"><Eye className="h-4 w-4" /></button>
                  <button type="button" onClick={() => openFile(application, file, true)} title="Download document" className="ui-btn ui-btn-ghost ui-btn-sm"><Download className="h-4 w-4" /></button>
                </div>
              ))}
              {!application.submittedFiles?.length && <p className="text-xs text-slate-500">No documents were submitted.</p>}
            </div>
            {application.providerNote && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Note: {application.providerNote}</p>}
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
                  <label className="text-xs font-semibold text-slate-600">Provider note
                    <textarea rows={2} maxLength={2000} value={noteDrafts[application.id] || ''} onChange={(event) => setNoteDrafts((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="Optional note for the applicant" className="ui-input mt-1" />
                    <span className="mt-1 block text-xs font-normal text-slate-500">A note is required to reject this application.</span>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">Interview date/time
                    <input type="datetime-local" value={interviewDrafts[application.id] || ''} onChange={(event) => setInterviewDrafts((current) => ({ ...current, [application.id]: event.target.value }))} className="ui-input mt-1" />
                  </label>
                </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={busyId === application.id} onClick={() => updateStatus(application, 'rejected')} className="ui-btn ui-btn-danger ui-btn-sm">
                {busyId === application.id && busyStatus === 'rejected' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Reject application
              </button>
              <button type="button" disabled={busyId === application.id} onClick={() => updateStatus(application, 'accepted')} className="ui-btn ui-btn-primary ui-btn-sm">
                {busyId === application.id && busyStatus === 'accepted' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accept application
              </button>
            </div>
            {busyId === application.id && !['accepted', 'rejected'].includes(busyStatus) && <Loader2 className="h-4 w-4 animate-spin text-brand-700" />}
          </article>
        ))}
      </div> : <div className="ui-empty">No applicants match this filter.</div>}
      </>
      )}

      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Applicant document preview">
        <div className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-popover">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="truncate text-sm font-semibold text-slate-900">{preview.fileName}</h2><button type="button" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} aria-label="Close preview" className="ui-btn ui-btn-ghost ui-btn-sm"><X className="h-5 w-5" /></button></div>
          <iframe title={`Preview ${preview.fileName}`} src={preview.url} className="min-h-0 flex-1 bg-slate-100" />
        </div>
      </div>}
    </div>
  );
};

export default ProviderCompanyDetail;
