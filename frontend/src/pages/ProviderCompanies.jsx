import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import {
  Building2,
  ChevronRight,
  ChevronDown,
  CircleAlert,
  FilePlus2,
  Loader2,
  Search,
  Store,
} from 'lucide-react';

const statusClass = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-rose-200 bg-rose-50 text-rose-800',
};

const ProviderCompanies = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState('all');
  const [addOptionsOpen, setAddOptionsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const refresh = () => apiAdapter.getMyCompanies()
      .then((list) => { if (active) setCompanies(list); })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load your companies.');
      })
      .finally(() => { if (active) setLoading(false); });
    refresh();
    const intervalId = window.setInterval(refresh, 10000);
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  const visibleCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return companies.filter((company) => {
      const matchesSearch = !query || company.name.toLowerCase().includes(query) || company.category.toLowerCase().includes(query);
      const organizationType = company.organizationType || 'company';
      return matchesSearch && (status === 'all' || company.status === status) && (type === 'all' || organizationType === type);
    });
  }, [companies, search, status, type]);

  const openAddForm = (organizationType) => navigate(`/provider/companies/new?type=${organizationType}`);

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-700">Provider Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Company &amp; business dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Manage organization listings and review applicants.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/provider" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Verification & profile</Link>
          <button type="button" aria-expanded={addOptionsOpen} aria-controls="add-organization-options" onClick={() => setAddOptionsOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800"><FilePlus2 className="h-4 w-4" /> Add listing <ChevronDown className={`h-4 w-4 transition-transform ${addOptionsOpen ? 'rotate-180' : ''}`} /></button>
        </div>
      </header>

      {addOptionsOpen && <section id="add-organization-options" aria-label="Choose what to add" className="flex flex-col justify-between gap-4 border-b border-indigo-200 bg-indigo-50/60 px-4 py-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-semibold text-slate-900">What would you like to add?</h2><p className="mt-1 text-xs text-slate-600">Choose the type of organization to create a listing.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openAddForm('company')} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:text-indigo-800"><Building2 className="h-4 w-4 text-indigo-700" />Company</button><button type="button" onClick={() => openAddForm('business')} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:text-indigo-800"><Store className="h-4 w-4 text-indigo-700" />Business</button></div></section>}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input aria-label="Search companies" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search companies or categories" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </label>
          <div className="flex flex-wrap gap-3"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Type
            <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"><option value="all">All types</option><option value="company">Companies</option><option value="business">Businesses</option></select>
          </label><label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Status <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs">
              <option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
          </label></div>
        </div>

        {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
          : error ? <div role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800"><CircleAlert className="h-4 w-4" />{error}</div>
            : visibleCompanies.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">
              {visibleCompanies.map((company) => (
                <Link key={company._id} to={`/provider/companies/${company._id}`} className="grid gap-4 py-5 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {company.logo ? <img src={company.logo} alt="" className="h-11 w-11 rounded-md border border-slate-200 object-contain" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700"><Building2 className="h-5 w-5" /></span>}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-bold text-slate-900">{company.name}</h2>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{company.organizationType || 'company'}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass[company.status] || ''}`}>{company.status === 'pending' ? 'Pending verification' : company.status === 'approved' ? 'Verified' : company.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{company.category}{company.location ? ` · ${company.location}` : ''}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Created {new Date(company.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-xs text-slate-600"><strong className="text-slate-900">{company.applicantCount || 0}</strong> applicants <span className="px-1 text-slate-300">·</span> <strong className="text-slate-900">{company.pendingApplicationCount || 0}</strong> pending</div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
              : <div className="border-y border-dashed border-slate-300 py-14 text-center">
                <Building2 className="mx-auto h-7 w-7 text-slate-400" />
                <h2 className="mt-3 text-sm font-semibold text-slate-800">No organizations found</h2>
                <p className="mt-1 text-xs text-slate-500">Add a company or business, or adjust the filters.</p>
              </div>}
      </section>
    </div>
  );
};

export default ProviderCompanies;
