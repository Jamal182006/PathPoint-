import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import {
  Building2,
  ChevronDown,
  CircleAlert,
  FilePlus2,
  Loader2,
  Search,
  Store,
  Users,
} from 'lucide-react';

const statusClass = {
  pending: 'ui-badge-warning',
  approved: 'ui-badge-success',
  rejected: 'ui-badge-danger',
};

const statusLabel = {
  pending: 'Pending verification',
  approved: 'Verified',
  rejected: 'Rejected',
};

const ProviderCompanies = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState('all');

  useEffect(() => {
    let active = true;
    const refresh = (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      return apiAdapter.getMyCompanies()
        .then((list) => { if (active) setCompanies(list); })
        .catch((loadError) => {
          if (active) setError(loadError.message || 'Unable to load your companies.');
        })
        .finally(() => {
          if (active) { setLoading(false); setRefreshing(false); }
        });
    };
    refresh();
    // Poll quietly, and only while the tab is actually being looked at.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh(true);
    }, 30000);
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') refresh(true); };
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
      const matchesSearch = !query || company.name.toLowerCase().includes(query) || String(company.category || '').toLowerCase().includes(query);
      const organizationType = company.organizationType || 'company';
      return matchesSearch && (status === 'all' || company.status === status) && (type === 'all' || organizationType === type);
    });
  }, [companies, search, status, type]);

  const summary = useMemo(() => ({
    total: companies.length,
    verified: companies.filter((company) => company.status === 'approved').length,
    pending: companies.filter((company) => company.status === 'pending').length,
    applicants: companies.reduce((total, company) => total + (company.applicantCount || 0), 0),
  }), [companies]);

  const hasFilters = Boolean(search.trim()) || status !== 'all' || type !== 'all';
  const openAddForm = (organizationType) => navigate(`/provider/companies/new?type=${organizationType}`);

  return (
    <div className="ui-container space-y-5 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="ui-page-title">Companies &amp; businesses</h1>
          <p className="mt-1 text-sm text-slate-500">Every organization you manage, in one list.</p>
        </div>
        <details className="relative">
          <summary className="ui-btn ui-btn-primary ui-btn-sm list-none [&::-webkit-details-marker]:hidden">
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            Add organization
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </summary>
          <div className="ui-popover absolute right-0 z-20 mt-1 w-48 overflow-hidden p-1">
            <button type="button" onClick={() => openAddForm('company')} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">
              <Building2 className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Company
            </button>
            <button type="button" onClick={() => openAddForm('business')} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">
              <Store className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Business
            </button>
          </div>
        </details>
      </header>

      <section className="ui-panel grid grid-cols-2 divide-x divide-slate-200 sm:grid-cols-4">
        <div className="px-3 py-2.5">
          <p className="ui-eyebrow">Organizations</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{summary.total}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="ui-eyebrow">Verified</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{summary.verified}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="ui-eyebrow">Awaiting review</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{summary.pending}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="ui-eyebrow">Applicants</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{summary.applicants}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="ui-panel flex flex-wrap items-center gap-2 p-2">
          <label className="relative block min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              aria-label="Search companies"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search companies or categories"
              className="ui-input py-2 pl-9 text-sm"
            />
          </label>
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by organization type" className="ui-input w-auto py-2 text-xs">
            <option value="all">All types</option>
            <option value="company">Companies</option>
            <option value="business">Businesses</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by verification status" className="ui-input w-auto py-2 text-xs">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <span className="ml-auto flex items-center gap-2 px-1 text-xs text-slate-500">
            {refreshing ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" />Updating</> : `${visibleCompanies.length} of ${companies.length}`}
          </span>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-200 border-y border-slate-200" aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 py-3">
                <div className="h-9 w-9 rounded-xl bg-slate-100" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error ? <div role="alert" className="ui-alert ui-alert-danger"><CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</div>
          : visibleCompanies.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">
            {visibleCompanies.map((company) => (
              <Link key={company._id} to={`/provider/companies/${company._id}`} className="grid gap-x-4 gap-y-2 py-3 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-2">
                <div className="flex min-w-0 items-center gap-3">
                  {company.logo ? <img src={company.logo} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-contain" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Building2 className="h-4 w-4" aria-hidden="true" /></span>}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-slate-900">{company.name}</h2>
                      <span className="ui-badge ui-badge-neutral">{company.organizationType || 'company'}</span>
                      <span className={`ui-badge ${statusClass[company.status] || 'ui-badge-neutral'}`}>{statusLabel[company.status] || company.status}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {company.category}{company.location ? ` · ${company.location}` : ''} · added {new Date(company.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pl-12 text-xs text-slate-600 sm:justify-end sm:pl-0">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
                    <strong className="font-semibold tabular-nums text-slate-900">{company.applicantCount || 0}</strong> applicants
                  </span>
                  {company.pendingApplicationCount ? <span className="inline-flex items-center gap-1.5"><strong className="font-semibold tabular-nums text-slate-900">{company.pendingApplicationCount}</strong> pending</span> : null}
                </div>
              </Link>
            ))}
          </div>
            : <div className="ui-empty">
              <Building2 className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
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
                      <Building2 className="h-4 w-4" aria-hidden="true" />Add company
                    </button>
                    <button type="button" onClick={() => openAddForm('business')} className="ui-btn ui-btn-secondary ui-btn-sm">
                      <Store className="h-4 w-4" aria-hidden="true" />Add business
                    </button>
                  </div>}
            </div>}
      </section>
    </div>
  );
};

export default ProviderCompanies;
