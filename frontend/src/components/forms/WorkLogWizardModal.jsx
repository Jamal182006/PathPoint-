import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';

const steps = ['Basics', 'Time & details', 'Review'];
const categories = [
  ['general', 'General'], ['cleaning', 'Cleaning'], ['delivery', 'Delivery'],
  ['repair', 'Repair'], ['care', 'Care'], ['other', 'Other'],
];
const localDate = (value = new Date()) => {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};
const formatDateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const createForm = (record, recentRecord) => ({
  title: record?.title || recentRecord?.title || '',
  clientName: record?.clientName || recentRecord?.clientName || '',
  location: record?.location || '',
  category: record?.category || recentRecord?.category || 'general',
  startedAt: record?.startedAt ? formatDateInput(record.startedAt) : localDate(),
  endedAt: formatDateInput(record?.endedAt),
  hours: record?.hours ?? '',
  days: record?.days ?? '',
  payAmount: record?.payAmount ?? '',
  paymentStatus: record?.paymentStatus || 'pending',
  status: record?.status || 'ongoing',
  notes: record?.notes || '',
});

const WorkLogWizardModal = ({ record, recentRecord, onClose, onSave }) => {
  const [form, setForm] = useState(() => createForm(record, recentRecord));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const editing = Boolean(record?._id);

  const update = (field, value) => {
    setDirty(true);
    setErrors((current) => ({ ...current, [field]: '' }));
    setForm((current) => ({ ...current, [field]: value }));
  };

  const close = () => {
    if (saving) return;
    if (dirty && !window.confirm('Discard this work log? Your unsaved changes will be lost.')) return;
    onClose();
  };

  const validateStep = () => {
    const nextErrors = {};
    if (step === 0) {
      if (!form.title.trim()) nextErrors.title = 'Enter a project or task.';
      if (!form.startedAt) nextErrors.startedAt = 'Choose the work date.';
      if (!categories.some(([value]) => value === form.category)) nextErrors.category = 'Choose a category.';
    }
    if (step === 1) {
      const hours = Number(form.hours || 0);
      const days = Number(form.days || 0);
      if (!Number.isFinite(hours) || !Number.isFinite(days) || hours < 0 || days < 0 || (!hours && !days)) nextErrors.duration = 'Enter hours or days worked.';
      if (form.endedAt && form.endedAt < form.startedAt) nextErrors.endedAt = 'End date cannot be before the start date.';
      const pay = Number(form.payAmount || 0);
      if (!Number.isFinite(pay) || pay < 0) nextErrors.payAmount = 'Enter a valid non-negative amount.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => { if (validateStep()) setStep((current) => Math.min(steps.length - 1, current + 1)); };
  const back = () => setStep((current) => Math.max(0, current - 1));

  const submit = async (event) => {
    event.preventDefault();
    if (!validateStep()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        hours: Number(form.hours || 0),
        days: Number(form.days || 0),
        payAmount: Number(form.payAmount || 0),
        endedAt: form.endedAt || undefined,
      }, record?._id);
    } catch (error) {
      setErrors((current) => ({ ...current, submit: error.message || 'Unable to save this work log.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = (event) => {
    if (step < steps.length - 1) {
      event.preventDefault();
      next();
      return;
    }
    submit(event);
  };

  return <Modal isOpen onClose={close} title={editing ? 'Edit work log' : 'Log work'} maxWidth="max-w-2xl">
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <ol aria-label={`Step ${step + 1} of ${steps.length}`} className="grid grid-cols-3 gap-3">{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={`border-t-2 pt-2 text-xs font-semibold ${step >= index ? 'border-indigo-700 text-indigo-800' : 'border-slate-200 text-slate-400'}`}>{index + 1}. {label}</li>)}</ol>
      {step === 0 && <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="sr-only">Work basics</legend>
        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Project or task *<input autoFocus required maxLength={160} value={form.title} onChange={(event) => update('title', event.target.value)} aria-invalid={Boolean(errors.title)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="e.g. Kitchen renovation" />{errors.title && <span role="alert" className="mt-1 block text-rose-700">{errors.title}</span>}</label>
        <label className="text-xs font-semibold text-slate-700">Date *<input type="date" required value={form.startedAt} onChange={(event) => update('startedAt', event.target.value)} aria-invalid={Boolean(errors.startedAt)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" />{errors.startedAt && <span role="alert" className="mt-1 block text-rose-700">{errors.startedAt}</span>}</label>
        <label className="text-xs font-semibold text-slate-700">Category *<select value={form.category} onChange={(event) => update('category', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.category && <span role="alert" className="mt-1 block text-rose-700">{errors.category}</span>}</label>
        <label className="text-xs font-semibold text-slate-700">Employer or project<input maxLength={160} value={form.clientName} onChange={(event) => update('clientName', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="Optional" /></label>
        <label className="text-xs font-semibold text-slate-700">Location<input maxLength={200} value={form.location} onChange={(event) => update('location', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="Optional" /></label>
      </fieldset>}
      {step === 1 && <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="sr-only">Time and details</legend>
        <label className="text-xs font-semibold text-slate-700">End date<input type="date" min={form.startedAt} value={form.endedAt} onChange={(event) => update('endedAt', event.target.value)} aria-invalid={Boolean(errors.endedAt)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" />{errors.endedAt && <span role="alert" className="mt-1 block text-rose-700">{errors.endedAt}</span>}</label>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-700">Hours<input type="number" min="0" max="10000" step="0.25" value={form.hours} onChange={(event) => update('hours', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Days<input type="number" min="0" max="3650" step="0.25" value={form.days} onChange={(event) => update('days', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label></div>
        {errors.duration && <p role="alert" className="text-xs text-rose-700 sm:col-span-2">{errors.duration}</p>}
        <label className="text-xs font-semibold text-slate-700">Amount earned<input type="number" min="0" step="0.01" value={form.payAmount} onChange={(event) => update('payAmount', event.target.value)} aria-invalid={Boolean(errors.payAmount)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" />{errors.payAmount && <span role="alert" className="mt-1 block text-rose-700">{errors.payAmount}</span>}</label>
        <label className="text-xs font-semibold text-slate-700">Details<textarea rows={4} maxLength={3000} value={form.notes} onChange={(event) => update('notes', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="Work completed, materials, or follow-up" /></label>
      </fieldset>}
      {step === 2 && <section aria-label="Review work log" className="divide-y divide-slate-200 border-y border-slate-200 text-sm">{[
        ['Project/task', form.title], ['Date', form.startedAt], ['Category', categories.find(([value]) => value === form.category)?.[1] || form.category],
        ['Employer/project', form.clientName || 'Not provided'], ['Duration', `${form.hours || 0} hours · ${form.days || 0} days`],
        ['Earned', Number(form.payAmount || 0).toLocaleString()], ['Payment', form.paymentStatus], ['Work status', form.status], ['Details', form.notes || 'None'],
      ].map(([label, value]) => <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2.5"><span className="font-semibold text-slate-600">{label}</span><span className="whitespace-pre-wrap break-words text-slate-800">{value}</span></div>)}
        <div className="grid gap-3 py-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Work status<select value={form.status} onChange={(event) => update('status', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label className="text-xs font-semibold text-slate-700">Payment status<select value={form.paymentStatus} onChange={(event) => update('paymentStatus', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="pending">Pending</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label></div>
      </section>}
      {errors.submit && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{errors.submit}</p>}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4"><button type="button" onClick={step ? back : close} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{step ? <><ArrowLeft className="h-3.5 w-3.5" />Back</> : 'Cancel'}</button>{step < steps.length - 1 ? <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-md bg-indigo-700 px-4 py-2 text-xs font-semibold text-white">Next<ArrowRight className="h-3.5 w-3.5" /></button> : <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editing ? 'Save changes' : 'Save work log'}</button>}</div>
    </form>
  </Modal>;
};

export default WorkLogWizardModal;
