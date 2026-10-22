import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import AddressMap from '../common/AddressMap';
import { validateJob } from './jobValidation';
import { readJobDraft, removeJobDraft, writeJobDraft } from './jobDraftStorage';
import { phDocumentGroups, phDocumentPresets, standardPhDocumentTitles } from './phDocumentPresets';
import { safeDateTimeString, safeLocalDateString } from '../../utils/dateUtils';

const types = [
  ['full_time', 'Full-time'], ['part_time', 'Part-time'], ['contract', 'Contract'],
  ['temporary', 'Temporary'], ['internship', 'Internship'], ['casual', 'Casual'],
];
const steps = ['Job basics', 'Requirements', 'Pay & publish'];
const fileTypes = [['application/pdf', 'PDF'], ['image/jpeg', 'JPG'], ['image/png', 'PNG']];
const defaultFileTypes = ['application/pdf', 'image/jpeg', 'image/png'];

const emptyRequirement = (type = 'file') => ({
  type,
  title: '',
  description: '',
  isRequired: true,
  allowedFileTypes: [...defaultFileTypes],
  maxSizeMB: 5,
  order: 0,
});
const requirementFromDocument = (document) => ({
  ...emptyRequirement('file'),
  title: document.title,
  description: document.description || '',
});
const normalizeTitle = (value) => String(value || '').trim().toLowerCase();
const withOrder = (requirements) => requirements.map((requirement, order) => ({ ...requirement, order }));
// datetime-local and date inputs take local wall-clock values, so the stored
// instant is formatted in the browser's own timezone rather than sliced from
// UTC. Values that already elapsed are still shown so nothing silently
// disappears from a listing that is being edited.
const localDateTime = (value) => safeDateTimeString(value);
const localDate = (value) => safeLocalDateString(value);
const matchesCompanyLocation = (job, company) => {
  if (!company) return false;
  const hasCompanyCoordinates = company.latitude != null && company.longitude != null;
  if (hasCompanyCoordinates) {
    return Number(job.latitude) === Number(company.latitude) && Number(job.longitude) === Number(company.longitude);
  }
  return Boolean(company.location) && job.location === company.location && (job.latitude === '' || job.latitude == null);
};

const createInitialJob = (initialJob, company) => ({
    title: initialJob?.title || '',
    category: initialJob?.category || company?.category || '',
    description: initialJob?.description || '',
    responsibilities: initialJob?.responsibilities || [],
    qualifications: initialJob?.qualifications || [],
    skills: initialJob?.skills || [],
    requirements: (initialJob?.requirements || []).map((requirement) => ({ ...requirement, allowedFileTypes: requirement.allowedFileTypes || [] })),
    salaryType: initialJob?.salaryType || 'range',
    salaryMin: initialJob?.salaryMin ?? '',
    salaryMax: initialJob?.salaryMax ?? '',
    salaryPayPeriod: initialJob?.salaryPayPeriod || 'month',
    currency: initialJob?.currency || 'PHP',
    salaryNegotiable: initialJob?.salaryNegotiable || false,
    benefits: initialJob?.benefits || [],
    interviewerName: initialJob?.interviewerName || '',
    interviewerPosition: initialJob?.interviewerPosition || '',
    interviewerContact: initialJob?.interviewerContact || '',
    interviewDate: localDateTime(initialJob?.interviewDate),
    interviewLocation: initialJob?.interviewLocation || '',
    interviewLink: initialJob?.interviewLink || '',
    slots: initialJob?.slots || 1,
    applicationDeadline: localDate(initialJob?.applicationDeadline),
    employmentType: initialJob?.employmentType || 'full_time',
    workSetup: initialJob?.workSetup || 'on_site',
    experienceLevel: initialJob?.experienceLevel || '',
    educationLevel: initialJob?.educationLevel || '',
    dressCode: initialJob?.dressCode || '',
    workSchedule: initialJob?.workSchedule || '',
    startDate: localDate(initialJob?.startDate),
    contactName: initialJob?.contactName || '',
    contactEmail: initialJob?.contactEmail || '',
    location: initialJob?.location || company?.location || '',
    formattedAddress: initialJob?.formattedAddress || company?.formattedAddress || '',
    latitude: initialJob?.latitude ?? company?.latitude ?? '',
    longitude: initialJob?.longitude ?? company?.longitude ?? '',
    useCompanyLocation: initialJob ? matchesCompanyLocation(initialJob, company) : true,
  });

