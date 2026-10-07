import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiAdapter } from '../services/apiAdapter';
import { Building2, FileText, Globe, Loader2, MapPin, Save, Upload } from 'lucide-react';

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
  const requiresDocumentUpload = verification.status !== 'approved'
    && (!verification.documentName || verification.status === 'rejected');

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
