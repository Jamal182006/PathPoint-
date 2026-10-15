import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, CircleAlert, FileText, Loader2, MapPin, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiAdapter } from '../services/apiAdapter';
import { LocationMap } from '../components/common/AddressMap';
import PinButton from '../components/common/PinButton';

const steps = ['Basic info', 'Resume & experience', 'Questions', 'Review'];
const acceptedDocuments = ['application/pdf', 'image/jpeg', 'image/png'];
const money = (value) => Number(value).toLocaleString();

const createFormData = ({ personal, experience, coverLetter, responses, resumeFile, useProfileResume, removeResume, step }) => {
  const formData = new FormData();
  formData.append('applicantName', personal.name);
  formData.append('applicantEmail', personal.email);
  formData.append('applicantPhone', personal.phone);
  formData.append('applicantAddress', personal.address);
  formData.append('experience', experience);
  formData.append('coverLetter', coverLetter);
  formData.append('draftStep', String(step));
  if (useProfileResume) formData.append('useProfileResume', 'true');
  if (removeResume) formData.append('removeResume', 'true');
  if (resumeFile) formData.append('resume', resumeFile, resumeFile.name);
  Object.entries(responses).forEach(([requirementId, value]) => {
    if (value instanceof File) formData.append(requirementId, value, value.name);
    else if (typeof value === 'string') formData.append(`requirement-${requirementId}`, value);
  });
  return formData;
};