const JobEditor = ({ initialJob, company, companyName, saving, onSave, onCancel, onDirtyChange, draftKey }) => {
  const [recoveredDraft, setRecoveredDraft] = useState(null);
  const [job, setJob] = useState(() => createInitialJob(initialJob, company));
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [draftStatus, setDraftStatus] = useState('');
  const markDirty = () => { setDirty(true); onDirtyChange?.(true); };

  const addedDocumentTitles = new Set(job.requirements.map((requirement) => normalizeTitle(requirement.title)));

  useEffect(() => {
    const draft = readJobDraft(window.localStorage, draftKey);
    if (draft) setRecoveredDraft(draft);
  }, [draftKey]);

  useEffect(() => {
    if (!dirty || recoveredDraft || !draftKey) return undefined;
    setDraftStatus('Saving this device draft…');
    const timeout = window.setTimeout(() => {
      const saved = writeJobDraft(window.localStorage, draftKey, { job, currentStep });
      setDraftStatus(saved ? `Draft saved on this device at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Could not save a browser draft.');
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [dirty, recoveredDraft, draftKey, job, currentStep]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warnBeforeLeave = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, [dirty]);

  const updateRequirement = (index, changes) => setJob((current) => ({
    ...current,
    requirements: current.requirements.map((requirement, requirementIndex) => requirementIndex === index ? { ...requirement, ...changes } : requirement),
  }));

  const moveRequirement = (index, offset) => setJob((current) => {
    const destination = index + offset;
    if (destination < 0 || destination >= current.requirements.length) return current;
    const requirements = [...current.requirements];
    [requirements[index], requirements[destination]] = [requirements[destination], requirements[index]];
    return { ...current, requirements: withOrder(requirements) };
  });

  const removeRequirement = (index) => setJob((current) => ({
    ...current,
    requirements: withOrder(current.requirements.filter((_requirement, requirementIndex) => requirementIndex !== index)),
  }));

  const addRequirement = (type) => setJob((current) => ({
    ...current,
    requirements: withOrder([...current.requirements, emptyRequirement(type)]),
  }));

  const toggleDocument = (document) => {
    markDirty();
    setJob((current) => {
      const key = normalizeTitle(document.title);
      const exists = current.requirements.some((requirement) => normalizeTitle(requirement.title) === key);
      const requirements = exists
        ? current.requirements.filter((requirement) => normalizeTitle(requirement.title) !== key)
        : [...current.requirements, requirementFromDocument(document)];
      return { ...current, requirements: withOrder(requirements) };
    });
  };

  const addStandardRequirements = () => {
    markDirty();
    setJob((current) => {
      const existing = new Set(current.requirements.map((requirement) => normalizeTitle(requirement.title)));
      const additions = phDocumentPresets
        .filter((document) => standardPhDocumentTitles.includes(document.title) && !existing.has(normalizeTitle(document.title)))
        .map(requirementFromDocument);
      if (!additions.length) return current;
      return { ...current, requirements: withOrder([...current.requirements, ...additions]) };
    });
  };

  const validateCurrentStep = () => {
    if (currentStep === 0 && (!job.title.trim() || !job.category.trim() || !job.description.trim())) {
      return 'Enter the job title, category, and description before continuing.';
    }
    if (currentStep === 1 && job.requirements.some((requirement) => !requirement.title.trim() || (requirement.type === 'file' && !requirement.allowedFileTypes.length))) {
      return 'Complete each requirement or remove it before continuing.';
    }
    if (currentStep === 2) {
      if (!Number.isInteger(Number(job.slots)) || Number(job.slots) < 1 || Number(job.slots) > 10000) return 'Openings must be a whole number between 1 and 10000.';
      if (job.salaryMin !== '' && job.salaryMax !== '' && Number(job.salaryMin) > Number(job.salaryMax)) return 'Minimum salary cannot exceed maximum salary.';
      if (!/^[A-Z]{3}$/.test(String(job.currency || '').trim().toUpperCase())) return 'Currency must be a three-letter code.';
      if (job.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.contactEmail.trim())) return 'Enter a valid contact email before continuing.';
    }
    return '';
  };

  const continueStep = () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setCurrentStep((step) => Math.min(steps.length - 1, step + 1));
  };

  const restoreDraft = () => {
    if (!recoveredDraft) return;
    setJob({ ...createInitialJob(initialJob, company), ...recoveredDraft.job });
    setCurrentStep(recoveredDraft.currentStep);
    setRecoveredDraft(null);
    setError('');
    markDirty();
  };

  const discardDraft = () => {
    removeJobDraft(window.localStorage, draftKey);
    setRecoveredDraft(null);
    setDraftStatus('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const workflowAction = event.nativeEvent.submitter?.value || 'submit';
    const validationError = validateJob(job);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await onSave({
        ...job,
        workflowAction,
        responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : job.responsibilities.split('\n').map((value) => value.trim()).filter(Boolean),
        qualifications: Array.isArray(job.qualifications) ? job.qualifications : job.qualifications.split('\n').map((value) => value.trim()).filter(Boolean),
        skills: Array.isArray(job.skills) ? job.skills : job.skills.split(',').map((value) => value.trim()).filter(Boolean),
        benefits: Array.isArray(job.benefits) ? job.benefits : job.benefits.split('\n').map((value) => value.trim()).filter(Boolean),
        // Empty strings are sent on purpose: the API treats them as "clear this
        // field", while an omitted key would keep the previously saved value.
        salaryMin: job.salaryMin === '' ? '' : Number(job.salaryMin),
        salaryMax: job.salaryMax === '' ? '' : Number(job.salaryMax),
        slots: Number(job.slots),
        startDate: job.startDate ? new Date(`${job.startDate}T00:00:00`).toISOString() : '',
        interviewDate: job.interviewDate ? new Date(job.interviewDate).toISOString() : '',
        applicationDeadline: job.applicationDeadline ? new Date(`${job.applicationDeadline}T23:59:59`).toISOString() : '',
        requirements: withOrder(job.requirements),
      });
      removeJobDraft(window.localStorage, draftKey);
      setDraftStatus('');
      setDirty(false);
      onDirtyChange?.(false);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the job listing.');
    }
  };

  return (
    <form onSubmit={handleSubmit} onChange={markDirty} onInput={markDirty} onClickCapture={(event) => { if (event.target.closest('.leaflet-container')) markDirty(); }} className="space-y-6">
      {error && <p role="alert" className="ui-alert ui-alert-danger">{error}</p>}
      {recoveredDraft && <section role="status" className="flex flex-col justify-between gap-3 border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-semibold text-brand-950">Unfinished job draft found</h2><p className="mt-1 text-xs text-brand-800">Saved on this device {new Date(recoveredDraft.savedAt).toLocaleString()}. Restore it and continue where you left off?</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={discardDraft} className="rounded-md border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-800">Discard</button><button type="button" onClick={restoreDraft} className="rounded-md bg-brand-700 px-3 py-2 text-xs font-semibold text-white">Restore draft</button></div></section>}
      <p aria-live="polite" className="min-h-4 text-right text-xs text-slate-500">{draftStatus}</p>
      <nav aria-label="Job listing steps" className="border-b border-slate-200 pb-4">
        <p className="mb-3 text-xs font-semibold text-slate-600">Step {currentStep + 1} of {steps.length}: {steps[currentStep]}</p>
        <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((step, index) => <li key={step}><button type="button" disabled={index > currentStep} aria-current={currentStep === index ? 'step' : undefined} onClick={() => { setCurrentStep(index); setError(''); }} className={`w-full border-t-2 pt-2 text-left text-xs font-semibold sm:text-xs ${currentStep === index ? 'border-brand-700 text-brand-800' : index < currentStep ? 'border-emerald-600 text-slate-700' : 'border-slate-200 text-slate-400'} disabled:cursor-default`}>{step}</button></li>)}
        </ol>
      </nav>

      {currentStep === 0 && <section className="grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Company
          <input readOnly value={companyName || initialJob?.companyId?.name || ''} className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Job title *
          <input required maxLength={160} value={job.title} onChange={(event) => setJob({ ...job, title: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Category *
          <input required maxLength={100} value={job.category} onChange={(event) => setJob({ ...job, category: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description *
          <textarea required maxLength={10000} rows={6} value={job.description} onChange={(event) => setJob({ ...job, description: event.target.value })} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Employment type *
          <select value={job.employmentType} onChange={(event) => setJob({ ...job, employmentType: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
            {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Work setup
          <select value={job.workSetup} onChange={(event) => setJob({ ...job, workSetup: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="on_site">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option></select>
        </label>
        <section aria-labelledby="job-location-heading" className="space-y-3 border-t border-slate-200 pt-4 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 id="job-location-heading" className="text-sm font-semibold text-slate-800">Work location</h3><p className="mt-0.5 text-xs text-slate-500">Choose the company address or set a location just for this job.</p></div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={job.useCompanyLocation} onChange={(event) => { const checked = event.target.checked; setJob((current) => ({ ...current, useCompanyLocation: checked, location: checked ? (company?.location || '') : '', formattedAddress: checked ? (company?.formattedAddress || '') : '', latitude: checked ? (company?.latitude ?? '') : '', longitude: checked ? (company?.longitude ?? '') : '' })); markDirty(); }} />Use company location</label>
          </div>
          {job.useCompanyLocation
            ? <AddressMap readOnly compact className="h-40" location={company?.location || job.location} formattedAddress={company?.formattedAddress || job.formattedAddress} latitude={company?.latitude ?? job.latitude} longitude={company?.longitude ?? job.longitude} />
            : <AddressMap location={job.location} formattedAddress={job.formattedAddress} latitude={job.latitude} longitude={job.longitude} onChange={(coordinates) => { setJob((current) => ({ ...current, ...coordinates })); markDirty(); }} />}
        </section>
      </section>}

      {currentStep === 1 && <section className="space-y-5 border-b border-slate-200 pb-6">
        <div><h2 className="text-base font-bold text-slate-900">Documents required to apply</h2><p className="mt-1 text-xs text-slate-500">Tap a Philippine document to require it from applicants. Selected items appear below, where you can still add your own uploads or text questions.</p></div>
        <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-brand-900">Common Philippine documents</h3>
            <button type="button" onClick={addStandardRequirements} className="rounded-md border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50">Add standard set</button>
          </div>
          {phDocumentGroups.map((group) => <div key={group.label} className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{group.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.documents.map((document) => { const added = addedDocumentTitles.has(normalizeTitle(document.title)); return <button key={document.title} type="button" aria-pressed={added} title={document.description} onClick={() => toggleDocument(document)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${added ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800'}`}>{added ? '✓' : '+'} {document.title}</button>; })}
            </div>
          </div>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-sm font-semibold text-slate-800">Added requirements ({job.requirements.length})</h3><p className="mt-0.5 text-xs text-slate-500">Applicants must complete these before submitting.</p></div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Add custom<select value="" onChange={(event) => { if (event.target.value) addRequirement(event.target.value); }} className="rounded-md border border-slate-300 bg-white px-2 py-2"><option value="" disabled>Requirement type</option><option value="file">File upload</option><option value="text">Text response</option></select></label>
        </div>
        {job.requirements.map((requirement, index) => <fieldset key={requirement._id || index} className="border-y border-slate-200 py-4"><div className="flex items-center justify-between"><legend className="text-xs font-bold uppercase text-brand-700">{requirement.type === 'file' ? 'File upload' : 'Text response'}</legend><div className="flex gap-1"><button type="button" disabled={!index} onClick={() => moveRequirement(index, -1)} aria-label="Move requirement up" className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === job.requirements.length - 1} onClick={() => moveRequirement(index, 1)} aria-label="Move requirement down" className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => removeRequirement(index)} aria-label="Remove requirement" className="rounded p-1.5 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Requirement title<input value={requirement.title} onChange={(event) => updateRequirement(index, { title: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={requirement.isRequired} onChange={(event) => updateRequirement(index, { isRequired: event.target.checked })} />Required</label><label className="text-xs font-semibold text-slate-700 sm:col-span-2">Instructions<textarea rows={2} maxLength={1500} value={requirement.description} onChange={(event) => updateRequirement(index, { description: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>{requirement.type === 'file' && <details className="sm:col-span-2"><summary className="cursor-pointer text-xs font-semibold text-slate-600">File settings (accepted types, max size)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><fieldset><legend className="text-xs font-semibold text-slate-700">Allowed file types</legend><div className="mt-2 flex gap-4">{fileTypes.map(([mime, label]) => <label key={mime} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={requirement.allowedFileTypes.includes(mime)} onChange={(event) => updateRequirement(index, { allowedFileTypes: event.target.checked ? [...requirement.allowedFileTypes, mime] : requirement.allowedFileTypes.filter((item) => item !== mime) })} />{label}</label>)}</div></fieldset><label className="text-xs font-semibold text-slate-700">Max size (MB)<input type="number" min="0.1" max="10" step="0.1" value={requirement.maxSizeMB} onChange={(event) => updateRequirement(index, { maxSizeMB: Number(event.target.value) })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label></div></details>}</div></fieldset>)}
        {!job.requirements.length && <p className="border-y border-dashed border-slate-300 py-7 text-center text-sm text-slate-500">No requirements added yet. Pick a document above or add a custom one.</p>}
      </section>}

      {currentStep === 2 && <section className="space-y-6 border-b border-slate-200 pb-6">
        <div><h2 className="text-base font-bold text-slate-900">Pay &amp; publish</h2><p className="mt-1 text-xs text-slate-500">Set compensation, then review and submit. Optional details below can be filled in now or later.</p></div>
        <div className="grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">Salary type<select value={job.salaryType} onChange={(event) => setJob({ ...job, salaryType: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="range">Range</option><option value="fixed">Fixed</option></select></label>
          <label className="text-sm font-semibold text-slate-700">Minimum pay<input type="number" min="0" step="0.01" value={job.salaryMin} onChange={(event) => setJob({ ...job, salaryMin: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          <label className="text-sm font-semibold text-slate-700">Maximum pay<input type="number" min="0" step="0.01" value={job.salaryMax} onChange={(event) => setJob({ ...job, salaryMax: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          <label className="text-sm font-semibold text-slate-700">Currency<input required maxLength={3} minLength={3} value={job.currency} onChange={(event) => setJob({ ...job, currency: event.target.value.toUpperCase() })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={job.salaryNegotiable} onChange={(event) => setJob({ ...job, salaryNegotiable: event.target.checked })} />Negotiable</label>
          <label className="text-sm font-semibold text-slate-700">Pay period<select value={job.salaryPayPeriod} onChange={(event) => setJob({ ...job, salaryPayPeriod: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal">{['hour', 'day', 'week', 'month', 'year', 'project'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">Open slots *<input type="number" required min="1" max="10000" value={job.slots} onChange={(event) => setJob({ ...job, slots: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          <label className="text-sm font-semibold text-slate-700">Application deadline<input type="date" value={job.applicationDeadline} onChange={(event) => setJob({ ...job, applicationDeadline: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          <label className="text-sm font-semibold text-slate-700">Benefits<textarea rows={2} value={Array.isArray(job.benefits) ? job.benefits.join('\n') : job.benefits} onChange={(event) => setJob({ ...job, benefits: event.target.value })} placeholder="One benefit per line" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        </div>

        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Role details <span className="font-normal text-slate-500">(optional)</span></summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Experience level<input maxLength={80} value={job.experienceLevel} onChange={(event) => setJob({ ...job, experienceLevel: event.target.value })} placeholder="Entry, mid, senior" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Education level<input maxLength={120} value={job.educationLevel} onChange={(event) => setJob({ ...job, educationLevel: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Skills (comma separated)<input value={Array.isArray(job.skills) ? job.skills.join(', ') : job.skills} onChange={(event) => setJob({ ...job, skills: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Responsibilities<textarea rows={3} value={Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : job.responsibilities} onChange={(event) => setJob({ ...job, responsibilities: event.target.value })} placeholder="One responsibility per line" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Qualifications<textarea rows={3} value={Array.isArray(job.qualifications) ? job.qualifications.join('\n') : job.qualifications} onChange={(event) => setJob({ ...job, qualifications: event.target.value })} placeholder="One qualification per line" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Dress code<textarea rows={2} maxLength={500} value={job.dressCode} onChange={(event) => setJob({ ...job, dressCode: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Schedule / shifts<textarea rows={2} maxLength={500} value={job.workSchedule} onChange={(event) => setJob({ ...job, workSchedule: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Start date<input type="date" value={job.startDate} onChange={(event) => setJob({ ...job, startDate: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Contact person<input maxLength={120} value={job.contactName} onChange={(event) => setJob({ ...job, contactName: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Contact email<input type="email" maxLength={254} value={job.contactEmail} onChange={(event) => setJob({ ...job, contactEmail: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          </div>
        </details>

        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Interview details <span className="font-normal text-slate-500">(optional)</span></summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Interviewer name<input maxLength={120} value={job.interviewerName} onChange={(event) => setJob({ ...job, interviewerName: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Position<input maxLength={120} value={job.interviewerPosition} onChange={(event) => setJob({ ...job, interviewerPosition: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Contact<input maxLength={200} value={job.interviewerContact} onChange={(event) => setJob({ ...job, interviewerContact: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Interview date/time<input type="datetime-local" value={job.interviewDate} onChange={(event) => setJob({ ...job, interviewDate: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Interview location<input maxLength={300} value={job.interviewLocation} onChange={(event) => setJob({ ...job, interviewLocation: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">Interview link<input type="url" maxLength={500} value={job.interviewLink} onChange={(event) => setJob({ ...job, interviewLink: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          </div>
        </details>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div><h3 className="text-base font-bold text-slate-900">Review job listing</h3><p className="mt-1 text-xs text-slate-600">Check the details before saving this draft or sending it for admin review.</p></div>
          <dl className="grid gap-x-6 gap-y-3 border-y border-slate-200 py-4 text-sm sm:grid-cols-2">
            {[
              ['Company', companyName || initialJob?.companyId?.name || 'Company'],
              ['Position', job.title || 'Not entered'],
              ['Category', job.category || 'Not entered'],
              ['Employment', job.employmentType.replaceAll('_', ' ')],
              ['Work setup', job.workSetup.replaceAll('_', '-')],
              ['Location', job.formattedAddress || job.location || company?.location || 'Not listed'],
              ['Openings', String(job.slots || 1)],
              ['Compensation', job.salaryNegotiable ? 'Negotiable' : job.salaryMin !== '' ? `${job.currency} ${job.salaryMin}${job.salaryMax !== '' ? `–${job.salaryMax}` : ''} per ${job.salaryPayPeriod}` : 'Not listed'],
              ['Deadline', job.applicationDeadline || 'No deadline'],
              ['Requirements', `${job.requirements.length} item${job.requirements.length === 1 ? '' : 's'}`],
            ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-900">{value}</dd></div>)}
          </dl>
          <div><h3 className="text-sm font-semibold text-slate-800">Description</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{job.description || 'No description entered.'}</p></div>
          <div><h3 className="text-sm font-semibold text-slate-800">Applicant requirements</h3>{job.requirements.length ? <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">{job.requirements.map((requirement, index) => <li key={requirement._id || index}>{requirement.title || 'Untitled requirement'}{requirement.isRequired ? ' (required)' : ' (optional)'}</li>)}</ul> : <p className="mt-1 text-sm text-slate-600">None added.</p>}</div>
        </div>
      </section>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={() => { if (dirty && !window.confirm('Discard unsaved job changes?')) return; discardDraft(); onCancel(); }} disabled={saving} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button><div className="flex flex-wrap justify-end gap-2">{currentStep > 0 && <button type="button" disabled={saving} onClick={() => { setError(''); setCurrentStep((step) => Math.max(0, step - 1)); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Back</button>}{currentStep < steps.length - 1 ? <button type="button" disabled={saving} onClick={continueStep} className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Continue</button> : <><button type="submit" value="draft" disabled={saving} className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save as draft'}</button><button type="submit" value="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Submitting…' : 'Submit for admin review'}</button></>}</div></div>
    </form>
  );
};

export default JobEditor;
