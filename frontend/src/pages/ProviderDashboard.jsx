import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiAdapter } from '../services/apiAdapter';
import { BriefcaseBusiness, Building2, CircleAlert, Clock3, FileText, Globe, Loader2, MapPin, RefreshCw, Save, Store, Upload, Users } from 'lucide-react';

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
    const intervalId = window.setInterval(loadOverview, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
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
    return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div><p className="text-xs font-semibold uppercase text-indigo-700">Provider portal</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Overview</h1><p className="mt-1 text-sm text-slate-500">Company profiles, job listings, and applicant activity in one place.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/provider/companies" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Companies &amp; businesses</Link><Link to="/provider/jobs" className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800">Job listings</Link></div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3"><div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-500" />Provider verified</div><button type="button" onClick={() => { setOverview((current) => ({ ...current, loading: true, error: '' })); setOverviewRefresh((value) => value + 1); }} disabled={overview.loading} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${overview.loading ? 'animate-spin' : ''}`} />Refresh stats</button></div>

      {overview.error && <p role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-50 p-3 text-sm text-rose-800"><CircleAlert className="h-4 w-4" />{overview.error}</p>}
      <section aria-label="Provider workspace stats" className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Company profiles', value: overviewStats.companyProfiles, icon: Building2, href: '/provider/companies' },
          { label: 'Businesses', value: overviewStats.businesses, icon: Store, href: '/provider/companies' },
          { label: 'Job listings', value: overviewStats.jobs, icon: BriefcaseBusiness, href: '/provider/jobs' },
          { label: 'Applications received', value: overviewStats.applications, icon: Users, href: '/provider/jobs' },
          { label: 'Applications pending', value: overviewStats.pendingApplications, icon: Clock3, href: '/provider/jobs' },
          { label: 'Awaiting review', value: overviewStats.jobReviews + overviewStats.organizationReviews, icon: FileText, href: '/provider/companies' },
        ].map(({ label, value, icon: Icon, href }) => <Link key={label} to={href} className="group flex items-center justify-between border-b border-slate-200 py-4 hover:bg-slate-50"><div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{overview.loading ? <span className="inline-block h-7 w-8 animate-pulse bg-slate-200" /> : value}</p></div><Icon className="h-5 w-5 text-indigo-700" /></Link>)}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Manage your organization listings</h2><p className="mt-1 text-xs text-slate-500">Create or edit company and business profiles from Companies &amp; businesses.</p></div><Link to="/provider/companies" className="text-sm font-semibold text-indigo-700 hover:underline">Open company dashboard</Link></section>
    </div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Provider Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Business listing</h1>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          verification.status === 'approved'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : verification.status === 'rejected'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          <span className={`h-2 w-2 rounded-full ${verification.status === 'approved' ? 'bg-emerald-500' : verification.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'}`} />
          {verification.status === 'approved' ? 'Verified and published' : verification.status === 'rejected' ? 'Verification rejected' : !verification.documentName ? 'Document required' : 'Verification pending'}
        </div>
        {verification.status === 'approved'
          ? <Link to="/provider/companies" className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100">Company dashboard</Link>
          : <span className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-500">Company tools unlock after verification</span>}
      </div>

      {verification.status !== 'approved' && (
        <section className={`mb-7 border-l-4 p-4 ${verification.status === 'rejected' ? 'border-rose-500 bg-rose-50' : 'border-amber-500 bg-amber-50'}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
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
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  <FileText className="h-4 w-4 text-indigo-700" />
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
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
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
            <label className="block text-xs font-semibold text-slate-700">
              Business name *
              <input
                required
                maxLength={120}
                name="companyName"
                value={businessProfile.companyName}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Industry *
              <input
                required
                maxLength={100}
                name="industry"
                value={businessProfile.industry}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Location
              <input
                maxLength={120}
                name="location"
                value={businessProfile.location}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Website
              <input
                type="url"
                maxLength={200}
                name="website"
                value={businessProfile.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-700">
            About the business
            <textarea
              maxLength={1000}
              rows={5}
              name="description"
              value={businessProfile.description}
              onChange={handleChange}
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save listing
          </button>
        </form>

        <aside className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            {businessProfile.companyName || 'Your business'}
          </h2>
          <p className="mt-1 text-xs font-semibold text-indigo-700">{businessProfile.industry || 'Industry'}</p>
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
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 hover:underline"
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