const JobApplicationWizard = () => {
  const { jobId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [job, setJob] = useState(null);
  const [personal, setPersonal] = useState({ name: '', email: '', phone: '', address: '' });
  const [experience, setExperience] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [responses, setResponses] = useState({});
  const [resumeFile, setResumeFile] = useState(null);
  const [useProfileResume, setUseProfileResume] = useState(false);
  const [removeResume, setRemoveResume] = useState(false);
  const [savedResume, setSavedResume] = useState(null);
  const [draftStep, setDraftStep] = useState(1);
  const [currentStep, setCurrentStep] = useState(1);
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [validation, setValidation] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const draftChangeVersion = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saveVersion, setSaveVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([apiAdapter.getJob(jobId), apiAdapter.getJobApplicationDraft(jobId)])
      .then(([jobData, application]) => {
        if (!active) return;
        setJob(jobData);
        setPersonal({
          name: application?.applicant?.name || user?.name || '',
          email: application?.applicant?.email || user?.email || '',
          phone: application?.applicant?.phone || user?.phone || '',
          address: application?.applicant?.address || user?.address || '',
        });
        const profileExperience = [
          ...(user?.experience || []).map((entry) => [entry.title, entry.company && `at ${entry.company}`, entry.description].filter(Boolean).join(' · ')),
          ...(user?.educationHistory || []).map((entry) => [entry.degree, entry.fieldOfStudy, entry.school].filter(Boolean).join(' · ')),
          ...(user?.skills || []).length ? [`Skills: ${user.skills.join(', ')}`] : [],
        ].filter(Boolean).join('\n');
        if (application?.status && !['draft', 'rejected'].includes(application.status)) {
          setSubmittedApplication(application);
        } else if (application) {
          setExperience(application.experience || '');
          setCoverLetter(application.coverLetter || '');
          setSavedResume(application.resume || null);
          const restoredResponses = {};
          (application.responses || []).forEach((response) => {
            restoredResponses[response.requirementId] = response.responseType === 'file'
              ? { fileName: response.fileName, fileSize: response.fileSize, persisted: true }
              : response.value;
          });
          setResponses(restoredResponses);
          setCurrentStep(Math.min(4, Math.max(1, application.draftStep || 1)));
          setDraftStep(Math.min(4, Math.max(1, application.draftStep || 1)));
        } else setExperience(profileExperience || user?.profileInfo?.bio || user?.bio || '');
        setHydrated(true);
      })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load this job.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jobId, user?.id]);

  const requirements = useMemo(() => [...(job?.requirements || [])].sort((left, right) => left.order - right.order), [job]);
  const markDraftDirty = () => {
    draftChangeVersion.current += 1;
    setDraftDirty(true);
  };

  useEffect(() => {
    if (!hydrated || !draftDirty || !job || submittedApplication || submitting) return undefined;
    const timeout = window.setTimeout(async () => {
      const savingVersion = draftChangeVersion.current;
      setSavingDraft(true);
      setDraftError('');
      try {
        const saved = await apiAdapter.saveJobApplicationDraft(jobId, createFormData({
          personal, experience, coverLetter, responses, resumeFile, useProfileResume, removeResume, step: currentStep,
        }));
        setDraftStep(saved.draftStep || currentStep);
        if (resumeFile) setResumeFile(null);
        if (saved.resume) setSavedResume(saved.resume);
        if (Object.values(responses).some((value) => value instanceof File)) {
          const savedFileResponses = Object.fromEntries((saved.responses || [])
            .filter((response) => response.responseType === 'file')
            .map((response) => [response.requirementId, { fileName: response.fileName, fileSize: response.fileSize, persisted: true }]));
          setResponses((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value instanceof File ? savedFileResponses[key] || null : value]).filter(([, value]) => value !== null)));
        }
        setSaveVersion((value) => value + 1);
        setDraftDirty(draftChangeVersion.current !== savingVersion);
      } catch (saveError) {
        setDraftError(saveError.message || 'Draft could not be saved. Your current entries remain on this page.');
      } finally {
        setSavingDraft(false);
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [hydrated, draftDirty, job, jobId, personal, experience, coverLetter, responses, resumeFile, useProfileResume, removeResume, currentStep, submittedApplication, submitting]);

  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!personal.name.trim()) errors.name = 'Enter your name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email.trim())) errors.email = 'Enter a valid email address.';
    }
    if (step === 3) {
      requirements.forEach((requirement) => {
        if (!requirement.isRequired) return;
        const value = responses[requirement._id];
        if (!value || (typeof value === 'string' && !value.trim())) errors[requirement._id] = 'This response is required.';
      });
    }
    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    markDraftDirty();
    setCurrentStep((step) => Math.min(4, step + 1));
  };

  const submit = async () => {
    const validBasic = validateStep(1);
    const validQuestions = validateStep(3);
    if (!validBasic || !validQuestions) {
      setCurrentStep(!validBasic ? 1 : 3);
      return;
    }
    setSubmitting(true);
    setDraftError('');
    try {
      const application = await apiAdapter.submitJobApplication(jobId, createFormData({
        personal, experience, coverLetter, responses, resumeFile, useProfileResume, removeResume, step: 4,
      }));
      setSubmittedApplication(application);
      toast('Your application was submitted.', 'success');
    } catch (submitError) {
      toast(submitError.message || 'Unable to submit your application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const setRequirementFile = (requirement, file) => {
    if (!file) return;
    if (!requirement.allowedFileTypes.includes(file.type)) {
      setValidation((current) => ({ ...current, [requirement._id]: 'Choose a supported file type.' }));
      return;
    }
    if (file.size > (requirement.maxSizeMB || 5) * 1024 * 1024) {
      setValidation((current) => ({ ...current, [requirement._id]: `File must be ${requirement.maxSizeMB || 5} MB or smaller.` }));
      return;
    }
    setValidation((current) => ({ ...current, [requirement._id]: '' }));
    setResponses((current) => ({ ...current, [requirement._id]: file }));
  };

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error || !job) return <div className="mx-auto max-w-5xl px-4 py-10"><div role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="h-4 w-4" />{error || 'Job not found.'}</div></div>;

  return <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
    <Link to="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" /> Browse jobs</Link>
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">{job.companyId?.logo ? <img src={job.companyId.logo} alt="" className="h-full w-full rounded-md object-contain" /> : <BriefcaseBusiness className="h-6 w-6" />}</div>
      <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h1 className="mt-1 text-2xl font-bold text-slate-900">{job.title}</h1></div><PinButton itemType="job" itemId={jobId} details={{ title: job.title, subtitle: job.companyId?.name || 'Company', status: 'Open', latestUpdate: `Posted ${new Date(job.createdAt).toLocaleDateString()}`, href: `/jobs/${jobId}` }} /></div><p className="mt-1 text-sm capitalize text-slate-600">{job.employmentType.replaceAll('_', ' ')} · <MapPin className="inline h-3.5 w-3.5" /> {job.location || job.companyId?.location || 'Location not listed'}</p><p className="mt-2 text-sm font-semibold text-slate-800">{job.salaryMin != null ? `${money(job.salaryMin)}${job.salaryMax != null && job.salaryMax !== job.salaryMin ? `–${money(job.salaryMax)}` : ''} per ${job.salaryPayPeriod}` : 'Salary not listed'}</p><p className="mt-1 text-xs text-slate-500">Posted {new Date(job.createdAt).toLocaleDateString()} · Apply by {job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'No deadline listed'}</p></div>
    </header>
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
      <article className="space-y-6">
        <section><h2 className="text-base font-bold text-slate-900">Job description</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{job.description}</p></section>
        {(job.responsibilities?.length > 0 || job.qualifications?.length > 0 || job.skills?.length > 0) && <section className="grid gap-5 sm:grid-cols-2">{job.responsibilities?.length > 0 && <div><h2 className="text-base font-bold text-slate-900">Responsibilities</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{job.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></div>}{job.qualifications?.length > 0 && <div><h2 className="text-base font-bold text-slate-900">Qualifications</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{job.qualifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}{job.skills?.length > 0 && <div><h2 className="text-base font-bold text-slate-900">Skills</h2><p className="mt-2 text-sm text-slate-700">{job.skills.join(', ')}</p></div>}{job.benefits?.length > 0 && <div><h2 className="text-base font-bold text-slate-900">Benefits</h2><p className="mt-2 text-sm text-slate-700">{job.benefits.join(', ')}</p></div>}</section>}
        <section><h2 className="mb-2 text-base font-bold text-slate-900">Location</h2><LocationMap address={job.formattedAddress || job.location || job.companyId?.formattedAddress || job.companyId?.location} latitude={job.latitude ?? job.companyId?.latitude} longitude={job.longitude ?? job.companyId?.longitude} /></section>
        {(job.dressCode || job.workSchedule || job.experienceLevel || job.educationLevel || job.salaryNegotiable) && <section><h2 className="text-base font-bold text-slate-900">Work details</h2><dl className="mt-2 grid gap-x-4 gap-y-2 border-y border-slate-200 py-3 text-sm sm:grid-cols-2">{[['Work setup', job.workSetup?.replaceAll('_', '-')], ['Dress code', job.dressCode], ['Schedule', job.workSchedule], ['Experience', job.experienceLevel], ['Education', job.educationLevel], ['Pay', job.salaryNegotiable ? 'Negotiable' : '']].filter(([, value]) => value).map(([label, value]) => <div key={label} className="flex gap-2"><dt className="font-semibold text-slate-600">{label}:</dt><dd className="text-slate-800">{value}</dd></div>)}</dl></section>}
          <p className="text-xs font-semibold text-slate-600">{job.currency || 'USD'}{job.salaryNegotiable ? ' · Salary negotiable' : ''}</p>
        <section><h2 className="text-base font-bold text-slate-900">Application requirements</h2><div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">{requirements.map((requirement) => <div key={requirement._id} className="py-3"><p className="text-sm font-semibold text-slate-800">{requirement.title}{requirement.isRequired && <span className="ml-2 text-[10px] uppercase text-rose-700">Required</span>}</p>{requirement.description && <p className="mt-1 text-xs text-slate-600">{requirement.description}</p>}{requirement.type === 'file' && <p className="mt-1 text-[11px] text-slate-500">{requirement.allowedFileTypes.map((type) => type.split('/')[1].toUpperCase()).join(', ')} · max {requirement.maxSizeMB} MB</p>}</div>)}{!requirements.length && <p className="py-4 text-sm text-slate-500">No additional questions are required.</p>}</div></section>
        <section><h2 className="text-base font-bold text-slate-900">Additional details</h2><dl className="mt-2 grid gap-x-4 gap-y-2 border-y border-slate-200 py-3 text-sm sm:grid-cols-2">{[['Category', job.category], ['Start date', job.startDate ? new Date(job.startDate).toLocaleDateString() : ''], ['Contact person', job.contactName], ['Contact email', job.contactEmail]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="flex min-w-0 gap-2"><dt className="shrink-0 font-semibold text-slate-600">{label}:</dt><dd className="min-w-0 break-words text-slate-800">{label === 'Contact email' ? <a href={`mailto:${value}`} className="text-indigo-700 hover:underline">{value}</a> : value}</dd></div>)}</dl></section>
      </article>

      <section className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0" aria-label="Application form" onInput={markDraftDirty} onChange={markDraftDirty}>
        {submittedApplication ? <div className="space-y-4 border-y border-emerald-200 bg-emerald-50 p-5" role="status"><CheckCircle2 className="h-7 w-7 text-emerald-700" /><h2 className="text-lg font-bold text-emerald-950">Application submitted</h2><p className="text-sm text-emerald-900">Your application for {job.title} is now <strong>{submittedApplication.status.replaceAll('_', ' ')}</strong>. You can follow updates in My Applications.</p><Link to="/my-applications" className="inline-flex rounded-md bg-emerald-800 px-3 py-2 text-sm font-semibold text-white">View My Applications</Link></div> : <>
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900">Apply for this job</h2><span role="status" aria-live="polite" className="text-[11px] text-slate-500">{savingDraft ? 'Saving draft…' : saveVersion ? `Draft saved · step ${draftStep}` : 'Draft autosave is ready'}</span></div>
          {draftError && <p role="alert" className="mt-3 border-l-4 border-amber-500 bg-amber-50 p-3 text-xs text-amber-900">{draftError}</p>}
          <ol aria-label={`Step ${currentStep} of ${steps.length}`} className="mt-5 grid grid-cols-4 gap-2">{steps.map((step, index) => <li key={step} aria-current={currentStep === index + 1 ? 'step' : undefined} className={`border-t-2 pt-2 text-[10px] font-semibold sm:text-xs ${currentStep >= index + 1 ? 'border-indigo-700 text-indigo-800' : 'border-slate-200 text-slate-400'}`}><span className="mr-1">{index + 1}.</span>{step}</li>)}</ol>

          {currentStep === 1 && <fieldset className="mt-5 space-y-3"><legend className="text-sm font-semibold text-slate-800">Basic information</legend>{[['name', 'Full name'], ['email', 'Email'], ['phone', 'Phone'], ['address', 'Address']].map(([key, label]) => <label key={key} className="block text-xs font-semibold text-slate-700">{label}{['name', 'email'].includes(key) ? ' *' : ''}<input type={key === 'email' ? 'email' : 'text'} readOnly={key === 'email'} maxLength={key === 'address' ? 300 : key === 'phone' ? 40 : 254} value={personal[key]} onChange={(event) => setPersonal((current) => ({ ...current, [key]: event.target.value }))} aria-invalid={Boolean(validation[key])} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal read-only:bg-slate-50" />{validation[key] && <span role="alert" className="mt-1 block text-rose-700">{validation[key]}</span>}</label>)}</fieldset>}

          {currentStep === 2 && <div className="mt-5 space-y-4"><h3 className="text-sm font-semibold text-slate-800">Resume and experience</h3>{user?.resume && <label className="flex items-start gap-2 border border-slate-200 p-3 text-xs text-slate-700"><input type="checkbox" checked={useProfileResume} onChange={(event) => { setUseProfileResume(event.target.checked); setRemoveResume(false); }} /><span>Use saved profile resume: <strong>{user.resume.fileName}</strong></span></label>}<label className="block text-xs font-semibold text-slate-700">Upload or replace resume/CV<input type="file" accept={acceptedDocuments.join(',')} onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size <= 5 * 1024 * 1024) { setResumeFile(file); setRemoveResume(false); setUseProfileResume(false); } else if (file) setValidation((current) => ({ ...current, resume: 'Choose a PDF, JPG, or PNG up to 5 MB.' })); }} className="mt-1 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-800" />{resumeFile && <span className="mt-1 block text-emerald-700">Selected: {resumeFile.name}</span>}{savedResume && !resumeFile && <span className="mt-1 block text-emerald-700">Saved to draft: {savedResume.fileName}</span>}{validation.resume && <span role="alert" className="mt-1 block text-rose-700">{validation.resume}</span>}</label><label className="block text-xs font-semibold text-slate-700">Relevant experience<textarea rows={6} maxLength={5000} value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="Summarize experience relevant to this role" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>{savedResume && <button type="button" onClick={() => { setRemoveResume(true); setUseProfileResume(false); setSavedResume(null); }} className="text-xs font-semibold text-rose-700 hover:underline">Remove saved resume from this application</button>}</div>}

          {currentStep === 3 && <div className="mt-5 space-y-4"><h3 className="text-sm font-semibold text-slate-800">Questions and cover letter</h3><label className="block text-xs font-semibold text-slate-700">Cover letter<textarea rows={5} maxLength={5000} value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>{requirements.map((requirement) => <div key={requirement._id}><label htmlFor={`requirement-${requirement._id}`} className="block text-xs font-semibold text-slate-700">{requirement.title}{requirement.isRequired ? ' *' : ' (optional)'}</label>{requirement.type === 'file' ? <><input id={`requirement-${requirement._id}`} type="file" accept={requirement.allowedFileTypes.join(',')} onChange={(event) => setRequirementFile(requirement, event.target.files?.[0])} className="mt-1 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-800" />{responses[requirement._id] && <p className="mt-1 text-[11px] text-emerald-700">{responses[requirement._id].name || responses[requirement._id].fileName || 'Saved to draft'}</p>}</> : <textarea id={`requirement-${requirement._id}`} rows={3} maxLength={5000} value={typeof responses[requirement._id] === 'string' ? responses[requirement._id] : ''} onChange={(event) => setResponses((current) => ({ ...current, [requirement._id]: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />}{validation[requirement._id] && <p role="alert" className="mt-1 text-xs text-rose-700">{validation[requirement._id]}</p>}</div>)}</div>}

          {currentStep === 4 && <div className="mt-5 space-y-3"><h3 className="text-sm font-semibold text-slate-800">Review your application</h3><dl className="divide-y divide-slate-200 border-y border-slate-200 text-xs">{[['Name', personal.name], ['Email', personal.email], ['Phone', personal.phone || 'Not provided'], ['Resume', resumeFile?.name || (useProfileResume ? user?.resume?.fileName : savedResume?.fileName) || 'Not attached'], ['Experience', experience || 'Not provided'], ['Cover letter', coverLetter || 'Not provided']].map(([label, value]) => <div key={label} className="grid grid-cols-[90px_1fr] gap-3 py-2"><dt className="font-semibold text-slate-600">{label}</dt><dd className="break-words text-slate-800">{value}</dd></div>)}</dl><div className="space-y-2">{requirements.map((requirement) => <p key={requirement._id} className="text-xs text-slate-700"><strong>{requirement.title}:</strong> {responses[requirement._id]?.name || responses[requirement._id]?.fileName || responses[requirement._id] || 'No response'}</p>)}</div></div>}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4"><button type="button" disabled={currentStep === 1 || submitting} onClick={() => { markDraftDirty(); setCurrentStep((step) => Math.max(1, step - 1)); }} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"><ArrowLeft className="h-3.5 w-3.5" />Back</button>{currentStep < 4 ? <button type="button" onClick={nextStep} className="inline-flex items-center gap-1 rounded-md bg-indigo-700 px-3 py-2 text-xs font-semibold text-white">Next<ArrowRight className="h-3.5 w-3.5" /></button> : <button type="button" disabled={submitting || savingDraft} onClick={submit} className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{submitting ? 'Submitting…' : 'Submit application'}</button>}</div>
          <div className="sr-only" aria-live="polite">{savingDraft ? 'Saving draft to your account' : 'Draft saved to your account'}</div>
          {!resumeFile && !user?.resume && !savedResume && <p className="flex items-center gap-2 text-[11px] text-slate-500"><Upload className="h-3.5 w-3.5" />Resume is optional unless requested by the company.</p>}
        </>}
      </section>
    </section>
  </div>;
};

export default JobApplicationWizard;