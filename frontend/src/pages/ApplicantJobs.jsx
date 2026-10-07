import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { BriefcaseBusiness, CircleAlert, Loader2, MapPin, Search } from 'lucide-react';

const ApplicantJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [employmentType, setEmploymentType] = useState('all');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiAdapter.getJobs({ search, employmentType: employmentType === 'all' ? undefined : employmentType, location })
      .then((list) => { if (active) setJobs(list); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load jobs.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, employmentType, location]);

  const visibleJobs = useMemo(() => jobs, [jobs]);

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-5"><p className="text-xs font-semibold uppercase text-indigo-700">Open positions</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Browse jobs</h1><p className="mt-1 text-sm text-slate-500">Approved openings from verified providers.</p></header><section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_200px]"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search jobs" placeholder="Search title or description" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label><label className="sr-only" htmlFor="job-location">Location</label><input id="job-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Filter by location" className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><select value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} aria-label="Filter employment type" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="all">All employment types</option>{[['full_time','Full-time'],['part_time','Part-time'],['contract','Contract'],['temporary','Temporary'],['internship','Internship'],['casual','Casual']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></section>{loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div> : error ? <div role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="h-4 w-4" />{error}</div> : visibleJobs.length ? <div className="divide-y divide-slate-200 border-y border-slate-200">{visibleJobs.map((job) => <Link key={job._id} to={`/jobs/${job._id}`} className="flex flex-wrap items-center justify-between gap-4 py-5 hover:bg-slate-50 sm:px-3"><div className="flex min-w-0 items-start gap-3">{job.companyId?.logo ? <img src={job.companyId.logo} alt="" className="h-11 w-11 rounded-md border border-slate-200 object-contain" /> : <BriefcaseBusiness className="mt-1 h-5 w-5 text-indigo-700" />}<div className="min-w-0"><h2 className="font-bold text-slate-900">{job.title}</h2><p className="mt-1 text-xs text-slate-600">{job.companyId?.name} · {job.employmentType.replaceAll('_', ' ')}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="h-3 w-3" />{job.location || job.companyId?.location || 'Location not listed'}</p></div></div><div className="text-right text-xs text-slate-600"><p className="font-semibold text-slate-900">{job.salaryMin != null ? `${job.salaryMin}${job.salaryMax != null && job.salaryMax !== job.salaryMin ? `–${job.salaryMax}` : ''} / ${job.salaryPayPeriod}` : 'Salary not listed'}</p><p className="mt-1">{job.slots} position{job.slots === 1 ? '' : 's'}</p></div></Link>)}</div> : <div className="border-y border-dashed border-slate-300 py-14 text-center"><BriefcaseBusiness className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-3 text-sm font-semibold text-slate-900">No open jobs found</h2><p className="mt-1 text-xs text-slate-500">Try another search or check back later.</p></div>}</div>;
};

export default ApplicantJobs;
