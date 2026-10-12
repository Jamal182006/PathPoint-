import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { ArrowLeft, Download, Eye, FileText, Loader2, Search, X } from 'lucide-react';

const statuses = ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'accepted', 'hired', 'rejected'];
const ProviderJobApplicants = () => {
  const { jobId } = useParams();
  const { toast } = useToast();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
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
      setInterviewDrafts(Object.fromEntries(applicantData.map((application) => [application.id, application.interviewDate ? new Date(application.interviewDate).toISOString().slice(0, 16) : ''])));
    } catch (error) {
      toast(error.message || 'Unable to load applicants.', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [jobId]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const visible = useMemo(() => applications.filter((application) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || application.applicant?.name?.toLowerCase().includes(query) || application.applicant?.email?.toLowerCase().includes(query);
    return matchesQuery && (status === 'all' || application.status === status);
  }), [applications, search, status]);

  const changeStatus = async (application, nextStatus) => {
    setBusy(application.id);
    try {
      const updated = await apiAdapter.updateJobApplication(application.id, {
        status: nextStatus,
        interviewDate: interviewDrafts[application.id] ? new Date(interviewDrafts[application.id]).toISOString() : undefined,
        providerNote: noteDrafts[application.id] || '',
      });
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, ...updated } : item));
      toast('Application updated.', 'success');
    } catch (error) { toast(error.message || 'Unable to update application.', 'error'); }
    finally { setBusy(''); }
  };

  const retrieveFile = async (application, response, download = false) => {
    try {
      const blob = response.kind === 'resume'
        ? await apiAdapter.getJobApplicationResume(application.id, !download)
        : await apiAdapter.getJobApplicationFile(application.id, response.id, !download);
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = response.fileName; anchor.click(); URL.revokeObjectURL(url);
      } else setPreview({ url, name: response.fileName });
    } catch (error) { toast(error.message || 'Unable to open file.', 'error'); }
  };

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-5"><Link to="/provider/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" /> Job listings</Link><h1 className="mt-3 text-2xl font-bold text-slate-900">{job?.title || 'Job applicants'}</h1><p className="mt-1 text-sm text-slate-500">{job?.companyId?.name || ''} · {applications.length} applicants</p></header><section className="flex flex-col gap-3 sm:flex-row sm:justify-between"><label className="relative block sm:max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search applicants" placeholder="Search name or email" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter applications" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></section>{visible.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{visible.map((application) => <article key={application.id} className="space-y-4 py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">{application.applicant.name}</h2><a href={`mailto:${application.applicant.email}`} className="text-xs text-indigo-700 hover:underline">{application.applicant.email}</a><p className="mt-1 text-xs text-slate-600">{application.applicant.phone}{application.applicant.address ? ` · ${application.applicant.address}` : ''}</p><p className="mt-1 text-[11px] text-slate-500">Applied {new Date(application.createdAt).toLocaleString()}</p></div><label className="text-xs font-semibold text-slate-600">Status<select disabled={busy === application.id} value={application.status} onChange={(event) => changeStatus(application, event.target.value)} className="ml-2 rounded-md border border-slate-300 bg-white px-2.5 py-2">{statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Provider note<textarea rows={2} value={noteDrafts[application.id] || ''} onChange={(event) => setNoteDrafts((current) => ({ ...current, [application.id]: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">Confirm interview date/time<input type="datetime-local" value={interviewDrafts[application.id] || ''} onChange={(event) => setInterviewDrafts((current) => ({ ...current, [application.id]: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label></div><div className="flex flex-wrap gap-2">{application.responses.map((response) => response.responseType === 'file' ? <div key={response.id} className="flex items-center gap-2 border border-slate-200 px-3 py-2"><FileText className="h-4 w-4 text-indigo-700" /><span className="max-w-52 truncate text-xs font-semibold">{response.requirementTitle}: {response.fileName}</span><button type="button" onClick={() => retrieveFile(application, response)} aria-label="Preview applicant file" className="rounded p-1.5 hover:bg-slate-100"><Eye className="h-4 w-4" /></button><button type="button" onClick={() => retrieveFile(application, response, true)} aria-label="Download applicant file" className="rounded p-1.5 hover:bg-slate-100"><Download className="h-4 w-4" /></button></div> : <div key={response.id} className="w-full border-l-2 border-slate-300 pl-3"><p className="text-xs font-semibold text-slate-700">{response.requirementTitle}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{response.value}</p></div>)}</div></article>)}</div> : <p className="border-y border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">No applicants match this filter.</p>}{preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Applicant file preview"><div className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col rounded-lg bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="truncate text-sm font-semibold">{preview.name}</h2><button type="button" aria-label="Close preview" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} className="rounded p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><iframe title={`Preview ${preview.name}`} src={preview.url} className="min-h-0 flex-1 bg-slate-100" /></div></div>}</div>;
};

export default ProviderJobApplicants;
