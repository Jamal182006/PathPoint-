import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { ArrowLeft, Building2, CalendarClock, CircleAlert, FileText, Loader2, MapPin, Upload } from 'lucide-react';

const CompanyDetail = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState(null);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState({});

  useEffect(() => {
    let active = true;
    apiAdapter.getCompany(companyId)
      .then((record) => { if (active) setCompany(record); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load this company.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId]);

  const requirements = useMemo(() => [...(company?.requirements || [])].sort((left, right) => left.order - right.order), [company]);
  const documentRequirements = requirements.filter((requirement) => requirement.type === 'document');
  const informationRequirements = requirements.filter((requirement) => requirement.type !== 'document');

  const selectFile = (requirement, file) => {
    setValidation((current) => ({ ...current, [requirement._id]: '' }));
    if (!file) {
      setFiles((current) => ({ ...current, [requirement._id]: null }));
      return;
    }
    const allowed = requirement.allowedFileTypes || [];
    if (!allowed.includes(file.type)) {
      setValidation((current) => ({ ...current, [requirement._id]: 'Choose one of the allowed file types.' }));
      setFiles((current) => ({ ...current, [requirement._id]: null }));
      return;
    }
    if (file.size > (requirement.maxSizeMB || 5) * 1024 * 1024) {
      setValidation((current) => ({ ...current, [requirement._id]: `File must be ${(requirement.maxSizeMB || 5)} MB or smaller.` }));
      setFiles((current) => ({ ...current, [requirement._id]: null }));
      return;
    }
    setFiles((current) => ({ ...current, [requirement._id]: file }));
  };

  const handleApply = async (event) => {
    event.preventDefault();
    const errors = {};
    for (const requirement of documentRequirements) {
      if (requirement.isRequired && !files[requirement._id]) errors[requirement._id] = 'This document is required.';
    }
    setValidation(errors);
    if (Object.keys(errors).length) return;

    const formData = new FormData();
    documentRequirements.forEach((requirement) => {
      const file = files[requirement._id];
      if (file) formData.append(requirement._id, file, file.name);
    });

    setSubmitting(true);
    setProgress(0);
    try {
      await apiAdapter.submitCompanyApplication(companyId, formData, (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
      });
      toast('Application submitted.', 'success');
      navigate('/my-company-applications');
    } catch (submitError) {
      toast(submitError.message || 'Unable to submit application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error || !company) return <div className="mx-auto max-w-4xl px-4 py-10"><div role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="h-4 w-4" />{error || 'Company unavailable.'}</div></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft className="h-4 w-4" /> Browse companies</Link>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start">
        {company.logo ? <img src={company.logo} alt={`${company.name} logo`} className="h-16 w-16 rounded-md border border-slate-200 object-contain" /> : <span className="flex h-16 w-16 items-center justify-center rounded-md bg-indigo-50 text-indigo-700"><Building2 className="h-7 w-7" /></span>}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-indigo-700">{company.category}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{company.name}</h1>
          {company.ownerName && <p className="mt-1 text-sm text-slate-600">Listed by {company.ownerName}</p>}
          {company.location && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 text-slate-400" />{company.location}</p>}
          {company.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">{company.description}</p>}
        </div>
      </header>

      <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Application requirements</h2>
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
              {informationRequirements.map((requirement) => (
                <div key={requirement._id} className="py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    {requirement.type === 'interview' ? <CalendarClock className="h-4 w-4 text-indigo-700" /> : <FileText className="h-4 w-4 text-slate-500" />}
                    {requirement.title}
                    {requirement.isRequired && <span className="text-[10px] font-semibold uppercase text-rose-700">Required</span>}
                  </div>
                  {requirement.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">{requirement.description}</p>}
                  {requirement.type === 'interview' && <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {requirement.interviewDate && <p>{new Date(requirement.interviewDate).toLocaleString()}</p>}
                    {requirement.interviewLocation && <p>{requirement.interviewLocation}</p>}
                    {requirement.interviewLink && <a href={requirement.interviewLink} target="_blank" rel="noreferrer" className="text-indigo-700 underline">Meeting link</a>}
                  </div>}
                </div>
              ))}
              {!requirements.length && <p className="py-6 text-sm text-slate-500">No additional requirements listed.</p>}
            </div>
          </div>
        </div>

        <aside className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <h2 className="text-base font-bold text-slate-900">Submit application</h2>
          <p className="mt-1 text-xs text-slate-500">Complete the listed documents before submitting.</p>
          <form onSubmit={handleApply} className="mt-4 space-y-4">
            {documentRequirements.map((requirement) => (
              <div key={requirement._id}>
                <label className="block text-xs font-semibold text-slate-700">
                  {requirement.title}{requirement.isRequired ? ' *' : ' (optional)'}
                  {requirement.description && <span className="mt-1 block font-normal text-slate-500">{requirement.description}</span>}
                  <span className="mt-1 block font-normal text-slate-500">{requirement.allowedFileTypes.map((type) => type.split('/')[1].toUpperCase()).join(', ')} · max {requirement.maxSizeMB} MB</span>
                  <input type="file" accept={requirement.allowedFileTypes.join(',')} onChange={(event) => selectFile(requirement, event.target.files?.[0] || null)} className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-800 hover:file:bg-indigo-100" />
                </label>
                {files[requirement._id] && <p className="mt-1 text-[11px] text-emerald-700">Selected: {files[requirement._id].name}</p>}
                {validation[requirement._id] && <p role="alert" className="mt-1 text-xs text-rose-700">{validation[requirement._id]}</p>}
              </div>
            ))}
            {!documentRequirements.length && <p className="border-y border-slate-200 py-3 text-xs text-slate-500">This listing has no required documents.</p>}
            {submitting && <div aria-live="polite" className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-indigo-700 transition-all" style={{ width: `${progress}%` }} /></div><p className="text-right text-[11px] text-slate-500">Uploading {progress}%</p></div>}
            <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </aside>
      </section>
    </div>
  );
};

export default CompanyDetail;
