import React, { useEffect, useState } from 'react';
import { TableLoadingRow } from '../components/common/Loading';
import { Link } from 'react-router-dom';
import adminApi from '../api/adminApi';
import { useToast } from '../components/common/Toast';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Modal } from '../components/common/Modal';
import { Archive, Building2, Check, ChevronLeft, ChevronRight, Search, X, AlertTriangle } from 'lucide-react';

const AdminCompanies = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  // Dialog modals
  const [rejectDialog, setRejectDialog] = useState({ open: false, company: null, reason: '' });
  const [archiveDialog, setArchiveDialog] = useState({ open: false, company: null });

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await adminApi.getCompanies({ status: status === 'all' ? undefined : status, search: debouncedSearch, page, limit: 20 });
      setCompanies(response.data?.data || []);
      setPages(response.data?.pages || 1);
    } catch (error) {
      toast(error.response?.data?.message || 'Unable to load companies.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [status, debouncedSearch, page]);

  const approveCompany = async (company) => {
    setBusyId(String(company._id));
    try {
      await adminApi.reviewCompany(company._id, 'approved', '');
      toast(`Company "${company.name}" approved.`, 'success');
      await load();
    } catch (error) {
      toast(error.response?.data?.message || 'Unable to approve company.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const confirmRejection = async () => {
    const { company, reason } = rejectDialog;
    if (!company) return;
    if (company.status === 'approved') {
      toast('An approved company cannot be rejected.', 'error');
      setRejectDialog({ open: false, company: null, reason: '' });
      return;
    }
    if (!reason.trim()) {
      toast('Please enter a rejection reason for the provider.', 'error');
      return;
    }
    setBusyId(String(company._id));
    try {
      await adminApi.reviewCompany(company._id, 'rejected', reason.trim());
      toast(`Company "${company.name}" rejected.`, 'success');
      setRejectDialog({ open: false, company: null, reason: '' });
      await load();
    } catch (error) {
      toast(error.response?.data?.message || 'Unable to reject company.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const confirmArchive = async () => {
    const { company } = archiveDialog;
    if (!company) return;
    setBusyId(String(company._id));
    try {
      await adminApi.archiveCompany(company._id);
      toast(`Company "${company.name}" archived.`, 'success');
      setArchiveDialog({ open: false, company: null });
      await load();
    } catch (error) {
      toast(error.response?.data?.message || 'Unable to archive company.', 'error');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mt-1 flex items-center gap-2 ui-page-title"><Building2 className="h-6 w-6 text-brand-700" />Company Listings</h1>
          <p className="mt-1 text-sm text-slate-500">Review individual company listings submitted by providers before they appear publicly.</p>
        </div>
      </header>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} aria-label="Search companies" placeholder="Search name or category" className="ui-input pl-9" /></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Status<select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="ui-input w-auto"><option value="all">All active</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
      </section>

      <div className="ui-table-shell">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="ui-th">Company</th><th className="ui-th">Provider</th><th className="ui-th">Provider verification</th><th className="ui-th">Applicants</th><th className="ui-th">Listing status</th><th className="ui-th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? <TableLoadingRow colSpan={6} label="Loading companies…" />
                : companies.length ? companies.map((company) => {
                  const provider = company.providerId || {};
                  const providerStatus = provider.businessVerification?.status || 'not_submitted';
                  const canApprove = providerStatus === 'approved';
                  return <tr key={company._id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{company.name}</div>
                      <div className="mt-1 text-slate-500">{company.category} · {company.location || 'No location'}</div>
                      <div className="mt-1 text-xs text-slate-400">Created {new Date(company.createdAt).toLocaleDateString()}</div>
                      {company.rejectionReason && <p className="mt-2 max-w-64 text-xs font-medium text-danger-700">Note: {company.rejectionReason}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-800">{provider.name || 'Provider'}</div>
                      <div className="mt-1 text-slate-500">{provider.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`ui-badge uppercase ${canApprove ? 'ui-badge-success' : 'ui-badge-warning'}`}>
                        {providerStatus.replaceAll('_', ' ')}
                      </span>
                      {!canApprove && (
                        <div className="mt-1.5 max-w-56 text-xs text-slate-500">
                          <span>Provider verification required.</span>{' '}
                          <Link to="/admin/providers" className="font-semibold text-brand-700 hover:underline">
                            Verify provider &rarr;
                          </Link>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{company.applicantCount || 0}</td>
                    <td className="px-4 py-4">
                      <span className={`ui-badge uppercase ${company.status === 'approved' ? 'ui-badge-success' : company.status === 'rejected' ? 'ui-badge-danger' : 'ui-badge-warning'}`}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {company.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={!canApprove || busyId === String(company._id)}
                            onClick={() => approveCompany(company)}
                            title={!canApprove ? 'Verify provider first' : 'Approve company'}
                            className="ui-btn ui-btn-primary ui-btn-sm"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {company.status !== 'approved' && company.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={company.status === 'approved' || busyId === String(company._id)}
                            onClick={() => setRejectDialog({ open: true, company, reason: '' })}
                            className="ui-btn ui-btn-danger ui-btn-sm"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        )}
                        {company.status === 'approved' && (
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                            Approved
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={busyId === String(company._id)}
                          onClick={() => setArchiveDialog({ open: true, company })}
                          title="Archive listing"
                          className="ui-btn ui-btn-ghost ui-btn-sm hover:text-danger-700"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>;
                }) : <tr><td colSpan="6" className="px-4 py-14 text-center text-sm text-slate-500">No companies found for this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="ui-btn ui-btn-secondary ui-btn-sm">
            <ChevronLeft className="h-4 w-4" />Previous
          </button>
          <button disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)} className="ui-btn ui-btn-secondary ui-btn-sm">
            Next<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectDialog.open && rejectDialog.company?.status !== 'approved'}
        onClose={() => setRejectDialog({ open: false, company: null, reason: '' })}
        title={`Reject Company: ${rejectDialog.company?.name || ''}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Please provide a clear reason for returning this company listing. The provider will receive this feedback so they can make corrections and resubmit.
          </p>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Reason for rejection *</span>
            <textarea
              rows={4}
              maxLength={500}
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Please provide an authentic business address or complete the company description..."
              className="ui-input mt-1 w-full text-xs"
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRejectDialog({ open: false, company: null, reason: '' })}
              className="ui-btn ui-btn-secondary ui-btn-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectDialog.reason.trim() || rejectDialog.company?.status === 'approved' || busyId === String(rejectDialog.company?._id)}
              onClick={confirmRejection}
              className="ui-btn ui-btn-danger ui-btn-sm"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={archiveDialog.open}
        onClose={() => setArchiveDialog({ open: false, company: null })}
        title={`Archive ${archiveDialog.company?.name || 'Company'}?`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed">
              Archiving this listing will hide it from active directories. All applicant records and submitted files will be retained.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setArchiveDialog({ open: false, company: null })}
              className="ui-btn ui-btn-secondary ui-btn-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busyId === String(archiveDialog.company?._id)}
              onClick={confirmArchive}
              className="ui-btn ui-btn-danger ui-btn-sm"
            >
              Archive Company
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminCompanies;
