import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import PhilippineLocationInput from '../common/PhilippineLocationInput';
import { matchesPhilippineLocation } from '../../utils/phLocations';

const categories = [
  ['general', 'General'], ['cleaning', 'Cleaning'], ['delivery', 'Delivery'],
  ['repair', 'Repair'], ['care', 'Care'], ['other', 'Other'],
];
const localDate = (value = new Date()) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};
const formatDateInput = (value) => {
  if (!value) return '';
  try {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};
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

const fieldClass = 'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal';

const WorkLogWizardModal = ({ record, recentRecord, onClose, onSave }) => {
  const [form, setForm] = useState(() => createForm(record, recentRecord));
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

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Enter a project or task.';
    if (!form.startedAt) nextErrors.startedAt = 'Choose the work date.';
    const hours = Number(form.hours || 0);
    const days = Number(form.days || 0);
    if (!Number.isFinite(hours) || !Number.isFinite(days) || hours < 0 || days < 0 || (!hours && !days)) {
      nextErrors.duration = 'Enter hours or days worked.';
    }
    const payAmount = Number(form.payAmount || 0);
    if (!Number.isFinite(payAmount) || payAmount < 0) nextErrors.payAmount = 'Enter a valid non-negative amount.';
    if (form.endedAt && form.endedAt < form.startedAt) nextErrors.endedAt = 'End date cannot be before the start date.';
    if (form.location.trim() && !matchesPhilippineLocation(form.location)) {
      nextErrors.location = 'Choose a Philippine city, municipality, or Pangasinan barangay from the suggestions.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      await onSave({
        ...form,
        hours,
        days,
        payAmount,
        endedAt: form.endedAt || undefined,
      }, record?._id);
    } catch (error) {
      setErrors((current) => ({ ...current, submit: error.message || 'Unable to save this work log.' }));
    } finally {
      setSaving(false);
    }
  };

  return <Modal isOpen onClose={close} title={editing ? 'Edit work log' : 'Log work'} maxWidth="max-w-2xl">
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-500">Add the task and time worked. You can fill in the rest later.</p>

      <label className="block text-xs font-semibold text-slate-700">Project or task *
        <input autoFocus required maxLength={160} value={form.title} onChange={(event) => update('title', event.target.value)} aria-invalid={Boolean(errors.title)} className={fieldClass} placeholder="e.g. Water pump repair" />
        {errors.title && <span role="alert" className="mt-1 block text-rose-700">{errors.title}</span>}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-700">Date worked *
          <input type="date" required max={localDate()} value={form.startedAt} onChange={(event) => update('startedAt', event.target.value)} aria-invalid={Boolean(errors.startedAt)} className={fieldClass} />
          {errors.startedAt && <span role="alert" className="mt-1 block text-rose-700">{errors.startedAt}</span>}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold text-slate-700">Hours
            <input type="number" min="0" max="10000" step="0.25" inputMode="decimal" value={form.hours} onChange={(event) => update('hours', event.target.value)} className={fieldClass} placeholder="0" />
          </label>
          <label className="block text-xs font-semibold text-slate-700">Days
            <input type="number" min="0" max="3650" step="0.25" inputMode="decimal" value={form.days} onChange={(event) => update('days', event.target.value)} className={fieldClass} placeholder="0" />
          </label>
        </div>
        {errors.duration && <p role="alert" className="text-xs text-rose-700 sm:col-span-2">{errors.duration}</p>}
      </div>

      <label className="block text-xs font-semibold text-slate-700">Amount earned <span className="font-normal text-slate-500">(optional)</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" value={form.payAmount} onChange={(event) => update('payAmount', event.target.value)} aria-invalid={Boolean(errors.payAmount)} className={fieldClass} placeholder="0.00" />
        {errors.payAmount && <span role="alert" className="mt-1 block text-rose-700">{errors.payAmount}</span>}
      </label>

      <details className="rounded-lg border border-slate-200 px-3 py-2.5" open={editing}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">More details <span className="font-normal text-slate-500">(optional)</span></summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">Employer or project
            <input maxLength={160} value={form.clientName} onChange={(event) => update('clientName', event.target.value)} className={fieldClass} placeholder="Who was the work for?" />
          </label>
          <div className="text-xs font-semibold text-slate-700"><label htmlFor="work-log-location">Location</label>
            <PhilippineLocationInput id="work-log-location" value={form.location} onChange={(value) => update('location', value)} placeholder="Search city, municipality, or barangay" maxLength={200} className="mt-1 py-2.5" />
            {errors.location && <span role="alert" className="mt-1 block text-rose-700">{errors.location}</span>}
          </div>
          <label className="block text-xs font-semibold text-slate-700">Category
            <select value={form.category} onChange={(event) => update('category', event.target.value)} className={`${fieldClass} bg-white`}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">End date
            <input type="date" min={form.startedAt} max={localDate()} value={form.endedAt} onChange={(event) => update('endedAt', event.target.value)} aria-invalid={Boolean(errors.endedAt)} className={fieldClass} />
            {errors.endedAt && <span role="alert" className="mt-1 block text-rose-700">{errors.endedAt}</span>}
          </label>
          <label className="block text-xs font-semibold text-slate-700">Work status
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className={`${fieldClass} bg-white`}><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">Payment status
            <select value={form.paymentStatus} onChange={(event) => update('paymentStatus', event.target.value)} className={`${fieldClass} bg-white`}><option value="pending">Pending</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select>
          </label>
          <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">Notes
            <textarea rows={3} maxLength={3000} value={form.notes} onChange={(event) => update('notes', event.target.value)} className={fieldClass} placeholder="Work completed, materials, or follow-up" />
          </label>
        </div>
      </details>

      {errors.submit && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{errors.submit}</p>}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <button type="button" onClick={close} disabled={saving} className="ui-btn ui-btn-secondary ui-btn-sm">Cancel</button>
        <button type="submit" disabled={saving} className="ui-btn ui-btn-primary ui-btn-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editing ? 'Save changes' : 'Save work log'}</button>
      </div>
    </form>
  </Modal>;
};

export default WorkLogWizardModal;
