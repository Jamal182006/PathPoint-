import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiAdapter } from '../services/apiAdapter';
import { BriefcaseBusiness, Building2, Check, CircleAlert, Clock3, FileText, Globe, Loader2, MapPin, RefreshCw, Save, Store, Upload, Users } from 'lucide-react';

const emptyProfile = {
  companyName: '',
  industry: '',
  location: '',
  description: '',
  website: '',
};

export const ProviderDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businessProfile, setBusinessProfile] = useState({
    ...emptyProfile,
    ...user?.businessProfile,
  });
  const [saving, setSaving] = useState(false);
  const [verification, setVerification] = useState(user?.businessVerification || { status: 'not_submitted' });
  const [verificationFile, setVerificationFile] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [overview, setOverview] = useState({ companies: [], jobs: [], loading: true, error: '' });
  const [overviewRefresh, setOverviewRefresh] = useState(0);

  useEffect(() => {
    if (user?.businessVerification) {
      setVerification(user.businessVerification);
    }
  }, [user?.businessVerification]);
  const requiresDocumentUpload = verification.status !== 'approved'
    && (!verification.documentName || verification.status === 'rejected');
  const providerApproved = verification.status === 'approved';

  useEffect(() => {
    if (!providerApproved) return undefined;
    let active = true;
    const loadOverview = async () => {
      try {
        const [companies, jobs] = await Promise.all([apiAdapter.getMyCompanies(), apiAdapter.getProviderJobs()]);
        if (active) setOverview({ companies, jobs, loading: false, error: '' });
      } catch (error) {
        if (active) setOverview((current) => ({ ...current, loading: false, error: error.message || 'Unable to load provider stats.' }));
      }
    };
    loadOverview();
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') loadOverview(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [providerApproved, overviewRefresh]);

  const overviewStats = useMemo(() => {
    const { companies, jobs } = overview;
    return {
      organizations: companies.length,
      businesses: companies.filter((company) => company.organizationType === 'business').length,
      companyProfiles: companies.filter((company) => (company.organizationType || 'company') === 'company').length,
      jobs: jobs.length,
      applications: companies.reduce((total, company) => total + (company.applicantCount || 0), 0)
        + jobs.reduce((total, job) => total + (job.applicantCount || 0), 0),
      pendingApplications: companies.reduce((total, company) => total + (company.pendingApplicationCount || 0), 0)
        + jobs.reduce((total, job) => total + (job.pendingApplicationCount || 0), 0),
      jobReviews: jobs.filter((job) => job.reviewStatus === 'pending').length,
      organizationReviews: companies.filter((company) => company.status === 'pending').length,
    };
  }, [overview]);

  const submitVerificationDocument = async () => {
    if (!verificationFile) return;
    setUploadingDocument(true);
    try {
      const result = await apiAdapter.submitProviderVerificationDocument(verificationFile);
      setVerification(result);
      setVerificationFile(null);
      toast('Verification document submitted for review.', 'success');
    } catch (error) {
      toast(error.message || 'Unable to submit the verification document.', 'error');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setBusinessProfile((profile) => ({ ...profile, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updatedProfile = await apiAdapter.updateBusinessProfile(businessProfile);
      setBusinessProfile({ ...emptyProfile, ...updatedProfile });
      if (updatedProfile.verification) setVerification(updatedProfile.verification);
      toast('Business listing updated.', 'success');
    } catch (error) {
      toast(error.message || 'Unable to update your business listing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (providerApproved) {
    const firstName = String(user?.name || '').trim().split(/\s+/)[0] || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const workspaceLabel = user?.businessName || 'Your workspace';
    const hasOrganizations = overview.companies.length > 0;
    const hasJobs = overview.jobs.length > 0;
    const pendingReviews = overviewStats.jobReviews + overviewStats.organizationReviews;

    const workspaceStats = [
      {
        label: 'Organizations',
        value: overviewStats.organizations,
        href: '/provider/companies',
        hint: hasOrganizations
          ? `${overviewStats.companyProfiles} ${overviewStats.companyProfiles === 1 ? 'company' : 'companies'} · ${overviewStats.businesses} ${overviewStats.businesses === 1 ? 'business' : 'businesses'}`
          : 'None added yet',
      },
      {
        label: 'Job listings',
        value: overviewStats.jobs,
        href: '/provider/jobs',
        hint: hasJobs ? `${overviewStats.jobReviews} awaiting review` : 'None published yet',
      },
      {
        label: 'Applications received',
        value: overviewStats.applications,
        href: '/provider/jobs',
        hint: overviewStats.pendingApplications > 0 ? `${overviewStats.pendingApplications} still pending` : 'No applications yet',
      },
      {
        label: 'Awaiting review',
        value: pendingReviews,
        href: '/provider/companies',
        hint: pendingReviews > 0 ? 'An administrator approves these' : 'Nothing to review',
      },
    ];

    const setupSteps = [
      {
        title: 'Add an organization',
        description: 'Create your company or business profile so candidates can discover you.',
        icon: Building2,
        done: hasOrganizations,
        action: { label: 'Add organization', to: '/provider/companies/new?type=company' },
      },
      {
        title: 'Publish a job listing',
        description: 'Post your first opening and start receiving applications.',
        icon: BriefcaseBusiness,
        done: hasJobs,
        locked: !hasOrganizations,
        action: { label: 'Create a listing', to: '/provider/jobs' },
      },
      {
        title: 'Review applicants',
        description: 'Screen, shortlist, and message candidates from one place.',
        icon: Users,
        done: overviewStats.applications > 0,
        locked: !hasJobs,
      },
    ];

    return (
      <div className="ui-container space-y-6 py-8">
        <header className="ui-panel overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="ui-eyebrow">Provider workspace</p>
                <h1 className="ui-page-title mt-2">{greeting}, {firstName}</h1>
                <p className="mt-1.5 text-sm text-slate-600">
                  {workspaceLabel} · {overviewStats.organizations} {overviewStats.organizations === 1 ? 'organization' : 'organizations'} · {overviewStats.jobs} {overviewStats.jobs === 1 ? 'listing' : 'listings'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="ui-badge ui-badge-success"><span className="h-1.5 w-1.5 rounded-full bg-success-600" />Verified provider</span>
                <button
                  type="button"
                  onClick={() => { setOverview((current) => ({ ...current, loading: true, error: '' })); setOverviewRefresh((value) => value + 1); }}
                  disabled={overview.loading}
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                >
                  <RefreshCw className={`h-4 w-4 ${overview.loading ? 'animate-spin' : ''}`} />Refresh
                </button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/provider/companies/new?type=company" className="ui-btn ui-btn-primary ui-btn-sm"><Building2 className="h-4 w-4" />Add organization</Link>
              <Link to="/provider/jobs" className="ui-btn ui-btn-secondary ui-btn-sm"><BriefcaseBusiness className="h-4 w-4" />Job listings</Link>
              <Link to="/provider/companies" className="ui-btn ui-btn-ghost ui-btn-sm">Manage companies</Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 divide-slate-200 sm:grid-cols-4 sm:divide-x">
            {workspaceStats.map(({ label, value, href, hint }) => (
              <Link key={label} to={href} className="group px-6 py-4 transition-colors hover:bg-slate-50 sm:px-8">
                <dt className="ui-eyebrow">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                  {overview.loading ? <span className="inline-block h-7 w-8 animate-pulse rounded bg-slate-200" /> : value}
                </dd>
                <p className="mt-1 text-xs text-slate-500">{hint}</p>
              </Link>
            ))}
          </dl>
        </header>

        {overview.error && <p role="alert" className="ui-alert ui-alert-danger"><CircleAlert className="h-4 w-4 shrink-0" />{overview.error}</p>}

        {!hasOrganizations && (
          <section aria-labelledby="setup-title" className="ui-panel p-6 sm:p-8">
            <h2 id="setup-title" className="ui-section-title">Get your workspace running</h2>
            <p className="mt-1 text-sm text-slate-500">Three steps before candidates can apply to you.</p>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {setupSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className={`flex flex-col rounded-2xl border p-5 ${step.done ? 'border-success-200 bg-success-50/50' : step.locked ? 'border-slate-200 bg-slate-50/60' : 'border-brand-200 bg-brand-50/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step.done ? 'bg-success-600 text-white' : step.locked ? 'bg-slate-200 text-slate-500' : 'bg-brand-600 text-white'}`}>
                        {step.done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                      </span>
                      <Icon className={`h-5 w-5 ${step.locked ? 'text-slate-400' : 'text-brand-700'}`} aria-hidden="true" />
                    </div>
                    <h3 className={`mt-4 font-semibold ${step.locked ? 'text-slate-500' : 'text-slate-900'}`}>{step.title}</h3>
                    <p className="mt-1 flex-1 text-xs leading-5 text-slate-600">{step.description}</p>
                    {step.done
                      ? <p className="mt-4 text-xs font-semibold text-success-700">Complete</p>
                      : step.action && (
                        <Link
                          to={step.action.to}
                          className={`ui-btn ui-btn-sm mt-4 ${step.locked ? 'pointer-events-none opacity-40' : 'ui-btn-primary'}`}
                          aria-disabled={step.locked ? 'true' : undefined}
                        >
                          {step.action.label}
                        </Link>
                      )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {hasOrganizations && (
          <section aria-labelledby="orgs-title" className="ui-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 id="orgs-title" className="ui-section-title">Your organizations</h2>
              <Link to="/provider/companies" className="text-sm font-semibold text-brand-700 hover:text-brand-800">View all</Link>
            </div>
            <ul className="divide-y divide-slate-200">
              {overview.companies.slice(0, 4).map((company) => (
                <li key={company._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{company.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{company.category}{company.location ? ` · ${company.location}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`ui-badge ${company.status === 'approved' ? 'ui-badge-success' : company.status === 'rejected' ? 'ui-badge-danger' : 'ui-badge-warning'}`}>
                      {company.status === 'pending' ? 'Pending verification' : company.status === 'approved' ? 'Verified' : company.status}
                    </span>
                    <Link to={`/provider/companies/${company._id}`} className="ui-btn ui-btn-secondary ui-btn-sm">Open</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="jobs-title" className="ui-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 id="jobs-title" className="ui-section-title">Latest job listings</h2>
            <Link to="/provider/jobs" className="text-sm font-semibold text-brand-700 hover:text-brand-800">View all</Link>
          </div>
          {!hasJobs ? (
            <div className="ui-empty border-0 bg-transparent px-6 py-10">
              <BriefcaseBusiness className="h-8 w-8 text-slate-300" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-slate-900">{hasOrganizations ? 'No listings yet' : 'No job listings'}</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {hasOrganizations
                  ? 'Publish your first opening to start receiving applications.'
                  : 'Add an approved organization first, then create your first draft.'}
              </p>
              <Link
                to={hasOrganizations ? '/provider/jobs' : '/provider/companies/new?type=company'}
                className="ui-btn ui-btn-primary ui-btn-sm mt-5"
              >
                {hasOrganizations ? 'Create a listing' : 'Add organization'}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {overview.jobs.slice(0, 4).map((job) => (
                <li key={job._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{job.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {job.companyId?.name || 'Company'} · {job.location || 'Location not listed'} · {String(job.employmentType || '').replaceAll('_', ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">{job.applicantCount || 0} {job.applicantCount === 1 ? 'applicant' : 'applicants'}</span>
                    <Link to={`/provider/jobs/${job._id}/applicants`} className="ui-btn ui-btn-secondary ui-btn-sm">Applicants</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="ui-container py-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="ui-page-title">Business listing</h1>
        </div>
        <div className={`ui-badge ${verification.status === 'approved' ? 'ui-badge-success' : verification.status === 'rejected' ? 'ui-badge-danger' : 'ui-badge-warning'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${verification.status === 'approved' ? 'bg-success-600' : verification.status === 'rejected' ? 'bg-danger-600' : 'bg-warning-600'}`} />
          {verification.status === 'approved' ? 'Verified and published' : verification.status === 'rejected' ? 'Verification rejected' : !verification.documentName ? 'Document required' : 'Verification pending'}
        </div>
        {verification.status === 'approved'
          ? <Link to="/provider/companies" className="ui-btn ui-btn-secondary ui-btn-sm">Company dashboard</Link>
          : <span className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">Company tools unlock after verification</span>}
      </div>

      {verification.status !== 'approved' && (
        <section className={`ui-alert mb-7 ${verification.status === 'rejected' ? 'ui-alert-danger' : 'ui-alert-warning'}`}>
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {verification.status === 'rejected' ? 'Update your verification documents' : !verification.documentName ? 'Submit a verification document' : 'Business verification is under review'}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {verification.status === 'rejected'
                  ? verification.rejectionReason || 'Submit an updated business registration, license, or ownership record.'
                  : !verification.documentName
                    ? 'Upload a business registration, license, or official ownership record to begin review.'
                    : 'Your business will appear in the directory after an administrator verifies your documents.'}
              </p>
            </div>
            {requiresDocumentUpload && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="ui-btn ui-btn-secondary ui-btn-sm cursor-pointer">
                  <FileText className="h-4 w-4 text-brand-700" />
                  <span className="max-w-48 truncate">{verificationFile?.name || 'Choose document'}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                    onChange={(event) => setVerificationFile(event.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  onClick={submitVerificationDocument}
                  disabled={!verificationFile || uploadingDocument}
                  className="ui-btn ui-btn-primary ui-btn-sm"
                >
                  {uploadingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {verification.status === 'rejected' ? 'Resubmit' : 'Submit document'}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="ui-label">
              Business name *
              <input
                required
                maxLength={120}
                name="companyName"
                value={businessProfile.companyName}
                onChange={handleChange}
                className="ui-input mt-1.5"
              />
            </label>
            <label className="ui-label">
              Industry *
              <input
                required
                maxLength={100}
                name="industry"
                value={businessProfile.industry}
                onChange={handleChange}
                className="ui-input mt-1.5"
              />
            </label>
            <label className="ui-label">
              Location
              <input
                maxLength={120}
                name="location"
                value={businessProfile.location}
                onChange={handleChange}
                className="ui-input mt-1.5"
              />
            </label>
            <label className="ui-label">
              Website
              <input
                type="url"
                maxLength={200}
                name="website"
                value={businessProfile.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="ui-input mt-1.5"
              />
            </label>
          </div>
          <label className="ui-label">
            About the business
            <textarea
              maxLength={1000}
              rows={5}
              name="description"
              value={businessProfile.description}
              onChange={handleChange}
              className="ui-input mt-1.5 resize-y"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="ui-btn ui-btn-primary"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save listing
          </button>
        </form>

        <aside className="ui-card p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            {businessProfile.companyName || 'Your business'}
          </h2>
          <p className="mt-1 text-xs font-semibold text-brand-700">{businessProfile.industry || 'Industry'}</p>
          {businessProfile.location && (
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              {businessProfile.location}
            </p>
          )}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {businessProfile.description || 'Add a business description to complete your public listing.'}
          </p>
          {businessProfile.website && (
            <a
              href={businessProfile.website}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand-700 hover:underline"
            >
              <Globe className="h-4 w-4" />
              Visit website
            </a>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ProviderDashboard;
