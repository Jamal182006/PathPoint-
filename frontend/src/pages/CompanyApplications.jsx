import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { Building2, Download, Eye, FileText, Loader2, Search, X } from 'lucide-react';

const applicationStatuses = ['submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected'];
const statusColors = {
  submitted: 'bg-sky-50 text-sky-800 border-sky-200',
  under_review: 'bg-amber-50 text-amber-800 border-amber-200',
  interview_scheduled: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

const CompanyApplications = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let active = true;
    apiAdapter.getMyCompanyApplications()
      .then((list) => { if (active) setApplications(list); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load applications.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const visible = useMemo(() => applications.filter((application) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || application.company?.name?.toLowerCase().includes(query);
    return matchesSearch && (status === 'all' || application.status === status);
  }), [applications, search, status]);

  const showFile = async (application, file, download = false) => {
    try {
      const blob = await apiAdapter.getCompanyApplicationFile(application.id, file.id, !download);
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        setPreview({ url, name: file.fileName });
      }
    } catch (fileError) {
      toast(fileError.message || 'Unable to open the document.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase text-indigo-700">Applicant portal</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Company applications</h1>
        <p className="mt-1 text-sm text-slate-500">Review submission status and documents.</p>
      </header>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search applications" placeholder="Search companies" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2"><option value="all">All</option>{applicationStatuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        : error ? <p role="alert" className="border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>
          : visible.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">
            {visible.map((application) => (
              <article key={application.id} className="space-y-3 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 text-indigo-700" />
                    <div><h2 className="font-bold text-slate-900">{application.company?.name || 'Company'}</h2><p className="mt-1 text-xs text-slate-500">Submitted {new Date(application.createdAt).toLocaleString()}</p></div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${statusColors[application.status] || ''}`}>{application.status.replaceAll('_', ' ')}</span>
                </div>
                {application.providerNote && <p className="border-l-2 border-slate-300 pl-3 text-sm text-slate-600">{application.providerNote}</p>}
                {application.interviewDate && <p className="text-xs font-semibold text-indigo-700">Interview: {new Date(application.interviewDate).toLocaleString()}</p>}
                <div className="flex flex-wrap gap-2">
                  {(application.submittedFiles || []).map((file) => <div key={file.id} className="flex items-center gap-2 border border-slate-200 px-3 py-2"><FileText className="h-4 w-4 text-indigo-700" /><span className="max-w-48 truncate text-xs font-semibold text-slate-800">{file.requirementTitle || file.fileName}</span><button type="button" onClick={() => showFile(application, file)} title="Preview document" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-700"><Eye className="h-4 w-4" /></button><button type="button" onClick={() => showFile(application, file, true)} title="Download document" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-700"><Download className="h-4 w-4" /></button></div>)}
                  {!application.submittedFiles?.length && <p className="text-xs text-slate-500">No files attached.</p>}
                </div>
              </article>
            ))}
          </div>
            : <div className="border-y border-dashed border-slate-300 py-14 text-center"><FileText className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-3 text-sm font-semibold text-slate-900">No company applications yet</h2><p className="mt-1 text-xs text-slate-500">Browse approved companies to submit an application.</p><Link to="/dashboard" className="mt-4 inline-flex text-xs font-semibold text-indigo-700 hover:underline">Browse companies</Link></div>}

      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Submitted document preview"><div className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="truncate text-sm font-semibold text-slate-900">{preview.name}</h2><button type="button" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} aria-label="Close preview" className="rounded p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><iframe title={`Preview ${preview.name}`} src={preview.url} className="min-h-0 flex-1 bg-slate-100" /></div></div>}
    </div>
  );
};

export default CompanyApplications;
