import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { safeDateTimeString, safeIsoString, formatDateTimeDisplay } from '../utils/dateUtils';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

const STAGES = [
  { key: 'all', label: 'All applicants' },
  { key: 'submitted', label: 'New' },
  { key: 'under_review', label: 'Under review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview_scheduled', label: 'Interview' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_STYLES = {
  submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
  under_review: 'bg-slate-100 text-slate-700 ring-slate-200',
  shortlisted: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  interview_scheduled: 'bg-amber-50 text-amber-800 ring-amber-200',
  accepted: 'bg-teal-50 text-teal-700 ring-teal-200',
  hired: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const STATUS_LABELS = {
  submitted: 'New',
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview scheduled',
  accepted: 'Accepted',
  hired: 'Hired',
  rejected: 'Rejected',
};

const BTN_BASE = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const BTN_PRIMARY = `${BTN_BASE} bg-indigo-600 text-white hover:bg-indigo-700`;
const BTN_HIRE = `${BTN_BASE} bg-emerald-600 text-white hover:bg-emerald-700`;
const BTN_REJECT = `${BTN_BASE} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;
const BTN_GHOST = `${BTN_BASE} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
const prettySize = (bytes) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const StatusPill = ({ status }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status] || STATUS_STYLES.under_review}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

const ProviderJobApplicants = () => {
  const { jobId } = useParams();
  const { toast } = useToast();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [noteDrafts, setNoteDrafts] = useState({});
  const [interviewDrafts, setInterviewDrafts] = useState({});
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [jobData, applicantData] = await Promise.all([apiAdapter.getProviderJob(jobId), apiAdapter.getProviderJobApplicants(jobId)]);
      setJob(jobData);
      setApplications(applicantData);
      setNoteDrafts(Object.fromEntries(applicantData.map((application) => [application.id, application.providerNote || ''])));
      setInterviewDrafts(Object.fromEntries(applicantData.map((application) => [application.id, safeDateTimeString(application.interviewDate)])));
    } catch (error) {
      toast(error.message || 'Unable to load applicants.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [jobId]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const counts = useMemo(() => applications.reduce((acc, application) => {
    acc.all += 1;
    acc[application.status] = (acc[application.status] || 0) + 1;
    return acc;
  }, { all: 0 }), [applications]);

  const visible = useMemo(() => applications.filter((application) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || application.applicant?.name?.toLowerCase().includes(query) || application.applicant?.email?.toLowerCase().includes(query);
    return matchesQuery && (stage === 'all' || application.status === stage);
  }), [applications, search, stage]);

  const applyUpdate = async (application, payload, successMessage) => {
    setBusy(application.id);
    try {
      const updated = await apiAdapter.updateJobApplication(application.id, payload);
      setApplications((current) => current.map((item) => (item.id === application.id ? { ...item, ...updated } : item)));
      setNoteDrafts((current) => ({ ...current, [application.id]: updated.providerNote || '' }));
      setInterviewDrafts((current) => ({ ...current, [application.id]: safeDateTimeString(updated.interviewDate) }));
      toast(successMessage, 'success');
    } catch (error) {
      toast(error.message || 'Unable to update this application.', 'error');
    } finally {
      setBusy('');
    }
  };

  const currentNote = (application) => noteDrafts[application.id] ?? application.providerNote ?? '';

  const markReviewing = (application) => applyUpdate(application, { status: 'under_review', providerNote: currentNote(application) }, 'Marked as under review.');
  const shortlist = (application) => applyUpdate(application, { status: 'shortlisted', providerNote: currentNote(application) }, 'Applicant shortlisted.');
  const hire = (application) => {
    if (!window.confirm(`Hire ${application.applicant?.name}? They will be notified.`)) return;
    return applyUpdate(application, { status: 'hired', providerNote: currentNote(application) }, 'Applicant hired.');
  };
  const reject = (application) => {
    if (!window.confirm(`Reject ${application.applicant?.name}'s application? They will be notified.`)) return;
    return applyUpdate(application, { status: 'rejected', providerNote: currentNote(application) }, 'Applicant rejected.');
  };
  const saveNote = (application) => applyUpdate(application, { providerNote: currentNote(application) }, 'Note saved.');
  const scheduleInterview = (application) => {
    const draft = interviewDrafts[application.id];
    const iso = draft ? safeIsoString(draft) : '';
    if (!iso || new Date(iso).getTime() < Date.now()) return toast('Choose a future interview date and time.', 'error');
    return applyUpdate(application, { status: 'interview_scheduled', interviewDate: iso, providerNote: currentNote(application) }, 'Interview scheduled.');
  };

  const retrieveFile = async (application, response, download = false) => {
    try {
      const blob = response.kind === 'resume'
        ? await apiAdapter.getJobApplicationResume(application.id, !download)
        : await apiAdapter.getJobApplicationFile(application.id, response.id, !download);
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = response.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        setPreview({ url, name: response.fileName });
      }
    } catch (error) {
      toast(error.message || 'Unable to open file.', 'error');
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5">
        <Link to="/provider/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Job listings
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-slate-900">{job?.title || 'Job applicants'}</h1>
            {job?.companyId?.name && <p className="mt-1 text-sm text-slate-500">{job.companyId.name}</p>}
          </div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <Users className="h-4 w-4" /> {applications.length} applicant{applications.length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <label className="relative block w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search applicants"
            placeholder="Search by name or email"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <nav className="flex flex-wrap gap-2" aria-label="Filter applicants by stage">
          {STAGES.map((item) => {
            const active = stage === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setStage(item.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{counts[item.key] || 0}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {visible.length ? (
        <div className="space-y-4">
          {visible.map((application) => {
            const expanded = expandedId === application.id;
            const fileResponses = (application.responses || []).filter((response) => response.responseType === 'file');
            const textResponses = (application.responses || []).filter((response) => response.responseType === 'text' && response.value);
            const isBusy = busy === application.id;
            return (
              <article key={application.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">{initials(application.applicant?.name)}</span>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : application.id)}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-bold text-slate-900">{application.applicant?.name}</h2>
                        <StatusPill status={application.status} />
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {application.applicant?.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{application.applicant.email}</span>}
                        {application.applicant?.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{application.applicant.phone}</span>}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">Applied {formatDateTimeDisplay(application.createdAt)}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : application.id)}
                    aria-label={expanded ? 'Hide application' : 'Review application'}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Review
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {expanded && (
                  <div className="grid gap-6 border-t border-slate-200 bg-slate-50/60 p-5 lg:grid-cols-5">
                    <div className="space-y-5 lg:col-span-3">
                      <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-900">Documents</h3>
                        {fileResponses.length ? (
                          <ul className="mt-3 space-y-2">
                            {fileResponses.map((response) => (
                              <li key={response.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><FileText className="h-4 w-4" /></span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-slate-800">{response.requirementTitle}</p>
                                  <p className="truncate text-[11px] text-slate-500">{response.fileName}{response.fileSize ? ` · ${prettySize(response.fileSize)}` : ''}</p>
                                </div>
                                <button type="button" onClick={() => retrieveFile(application, response)} aria-label={`Preview ${response.requirementTitle}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Eye className="h-4 w-4" /></button>
                                <button type="button" onClick={() => retrieveFile(application, response, true)} aria-label={`Download ${response.requirementTitle}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Download className="h-4 w-4" /></button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">No documents were attached.</p>
                        )}
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-900">Experience</h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{application.experience?.trim() || 'Not provided.'}</p>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-900">Cover letter</h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{application.coverLetter?.trim() || 'Not provided.'}</p>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-900">Answers</h3>
                        {textResponses.length ? (
                          <dl className="mt-2 space-y-3">
                            {textResponses.map((response) => (
                              <div key={response.id} className="border-l-2 border-slate-200 pl-3">
                                <dt className="text-xs font-semibold text-slate-700">{response.requirementTitle}</dt>
                                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{response.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">No written answers.</p>
                        )}
                      </section>

                      {application.statusHistory?.length > 1 && (
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                          <h3 className="text-sm font-bold text-slate-900">History</h3>
                          <ol className="mt-2 space-y-1.5">
                            {application.statusHistory.map((entry, index) => (
                              <li key={`${entry.status}-${index}`} className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                <span className="font-medium text-slate-700">{STATUS_LABELS[entry.status] || entry.status}</span>
                                <span>{formatDateTimeDisplay(entry.changedAt)}</span>
                              </li>
                            ))}
                          </ol>
                        </section>
                      )}
                    </div>

                    <div className="space-y-5 lg:col-span-2">
                      <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-900">Decision</h3>
                        <p className="mt-1 text-xs text-slate-500">Move this applicant through your hiring pipeline.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => markReviewing(application)} disabled={isBusy || application.status === 'under_review'} className={BTN_GHOST}><Clock className="h-3.5 w-3.5" />Reviewing</button>
                          <button type="button" onClick={() => shortlist(application)} disabled={isBusy || application.status === 'shortlisted'} className={BTN_PRIMARY}><CheckCircle2 className="h-3.5 w-3.5" />Shortlist</button>
                          <button type="button" onClick={() => hire(application)} disabled={isBusy || application.status === 'hired'} className={BTN_HIRE}><UserCheck className="h-3.5 w-3.5" />Hire</button>
                          <button type="button" onClick={() => reject(application)} disabled={isBusy || application.status === 'rejected'} className={BTN_REJECT}><X className="h-3.5 w-3.5" />Reject</button>
                        </div>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><CalendarClock className="h-4 w-4 text-amber-600" />Interview</h3>
                        {application.interviewDate && (
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
                            <CalendarClock className="h-3.5 w-3.5" />Scheduled for {formatDateTimeDisplay(application.interviewDate)}
                          </p>
                        )}
                        <div className="mt-3 space-y-2">
                          <label htmlFor={`interview-${application.id}`} className="block text-xs font-semibold text-slate-600">Date &amp; time</label>
                          <input
                            id={`interview-${application.id}`}
                            type="datetime-local"
                            min={safeDateTimeString(new Date())}
                            value={interviewDrafts[application.id] || ''}
                            onChange={(event) => setInterviewDrafts((current) => ({ ...current, [application.id]: event.target.value }))}
                            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                          <button type="button" onClick={() => scheduleInterview(application)} disabled={isBusy} className={`${BTN_PRIMARY} w-full`}>
                            <CalendarClock className="h-3.5 w-3.5" />{application.status === 'interview_scheduled' ? 'Update interview' : 'Schedule interview'}
                          </button>
                        </div>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-900">Private note</h3>
                        <p className="mt-1 text-xs text-slate-500">Only you and your team can see this.</p>
                        <label htmlFor={`note-${application.id}`} className="sr-only">Provider note</label>
                        <textarea
                          id={`note-${application.id}`}
                          rows={3}
                          value={noteDrafts[application.id] || ''}
                          onChange={(event) => setNoteDrafts((current) => ({ ...current, [application.id]: event.target.value }))}
                          placeholder="Notes about this candidate"
                          className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <button type="button" onClick={() => saveNote(application)} disabled={isBusy} className={`${BTN_GHOST} mt-2 w-full`}>Save note</button>
                      </section>

                      {application.applicant?.address && (
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                          <h3 className="text-sm font-bold text-slate-900">Location</h3>
                          <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{application.applicant.address}</p>
                        </section>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
          {applications.length ? 'No applicants match this filter.' : 'No applications have been submitted yet.'}
        </p>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Applicant file preview" onClick={closePreview}>
          <div className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="truncate text-sm font-semibold text-slate-900">{preview.name}</h2>
              <button type="button" aria-label="Close preview" onClick={closePreview} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <iframe title={`Preview ${preview.name}`} src={preview.url} className="min-h-0 flex-1 bg-slate-100" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderJobApplicants;
