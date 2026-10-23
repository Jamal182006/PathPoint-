import React, { useEffect, useMemo, useState } from 'react';
import { LoadingState } from '../components/common/Loading';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { LocationMap } from '../components/common/AddressMap';
import PinButton from '../components/common/PinButton';
import { ArrowLeft, BadgeCheck, Briefcase, Building2, CalendarClock, CircleAlert, FileText, Loader2, MapPin, Upload } from 'lucide-react';

const CompanyDetail = () => {
  const { companyId } = useParams();
  const [searchParams] = useSearchParams();
  const resubmitId = searchParams.get('resubmit');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState(null);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState({});
  const [answers, setAnswers] = useState({});
  const [previousApplication, setPreviousApplication] = useState(null);
  const [companyJobs, setCompanyJobs] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiAdapter.getCompany(companyId),
      resubmitId ? apiAdapter.getMyCompanyApplication(resubmitId) : Promise.resolve(null),
      apiAdapter.getJobs().catch(() => []),
    ])
      .then(([record, application, allJobs]) => {
        if (!active) return;
        if (application && application.companyId !== companyId) throw new Error('This application does not belong to this company.');
        setCompany(record);
        if (application) {
          setPreviousApplication(application);
          setAnswers(application.formData || {});
        }
        const openJobs = (Array.isArray(allJobs) ? allJobs : []).filter(
          (j) => String(j.companyId?._id || j.companyId) === String(companyId) && j.status === 'open'
        );
        setCompanyJobs(openJobs);
      })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load this company.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId, resubmitId]);

  const requirements = useMemo(() => [...(company?.requirements || [])].sort((left, right) => left.order - right.order), [company]);
  const documentRequirements = requirements.filter((requirement) => ['document', 'file'].includes(requirement.type));
  const responseRequirements = requirements.filter((requirement) => ['text', 'date', 'select'].includes(requirement.type));
  const informationRequirements = requirements.filter((requirement) => !['document', 'file', 'text', 'date', 'select'].includes(requirement.type));

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
    for (const requirement of responseRequirements) {
      const value = String(answers[requirement._id] || '').trim();
      if (requirement.isRequired && !value) errors[requirement._id] = 'This field is required.';
      else if (value && requirement.type === 'date' && Number.isNaN(new Date(value).getTime())) errors[requirement._id] = 'Enter a valid date.';
      else if (value && requirement.type === 'select' && !requirement.options?.includes(value)) errors[requirement._id] = 'Choose one of the listed options.';
    }
    for (const requirement of documentRequirements) {
      if (requirement.isRequired && !files[requirement._id]) errors[requirement._id] = 'This document is required.';
    }
    setValidation(errors);
    if (Object.keys(errors).length) return;

    const submission = new FormData();
    const responseData = responseRequirements.reduce((result, requirement) => ({ ...result, [requirement._id]: answers[requirement._id] || '' }), {});
    submission.append('formData', JSON.stringify(responseData));
    documentRequirements.forEach((requirement) => {
      const file = files[requirement._id];
      if (file) submission.append(requirement._id, file, file.name);
    });

    setSubmitting(true);
    setProgress(0);
    try {
      await apiAdapter.submitCompanyApplication(companyId, submission, (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
      });
      toast(previousApplication ? 'Application resubmitted.' : 'Application submitted.', 'success');
      navigate('/my-applications');
    } catch (submitError) {
      toast(submitError.message || 'Unable to submit application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !company) return <div className="ui-container py-10"><div role="alert" className="ui-alert ui-alert-danger"><CircleAlert className="h-4 w-4" />{error || 'Company unavailable.'}</div></div>;

  return (
    <div className="ui-container space-y-7 py-8">
      <Link to="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> Browse jobs</Link>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start">
        {company.logo ? <img src={company.logo} alt={`${company.name} logo`} loading="lazy" className="h-16 w-16 rounded-xl border border-slate-200 object-contain" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Building2 className="h-7 w-7" /></span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-start justify-between gap-3"><p className="ui-eyebrow text-brand-700">{company.category}</p><PinButton itemType="company" itemId={companyId} details={{ title: company.name, subtitle: company.category, status: company.status === 'approved' ? 'Verified' : 'Pending review', latestUpdate: `Organization updated ${new Date(company.updatedAt).toLocaleDateString()}`, href: `/companies/${companyId}` }} /></div>
            <span className={`ui-badge ${company.status === 'approved' ? 'ui-badge-success' : 'ui-badge-warning'}`}>
              {company.status === 'approved' && <BadgeCheck className="h-3 w-3" />}
              {company.status === 'approved' ? 'Verified' : 'Pending verification'}
            </span>
          </div>
          <h1 className="ui-page-title mt-1">{company.name}</h1>
          {company.ownerName && <p className="mt-1 text-sm text-slate-600">Listed by {company.ownerName}</p>}
          {company.location && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 text-slate-400" />{company.location}</p>}
          {(company.size || company.locations?.length > 0 || company.website) && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">{company.size && <span>{company.size}</span>}{company.locations?.length > 0 && <span>Locations: {company.locations.join(', ')}</span>}{/^https?:\/\//i.test(company.website || '') && <a href={company.website} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">Company website</a>}</div>}
          {company.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">{company.description}</p>}
        </div>
      </header>

      <section className="max-w-2xl"><h2 className="mb-2 text-base font-bold text-slate-900">Location</h2><LocationMap address={company.formattedAddress || company.location} latitude={company.latitude} longitude={company.longitude} /></section>

      <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
        <div className="space-y-6">
          {companyJobs.length > 0 && (
            <div className="ui-card p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-brand-700" />
                  <h2 className="text-base font-bold text-slate-900">
                    Open Job Positions ({companyJobs.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-500">Direct applications</span>
              </div>
              <ul className="mt-2 divide-y divide-slate-100">
                {companyJobs.map((job) => (
                  <li key={job._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link to={`/jobs/${job._id}`} className="font-semibold text-slate-900 hover:text-brand-700 hover:underline">
                        {job.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {job.location || 'Location not specified'} · {String(job.employmentType || '').replaceAll('_', ' ')}
                        {job.salaryMin ? ` · ${job.currency || 'USD'} ${job.salaryMin.toLocaleString()}${job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : ''}` : ''}
                      </p>
                    </div>
                    <Link to={`/jobs/${job._id}`} className="ui-btn ui-btn-primary ui-btn-sm">
                      Apply for Job
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="text-base font-bold text-slate-900">Company general application requirements</h2>
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
              {informationRequirements.map((requirement) => (
                <div key={requirement._id} className="py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    {requirement.type === 'interview' ? <CalendarClock className="h-4 w-4 text-brand-700" /> : <FileText className="h-4 w-4 text-slate-500" />}
                    {requirement.title}
                    {requirement.isRequired && <span className="text-xs font-semibold uppercase tracking-caps text-danger-700">Required</span>}
                  </div>
                  {requirement.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">{requirement.description}</p>}
                  {requirement.type === 'interview' && <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {requirement.interviewDate && <p>{new Date(requirement.interviewDate).toLocaleString()}</p>}
                    {requirement.interviewLocation && <p>{requirement.interviewLocation}</p>}
                    {requirement.interviewLink && <a href={requirement.interviewLink} target="_blank" rel="noreferrer" className="text-brand-700 underline">Meeting link</a>}
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
            {resubmitId && <p className="ui-alert ui-alert-warning">Update your responses and documents, then resubmit for provider review.</p>}
            {responseRequirements.map((requirement) => (
              <div key={requirement._id}>
                <label className="block text-xs font-semibold text-slate-700">
                  {requirement.title}{requirement.isRequired ? ' *' : ' (optional)'}
                  {requirement.description && <span className="mt-1 block font-normal text-slate-500">{requirement.description}</span>}
                  {requirement.type === 'text' && <textarea rows={3} maxLength={5000} required={requirement.isRequired} value={answers[requirement._id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [requirement._id]: event.target.value }))} className="ui-input mt-2 font-normal" />}
                  {requirement.type === 'date' && <input type="date" required={requirement.isRequired} value={answers[requirement._id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [requirement._id]: event.target.value }))} className="ui-input mt-2 font-normal" />}
                  {requirement.type === 'select' && <select required={requirement.isRequired} value={answers[requirement._id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [requirement._id]: event.target.value }))} className="ui-input mt-2 font-normal"><option value="">Choose an option</option>{(requirement.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>}
                </label>
                {validation[requirement._id] && <p role="alert" className="ui-error-text">{validation[requirement._id]}</p>}
              </div>
            ))}
            {documentRequirements.map((requirement) => (
              <div key={requirement._id}>
                <label className="block text-xs font-semibold text-slate-700">
                  {requirement.title}{requirement.isRequired ? ' *' : ' (optional)'}
                  {requirement.description && <span className="mt-1 block font-normal text-slate-500">{requirement.description}</span>}
                  <span className="mt-1 block font-normal text-slate-500">{requirement.allowedFileTypes.map((type) => type.split('/')[1].toUpperCase()).join(', ')} · max {requirement.maxSizeMB} MB</span>
                  <input type="file" accept={requirement.allowedFileTypes.join(',')} onChange={(event) => selectFile(requirement, event.target.files?.[0] || null)} className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100" />
                </label>
                {files[requirement._id] && <p className="mt-1 text-xs text-success-700">Selected: {files[requirement._id].name}</p>}
                {validation[requirement._id] && <p role="alert" className="ui-error-text">{validation[requirement._id]}</p>}
              </div>
            ))}
            {!documentRequirements.length && <p className="border-y border-slate-200 py-3 text-xs text-slate-500">This listing has no required documents.</p>}
            {submitting && <div aria-live="polite" className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} /></div><p className="text-right text-xs text-slate-500">Uploading {progress}%</p></div>}
            <button type="submit" disabled={submitting} className="ui-btn ui-btn-primary w-full">
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
