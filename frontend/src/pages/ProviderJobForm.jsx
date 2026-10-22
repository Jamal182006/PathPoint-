import React, { useEffect, useState } from 'react';
import { LoadingState } from '../components/common/Loading';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import JobEditor from '../components/forms/JobEditor';
import { ArrowLeft } from 'lucide-react';

const ProviderJobForm = () => {
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState('');
  const companyId = searchParams.get('companyId') || '';
  const duplicateJobId = searchParams.get('duplicateJobId') || '';
  const draftKey = jobId
    ? `pathpoint:job-editor:edit:${jobId}`
    : `pathpoint:job-editor:new:${companyId}${duplicateJobId ? `:duplicate:${duplicateJobId}` : ''}`;

  useEffect(() => {
    if (!jobId && !companyId) {
      setError('Choose one of your companies before creating a job listing.');
      setLoading(false);
      return undefined;
    }
    let active = true;
    const sourceJobId = jobId || duplicateJobId;
    const loads = [sourceJobId ? apiAdapter.getProviderJob(sourceJobId) : Promise.resolve(null)];
    if (companyId) loads.push(apiAdapter.getMyCompany(companyId));
    Promise.all(loads).then(([jobData, companyData]) => {
      if (!active) return;
      setJob(jobData && duplicateJobId && !jobId ? {
        ...jobData,
        _id: undefined,
        requirements: (jobData.requirements || []).map(({ _id, ...requirement }) => requirement),
      } : jobData);
      setCompany(companyData || jobData?.companyId || null);
    }).catch((loadError) => { if (active) setError(loadError.message || 'Unable to load job details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jobId, duplicateJobId, companyId]);

  const save = async (payload) => {
    setSaving(true);
    try {
      if (jobId) await apiAdapter.updateProviderJob(jobId, payload);
      else await apiAdapter.createJob(companyId || company?._id, payload);
      toast(payload.workflowAction === 'draft' ? 'Job saved as a draft.' : 'Job submitted for admin review.', 'success');
      navigate(`/provider/companies/${companyId || company?._id}`);
    } catch (saveError) {
      toast(saveError.message || 'Unable to save this job.', 'error');
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <div className="mx-auto max-w-5xl px-4 py-10"><p role="alert" className="ui-alert ui-alert-danger">{error}</p></div>;
  if (!company && !job) return <div className="mx-auto max-w-5xl px-4 py-10"><p role="alert" className="ui-alert ui-alert-warning">Choose one of your companies before creating a job listing.</p><Link to="/provider/companies" className="mt-4 inline-flex text-sm font-semibold text-brand-700">View companies</Link></div>;
  if (!jobId && company?.status !== 'approved') return <div className="mx-auto max-w-5xl space-y-4 px-4 py-10"><p role="alert" className="ui-alert ui-alert-warning">This company must be approved before you can submit a job listing.</p><Link to={`/provider/companies/${company._id}`} className="inline-flex text-sm font-semibold text-brand-700">Return to company</Link></div>;

  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><Link to={company ? `/provider/companies/${company._id}` : '/provider/jobs'} onClick={(event) => { if (hasUnsavedChanges && !window.confirm('Leave without saving this job?')) event.preventDefault(); }} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" /> {company?.name || 'Job listings'}</Link><header className="border-b border-slate-200 pb-4"><h1 className="text-2xl font-bold text-slate-900">{jobId ? 'Edit job listing' : 'Create job listing'}</h1><p className="mt-1 text-sm text-slate-500">Submitted jobs await admin review before publication.</p></header><JobEditor initialJob={job} company={company} companyName={company?.name} saving={saving} draftKey={draftKey} onDirtyChange={setHasUnsavedChanges} onSave={save} onCancel={() => navigate(company ? `/provider/companies/${company._id}` : '/provider/jobs')} /></div>;
};

export default ProviderJobForm;
