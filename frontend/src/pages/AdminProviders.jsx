import React, { useEffect, useState } from 'react';
import { TableLoadingRow } from '../components/common/Loading';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import {
  Building2,
  Check,
  Eye,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';

const statusStyles = {
  pending: 'ui-badge-warning',
  approved: 'ui-badge-success',
  rejected: 'ui-badge-danger',
};

export const AdminProviders = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
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

  // Dialog modal
  const [rejectDialog, setRejectDialog] = useState({ open: false, provider: null, reason: '' });

  const approveProvider = async (provider) => {
    setBusyProvider(provider.id);
    try {
      await apiAdapter.reviewProviderVerification(provider.id, 'approved', '');
      toast(`Provider "${provider.businessProfile?.companyName || provider.name}" verified.`, 'success');
      await loadProviders();
    } catch (error) {
      toast(error.message || 'Unable to approve this provider.', 'error');
    } finally {
      setBusyProvider('');
    }
  };

  const confirmRejection = async () => {
    const { provider, reason } = rejectDialog;
    if (!provider) return;
    if (provider.businessVerification?.status === 'approved') {
      toast('An approved business verification cannot be rejected.', 'error');
      setRejectDialog({ open: false, provider: null, reason: '' });
      return;
    }
    if (!reason.trim()) {
      toast('Please enter a rejection reason for the provider.', 'error');
      return;
    }
    setBusyProvider(provider.id);
    try {
      await apiAdapter.reviewProviderVerification(provider.id, 'rejected', reason.trim());
      toast(`Verification for "${provider.businessProfile?.companyName || provider.name}" rejected.`, 'success');
      setRejectDialog({ open: false, provider: null, reason: '' });
      await loadProviders();
    } catch (error) {
      toast(error.message || 'Unable to reject this provider.', 'error');
    } finally {
      setBusyProvider('');
    }
  };

  const closePreview = () => {
    if (documentPreview?.url) URL.revokeObjectURL(documentPreview.url);
    setDocumentPreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-page-title flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-brand-600" /> Business Verification
          </h1>
          <p className="mt-1 text-sm text-slate-500">Review provider business documents to verify their account before approving company listings.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Review status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="ui-input w-auto text-xs font-medium"
          >
            <option value="all">All providers</option>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <button
          type="button"
          onClick={loadProviders}
          disabled={loading}
          className="ui-btn ui-btn-secondary ui-btn-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="ui-table-shell">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="ui-th">Business / Owner</th>
                <th className="ui-th">Document</th>
                <th className="ui-th">Submitted</th>
                <th className="ui-th">Review</th>
                <th className="ui-th text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <TableLoadingRow colSpan={5} label="Loading providers…" />
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
                        className="inline-flex max-w-56 items-center gap-2 text-left font-semibold text-brand-700 hover:underline disabled:opacity-50"
                      >
                        {busyProvider === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 shrink-0" />}
                        <span className="truncate">{verification.documentName}</span>
                      </button> : <span className="text-xs text-warning-700">Awaiting provider document</span>}
                      {verification.documentSize && <div className="mt-1 text-xs text-slate-500">{(verification.documentSize / 1024 / 1024).toFixed(2)} MB</div>}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {verification.submittedAt ? new Date(verification.submittedAt).toLocaleDateString() : 'Not available'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`ui-badge uppercase ${statusStyles[verification.status] || 'ui-badge-neutral'}`}>
                        {verification.status || 'not submitted'}
                      </span>
                      {verification.rejectionReason && <p className="mt-2 max-w-52 text-xs leading-4 text-danger-700">{verification.rejectionReason}</p>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {verification.status !== 'approved' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => approveProvider(provider)}
                            disabled={!hasDocument || busyProvider === provider.id}
                            title={!hasDocument ? 'Provider must submit a document before approval' : 'Approve provider'}
                            className="ui-btn ui-btn-primary ui-btn-sm"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyProvider === provider.id}
                            onClick={() => setRejectDialog({ open: true, provider, reason: '' })}
                            className="ui-btn ui-btn-danger ui-btn-sm"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      ) : <span className="text-slate-500">Reviewed</span>}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="5" className="px-5 py-14 text-center text-sm text-slate-500">No providers found for this review status.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Preview Modal */}
      <Modal
        isOpen={Boolean(documentPreview)}
        onClose={closePreview}
        title={documentPreview?.providerName}
        maxWidth="max-w-5xl"
      >
        {documentPreview && (
          <div className="space-y-3">
            <p className="truncate text-xs text-slate-500">{documentPreview.fileName}</p>
            <iframe title="Business verification document preview" src={documentPreview.url} className="h-[70vh] w-full rounded-xl bg-slate-100" />
          </div>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectDialog.open && rejectDialog.provider?.businessVerification?.status !== 'approved'}
        onClose={() => setRejectDialog({ open: false, provider: null, reason: '' })}
        title={`Reject Verification: ${rejectDialog.provider?.businessProfile?.companyName || rejectDialog.provider?.name || ''}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Please provide a specific reason for rejecting this business verification document. The provider will see this feedback in their dashboard and can re-upload their credentials.
          </p>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Reason for rejection *</span>
            <textarea
              rows={4}
              maxLength={500}
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. The uploaded DTI certificate is blurry or expired. Please upload a clear copy of your current permit..."
              className="ui-input mt-1 w-full text-xs"
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRejectDialog({ open: false, provider: null, reason: '' })}
              className="ui-btn ui-btn-secondary ui-btn-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectDialog.reason.trim() || rejectDialog.provider?.businessVerification?.status === 'approved' || busyProvider === rejectDialog.provider?.id}
              onClick={confirmRejection}
              className="ui-btn ui-btn-danger ui-btn-sm"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProviders;
