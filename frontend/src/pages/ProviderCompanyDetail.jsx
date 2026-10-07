import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import {
  ArrowDownToLine,
  ArrowLeft,
  Archive,
  CalendarClock,
  CircleAlert,
  Download,
  Eye,
  FileText,
  Loader2,
  Search,
  UserRound,
  X,
} from 'lucide-react';

const applicationStatuses = ['submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected'];
const statusStyle = {
  submitted: 'bg-sky-50 text-sky-800 border-sky-200',
  under_review: 'bg-amber-50 text-amber-800 border-amber-200',
  interview_scheduled: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

const ProviderCompanyDetail = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [preview, setPreview] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [interviewDrafts, setInterviewDrafts] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [companyData, applicationsData] = await Promise.all([
        apiAdapter.getMyCompany(companyId),
        apiAdapter.getProviderCompanyApplications(companyId),
      ]);
      setCompany(companyData);
      setApplications(applicationsData);
      setNoteDrafts(Object.fromEntries(applicationsData.map((application) => [application.id, application.providerNote || ''])));
      setInterviewDrafts(Object.fromEntries(applicationsData.map((application) => [
        application.id,
        application.interviewDate ? new Date(application.interviewDate).toISOString().slice(0, 16) : '',
      ])));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load company applicants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const visibleApplications = useMemo(() => applications.filter((application) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || application.applicant?.name?.toLowerCase().includes(query) || application.applicant?.email?.toLowerCase().includes(query);
    return matchesSearch && (statusFilter === 'all' || application.status === statusFilter);
  }), [applications, search, statusFilter]);

  const updateStatus = async (application, status) => {
    setBusyId(application.id);
    try {
      const updated = await apiAdapter.updateCompanyApplicationStatus(application.id, {
        status,
        interviewDate: status === 'interview_scheduled' && interviewDrafts[application.id]
          ? new Date(interviewDrafts[application.id]).toISOString()
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

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) return <div className="mx-auto max-w-6xl px-4 py-10"><div role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="h-4 w-4" />{error}</div></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link to="/provider/companies" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft className="h-4 w-4" /> Companies</Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusStyle[company.status]}`}>{company.status}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{company.category}{company.location ? ` · ${company.location}` : ''} · {applications.length} applicants</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/provider/companies/${companyId}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit listing</Link>
          <button type="button" onClick={archiveCompany} className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Archive className="h-4 w-4" />Archive</button>
        </div>
      </header>

      {company.status === 'rejected' && company.rejectionReason && <p className="border-l-4 border-rose-500 bg-rose-50 p-3 text-sm text-rose-800">Review note: {company.rejectionReason}</p>}
      <section className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-[1fr_auto_auto] md:items-end">
        <label className="relative block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input aria-label="Search applicants" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search applicants by name or email" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Application status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs">
            <option value="all">All statuses</option>{applicationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
          </select>
        </label>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ArrowDownToLine className="h-4 w-4" /> Refresh</button>
      </section>

      {visibleApplications.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">
        {visibleApplications.map((application) => (
          <article key={application.id} className="space-y-4 py-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"><UserRound className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-bold text-slate-900">{application.applicant?.name || 'Applicant'}</h2>
                  <a href={`mailto:${application.applicant?.email}`} className="text-xs text-indigo-700 hover:underline">{application.applicant?.email}</a>
                  <p className="mt-1 text-[11px] text-slate-500">Applied {new Date(application.createdAt).toLocaleString()}</p>
                  {application.interviewDate && <p className="mt-1 flex items-center gap-1 text-[11px] text-indigo-700"><CalendarClock className="h-3 w-3" />{new Date(application.interviewDate).toLocaleString()}</p>}
                </div>
              </div>
              <label className="text-xs font-semibold text-slate-600">Status
                <select disabled={busyId === application.id} value={application.status} onChange={(event) => updateStatus(application, event.target.value)} className="ml-2 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs">
                  {applicationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(application.submittedFiles || []).map((file) => (
                  <div key={file.id} className="flex items-center gap-2 border border-slate-200 px-3 py-2">
                  <FileText className="h-4 w-4 text-indigo-700" />
                  <div className="min-w-0"><p className="max-w-48 truncate text-xs font-semibold text-slate-800">{file.requirementTitle || file.fileName}</p><p className="max-w-48 truncate text-[10px] text-slate-500">{file.fileName} · {(file.fileSize / 1024 / 1024).toFixed(2)} MB</p></div>
                  <button type="button" onClick={() => openFile(application, file)} title="Preview document" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-700"><Eye className="h-4 w-4" /></button>
                  <button type="button" onClick={() => openFile(application, file, true)} title="Download document" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-700"><Download className="h-4 w-4" /></button>
                </div>
              ))}
              {!application.submittedFiles?.length && <p className="text-xs text-slate-500">No documents were submitted.</p>}
            </div>
            {application.providerNote && <p className="border-l-2 border-slate-300 pl-3 text-xs text-slate-600">Note: {application.providerNote}</p>}
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
                  <label className="text-xs font-semibold text-slate-600">Provider note
                    <textarea rows={2} maxLength={2000} value={noteDrafts[application.id] || ''} onChange={(event) => setNoteDrafts((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="Optional note for the applicant" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">Interview date/time
                    <input type="datetime-local" value={interviewDrafts[application.id] || ''} onChange={(event) => setInterviewDrafts((current) => ({ ...current, [application.id]: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                  </label>
                </div>
            {busyId === application.id && <Loader2 className="h-4 w-4 animate-spin text-indigo-700" />}
          </article>
        ))}
      </div> : <div className="border-y border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">No applicants match this filter.</div>}

      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Applicant document preview">
        <div className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="truncate text-sm font-semibold text-slate-900">{preview.fileName}</h2><button type="button" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} aria-label="Close preview" className="rounded p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <iframe title={`Preview ${preview.fileName}`} src={preview.url} className="min-h-0 flex-1 bg-slate-100" />
        </div>
      </div>}
    </div>
  );
};

export default ProviderCompanyDetail;
