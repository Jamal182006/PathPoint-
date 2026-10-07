import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import JobEditor from '../components/forms/JobEditor';
import { ArrowLeft, Loader2 } from 'lucide-react';

const ProviderJobForm = () => {
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const companyId = searchParams.get('companyId') || '';

  useEffect(() => {
    let active = true;
    const loads = [jobId ? apiAdapter.getProviderJob(jobId) : Promise.resolve(null)];
    if (companyId) loads.push(apiAdapter.getMyCompany(companyId));
    Promise.all(loads).then(([jobData, companyData]) => {
      if (!active) return;
      setJob(jobData);
      setCompany(companyData || jobData?.companyId || null);
    }).catch((loadError) => { if (active) setError(loadError.message || 'Unable to load job details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jobId, companyId]);

  const save = async (payload) => {
    setSaving(true);
    try {
      if (jobId) await apiAdapter.updateProviderJob(jobId, payload);
      else await apiAdapter.createJob(companyId || company?._id, payload);
      toast(jobId ? 'Job updated and returned to draft review.' : 'Job saved as a draft for admin review.', 'success');
      navigate('/provider/jobs');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) return <div className="mx-auto max-w-5xl px-4 py-10"><p role="alert" className="border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800">{error}</p></div>;
  if (!company && !job) return <div className="mx-auto max-w-5xl px-4 py-10"><p role="alert" className="border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-800">Choose one of your companies before creating a job listing.</p><Link to="/provider/companies" className="mt-4 inline-flex text-sm font-semibold text-indigo-700">View companies</Link></div>;

  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><Link to="/provider/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" /> Job listings</Link><header className="border-b border-slate-200 pb-4"><h1 className="text-2xl font-bold text-slate-900">{jobId ? 'Edit job listing' : 'Create job listing'}</h1><p className="mt-1 text-sm text-slate-500">Jobs are saved as drafts and require admin approval before opening.</p></header><JobEditor initialJob={job} companyName={company?.name} saving={saving} onSave={save} onCancel={() => navigate('/provider/jobs')} /></div>;
};

export default ProviderJobForm;
