import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

const newRequirement = (type = 'document') => ({
  type,
  title: type === 'document' ? '' : type === 'interview' ? 'Interview details' : type === 'dressCode' ? 'Dress code' : 'Additional notes',
  description: '',
  isRequired: type === 'document',
  allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxSizeMB: 5,
  interviewDate: '',
  interviewLocation: '',
  interviewLink: '',
});

const requirementTypes = [
  ['document', 'Document'],
  ['interview', 'Interview details'],
  ['dressCode', 'Dress code'],
  ['note', 'Additional note'],
];

const CompanyEditor = ({ initialCompany, onSave, onCancel, saving = false }) => {
  const [company, setCompany] = useState({
    name: initialCompany?.name || '',
    category: initialCompany?.category || '',
    description: initialCompany?.description || '',
    logo: initialCompany?.logo || '',
    location: initialCompany?.location || '',
    requirements: (initialCompany?.requirements || []).map((requirement) => ({
      ...requirement,
      interviewDate: requirement.interviewDate ? new Date(requirement.interviewDate).toISOString().slice(0, 16) : '',
      allowedFileTypes: requirement.allowedFileTypes || [],
    })),
  });
  const [error, setError] = useState('');

  const updateRequirement = (index, updates) => {
    setCompany((current) => ({
      ...current,
      requirements: current.requirements.map((requirement, requirementIndex) =>
        requirementIndex === index ? { ...requirement, ...updates } : requirement
      ),
    }));
  };

  const moveRequirement = (index, offset) => {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= company.requirements.length) return;
    setCompany((current) => {
      const requirements = [...current.requirements];
      [requirements[index], requirements[targetIndex]] = [requirements[targetIndex], requirements[index]];
      return { ...current, requirements: requirements.map((requirement, order) => ({ ...requirement, order })) };
    });
  };

  const removeRequirement = (index) => {
    setCompany((current) => ({
      ...current,
      requirements: current.requirements.filter((_requirement, requirementIndex) => requirementIndex !== index)
        .map((requirement, order) => ({ ...requirement, order })),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (company.requirements.some((requirement) => !requirement.title.trim())) {
      setError('Add a title to each requirement or remove the empty item.');
      return;
    }
    try {
      await onSave({
        ...company,
        requirements: company.requirements.map((requirement, order) => ({
          ...requirement,
          order,
          interviewDate: requirement.interviewDate ? new Date(requirement.interviewDate).toISOString() : undefined,
        })),
      });
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the company.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div role="alert" className="border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      <section className="grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Business name *
          <input required maxLength={120} value={company.name} onChange={(event) => setCompany({ ...company, name: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Category *
          <input required maxLength={100} value={company.category} onChange={(event) => setCompany({ ...company, category: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Location
          <input maxLength={200} value={company.location} onChange={(event) => setCompany({ ...company, location: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Logo URL
          <input type="url" maxLength={2000} value={company.logo} onChange={(event) => setCompany({ ...company, logo: event.target.value })} placeholder="https://example.com/logo.png" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description
          <textarea rows={4} maxLength={3000} value={company.description} onChange={(event) => setCompany({ ...company, description: event.target.value })} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Requirements</h2>
            <p className="mt-1 text-xs text-slate-500">Documents, interview information, dress code, and applicant instructions.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Add</span>
            <select value="" onChange={(event) => {
              if (event.target.value) setCompany((current) => ({ ...current, requirements: [...current.requirements, newRequirement(event.target.value)] }));
            }} className="rounded-md border border-slate-300 bg-white px-2.5 py-2">
              <option value="" disabled>Requirement type</option>
              {requirementTypes.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
            </select>
          </label>
        </div>

        <div className="space-y-3">
          {company.requirements.map((requirement, index) => (
            <fieldset key={requirement._id || `${requirement.type}-${index}`} className="border-y border-slate-200 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <legend className="text-xs font-bold uppercase text-indigo-700">{requirementTypes.find(([type]) => type === requirement.type)?.[1]}</legend>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={index === 0} onClick={() => moveRequirement(index, -1)} aria-label="Move requirement up" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" disabled={index === company.requirements.length - 1} onClick={() => moveRequirement(index, 1)} aria-label="Move requirement down" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => removeRequirement(index)} aria-label="Remove requirement" className="rounded p-1.5 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Title
                  <input maxLength={120} value={requirement.title} onChange={(event) => updateRequirement(index, { title: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={requirement.isRequired} onChange={(event) => updateRequirement(index, { isRequired: event.target.checked })} />
                  Required to submit
                </label>
                <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Instructions
                  <textarea rows={2} maxLength={2000} value={requirement.description} onChange={(event) => updateRequirement(index, { description: event.target.value })} className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                </label>
                {requirement.type === 'document' && <>
                  <fieldset className="sm:col-span-2">
                    <legend className="text-xs font-semibold text-slate-700">Allowed file types</legend>
                    <div className="mt-2 flex flex-wrap gap-4">
                      {[
                        ['application/pdf', 'PDF'],
                        ['image/jpeg', 'JPG'],
                        ['image/png', 'PNG'],
                      ].map(([mimeType, label]) => (
                        <label key={mimeType} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={requirement.allowedFileTypes.includes(mimeType)}
                            onChange={(event) => updateRequirement(index, {
                              allowedFileTypes: event.target.checked
                                ? [...requirement.allowedFileTypes, mimeType]
                                : requirement.allowedFileTypes.filter((type) => type !== mimeType),
                            })}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="text-xs font-semibold text-slate-700">Maximum size (MB)
                    <input type="number" min="0.1" max="10" step="0.1" value={requirement.maxSizeMB} onChange={(event) => updateRequirement(index, { maxSizeMB: Number(event.target.value) })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                  </label>
                </>}
                {requirement.type === 'interview' && <>
                  <label className="text-xs font-semibold text-slate-700">Interview date/time
                    <input type="datetime-local" value={requirement.interviewDate} onChange={(event) => updateRequirement(index, { interviewDate: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Location
                    <input maxLength={300} value={requirement.interviewLocation} onChange={(event) => updateRequirement(index, { interviewLocation: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Meeting link
                    <input type="url" maxLength={500} value={requirement.interviewLink} onChange={(event) => updateRequirement(index, { interviewLink: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                  </label>
                </>}
              </div>
            </fieldset>
          ))}
          {!company.requirements.length && <p className="border-y border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">No requirements added.</p>}
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">
          <Plus className="h-4 w-4" /> {saving ? 'Saving…' : initialCompany ? 'Save changes' : 'Submit company'}
        </button>
      </div>
    </form>
  );
};

export default CompanyEditor;
