import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../api/adminApi';
import { useToast } from '../components/common/Toast';
import AddressMap from '../components/common/AddressMap';
import { Archive, BriefcaseBusiness, Check, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';

const AdminJobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [reviewStatus, setReviewStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [mapJobId, setMapJobId] = useState('');
  const mapJob = jobs.find((job) => String(job._id) === mapJobId);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getJobs({ search, reviewStatus: reviewStatus === 'all' ? undefined : reviewStatus, page, limit: 20 });
      setJobs(res.data?.data || []);
      setPages(res.data?.pages || 1);
    } catch (error) { toast(error.response?.data?.message || 'Unable to load job listings.', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [search, reviewStatus, page]);

  const review = async (job, status) => {
    const reviewReason = status === 'rejected' ? window.prompt(`Reason for rejecting ${job.title}?`) : '';
    if (status === 'rejected' && !reviewReason?.trim()) return;
    setBusy(String(job._id));
    try { await adminApi.reviewJob(job._id, status, reviewReason); toast(`Job ${status}.`, 'success'); await load(); }
    catch (error) { toast(error.response?.data?.message || `Unable to ${status} job.`, 'error'); }
    finally { setBusy(''); }
  };

  const archive = async (job) => {
    if (!window.confirm(`Archive “${job.title}”? Applications will be retained.`)) return;
    setBusy(String(job._id));
    try { await adminApi.archiveJob(job._id); toast('Job archived.', 'success'); await load(); }
    catch (error) { toast(error.response?.data?.message || 'Unable to archive job.', 'error'); }
    finally { setBusy(''); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-5"><p className="text-xs font-semibold uppercase text-indigo-700">Admin suite</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><BriefcaseBusiness className="h-6 w-6 text-indigo-700" />Job listing review</h1><p className="mt-1 text-sm text-slate-500">Only approved provider and company records can pass review.</p></header><section className="flex flex-col gap-3 sm:flex-row sm:justify-between"><label className="relative block sm:max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} aria-label="Search job listings" placeholder="Search job title or description" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label><select value={reviewStatus} onChange={(event) => { setPage(1); setReviewStatus(event.target.value); }} aria-label="Filter job review status" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All jobs</option></select></section>
    {jobs.length > 0 && <section className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end"><label className="text-xs font-semibold text-slate-600">Review job details<select value={mapJobId} onChange={(event) => setMapJobId(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 sm:min-w-64"><option value="">Choose a job</option>{jobs.map((job) => <option key={job._id} value={job._id}>{job.title} · {job.companyId?.name}</option>)}</select></label>{mapJob && <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2"><AddressMap readOnly location={mapJob.location || mapJob.companyId?.location} formattedAddress={mapJob.formattedAddress || mapJob.companyId?.formattedAddress} latitude={mapJob.latitude ?? mapJob.companyId?.latitude} longitude={mapJob.longitude ?? mapJob.companyId?.longitude} /><div className="space-y-2 text-xs text-slate-700"><p><strong>{mapJob.category || 'Uncategorized'}</strong> · {mapJob.workSetup?.replaceAll('_', '-')} · {mapJob.employmentType?.replaceAll('_', ' ')}</p><p className="whitespace-pre-wrap">{mapJob.description}</p>{mapJob.responsibilities?.length > 0 && <p><strong>Responsibilities:</strong> {mapJob.responsibilities.join('; ')}</p>}{mapJob.qualifications?.length > 0 && <p><strong>Qualifications:</strong> {mapJob.qualifications.join('; ')}</p>}{mapJob.skills?.length > 0 && <p><strong>Skills:</strong> {mapJob.skills.join(', ')}</p>}{mapJob.benefits?.length > 0 && <p><strong>Benefits:</strong> {mapJob.benefits.join(', ')}</p>}<p><strong>Dress code:</strong> {mapJob.dressCode || 'Not listed'} · <strong>Schedule:</strong> {mapJob.workSchedule || 'Not listed'}</p><p><strong>Experience:</strong> {mapJob.experienceLevel || 'Not listed'} · <strong>Education:</strong> {mapJob.educationLevel || 'Not listed'}</p><p><strong>Application requirements:</strong> {mapJob.requirements?.length ? mapJob.requirements.map((requirement) => `${requirement.title}${requirement.isRequired ? ' (required)' : ''}`).join(', ') : 'None'}</p></div></div>}</section>}
    <div className="overflow-x-auto border-y border-slate-200"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500"><th className="px-4 py-3">Job</th><th className="px-4 py-3">Provider/company</th><th className="px-4 py-3">Terms</th><th className="px-4 py-3">Review</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs">{loading ? <tr><td colSpan="5" className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : jobs.length ? jobs.map((job) => <tr key={job._id} className="align-top hover:bg-slate-50"><td className="px-4 py-4"><p className="font-bold text-slate-900">{job.title}</p><p className="mt-1 max-w-72 line-clamp-2 text-slate-500">{job.description}</p><p className="mt-1 text-[10px] text-slate-500">Created {new Date(job.createdAt).toLocaleDateString()}</p></td><td className="px-4 py-4"><p className="font-semibold text-slate-800">{job.companyId?.name}</p><p className="mt-1 text-slate-600">{job.providerId?.name}</p><p className="text-slate-500">{job.providerId?.email}</p><span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] ${job.companyId?.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>Company {job.companyId?.status}</span></td><td className="px-4 py-4 text-slate-600">{job.employmentType?.replaceAll('_', ' ')} · {job.location || 'Location TBD'}<br />{job.salaryMin != null ? `${job.salaryMin}–${job.salaryMax ?? job.salaryMin} / ${job.salaryPayPeriod}` : 'Salary not listed'}<br />{job.slots} slots</td><td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${job.reviewStatus === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : job.reviewStatus === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{job.reviewStatus}</span><p className="mt-2 capitalize text-slate-500">Listing: {job.status}</p>{job.reviewReason && <p className="mt-2 max-w-52 text-rose-700">{job.reviewReason}</p>}</td><td className="px-4 py-4 text-right"><div className="inline-flex gap-1.5">{job.reviewStatus !== 'approved' && <button type="button" disabled={busy === String(job._id) || job.companyId?.status !== 'approved'} title={job.companyId?.status !== 'approved' ? 'Company must be approved first' : 'Approve job'} onClick={() => review(job, 'approved')} className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-2 font-semibold text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" />Approve</button>}{job.reviewStatus !== 'rejected' && <button type="button" disabled={busy === String(job._id)} onClick={() => review(job, 'rejected')} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"><X className="h-3.5 w-3.5" />Reject</button>}<button type="button" disabled={busy === String(job._id)} onClick={() => archive(job)} aria-label="Archive job" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-700"><Archive className="h-4 w-4" /></button></div></td></tr>) : <tr><td colSpan="5" className="py-12 text-center text-sm text-slate-500">No job listings match this filter.</td></tr>}</tbody></table></div><div className="flex items-center justify-between text-xs text-slate-600"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button></div></div></div>;
};
export default AdminJobs;
