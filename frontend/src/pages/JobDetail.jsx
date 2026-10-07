import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { ArrowLeft, BriefcaseBusiness, CalendarClock, CircleAlert, FileText, Loader2, MapPin, Upload } from 'lucide-react';

const money = (value) => Number(value).toLocaleString();
const JobDetail = () => {
  const { jobId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState(null);
  const [personal, setPersonal] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '' });
  const [responses, setResponses] = useState({});
  const [validation, setValidation] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiAdapter.getJob(jobId).then((data) => { if (active) setJob(data); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Job not found.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jobId]);

  const requirements = useMemo(() => [...(job?.requirements || [])].sort((left, right) => left.order - right.order), [job]);
  const setFileResponse = (requirement, file) => {
    if (!file) return setResponses((current) => ({ ...current, [requirement._id]: null }));
    if (!requirement.allowedFileTypes.includes(file.type)) return setValidation((current) => ({ ...current, [requirement._id]: 'Choose one of the allowed file types.' }));
    if (file.size > (requirement.maxSizeMB || 5) * 1024 * 1024) return setValidation((current) => ({ ...current, [requirement._id]: `File must be ${(requirement.maxSizeMB || 5)} MB or smaller.` }));
    setValidation((current) => ({ ...current, [requirement._id]: '' }));
    setResponses((current) => ({ ...current, [requirement._id]: file }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!personal.name.trim()) errors.name = 'Name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email.trim())) errors.email = 'Enter a valid email.';
    for (const requirement of requirements) {
      if (requirement.isRequired && !responses[requirement._id]) errors[requirement._id] = requirement.type === 'file' ? 'Upload this required document.' : 'Complete this required response.';
    }
    setValidation(errors);
    if (Object.keys(errors).length) return;

    const formData = new FormData();
    formData.append('applicantName', personal.name);
    formData.append('applicantEmail', personal.email);
    formData.append('applicantPhone', personal.phone);
    formData.append('applicantAddress', personal.address);
    for (const requirement of requirements) {
      const value = responses[requirement._id];
      if (!value) continue;
      if (requirement.type === 'file') formData.append(requirement._id, value, value.name);
      else formData.append(`requirement-${requirement._id}`, value);
    }

    setSubmitting(true);
    setProgress(0);
    try {
      await apiAdapter.submitJobApplication(jobId, formData, (event) => { if (event.total) setProgress(Math.round((event.loaded / event.total) * 100)); });
      toast('Your application has been submitted.', 'success');
      navigate('/my-job-applications');
    } catch (submitError) { toast(submitError.message || 'Unable to submit your application.', 'error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error || !job) return <div className="mx-auto max-w-5xl px-4 py-10"><div role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="h-4 w-4" />{error || 'Job not found.'}</div></div>;

  return <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:px-8"><Link to="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" /> Browse jobs</Link><header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">{job.companyId?.logo ? <img src={job.companyId.logo} alt="" className="h-full w-full rounded-md object-contain" /> : <BriefcaseBusiness className="h-6 w-6" />}</div><div className="min-w-0"><p className="text-xs font-semibold uppercase text-indigo-700">{job.companyId?.name}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{job.title}</h1><p className="mt-1 text-sm text-slate-600">{job.employmentType.replaceAll('_', ' ')} · {job.location || job.companyId?.location}</p><p className="mt-2 text-sm font-semibold text-slate-800">{job.salaryMin != null ? `${money(job.salaryMin)}${job.salaryMax != null && job.salaryMax !== job.salaryMin ? `–${money(job.salaryMax)}` : ''} per ${job.salaryPayPeriod}` : 'Salary not listed'} · {job.slots} opening{job.slots === 1 ? '' : 's'}</p><p className="mt-1 text-xs text-slate-500">Apply by {job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'No deadline listed'}</p></div></header>
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]"><div className="space-y-6"><section><h2 className="text-base font-bold text-slate-900">Job description</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{job.description}</p></section><section><h2 className="text-base font-bold text-slate-900">Interview details</h2><div className="mt-3 space-y-2 text-sm text-slate-600">{job.interviewerName && <p>{job.interviewerName}{job.interviewerPosition ? ` · ${job.interviewerPosition}` : ''}{job.interviewerContact ? ` · ${job.interviewerContact}` : ''}</p>}{job.interviewDate && <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-indigo-700" />{new Date(job.interviewDate).toLocaleString()}</p>}{job.interviewLocation && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{job.interviewLocation}</p>}{job.interviewLink && <a href={job.interviewLink} target="_blank" rel="noreferrer" className="text-indigo-700 underline">Interview link</a>}{!job.interviewerName && !job.interviewDate && !job.interviewLocation && !job.interviewLink && <p>Details will be shared by the provider.</p>}</div></section><section><h2 className="text-base font-bold text-slate-900">Application requirements</h2><div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">{requirements.map((requirement) => <div key={requirement._id} className="py-3"><p className="text-sm font-semibold text-slate-800">{requirement.title}{requirement.isRequired && <span className="ml-2 text-[10px] uppercase text-rose-700">Required</span>}</p>{requirement.description && <p className="mt-1 text-xs text-slate-600">{requirement.description}</p>}{requirement.type === 'file' && <p className="mt-1 text-[11px] text-slate-500">{requirement.allowedFileTypes.map((type) => type.split('/')[1].toUpperCase()).join(', ')} · max {requirement.maxSizeMB} MB</p>}</div>)}{!requirements.length && <p className="py-4 text-sm text-slate-500">No additional requirements.</p>}</div></section></div>
    <form onSubmit={submit} className="space-y-4 border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0"><h2 className="text-base font-bold text-slate-900">Apply for this job</h2>{[['name','Name'],['email','Email'],['phone','Phone'],['address','Address']].map(([key,label]) => <label key={key} className="block text-xs font-semibold text-slate-700">{label}{['name','email'].includes(key) ? ' *' : ''}<input required={['name','email'].includes(key)} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'address' ? 300 : key === 'phone' ? 40 : 254} value={personal[key]} onChange={(event) => setPersonal((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />{validation[key] && <span role="alert" className="mt-1 block text-rose-700">{validation[key]}</span>}</label>)}{requirements.map((requirement) => <div key={requirement._id}><label className="block text-xs font-semibold text-slate-700">{requirement.title}{requirement.isRequired ? ' *' : ' (optional)'}</label>{requirement.type === 'file' ? <><input type="file" accept={requirement.allowedFileTypes.join(',')} onChange={(event) => setFileResponse(requirement, event.target.files?.[0])} className="mt-1 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-800" />{responses[requirement._id] && <p className="mt-1 text-[11px] text-emerald-700">{responses[requirement._id].name}</p>}</> : <textarea rows={3} value={responses[requirement._id] || ''} onChange={(event) => setResponses((current) => ({ ...current, [requirement._id]: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />}{validation[requirement._id] && <p role="alert" className="mt-1 text-xs text-rose-700">{validation[requirement._id]}</p>}</div>)}{submitting && <div aria-live="polite"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-indigo-700 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-right text-[11px] text-slate-500">Uploading {progress}%</p></div>}<button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Upload className="h-4 w-4" />{submitting ? 'Submitting…' : 'Submit application'}</button></form></section></div>;
};

export default JobDetail;
