import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

const types = [
  ['full_time', 'Full-time'], ['part_time', 'Part-time'], ['contract', 'Contract'],
  ['temporary', 'Temporary'], ['internship', 'Internship'], ['casual', 'Casual'],
];
const fileTypes = [['application/pdf', 'PDF'], ['image/jpeg', 'JPG'], ['image/png', 'PNG']];
const emptyRequirement = (type = 'file') => ({
  type,
  title: '',
  description: '',
  isRequired: true,
  allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxSizeMB: 5,
  order: 0,
});
const localDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() < Date.now() ? '' : date.toISOString().slice(0, 16);
};
const localDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() < Date.now() ? '' : date.toISOString().slice(0, 10);
};

const JobEditor = ({ initialJob, companyName, saving, onSave, onCancel }) => {
  const [job, setJob] = useState({
    title: initialJob?.title || '',
    description: initialJob?.description || '',
    requirements: (initialJob?.requirements || []).map((requirement) => ({ ...requirement, allowedFileTypes: requirement.allowedFileTypes || [] })),
    salaryType: initialJob?.salaryType || 'range',
    salaryMin: initialJob?.salaryMin ?? '',
    salaryMax: initialJob?.salaryMax ?? '',
    salaryPayPeriod: initialJob?.salaryPayPeriod || 'month',
    interviewerName: initialJob?.interviewerName || '',
    interviewerPosition: initialJob?.interviewerPosition || '',
    interviewerContact: initialJob?.interviewerContact || '',
    interviewDate: localDateTime(initialJob?.interviewDate),
    interviewLocation: initialJob?.interviewLocation || '',
    interviewLink: initialJob?.interviewLink || '',
    slots: initialJob?.slots || 1,
    applicationDeadline: localDate(initialJob?.applicationDeadline),
    employmentType: initialJob?.employmentType || 'full_time',
    location: initialJob?.location || '',
  });
  const [error, setError] = useState('');

  const updateRequirement = (index, changes) => setJob((current) => ({
    ...current,
    requirements: current.requirements.map((requirement, requirementIndex) => requirementIndex === index ? { ...requirement, ...changes } : requirement),
  }));

  const moveRequirement = (index, offset) => setJob((current) => {
    const destination = index + offset;
    if (destination < 0 || destination >= current.requirements.length) return current;
    const requirements = [...current.requirements];
    [requirements[index], requirements[destination]] = [requirements[destination], requirements[index]];
    return { ...current, requirements: requirements.map((requirement, order) => ({ ...requirement, order })) };
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (job.salaryMin !== '' && job.salaryMax !== '' && Number(job.salaryMin) > Number(job.salaryMax)) {
      setError('Minimum salary cannot exceed maximum salary.');
      return;
    }
    if (job.requirements.some((requirement) => !requirement.title.trim() || (requirement.type === 'file' && !requirement.allowedFileTypes.length))) {
      setError('Every requirement needs a title and file requirements need an allowed file type.');
      return;
    }
    try {
      await onSave({
        ...job,
        salaryMin: job.salaryMin === '' ? undefined : Number(job.salaryMin),
        salaryMax: job.salaryMax === '' ? undefined : Number(job.salaryMax),
        slots: Number(job.slots),
        interviewDate: job.interviewDate ? new Date(job.interviewDate).toISOString() : undefined,
        applicationDeadline: job.applicationDeadline ? new Date(`${job.applicationDeadline}T23:59:59`).toISOString() : undefined,
        requirements: job.requirements.map((requirement, order) => ({ ...requirement, order })),
      });
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the job listing.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p role="alert" className="border-l-4 border-rose-500 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <section className="grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Company
          <input readOnly value={companyName || initialJob?.companyId?.name || ''} className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Job title *
          <input required maxLength={160} value={job.title} onChange={(event) => setJob({ ...job, title: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description *
          <textarea required maxLength={10000} rows={6} value={job.description} onChange={(event) => setJob({ ...job, description: event.target.value })} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Employment type *
          <select value={job.employmentType} onChange={(event) => setJob({ ...job, employmentType: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
            {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Work location
          <input maxLength={200} value={job.location} onChange={(event) => setJob({ ...job, location: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
        </label>
      </section>

      <section className="space-y-3 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-base font-bold text-slate-900">Applicant requirements</h2><p className="mt-1 text-xs text-slate-500">Choose file uploads or short text responses and order them for applicants.</p></div><label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Add<select value="" onChange={(event) => { if (event.target.value) setJob((current) => ({ ...current, requirements: [...current.requirements, emptyRequirement(event.target.value)] })); }} className="rounded-md border border-slate-300 bg-white px-2 py-2"><option value="" disabled>Requirement type</option><option value="file">File upload</option><option value="text">Text response</option></select></label></div>
        {job.requirements.map((requirement, index) => <fieldset key={requirement._id || index} className="border-y border-slate-200 py-4"><div className="flex items-center justify-between"><legend className="text-xs font-bold uppercase text-indigo-700">{requirement.type === 'file' ? 'File upload' : 'Text response'}</legend><div className="flex gap-1"><button type="button" disabled={!index} onClick={() => moveRequirement(index, -1)} aria-label="Move requirement up" className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === job.requirements.length - 1} onClick={() => moveRequirement(index, 1)} aria-label="Move requirement down" className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => setJob((current) => ({ ...current, requirements: current.requirements.filter((_item, itemIndex) => itemIndex !== index) }))} aria-label="Remove requirement" className="rounded p-1.5 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Requirement title<input value={requirement.title} onChange={(event) => updateRequirement(index, { title: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={requirement.isRequired} onChange={(event) => updateRequirement(index, { isRequired: event.target.checked })} />Required</label><label className="text-xs font-semibold text-slate-700 sm:col-span-2">Instructions<textarea rows={2} maxLength={1500} value={requirement.description} onChange={(event) => updateRequirement(index, { description: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>{requirement.type === 'file' && <><fieldset className="sm:col-span-2"><legend className="text-xs font-semibold text-slate-700">Allowed file types</legend><div className="mt-2 flex gap-4">{fileTypes.map(([mime, label]) => <label key={mime} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={requirement.allowedFileTypes.includes(mime)} onChange={(event) => updateRequirement(index, { allowedFileTypes: event.target.checked ? [...requirement.allowedFileTypes, mime] : requirement.allowedFileTypes.filter((item) => item !== mime) })} />{label}</label>)}</div></fieldset><label className="text-xs font-semibold text-slate-700">Max size (MB)<input type="number" min="0.1" max="10" step="0.1" value={requirement.maxSizeMB} onChange={(event) => updateRequirement(index, { maxSizeMB: Number(event.target.value) })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label></>}</div></fieldset>)}
        {!job.requirements.length && <p className="border-y border-dashed border-slate-300 py-7 text-center text-sm text-slate-500">No requirements added.</p>}
      </section>

      <section className="grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">Salary type<select value={job.salaryType} onChange={(event) => setJob({ ...job, salaryType: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="range">Range</option><option value="fixed">Fixed</option></select></label>
        <label className="text-sm font-semibold text-slate-700">Minimum pay<input type="number" min="0" step="0.01" value={job.salaryMin} onChange={(event) => setJob({ ...job, salaryMin: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-sm font-semibold text-slate-700">Maximum pay<input type="number" min="0" step="0.01" value={job.salaryMax} onChange={(event) => setJob({ ...job, salaryMax: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-sm font-semibold text-slate-700">Pay period<select value={job.salaryPayPeriod} onChange={(event) => setJob({ ...job, salaryPayPeriod: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal">{['hour', 'day', 'week', 'month', 'year', 'project'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Open slots<input type="number" required min="1" max="10000" value={job.slots} onChange={(event) => setJob({ ...job, slots: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-sm font-semibold text-slate-700">Application deadline<input type="date" value={job.applicationDeadline} onChange={(event) => setJob({ ...job, applicationDeadline: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
      </section>

      <section className="grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Interviewer name<input maxLength={120} value={job.interviewerName} onChange={(event) => setJob({ ...job, interviewerName: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-sm font-semibold text-slate-700">Position<input maxLength={120} value={job.interviewerPosition} onChange={(event) => setJob({ ...job, interviewerPosition: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-sm font-semibold text-slate-700">Contact<input maxLength={200} value={job.interviewerContact} onChange={(event) => setJob({ ...job, interviewerContact: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-sm font-semibold text-slate-700">Interview date/time<input type="datetime-local" value={job.interviewDate} onChange={(event) => setJob({ ...job, interviewDate: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-sm font-semibold text-slate-700">Interview location<input maxLength={300} value={job.interviewLocation} onChange={(event) => setJob({ ...job, interviewLocation: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-sm font-semibold text-slate-700">Interview link<input type="url" maxLength={500} value={job.interviewLink} onChange={(event) => setJob({ ...job, interviewLink: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
      </section>

      <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} disabled={saving} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Saving…' : 'Save draft for review'}</button></div>
    </form>
  );
};

export default JobEditor;
