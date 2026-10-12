import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import CompanyEditor from '../components/forms/CompanyEditor';
import { ArrowLeft, Loader2 } from 'lucide-react';

const ProviderCompanyForm = () => {
  const { companyId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(Boolean(companyId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const organizationType = company?.organizationType || (searchParams.get('type') === 'business' ? 'business' : 'company');

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    apiAdapter.getMyCompany(companyId)
      .then((result) => { if (active) setCompany(result); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load company.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId]);

  const save = async (payload) => {
    setSaving(true);
    try {
      if (companyId) await apiAdapter.updateMyCompany(companyId, payload);
      else await apiAdapter.createCompany(payload);
      toast(companyId ? 'Company updated and sent for review.' : 'Company submitted for review.', 'success');
      navigate('/provider/companies');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) return <div className="mx-auto max-w-4xl px-4 py-10"><p role="alert" className="border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800">{error}</p></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link to={companyId ? `/provider/companies/${companyId}` : '/provider/companies'} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">{companyId ? `Edit ${organizationType}` : `Add a ${organizationType}`}</h1>
        <p className="mt-1 text-sm text-slate-500">{organizationType === 'business' ? 'Business' : 'Company'} details are reviewed before publication.</p>
      </header>
      <CompanyEditor initialCompany={company} organizationType={organizationType} onSave={save} saving={saving} onCancel={() => navigate('/provider/companies')} />
    </div>
  );
};

export default ProviderCompanyForm;
