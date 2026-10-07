import React, { useEffect, useState } from 'react';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import {
  Building2,
  Check,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';

const statusStyles = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

export const AdminProviders = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState('');
  const [documentPreview, setDocumentPreview] = useState(null);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const list = await apiAdapter.getAdminProviders({
        verificationStatus: statusFilter === 'all' ? undefined : statusFilter,
      });
      setProviders(list);
    } catch (error) {
      toast(error.message || 'Unable to load provider verifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, [statusFilter]);

  useEffect(() => () => {
    if (documentPreview?.url) URL.revokeObjectURL(documentPreview.url);
  }, [documentPreview]);

  const handleDocumentPreview = async (provider) => {
    setBusyProvider(provider.id);
    try {
      const blob = await apiAdapter.getProviderVerificationDocument(provider.id);
      const url = URL.createObjectURL(blob);
      setDocumentPreview({ url, providerName: provider.name, fileName: provider.businessVerification.documentName });
    } catch (error) {
      toast(error.message || 'Unable to open the verification document.', 'error');
    } finally {
      setBusyProvider('');
    }
  };

  const reviewProvider = async (provider, status) => {
    const rejectionReason = status === 'rejected'
      ? window.prompt(`Why is ${provider.businessProfile?.companyName || provider.name} being rejected?`)
      : '';
    if (status === 'rejected' && !rejectionReason?.trim()) return;

    setBusyProvider(provider.id);
    try {
      await apiAdapter.reviewProviderVerification(provider.id, status, rejectionReason);
      toast(`Verification ${status}.`, 'success');
      await loadProviders();
    } catch (error) {
      toast(error.message || `Unable to ${status} this provider.`, 'error');
    } finally {
      setBusyProvider('');
    }
  };

  const closePreview = () => {
    if (documentPreview?.url) URL.revokeObjectURL(documentPreview.url);
    setDocumentPreview(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
            <Building2 className="h-7 w-7 text-indigo-600" /> Provider Verification
          </h1>
          <p className="mt-1 text-sm text-slate-500">Review company ownership documents before publishing business listings.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Review status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          >
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All providers</option>
          </select>
        </label>
        <button
          type="button"
          onClick={loadProviders}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Business / Owner</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-5 py-3 text-right">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr><td colSpan="5" className="px-5 py-14 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : providers.length ? providers.map((provider) => {
              const verification = provider.businessVerification || {};
              const hasDocument = Boolean(verification.documentName);
              return (
                <tr key={provider.id} className="align-top hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{provider.businessProfile?.companyName || 'Business name missing'}</div>
                    <div className="mt-1 text-slate-600">{provider.name} · {provider.email}</div>
                    <div className="mt-1 text-slate-500">{provider.businessProfile?.industry || 'Industry not listed'}{provider.businessProfile?.location ? ` · ${provider.businessProfile.location}` : ''}</div>
                  </td>
                  <td className="px-4 py-4">
                    {hasDocument ? <button
                      type="button"
                      onClick={() => handleDocumentPreview(provider)}
                      disabled={busyProvider === provider.id}
                      className="inline-flex max-w-56 items-center gap-2 text-left font-semibold text-indigo-700 hover:underline disabled:opacity-50"
                    >
                      {busyProvider === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{verification.documentName}</span>
                    </button> : <span className="text-[11px] text-amber-700">Awaiting provider document</span>}
                    {verification.documentSize && <div className="mt-1 text-[11px] text-slate-500">{(verification.documentSize / 1024 / 1024).toFixed(2)} MB</div>}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {verification.submittedAt ? new Date(verification.submittedAt).toLocaleDateString() : 'Not available'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusStyles[verification.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      {verification.status || 'not submitted'}
                    </span>
                    {verification.rejectionReason && <p className="mt-2 max-w-52 text-[11px] leading-4 text-rose-700">{verification.rejectionReason}</p>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {verification.status !== 'approved' ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => reviewProvider(provider, 'approved')}
                          disabled={!hasDocument || busyProvider === provider.id}
                          title={!hasDocument ? 'Provider must submit a document before approval' : 'Approve provider'}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        ><Check className="h-3.5 w-3.5" /> Approve</button>
                        <button
                          type="button"
                          onClick={() => reviewProvider(provider, 'rejected')}
                          disabled={busyProvider === provider.id}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        ><X className="h-3.5 w-3.5" /> Reject</button>
                      </div>
                    ) : <span className="text-slate-400">Reviewed</span>}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan="5" className="px-5 py-14 text-center text-sm text-slate-500">No providers found for this review status.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {documentPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Business verification document">
          <div className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-slate-900">{documentPreview.providerName}</h2>
                <p className="truncate text-xs text-slate-500">{documentPreview.fileName}</p>
              </div>
              <button type="button" onClick={closePreview} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close document preview">
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe title="Business verification document preview" src={documentPreview.url} className="min-h-0 flex-1 bg-slate-100" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProviders;
