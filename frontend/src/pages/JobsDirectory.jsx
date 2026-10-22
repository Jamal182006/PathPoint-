import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, BriefcaseBusiness, Building2, MapPin, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { apiAdapter } from '../services/apiAdapter';
import PinButton from '../components/common/PinButton';
import { formatDateDisplay } from '../utils/dateUtils';

const pageSize = 9;
const money = (value) => Number(value).toLocaleString();
const sortOptions = [
  ['newest', 'Newest'], ['oldest', 'Oldest'], ['name-asc', 'Name A–Z'], ['name-desc', 'Name Z–A'],
  ['verified', 'Verified first'], ['applicants', 'Most applicants'],
];
const scopeOptions = [
  ['all', 'All listings'],
  ['jobs', 'Jobs only'],
  ['companies', 'Companies only'],
];

const readParam = (params, key, fallback) => {
  const value = params.get(key);
  return value && value !== 'all' ? value : fallback;
};

const JobsDirectory = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(readParam(searchParams, 'category', 'all'));
  const [location, setLocation] = useState(readParam(searchParams, 'location', 'all'));
  const [employmentType, setEmploymentType] = useState(readParam(searchParams, 'type', 'all'));
  const [verification, setVerification] = useState(readParam(searchParams, 'verification', 'all'));
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [scope, setScope] = useState(searchParams.get('scope') || 'all');
  const [page, setPage] = useState(1);
  // Respect the OS "reduce motion" preference for the card entrance animation.
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Keep the filters in the URL so a search can be shared and the back button
  // returns to the same view.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('q', search);
    if (category !== 'all') next.set('category', category);
    if (location !== 'all') next.set('location', location);
    if (employmentType !== 'all') next.set('type', employmentType);
    if (verification !== 'all') next.set('verification', verification);
    if (sort !== 'newest') next.set('sort', sort);
    if (scope !== 'all') next.set('scope', scope);
    setSearchParams(next, { replace: true });
  }, [search, category, location, employmentType, verification, sort, scope, setSearchParams]);

  useEffect(() => {
    let active = true;
    const refresh = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const [companyRows, jobRows] = await Promise.all([apiAdapter.getCompanies(), apiAdapter.getJobs()]);
        if (active) {
          setCompanies(companyRows);
          setJobs(jobRows);
          setError('');
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load current company and job listings.');
      } finally {
        if (active) setLoading(false);
      }
    };
    refresh(true);
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  const listings = useMemo(() => [
    ...companies.map((company) => ({
      id: `company-${company.id || company._id}`,
      entityId: company.id || company._id,
      kind: 'company',
      title: company.name,
      companyName: company.name,
      category: company.category || 'Other',
      location: company.location || '',
      description: company.description || '',
      logo: company.logo || '',
      verified: company.status === 'approved',
      status: company.status,
      applicantCount: company.applicantCount || 0,
      size: company.size || '',
      website: company.website || '',
      locations: company.locations || [],
      createdAt: company.createdAt,
      searchText: `${company.name} ${company.category || ''} ${company.location || ''} ${company.description || ''} ${(company.requirements || []).map((item) => item.title).join(' ')}`.toLowerCase(),
    })),
    ...jobs.map((job) => ({
      id: `job-${job._id}`,
      entityId: job._id,
      kind: 'job',
      title: job.title,
      companyName: job.companyId?.name || 'Company',
      category: job.companyId?.category || 'Other',
      location: job.location || job.companyId?.location || '',
      description: job.description || '',
      logo: job.companyId?.logo || '',
      verified: true,
      status: 'approved',
      applicantCount: job.applicationCount || 0,
      createdAt: job.createdAt,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryPayPeriod: job.salaryPayPeriod,
      searchText: `${job.title} ${job.companyId?.name || ''} ${job.companyId?.category || ''} ${job.location || ''} ${job.description || ''} ${(job.requirements || []).map((item) => item.title).join(' ')}`.toLowerCase(),
    })),
  ], [companies, jobs]);

  const categories = useMemo(() => [...new Set(listings.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [listings]);
  const locations = useMemo(() => [...new Set(listings.map((item) => item.location).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [listings]);
  const employmentTypes = useMemo(() => [...new Set(jobs.map((job) => job.employmentType).filter(Boolean))].sort(), [jobs]);

  const visibleListings = useMemo(() => {
    const filtered = listings.filter((item) => {
      const matchesScope = scope === 'all' || item.kind === (scope === 'jobs' ? 'job' : 'company');
      const matchesSearch = !search || item.searchText.includes(search);
      const matchesCategory = category === 'all' || item.category === category;
      const matchesLocation = location === 'all' || item.location === location;
      const matchesEmploymentType = employmentType === 'all' || (item.kind === 'job' && item.employmentType === employmentType);
      const matchesVerification = verification === 'all' || (verification === 'verified' ? item.verified : !item.verified);
      return matchesScope && matchesSearch && matchesCategory && matchesLocation && matchesEmploymentType && matchesVerification;
    });
    return filtered.sort((left, right) => {
      if (sort === 'oldest') return new Date(left.createdAt || 0) - new Date(right.createdAt || 0);
      if (sort === 'name-asc') return left.title.localeCompare(right.title);
      if (sort === 'name-desc') return right.title.localeCompare(left.title);
      if (sort === 'verified') return Number(right.verified) - Number(left.verified) || new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
      if (sort === 'applicants') return right.applicantCount - left.applicantCount;
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });
  }, [listings, search, category, location, employmentType, verification, sort, scope]);

  const jobCount = useMemo(() => visibleListings.filter((item) => item.kind === 'job').length, [visibleListings]);
  const companyCount = useMemo(() => visibleListings.filter((item) => item.kind === 'company').length, [visibleListings]);

  useEffect(() => setPage(1), [search, category, location, employmentType, verification, sort, scope]);
  const pageCount = Math.max(1, Math.ceil(visibleListings.length / pageSize));
  const pageListings = visibleListings.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = visibleListings.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, visibleListings.length);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory('all');
    setLocation('all');
    setEmploymentType('all');
    setVerification('all');
    setSort('newest');
    setScope('all');
    setPage(1);
  };

  // Active filters shown as removable chips so it is always obvious why a
  // listing is missing.
  const chips = [
    search && { key: 'search', label: `“${search}”`, onRemove: () => { setSearchInput(''); setSearch(''); } },
    category !== 'all' && { key: 'category', label: category, onRemove: () => setCategory('all') },
    location !== 'all' && { key: 'location', label: location, onRemove: () => setLocation('all') },
    employmentType !== 'all' && { key: 'type', label: employmentType.replaceAll('_', ' '), onRemove: () => setEmploymentType('all') },
    verification !== 'all' && { key: 'verification', label: verification === 'verified' ? 'Verified' : 'Pending review', onRemove: () => setVerification('all') },
  ].filter(Boolean);

  return (
    <div className="ui-container space-y-6 py-8">
      <header className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-7 text-white sm:px-9 sm:py-9">
        <div className="relative max-w-2xl">
          <h1 className="ui-page-title mt-2 text-white">Find your next move.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Browse businesses and open roles from providers. Verification status and application requirements come from the platform.</p>
        </div>
        <div className="relative mt-6 grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
          <label className="relative block"><span className="sr-only">Search companies and jobs</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input id="jobs-search-input" data-global-search value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search companies, jobs, skills, or keywords" className="ui-input pl-9" />{searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search" className="absolute right-2 top-2.5 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}</label>
          <label className="sr-only" htmlFor="jobs-category">Industry</label><select id="jobs-category" value={category} onChange={(event) => setCategory(event.target.value)} className="ui-input"><option value="all">All industries</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <label className="sr-only" htmlFor="jobs-location">Location</label><select id="jobs-location" value={location} onChange={(event) => setLocation(event.target.value)} className="ui-input"><option value="all">All locations</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <label className="sr-only" htmlFor="jobs-type">Job type</label><select id="jobs-type" value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} className="ui-input"><option value="all">All job types</option>{employmentTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select>
        </div>
      </header>

      {/* Scope switch — company cards must never crowd out the open roles. */}
      <section aria-label="Listing filters" className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
            {scopeOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                aria-pressed={scope === value}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  scope === value ? 'bg-white font-semibold text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><SlidersHorizontal className="h-4 w-4 text-slate-400" /><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="ui-input w-auto text-xs">{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Verification<select value={verification} onChange={(event) => setVerification(event.target.value)} className="ui-input ml-2 w-auto text-xs"><option value="all">All statuses</option><option value="verified">Verified</option><option value="pending">Pending</option></select></label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-xs text-slate-500">
            {loading ? 'Loading listings…' : `${jobCount} ${jobCount === 1 ? 'job' : 'jobs'} · ${companyCount} ${companyCount === 1 ? 'company' : 'companies'}`}
          </p>
          <button type="button" onClick={clearFilters} disabled={!chips.length && scope === 'all'} className="text-xs font-semibold text-brand-700 hover:text-brand-900 disabled:text-slate-300 disabled:hover:text-slate-300">Clear filters</button>
        </div>
      </section>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Active:</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              {chip.label}
              <X className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
        </div>
      )}

      {error && <div role="alert" className="ui-alert ui-alert-danger">{error}</div>}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading listings">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"><div className="flex gap-3"><div className="h-11 w-11 rounded-md bg-slate-100" /><div className="flex-1"><div className="h-3 w-20 rounded bg-slate-100" /><div className="mt-2 h-4 w-2/3 rounded bg-slate-100" /></div></div><div className="mt-6 h-3 w-full rounded bg-slate-100" /><div className="mt-2 h-3 w-4/5 rounded bg-slate-100" /><div className="mt-8 h-8 w-28 rounded bg-slate-100" /></div>)}</div>
        : pageListings.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageListings.map((item, index) => <motion.article key={item.id} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.22, delay: Math.min(index * 0.035, 0.18) }} className="ui-card-interactive group flex min-h-52 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">{item.logo ? <img src={item.logo} alt={`${item.companyName} logo`} loading="lazy" className="h-11 w-11 shrink-0 rounded-md border border-slate-200 object-contain" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{item.kind === 'job' ? <BriefcaseBusiness className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}</span>}<div className="min-w-0"><p className="truncate text-xs font-semibold text-brand-700">{item.kind === 'job' ? item.companyName : item.category}</p><h2 className="mt-1 truncate font-bold text-slate-900">{item.title}</h2></div></div>
              <div className="flex shrink-0 items-start gap-2"><span className={`ui-badge ${item.kind === 'job' || item.verified ? 'ui-badge-success' : 'ui-badge-warning'}`}>{item.kind === 'job' || item.verified ? <BadgeCheck className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}{item.kind === 'job' ? 'Open' : item.verified ? 'Verified' : 'Pending review'}</span><PinButton itemType={item.kind} itemId={item.entityId} details={{ title: item.title, subtitle: item.companyName, status: item.kind === 'job' ? 'Open' : item.verified ? 'Verified' : 'Pending review', latestUpdate: item.kind === 'job' ? `Posted ${formatDateDisplay(item.createdAt)}` : 'Company listing', href: item.kind === 'job' ? `/jobs/${item.entityId}` : `/companies/${item.entityId}` }} /></div>
            </div>
            {item.kind === 'job' && <p className="mt-2 text-xs font-medium capitalize text-slate-500">{item.employmentType?.replaceAll('_', ' ') || 'Open position'}</p>}
            {item.kind === 'company' && <p className="mt-2 text-xs text-slate-500">Company listing</p>}
            <p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-600">{item.description || 'Open the listing to review details and application requirements.'}</p>
            <div className="mt-auto space-y-3 pt-4"><div className="space-y-1 text-xs text-slate-500"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{item.location || 'Location not listed'}</span>{item.kind === 'job' && <><span className="block font-semibold text-slate-800">{item.salaryMin != null ? `${money(item.salaryMin)}${item.salaryMax != null && item.salaryMax !== item.salaryMin ? `–${money(item.salaryMax)}` : ''} per ${item.salaryPayPeriod}` : 'Salary not listed'}</span><span className="block">Posted {formatDateDisplay(item.createdAt, undefined, 'Date unavailable')} · {item.applicantCount} applicant{item.applicantCount === 1 ? '' : 's'}</span></>}</div><Link to={item.kind === 'job' ? `/jobs/${item.entityId}` : `/companies/${item.entityId}`} className="ui-btn ui-btn-primary ui-btn-sm shrink-0">{item.kind === 'job' ? 'View job & apply' : 'View details & apply'}</Link></div>
          </motion.article>)}
        </div> : !error && <div className="ui-empty"><Building2 className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-base font-semibold text-slate-900">No listings match these filters</h2><p className="mt-1 text-sm text-slate-500">Try another keyword or clear one of the filters.</p><button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-brand-700 hover:underline">Clear filters</button></div>}

      {!loading && visibleListings.length > 0 && <nav aria-label="Jobs pages" className="flex items-center justify-between border-t border-slate-200 pt-4"><p className="text-xs text-slate-500">Showing {rangeStart}–{rangeEnd} of {visibleListings.length} · Page {page} of {pageCount}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Previous</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Next</button></div></nav>}
    </div>
  );
};

export default JobsDirectory;
