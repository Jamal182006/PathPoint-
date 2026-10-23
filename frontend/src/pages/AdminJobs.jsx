import React, { useEffect, useState } from 'react';
import { TableLoadingRow } from '../components/common/Loading';
import { Link, useSearchParams } from 'react-router-dom';
import adminApi from '../api/adminApi';
import { useToast } from '../components/common/Toast';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import AddressMap from '../components/common/AddressMap';
import { Modal } from '../components/common/Modal';
import { Archive, BriefcaseBusiness, Check, ChevronLeft, ChevronRight, Search, X, AlertTriangle } from 'lucide-react';

const AdminJobs = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [reviewStatus, setReviewStatus] = useState(() => searchParams.get('reviewStatus') || 'all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [mapJobId, setMapJobId] = useState('');

  // Dialog modals
  const [rejectDialog, setRejectDialog] = useState({ open: false, job: null, reason: '' });
  const [archiveDialog, setArchiveDialog] = useState({ open: false, job: null });

  const mapJob = jobs.find((job) => String(job._id) === mapJobId);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getJobs({
        search: debouncedSearch,
        reviewStatus: reviewStatus === 'all' ? undefined : reviewStatus,
        page,
        limit: 20,
      });
      setJobs(res.data?.data || []);
      setPages(res.data?.pages || 1);
    } catch (error) {
      toast(error.response?.data?.message || 'Unable to load job listings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debouncedSearch, reviewStatus, page]);

  const approveJob = async (job) => {
    setBusy(String(job._id));
    try {
      await adminApi.reviewJob(job._id, 'approved', '');
      toast(`Job "${job.title}" approved.`, 'success');
      await load();
    } catch (error) {
      toast(error.response?.data?.message || 'Unable to approve job.', 'error');
    } finally {
      setBusy('');
    }
  };

  const confirmRejection = async () => {
    const { job, reason } = rejectDialog;
    if (!job) return;
    if (!reason.trim()) {
      toast('Please enter a rejection reason for the provider.', 'error');
      return;
    }
    setBusy(String(job._id));
    try {
      await adminApi.reviewJob(job._id, 'rejected', reason.trim());
      toast(`Job "${job.title}" rejected.`, 'success');
      setRejectDialog({ open: false, job: null, reason: '' });
      await load();
    } catch (error) {
      toast(error.response?.data?.message || 'Unable to reject job.', 'error');
    } finally {
      setBusy('');
    }
  };

  const confirmArchive = async () => {
    const { job } = archiveDialog;
    if (!job) return;
    setBusy(String(job._id));
    try {
      await adminApi.archiveJob(job._id);
      toast(`Job "${job.title}" archived.`, 'success');
      setArchiveDialog({ open: false, job: null });
      await load();
    } catch (error) {
      toast(error.response?.data?.message || 'Unable to archive job.', 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="ui-page-title mt-1 flex items-center gap-2">
          <BriefcaseBusiness className="h-6 w-6 text-brand-700" />
          Job Listing Review
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Only approved provider and company records can publish jobs to the public directory.
        </p>
      </header>

      <section className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <label className="relative block sm:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => { setPage(1); setSearch(event.target.value); }}
            aria-label="Search job listings"
            placeholder="Search job title or description"
            className="ui-input pl-9"
          />
        </label>
        <select
          value={reviewStatus}
          onChange={(event) => { setPage(1); setReviewStatus(event.target.value); }}
          aria-label="Filter job review status"
          className="ui-input w-auto text-xs"
        >
          <option value="all">All jobs</option>
          <option value="pending">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </section>

      {jobs.length > 0 && (
        <section className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
          <label className="text-xs font-semibold text-slate-600">
            Preview job details & map
            <select
              value={mapJobId}
              onChange={(event) => setMapJobId(event.target.value)}
              className="ui-input mt-1 block w-full sm:min-w-64"
            >
              <option value="">Choose a job to inspect</option>
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>{job.title} · {job.companyId?.name}</option>
              ))}
            </select>
          </label>
          {mapJob && (
            <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
              <AddressMap
                readOnly
                location={mapJob.location || mapJob.companyId?.location}
                formattedAddress={mapJob.formattedAddress || mapJob.companyId?.formattedAddress}
                latitude={mapJob.latitude ?? mapJob.companyId?.latitude}
                longitude={mapJob.longitude ?? mapJob.companyId?.longitude}
              />
              <div className="space-y-2 text-xs text-slate-700">
                <p><strong>{mapJob.category || 'Uncategorized'}</strong> · {mapJob.workSetup?.replaceAll('_', '-')} · {mapJob.employmentType?.replaceAll('_', ' ')}</p>
                <p className="whitespace-pre-wrap">{mapJob.description}</p>
                {mapJob.responsibilities?.length > 0 && <p><strong>Responsibilities:</strong> {mapJob.responsibilities.join('; ')}</p>}
                {mapJob.qualifications?.length > 0 && <p><strong>Qualifications:</strong> {mapJob.qualifications.join('; ')}</p>}
                {mapJob.skills?.length > 0 && <p><strong>Skills:</strong> {mapJob.skills.join(', ')}</p>}
                {mapJob.benefits?.length > 0 && <p><strong>Benefits:</strong> {mapJob.benefits.join(', ')}</p>}
                <p><strong>Experience:</strong> {mapJob.experienceLevel || 'Not listed'} · <strong>Education:</strong> {mapJob.educationLevel || 'Not listed'}</p>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="ui-table-shell">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="ui-th">Job</th>
                <th className="ui-th">Provider / Company</th>
                <th className="ui-th">Terms & Slots</th>
                <th className="ui-th">Review Status</th>
                <th className="ui-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <TableLoadingRow colSpan={5} label="Loading job listings…" />
              ) : jobs.length ? jobs.map((job) => {
                const companyApproved = job.companyId?.status === 'approved';
                return (
                  <tr key={job._id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{job.title}</p>
                      <p className="mt-1 max-w-72 line-clamp-2 text-slate-500">{job.description}</p>
                      <p className="mt-1 text-xs text-slate-400">Created {new Date(job.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800">{job.companyId?.name || 'Company missing'}</p>
                      <p className="mt-1 text-slate-600">{job.providerId?.name}</p>
                      <p className="text-slate-400">{job.providerId?.email}</p>
                      <div className="mt-1.5">
                        <span className={`ui-badge ${companyApproved ? 'ui-badge-success' : 'ui-badge-danger'}`}>
                          Company {job.companyId?.status || 'unverified'}
                        </span>
                        {!companyApproved && (
                          <Link to="/admin/companies" className="mt-1 block text-xs font-semibold text-brand-700 hover:underline">
                            Review company &rarr;
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {job.employmentType?.replaceAll('_', ' ')} · {job.location || 'Location TBD'}
                      <br />
                      {job.salaryMin != null ? `${job.salaryMin}–${job.salaryMax ?? job.salaryMin} / ${job.salaryPayPeriod}` : 'Salary not listed'}
                      <br />
                      <span className="font-medium text-slate-700">{job.slots} slots</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`ui-badge uppercase ${job.reviewStatus === 'approved' ? 'ui-badge-success' : job.reviewStatus === 'rejected' ? 'ui-badge-danger' : 'ui-badge-warning'}`}>
                        {job.reviewStatus}
                      </span>
                      <p className="mt-2 text-xs capitalize text-slate-500">Directory: {job.status}</p>
                      {job.reviewReason && (
                        <p className="mt-1.5 max-w-52 text-xs font-medium text-danger-700">Note: {job.reviewReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex gap-1.5">
                        {job.reviewStatus !== 'approved' && (
                          <button
                            type="button"
                            disabled={busy === String(job._id) || !companyApproved}
                            title={!companyApproved ? 'Company must be approved first' : 'Approve job'}
                            onClick={() => approveJob(job)}
                            className="ui-btn ui-btn-primary ui-btn-sm"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {job.reviewStatus !== 'rejected' && (
                          <button
                            type="button"
                            disabled={busy === String(job._id)}
                            onClick={() => setRejectDialog({ open: true, job, reason: '' })}
                            className="ui-btn ui-btn-danger ui-btn-sm"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy === String(job._id)}
                          onClick={() => setArchiveDialog({ open: true, job })}
                          aria-label="Archive job"
                          className="ui-btn ui-btn-ghost ui-btn-sm hover:text-danger-700"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="5" className="py-12 text-center text-sm text-slate-500">No job listings match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="ui-btn ui-btn-secondary ui-btn-sm">
            <ChevronLeft className="h-4 w-4" />Previous
          </button>
          <button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="ui-btn ui-btn-secondary ui-btn-sm">
            Next<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, job: null, reason: '' })}
        title={`Reject Job: ${rejectDialog.job?.title || ''}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Please provide a clear reason for returning this job listing. The provider will receive this feedback and can edit and resubmit the job.
          </p>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Reason for rejection *</span>
            <textarea
              rows={4}
              maxLength={500}
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Please clarify job qualifications or adjust salary range..."
              className="ui-input mt-1 w-full text-xs"
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRejectDialog({ open: false, job: null, reason: '' })}
              className="ui-btn ui-btn-secondary ui-btn-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectDialog.reason.trim() || busy === String(rejectDialog.job?._id)}
              onClick={confirmRejection}
              className="ui-btn ui-btn-danger ui-btn-sm"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* Archive Modal */}
      <Modal
        isOpen={archiveDialog.open}
        onClose={() => setArchiveDialog({ open: false, job: null })}
        title={`Archive “${archiveDialog.job?.title || 'Job'}”?`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed">
              Archiving will remove this job listing from public discovery. All applicant history and submitted documents will be safely retained.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setArchiveDialog({ open: false, job: null })}
              className="ui-btn ui-btn-secondary ui-btn-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy === String(archiveDialog.job?._id)}
              onClick={confirmArchive}
              className="ui-btn ui-btn-danger ui-btn-sm"
            >
              Archive Job
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminJobs;
