import React, { useEffect, useMemo, useState } from 'react';
import { LoadingState } from '../components/common/Loading';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import JobEditor from '../components/forms/JobEditor';
import { ArrowLeft, Building2, CheckCircle2, Clock, MapPin } from 'lucide-react';

const COMPANY_STATUS = {
  approved: { label: 'Approved', className: 'ui-badge-success' },
  pending: { label: 'Awaiting review', className: 'ui-badge-warning' },
  rejected: { label: 'Rejected', className: 'ui-badge-danger' },
};

const ProviderJobForm = () => {
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [choosingCompany, setChoosingCompany] = useState(false);
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
      // New listing without a company: the provider picks which organization
      // owns the posting. A single organization is selected automatically.
      let active = true;
      apiAdapter.getMyCompanies()
        .then((rows) => {
          if (!active) return;
          const list = Array.isArray(rows) ? rows : [];
          setCompanies(list);
          if (list.length === 1) {
            navigate(`/provider/jobs/new?companyId=${list[0]._id}`, { replace: true });
            return;
          }
          setChoosingCompany(true);
          setLoading(false);
        })
        .catch((loadError) => {
          if (!active) return;
          setError(loadError.message || 'Unable to load your companies.');
          setLoading(false);
        });
      return () => { active = false; };
    }

    let active = true;
    const sourceJobId = jobId || duplicateJobId;
    const loadJob = async () => {
      try {
        const [jobData, companyData] = await Promise.all([
          sourceJobId ? apiAdapter.getProviderJob(sourceJobId) : Promise.resolve(null),
          companyId ? apiAdapter.getMyCompany(companyId) : Promise.resolve(null),
        ]);
        // Editing a listing carries no company in the URL: fall back to the
        // company the listing belongs to so the editor keeps its address.
        let resolvedCompany = companyData;
        if (!resolvedCompany && jobData?.companyId?._id) {
          resolvedCompany = await apiAdapter.getMyCompany(jobData.companyId._id);
        }
        if (!active) return;
        setJob(jobData && duplicateJobId && !jobId ? {
          ...jobData,
          _id: undefined,
          requirements: (jobData.requirements || []).map(({ _id, ...requirement }) => requirement),
        } : jobData);
        setCompany(resolvedCompany || null);
        setChoosingCompany(false);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load job details.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadJob();
    return () => { active = false; };
  }, [jobId, duplicateJobId, companyId, navigate]);

  const selectCompany = (selected) => {
    setCompany(selected);
    setChoosingCompany(false);
    const next = new URLSearchParams(searchParams);
    next.set('companyId', selected._id);
    navigate(`/provider/jobs/new?${next.toString()}`, { replace: true });
  };

  const approvedCount = useMemo(
    () => companies.filter((item) => item.status === 'approved').length,
    [companies]
  );

  const save = async (payload) => {
    setSaving(true);
    try {
      if (jobId) await apiAdapter.updateProviderJob(jobId, payload);
      else await apiAdapter.createJob(companyId || company?._id, payload);
      toast(payload.workflowAction === 'draft' ? 'Job saved as a draft.' : 'Job submitted for admin review.', 'success');
      const returnToCompany = searchParams.get('from') === 'company';
      navigate(returnToCompany && (companyId || company?._id) ? `/provider/companies/${companyId || company?._id}` : '/provider/jobs');
    } catch (saveError) {
      toast(saveError.message || 'Unable to save this job.', 'error');
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p role="alert" className="ui-alert ui-alert-danger">{error}</p>
        <Link to="/provider/companies" className="mt-4 inline-flex text-sm font-semibold text-brand-700">View companies</Link>
      </div>
    );
  }

  // Company chooser: shown when the provider has more than one organization.
  if (choosingCompany) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/provider/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ArrowLeft className="h-4 w-4" /> Job listings
        </Link>

        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">Where should this job be listed?</h1>
          <p className="mt-1 text-sm text-slate-500">
            {companies.length === 1
              ? 'Your account has one organization. Select it to continue.'
              : `Your account has ${companies.length} organizations. Pick the one that will own this listing.`}
          </p>
        </header>

        {companies.length === 0 ? (
          <div className="ui-empty">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Building2 className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">No organizations yet</h2>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500">
              Add an organization first. Job listings are published under an approved organization.
            </p>
            <Link to="/provider/companies/new" className="ui-btn ui-btn-primary mt-5">Add organization</Link>
          </div>
        ) : (
          <>
            {approvedCount === 0 && (
              <p role="alert" className="ui-alert ui-alert-warning">
                None of your organizations are approved for publishing yet. An admin has to approve an organization before you can post a job.
              </p>
            )}

            <ul className="grid gap-3 sm:grid-cols-2">
              {companies.map((item) => {
                const isApproved = item.status === 'approved';
                const status = COMPANY_STATUS[item.status] || { label: item.status || 'Unknown', className: 'ui-badge-neutral' };
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => selectCompany(item)}
                      disabled={!isApproved}
                      className={`ui-card flex h-full w-full flex-col gap-2 p-4 text-left transition ${
                        isApproved
                          ? 'hover:border-slate-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
                          : 'cursor-not-allowed opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{item.category || 'Organization'}</p>
                        </div>
                        <span className={`ui-badge ${status.className} shrink-0`}>{status.label}</span>
                      </div>

                      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {item.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {item.location}
                          </span>
                        )}
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Ready to publish
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            Approval required
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    );
  }

  if (!company && !job) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p role="alert" className="ui-alert ui-alert-warning">Choose one of your companies before creating a job listing.</p>
        <Link to="/provider/companies" className="mt-4 inline-flex text-sm font-semibold text-brand-700">View companies</Link>
      </div>
    );
  }

  if (!jobId && company?.status !== 'approved') {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <p role="alert" className="ui-alert ui-alert-warning">This company must be approved before you can submit a job listing.</p>
        <Link to={`/provider/companies/${company._id}`} className="inline-flex text-sm font-semibold text-brand-700">Return to company</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to={company ? `/provider/companies/${company._id}` : '/provider/jobs'}
        onClick={(event) => { if (hasUnsavedChanges && !window.confirm('Leave without saving this job?')) event.preventDefault(); }}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
      >
        <ArrowLeft className="h-4 w-4" /> {company?.name || 'Job listings'}
      </Link>
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">{jobId ? 'Edit job listing' : 'Create job listing'}</h1>
        <p className="mt-1 text-sm text-slate-500">Submitted jobs await admin review before publication.</p>
      </header>
      <JobEditor
        initialJob={job}
        company={company}
        companyName={company?.name}
        saving={saving}
        draftKey={draftKey}
        onDirtyChange={setHasUnsavedChanges}
        onSave={save}
        onCancel={() => navigate(company ? `/provider/companies/${company._id}` : '/provider/jobs')}
      />
    </div>
  );
};

export default ProviderJobForm;
