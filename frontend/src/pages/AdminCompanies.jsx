import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminApi';
import { useToast } from '../components/common/Toast';
import { Archive, Building2, Check, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';

const AdminCompanies = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [status, setStatus] = useState('pending');
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-700">Admin suite</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><Building2 className="h-6 w-6 text-indigo-700" />Company review</h1>
          <p className="mt-1 text-sm text-slate-500">Verify provider eligibility and review company listings before publishing.</p>
        </div>
      </header>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} aria-label="Search companies" placeholder="Search name or category" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Status<select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="rounded-md border border-slate-300 bg-white px-3 py-2"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All active</option></select></label>
      </section>

      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        <table className="w-full min-w-[850px] text-left">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500"><th className="px-4 py-3">Company</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Provider verification</th><th className="px-4 py-3">Applicants</th><th className="px-4 py-3">Listing status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? <tr><td colSpan="6" className="px-4 py-14 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : companies.length ? companies.map((company) => {
                const provider = company.providerId || {};
                const providerStatus = provider.businessVerification?.status || 'not_submitted';
                const canApprove = providerStatus === 'approved';
                return <tr key={company._id} className="align-top hover:bg-slate-50/60">
                  <td className="px-4 py-4"><div className="font-semibold text-slate-900">{company.name}</div><div className="mt-1 text-slate-500">{company.category} · {company.location || 'No location'}</div><div className="mt-1 text-[11px] text-slate-500">{new Date(company.createdAt).toLocaleDateString()}</div>{company.rejectionReason && <p className="mt-2 max-w-64 text-[11px] text-rose-700">{company.rejectionReason}</p>}</td>
                  <td className="px-4 py-4"><div className="font-semibold text-slate-800">{provider.name || 'Provider'}</div><div className="mt-1 text-slate-500">{provider.email}</div></td>
                  <td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${canApprove ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{providerStatus.replaceAll('_', ' ')}</span>{!canApprove && <p className="mt-1 max-w-48 text-[10px] text-slate-500">Provider verification is required before this listing can be approved.</p>}</td>
                  <td className="px-4 py-4 font-semibold text-slate-800">{company.applicantCount || 0}</td>
                  <td className="px-4 py-4 capitalize text-slate-700">{company.status}</td>
                  <td className="px-4 py-4 text-right"><div className="inline-flex items-center gap-1.5">
                    {company.status !== 'approved' && <button type="button" disabled={!canApprove || busyId === String(company._id)} onClick={() => review(company, 'approved')} title={!canApprove ? 'Verify provider first' : 'Approve company'} className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"><Check className="h-3.5 w-3.5" /> Approve</button>}
                    {company.status !== 'rejected' && <button type="button" disabled={busyId === String(company._id)} onClick={() => review(company, 'rejected')} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"><X className="h-3.5 w-3.5" /> Reject</button>}
                    <button type="button" disabled={busyId === String(company._id)} onClick={() => archive(company)} title="Archive listing" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-700 disabled:opacity-40"><Archive className="h-4 w-4" /></button>
                  </div></td>
                </tr>;
              }) : <tr><td colSpan="6" className="px-4 py-14 text-center text-sm text-slate-500">No companies found for this filter.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button><button disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button></div></div>
    </div>
  );
};

export default AdminCompanies;
