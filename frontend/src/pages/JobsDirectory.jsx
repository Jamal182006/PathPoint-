import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, BriefcaseBusiness, Building2, MapPin, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { apiAdapter } from '../services/apiAdapter';
import PinButton from '../components/common/PinButton';
import { formatDateDisplay } from '../utils/dateUtils';

const pageSize = 9;
const money = (value) => Number(value).toLocaleString();
const sortOptions = [
  ['newest', 'Newest'], ['oldest', 'Oldest'], ['name-asc', 'Name A–Z'], ['name-desc', 'Name Z–A'],
  ['verified', 'Verified first'], ['applicants', 'Most applicants'],
];

const JobsDirectory = () => {
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [employmentType, setEmploymentType] = useState('all');
  const [verification, setVerification] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  // Respect the OS "reduce motion" preference for the card entrance animation.
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

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
      const matchesSearch = !deferredSearch || item.searchText.includes(deferredSearch);
      const matchesCategory = category === 'all' || item.category === category;
      const matchesLocation = location === 'all' || item.location === location;
      const matchesEmploymentType = employmentType === 'all' || (item.kind === 'job' && item.employmentType === employmentType);
      const matchesVerification = verification === 'all' || (verification === 'verified' ? item.verified : !item.verified);
      return matchesSearch && matchesCategory && matchesLocation && matchesEmploymentType && matchesVerification;
    });
    return filtered.sort((left, right) => {
      if (sort === 'oldest') return new Date(left.createdAt || 0) - new Date(right.createdAt || 0);
      if (sort === 'name-asc') return left.title.localeCompare(right.title);
      if (sort === 'name-desc') return right.title.localeCompare(left.title);
      if (sort === 'verified') return Number(right.verified) - Number(left.verified) || new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
      if (sort === 'applicants') return right.applicantCount - left.applicantCount;
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });
  }, [listings, deferredSearch, category, location, employmentType, verification, sort]);

  useEffect(() => setPage(1), [deferredSearch, category, location, employmentType, verification, sort]);
  const pageCount = Math.max(1, Math.ceil(visibleListings.length / pageSize));
  const pageListings = visibleListings.slice((page - 1) * pageSize, page * pageSize);
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory('all');
    setLocation('all');
    setEmploymentType('all');
    setVerification('all');
    setSort('newest');
    setPage(1);
  };

  return (
    <div className="ui-container space-y-7 py-8">
      <header className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="relative max-w-2xl">
          <h1 className="ui-page-title mt-2 text-white">Find your next move.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Browse businesses and open roles from providers. Verification status and application requirements come from the platform.</p>
        </div>
        <div className="relative mt-6 grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
          <label className="relative block"><span className="sr-only">Search companies and jobs</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input id="jobs-search-input" data-global-search value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search companies, jobs, skills, or keywords" className="ui-input pl-9" /></label>
          <label className="sr-only" htmlFor="jobs-category">Industry</label><select id="jobs-category" value={category} onChange={(event) => setCategory(event.target.value)} className="ui-input"><option value="all">All industries</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <label className="sr-only" htmlFor="jobs-location">Location</label><select id="jobs-location" value={location} onChange={(event) => setLocation(event.target.value)} className="ui-input"><option value="all">All locations</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <label className="sr-only" htmlFor="jobs-type">Job type</label><select id="jobs-type" value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} className="ui-input"><option value="all">All job types</option>{employmentTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select>
        </div>
      </header>

      <section aria-label="Listing filters" className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><SlidersHorizontal className="h-4 w-4 text-slate-400" /><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="ui-input w-auto text-xs">{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Verification<select value={verification} onChange={(event) => setVerification(event.target.value)} className="ui-input ml-2 w-auto text-xs"><option value="all">All statuses</option><option value="verified">Verified</option><option value="pending">Pending</option></select></label>
        </div>
        <div className="flex items-center justify-between gap-3"><p aria-live="polite" className="text-xs text-slate-500">{loading ? 'Loading listings…' : `${visibleListings.length} ${visibleListings.length === 1 ? 'listing' : 'listings'}`}</p><button type="button" onClick={clearFilters} className="text-xs font-semibold text-brand-700 hover:text-brand-900">Clear filters</button></div>
      </section>

      {error && <div role="alert" className="ui-alert ui-alert-danger">{error}</div>}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading listings">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-60 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"><div className="flex gap-3"><div className="h-11 w-11 rounded-md bg-slate-100" /><div className="flex-1"><div className="h-3 w-20 rounded bg-slate-100" /><div className="mt-2 h-4 w-2/3 rounded bg-slate-100" /></div></div><div className="mt-6 h-3 w-full rounded bg-slate-100" /><div className="mt-2 h-3 w-4/5 rounded bg-slate-100" /><div className="mt-8 h-8 w-28 rounded bg-slate-100" /></div>)}</div>
        : pageListings.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageListings.map((item, index) => <motion.article key={item.id} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.22, delay: Math.min(index * 0.035, 0.18) }} className="ui-card-interactive group flex min-h-60 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">{item.logo ? <img src={item.logo} alt={`${item.companyName} logo`} loading="lazy" className="h-11 w-11 shrink-0 rounded-md border border-slate-200 object-contain" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{item.kind === 'job' ? <BriefcaseBusiness className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}</span>}<div className="min-w-0"><p className="truncate text-xs font-semibold text-brand-700">{item.kind === 'job' ? item.companyName : item.category}</p><h2 className="mt-1 truncate font-bold text-slate-900">{item.title}</h2></div></div>
              <div className="flex shrink-0 items-start gap-2"><span className={`ui-badge ${item.kind === 'job' || item.verified ? 'ui-badge-success' : 'ui-badge-warning'}`}>{item.kind === 'job' || item.verified ? <BadgeCheck className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}{item.kind === 'job' ? 'Open' : item.verified ? 'Verified' : 'Pending review'}</span><PinButton itemType={item.kind} itemId={item.entityId} details={{ title: item.title, subtitle: item.companyName, status: item.kind === 'job' ? 'Open' : item.verified ? 'Verified' : 'Pending review', latestUpdate: item.kind === 'job' ? `Posted ${formatDateDisplay(item.createdAt)}` : 'Company listing', href: item.kind === 'job' ? `/jobs/${item.entityId}` : `/companies/${item.entityId}` }} /></div>
            </div>
            {item.kind === 'job' && <p className="mt-2 text-xs font-medium capitalize text-slate-500">{item.employmentType?.replaceAll('_', ' ') || 'Open position'}</p>}
            {item.kind === 'company' && <p className="mt-2 text-xs text-slate-500">Company listing</p>}
            <p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-600">{item.description || 'Open the listing to review details and application requirements.'}</p>
            <div className="mt-auto space-y-3 pt-5"><div className="space-y-1 text-xs text-slate-500"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{item.location || 'Location not listed'}</span>{item.kind === 'job' && <><span className="block font-semibold text-slate-800">{item.salaryMin != null ? `${money(item.salaryMin)}${item.salaryMax != null && item.salaryMax !== item.salaryMin ? `–${money(item.salaryMax)}` : ''} per ${item.salaryPayPeriod}` : 'Salary not listed'}</span><span className="block">Posted {formatDateDisplay(item.createdAt, undefined, 'Date unavailable')} · {item.applicantCount} applicant{item.applicantCount === 1 ? '' : 's'}</span></>}</div><Link to={item.kind === 'job' ? `/jobs/${item.entityId}` : `/companies/${item.entityId}`} className="ui-btn ui-btn-primary ui-btn-sm shrink-0">{item.kind === 'job' ? 'View job & apply' : 'View details & apply'}</Link></div>
          </motion.article>)}
        </div> : !error && <div className="ui-empty"><Building2 className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-base font-semibold text-slate-900">No listings match these filters</h2><p className="mt-1 text-sm text-slate-500">Try another keyword or clear one of the filters.</p><button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-brand-700 hover:underline">Clear filters</button></div>}

      {!loading && visibleListings.length > 0 && <nav aria-label="Jobs pages" className="flex items-center justify-between border-t border-slate-200 pt-4"><p className="text-xs text-slate-500">Page {page} of {pageCount}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Previous</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Next</button></div></nav>}
    </div>
  );
};

export default JobsDirectory;