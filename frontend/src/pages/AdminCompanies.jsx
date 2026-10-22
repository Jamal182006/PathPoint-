import React, { useEffect, useState } from 'react';
import { TableLoadingRow } from '../components/common/Loading';
import adminApi from '../api/adminApi';
import { useToast } from '../components/common/Toast';
import { Archive, Building2, Check, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

const AdminCompanies = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await adminApi.getCompanies({ status: status === 'all' ? undefined : status, search, page, limit: 20 });
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
  }, [status, search, page]);

  const review = async (company, nextStatus) => {
    const rejectionReason = nextStatus === 'rejected'
      ? window.prompt(`Reason for rejecting ${company.name}?`)
      : '';
    if (nextStatus === 'rejected' && !rejectionReason?.trim()) return;
    setBusyId(String(company._id));
    try {
      await adminApi.reviewCompany(company._id, nextStatus, rejectionReason);
      toast(`Company ${nextStatus}.`, 'success');
      await load();
    } catch (error) {
      toast(error.response?.data?.message || `Unable to ${nextStatus} company.`, 'error');
    } finally {
      setBusyId('');
    }
  };

  const archive = async (company) => {
    if (!window.confirm(`Archive ${company.name}? Its application history will be retained.`)) return;
    setBusyId(String(company._id));
    try {
      await adminApi.archiveCompany(company._id);
      toast('Company archived.', 'success');
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
          <p className="mt-1 text-sm text-slate-500">Review individual company listings submitted by providers.</p>
        </div>
      </header>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} aria-label="Search companies" placeholder="Search name or category" className="ui-input pl-9" /></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Status<select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="ui-input w-auto"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All active</option></select></label>
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
                    <td className="px-4 py-4"><div className="font-semibold text-slate-900">{company.name}</div><div className="mt-1 text-slate-500">{company.category} · {company.location || 'No location'}</div><div className="mt-1 text-xs text-slate-500">{new Date(company.createdAt).toLocaleDateString()}</div>{company.rejectionReason && <p className="mt-2 max-w-64 text-xs text-danger-700">{company.rejectionReason}</p>}</td>
                    <td className="px-4 py-4"><div className="font-semibold text-slate-800">{provider.name || 'Provider'}</div><div className="mt-1 text-slate-500">{provider.email}</div></td>
                    <td className="px-4 py-4"><span className={`ui-badge uppercase ${canApprove ? 'ui-badge-success' : 'ui-badge-warning'}`}>{providerStatus.replaceAll('_', ' ')}</span>{!canApprove && <p className="mt-1 max-w-48 text-xs text-slate-500">Provider verification is required before this listing can be approved.</p>}</td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{company.applicantCount || 0}</td>
                    <td className="px-4 py-4 capitalize text-slate-700">{company.status}</td>
                    <td className="px-4 py-4 text-right"><div className="inline-flex items-center gap-1.5">
                      {company.status !== 'approved' && <button type="button" disabled={!canApprove || busyId === String(company._id)} onClick={() => review(company, 'approved')} title={!canApprove ? 'Verify provider first' : 'Approve company'} className="ui-btn ui-btn-primary ui-btn-sm"><Check className="h-3.5 w-3.5" /> Approve</button>}
                      {company.status !== 'rejected' && <button type="button" disabled={busyId === String(company._id)} onClick={() => review(company, 'rejected')} className="ui-btn ui-btn-danger ui-btn-sm"><X className="h-3.5 w-3.5" /> Reject</button>}
                      <button type="button" disabled={busyId === String(company._id)} onClick={() => archive(company)} title="Archive listing" className="ui-btn ui-btn-ghost ui-btn-sm hover:text-danger-700"><Archive className="h-4 w-4" /></button>
                    </div></td>
                  </tr>;
                }) : <tr><td colSpan="6" className="px-4 py-14 text-center text-sm text-slate-500">No companies found for this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="ui-btn ui-btn-secondary ui-btn-sm"><ChevronLeft className="h-4 w-4" />Previous</button><button disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Next<ChevronRight className="h-4 w-4" /></button></div></div>
    </div>
  );
};

export default AdminCompanies;
