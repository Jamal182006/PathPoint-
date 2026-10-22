import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiAdapter } from '../services/apiAdapter';
import { BriefcaseBusiness, Building2, Check, CircleAlert, FileText, Loader2, RefreshCw, Save, Upload, Users } from 'lucide-react';
import PhilippineLocationInput from '../components/common/PhilippineLocationInput';

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
  const [showBusinessProfile, setShowBusinessProfile] = useState(false);

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

  const businessProfileForm = (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
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
        <div>
          <span className="ui-label">Location</span>
          <div className="mt-1.5">
            <PhilippineLocationInput
              name="location"
              value={businessProfile.location || ''}
              onChange={(value) => setBusinessProfile((profile) => ({ ...profile, location: value }))}
              placeholder="Search a Philippine city or municipality"
            />
          </div>
        </div>
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
  );

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
      <div className="ui-container space-y-5 py-6">
        <header className="ui-panel overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="ui-eyebrow">Provider workspace</p>
                <h1 className="ui-page-title mt-1.5">{greeting}, {firstName}</h1>
                <p className="mt-1 text-sm text-slate-600">
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
                  <RefreshCw className={`h-4 w-4 ${overview.loading ? 'animate-spin' : ''}`} aria-hidden="true" />Refresh
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/provider/companies/new?type=company" className="ui-btn ui-btn-primary ui-btn-sm"><Building2 className="h-4 w-4" aria-hidden="true" />Add organization</Link>
              <Link to="/provider/jobs" className="ui-btn ui-btn-secondary ui-btn-sm"><BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />Job listings</Link>
              <Link to="/provider/companies" className="ui-btn ui-btn-ghost ui-btn-sm">Manage companies</Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 divide-slate-200 sm:grid-cols-4 sm:divide-x">
            {workspaceStats.map(({ label, value, href, hint }) => (
              <Link key={label} to={href} className="group px-5 py-3 transition-colors hover:bg-slate-50 sm:px-6">
                <dt className="ui-eyebrow">{label}</dt>
                <dd className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">
                  {overview.loading ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-slate-200" /> : value}
                </dd>
                <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>
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

        <div className="grid gap-4 lg:grid-cols-2">
        {hasOrganizations && (
          <section aria-labelledby="orgs-title" className="ui-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 id="orgs-title" className="ui-section-title">Your organizations</h2>
              <Link to="/provider/companies" className="text-sm font-semibold text-brand-700 hover:text-brand-800">View all</Link>
            </div>
            <ul className="divide-y divide-slate-200">
              {overview.companies.slice(0, 4).map((company) => (
                <li key={company._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
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
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
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
                <li key={job._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
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

        <section aria-labelledby="profile-title" className="ui-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <div>
              <h2 id="profile-title" className="ui-section-title">Business profile</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                This is how your business appears to applicants in the provider directory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBusinessProfile((open) => !open)}
              className="ui-btn ui-btn-secondary ui-btn-sm"
              aria-expanded={showBusinessProfile}
              aria-controls="business-profile-form"
            >
              {showBusinessProfile ? 'Hide details' : 'Edit details'}
            </button>
          </div>
          {showBusinessProfile && (
            <div id="business-profile-form" className="px-5 py-5">
              {businessProfileForm}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="ui-container py-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="ui-page-title">Business verification</h1>
          <p className="mt-1 text-sm text-slate-500">Your signup business is ready — just submit the required document for review.</p>
        </div>
        <div className={`ui-badge ${verification.status === 'approved' ? 'ui-badge-success' : verification.status === 'rejected' ? 'ui-badge-danger' : 'ui-badge-warning'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${verification.status === 'approved' ? 'bg-success-600' : verification.status === 'rejected' ? 'bg-danger-600' : 'bg-warning-600'}`} />
          {verification.status === 'approved' ? 'Verified and published' : verification.status === 'rejected' ? 'Verification rejected' : !verification.documentName ? 'Document required' : 'Verification pending'}
        </div>
        {verification.status === 'approved'
          ? <Link to="/provider/companies" className="ui-btn ui-btn-secondary ui-btn-sm">Company dashboard</Link>
          : null}
      </div>

      {verification.status !== 'approved' && (
        <section className={`ui-alert mb-7 ${verification.status === 'rejected' ? 'ui-alert-danger' : 'ui-alert-warning'}`}>
          <div className="flex w-full flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {verification.status === 'rejected' ? 'Update your verification documents' : !verification.documentName ? 'Submit a verification document' : 'Business verification is under review'}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {verification.status === 'rejected'
                  ? verification.rejectionReason || 'Submit an updated document based on the requirements below.'
                  : !verification.documentName
                    ? 'Upload the required document below to begin review. Your business was created from your signup details.'
                    : 'Your business will appear in the directory after an administrator verifies your documents.'}
              </p>
              {!verification.documentName && verification.status !== 'rejected' && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-3">
                  <p className="text-xs font-semibold text-slate-800">Document requirements</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                    <li><span className="font-medium">Individual / Business:</span> DTI Certificate OR Mayor&apos;s Permit OR BIR Form 2303</li>
                    <li><span className="font-medium">Company:</span> SEC Certificate of Incorporation OR BIR Form 2303</li>
                  </ul>
                </div>
              )}
            </div>
            {requiresDocumentUpload && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="ui-btn ui-btn-secondary ui-btn-sm cursor-pointer">
                  <FileText className="h-4 w-4 text-brand-700" />
                  <span>{verificationFile?.name ? `Selected: ${verificationFile.name}` : 'Choose document'}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                    onChange={(event) => setVerificationFile(event.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
                {verificationFile && (
                  <span className="text-xs text-slate-600 truncate max-w-xs">{verificationFile.name} ({Math.round(verificationFile.size / 1024)} KB)</span>
                )}
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
    </div>
  );
};

export default ProviderDashboard;
