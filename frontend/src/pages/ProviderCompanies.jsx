import React, { useEffect, useMemo, useState } from 'react';
import { LoadingState } from '../components/common/Loading';
import { Link, useNavigate } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import {
  Building2,
  ChevronRight,
  ChevronDown,
  CircleAlert,
  FilePlus2,
  Search,
  Store,
} from 'lucide-react';

const statusClass = {
  pending: 'ui-badge-warning',
  approved: 'ui-badge-success',
  rejected: 'ui-badge-danger',
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

  const hasFilters = Boolean(search.trim()) || status !== 'all' || type !== 'all';

  const openAddForm = (organizationType) => navigate(`/provider/companies/new?type=${organizationType}`);

  return (
    <div className="ui-container space-y-7 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="ui-page-title">Company &amp; business dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Manage organization listings and review applicants.</p>
        </div>
        <button type="button" aria-expanded={addOptionsOpen} aria-controls="add-organization-options" onClick={() => setAddOptionsOpen((open) => !open)} className="ui-btn ui-btn-secondary"><FilePlus2 className="h-4 w-4" /> Add another listing <ChevronDown className={`h-4 w-4 transition-transform ${addOptionsOpen ? 'rotate-180' : ''}`} /></button>
      </header>

      {addOptionsOpen && <section id="add-organization-options" aria-label="Choose what to add" className="flex flex-col justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-semibold text-slate-900">What would you like to add?</h2><p className="mt-1 text-xs text-slate-600">Choose the type of organization to create a listing.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openAddForm('company')} className="ui-btn ui-btn-secondary"><Building2 className="h-4 w-4 text-brand-700" />Company</button><button type="button" onClick={() => openAddForm('business')} className="ui-btn ui-btn-secondary"><Store className="h-4 w-4 text-brand-700" />Business</button></div></section>}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input aria-label="Search companies" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search companies or categories" className="ui-input pl-9" />
          </label>
          <div className="flex flex-wrap gap-3"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Type
            <select value={type} onChange={(event) => setType(event.target.value)} className="ui-input w-auto text-xs"><option value="all">All types</option><option value="company">Companies</option><option value="business">Businesses</option></select>
          </label><label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Status <select value={status} onChange={(event) => setStatus(event.target.value)} className="ui-input w-auto text-xs">
              <option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
          </label></div>
        </div>

        {loading ? <LoadingState />
          : error ? <div role="alert" className="ui-alert ui-alert-danger"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div>
            : visibleCompanies.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">
              {visibleCompanies.map((company) => (
                <Link key={company._id} to={`/provider/companies/${company._id}`} className="grid gap-4 py-5 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {company.logo ? <img src={company.logo} alt="" loading="lazy" className="h-11 w-11 rounded-xl border border-slate-200 object-contain" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Building2 className="h-5 w-5" /></span>}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold text-slate-900">{company.name}</h2>
                        <span className="ui-badge ui-badge-neutral">{company.organizationType || 'company'}</span>
                        <span className={`ui-badge ${statusClass[company.status] || 'ui-badge-neutral'}`}>{company.status === 'pending' ? 'Pending verification' : company.status === 'approved' ? 'Verified' : company.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{company.category}{company.location ? ` · ${company.location}` : ''}</p>
                      <p className="mt-1 text-xs text-slate-500">Created {new Date(company.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-xs text-slate-600"><strong className="text-slate-900">{company.applicantCount || 0}</strong> applicants <span className="px-1 text-slate-300">·</span> <strong className="text-slate-900">{company.pendingApplicationCount || 0}</strong> pending</div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
              : <div className="ui-empty">
                <Building2 className="mx-auto h-7 w-7 text-slate-400" />
                <h2 className="mt-3 text-sm font-semibold text-slate-800">
                  {hasFilters ? 'No organizations match your filters' : 'No organizations yet'}
                </h2>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  {hasFilters
                    ? 'Try a different search term, or clear the filters to see everything you have added.'
                    : 'Add your company or business profile so you can post job listings and receive applicants.'}
                </p>
                {hasFilters
                  ? <button
                      type="button"
                      onClick={() => { setSearch(''); setStatus('all'); setType('all'); }}
                      className="ui-btn ui-btn-secondary ui-btn-sm mt-4"
                    >
                      Clear filters
                    </button>
                  : <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <button type="button" onClick={() => openAddForm('company')} className="ui-btn ui-btn-primary ui-btn-sm">
                        <Building2 className="h-4 w-4" />Add company
                      </button>
                      <button type="button" onClick={() => openAddForm('business')} className="ui-btn ui-btn-secondary ui-btn-sm">
                        <Store className="h-4 w-4" />Add business
                      </button>
                    </div>}
              </div>}
      </section>
    </div>
  );
};

export default ProviderCompanies;
