import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import AddressMap from '../common/AddressMap';

const newRequirement = (type = 'file') => ({
  type,
  title: type === 'file' || type === 'document' ? '' : type === 'interview' ? 'Interview details' : type === 'dressCode' ? 'Dress code' : type === 'note' ? 'Additional notes' : '',
  description: '',
  isRequired: type === 'document' || type === 'file',
  options: [],
  allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxSizeMB: 5,
  interviewDate: '',
  interviewLocation: '',
  interviewLink: '',
});

const requirementTypes = [
  ['text', 'Text response'],
  ['date', 'Date'],
  ['select', 'Dropdown'],
  ['file', 'File upload'],
  ['document', 'Document'],
  ['interview', 'Interview details'],
  ['dressCode', 'Dress code'],
  ['note', 'Additional note'],
];

const CompanyEditor = ({ initialCompany, organizationType = 'company', onSave, onCancel, saving = false }) => {
  const [company, setCompany] = useState({
    organizationType: initialCompany?.organizationType || organizationType,
    name: initialCompany?.name || '',
    category: initialCompany?.category || '',
    description: initialCompany?.description || '',
    logo: initialCompany?.logo || '',
    location: initialCompany?.location || '',
    formattedAddress: initialCompany?.formattedAddress || '',
    latitude: initialCompany?.latitude ?? '',
    longitude: initialCompany?.longitude ?? '',
    locations: initialCompany?.locations || [],
    size: initialCompany?.size || '',
    website: initialCompany?.website || '',
    requirements: (initialCompany?.requirements || []).map((requirement) => ({
      ...requirement,
      interviewDate: requirement.interviewDate ? new Date(requirement.interviewDate).toISOString().slice(0, 16) : '',
      allowedFileTypes: requirement.allowedFileTypes || [],
    })),
  });
  const [error, setError] = useState('');
  const [logoLoading, setLogoLoading] = useState(false);

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setError('Choose a PNG or JPG logo up to 3 MB.');
      event.target.value = '';
      return;
    }
    setError('');
    setLogoLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setCompany((current) => ({ ...current, logo: String(reader.result || '') }));
      setLogoLoading(false);
    };
    reader.onerror = () => {
      setError('Unable to read this logo file.');
      setLogoLoading(false);
    };
    reader.readAsDataURL(file);
  };

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
        latitude: company.latitude === '' ? undefined : Number(company.latitude),
        longitude: company.longitude === '' ? undefined : Number(company.longitude),
        locations: typeof company.locations === 'string'
          ? company.locations.split(/[\n,]/).map((location) => location.trim()).filter(Boolean)
          : company.locations,
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
        <label className="text-sm font-semibold text-slate-700">{company.organizationType === 'business' ? 'Business name' : 'Company name'} *
          <input required maxLength={120} value={company.name} onChange={(event) => setCompany({ ...company, name: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm font-semibold text-slate-700">{company.organizationType === 'business' ? 'Industry' : 'Category'} *
          <input required maxLength={100} value={company.category} onChange={(event) => setCompany({ ...company, category: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Location
          <input maxLength={200} value={company.location} onChange={(event) => setCompany({ ...company, location: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Company size
          <input maxLength={40} value={company.size} onChange={(event) => setCompany({ ...company, size: event.target.value })} placeholder="e.g. 50–200 employees" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <div className="sm:col-span-2"><h2 className="mb-2 text-sm font-semibold text-slate-700">Map location</h2><AddressMap location={company.location} formattedAddress={company.formattedAddress} latitude={company.latitude} longitude={company.longitude} onChange={(coordinates) => setCompany((current) => ({ ...current, ...coordinates }))} /></div>
        <label className="text-sm font-semibold text-slate-700">Website
          <input type="url" maxLength={200} value={company.website} onChange={(event) => setCompany({ ...company, website: event.target.value })} placeholder="https://example.com" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Locations
          <textarea rows={2} maxLength={2400} value={company.locations.join('\n')} onChange={(event) => setCompany({ ...company, locations: event.target.value })} placeholder="One location per line" className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-slate-700">Logo URL
            <input type="url" maxLength={2000} value={company.logo.startsWith('data:') ? '' : company.logo} onChange={(event) => setCompany({ ...company, logo: event.target.value })} placeholder="https://example.com/logo.png" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{logoLoading ? 'Reading logo…' : 'Upload PNG/JPG'}<input type="file" accept="image/png,image/jpeg" disabled={logoLoading} onChange={handleLogoUpload} className="sr-only" /></label>
            {company.logo.startsWith('data:image/') && <><img src={company.logo} alt="Company logo preview" className="h-10 w-10 rounded-md border border-slate-200 object-contain" /><button type="button" onClick={() => setCompany({ ...company, logo: '' })} className="text-xs font-semibold text-rose-700 hover:underline">Remove uploaded logo</button></>}
          </div>
        </div>
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
                {['file', 'document'].includes(requirement.type) && <>
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
                    <input type="number" min="0.1" max="5" step="0.1" value={requirement.maxSizeMB} onChange={(event) => updateRequirement(index, { maxSizeMB: Number(event.target.value) })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                  </label>
                </>}
                {requirement.type === 'select' && <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Options (one per line)
                  <textarea rows={3} value={(requirement.options || []).join('\n')} onChange={(event) => updateRequirement(index, { options: event.target.value.split('\n') })} placeholder={'First option\nSecond option'} className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                </label>}
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
