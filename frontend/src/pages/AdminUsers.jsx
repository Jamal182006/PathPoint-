import React, { useState, useEffect } from 'react';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Users,
  Search,
  Archive,
  ArchiveRestore,
  Ban,
  CircleCheck,
  Download,
  Briefcase,
  Building2,
  Loader2,
} from 'lucide-react';

export const AdminUsers = () => {
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('user'); // Default to job seekers
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Candidate Portfolio Inspection Modal
  const [inspectedUser, setInspectedUser] = useState(null);
  const [inspectedApps, setInspectedApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await apiAdapter.getAdminUsersPage({
        search: searchTerm,
        status: statusFilter === 'All' ? undefined : statusFilter,
        role: roleFilter === 'All' ? undefined : roleFilter,
        archived: showArchived ? 'true' : 'false',
        page,
        limit: 20,
      });
      setUsers(result.data || []);
      setPages(result.pages || 1);
    } catch (err) {
      toast('Failed to load candidate directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchTerm, statusFilter, roleFilter, showArchived, page]);

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const confirmMsg =
      nextStatus === 'suspended'
        ? `Are you sure you want to suspend candidate profile "${user.name}"?`
        : `Re-activate candidate profile "${user.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiAdapter.updateUserStatus(user.id, nextStatus);
      toast(
        `User ${user.name} is now ${nextStatus}.`,
        nextStatus === 'active' ? 'success' : 'info'
      );
      loadUsers();
    } catch (err) {
      toast(err.message || 'Status update failed.', 'error');
    }
  };

  const handleArchiveUser = async (user) => {
    const archived = !user.isArchived;
    if (archived && !window.confirm(`Archive ${user.name}? Their records will be retained, but they will no longer be able to sign in.`)) return;
    try {
      await apiAdapter.archiveAdminUser(user.id, archived);
      toast(archived ? 'Account archived; records retained.' : 'Account restored.', 'success');
      loadUsers();
    } catch (err) {
      toast(err.message || 'Unable to update account archive status.', 'error');
    }
  };

  const handleInspectPortfolio = async (user) => {
    setInspectedUser(user);
    setLoadingApps(true);
    try {
      const apps = await apiAdapter.getUserApplications(user.id);
      setInspectedApps(apps);
    } catch (err) {
      toast('Failed to retrieve seeker applications.', 'error');
    } finally {
      setLoadingApps(false);
    }
  };

  const handleExportCSV = () => {
    if (users.length === 0) return;
    const headers = ['Name', 'Email', 'Role', 'Career Track', 'Status', 'Applications', 'Offers', 'Last Active'];
    const rows = users.map((u) => [
      `"${u.name}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${u.careerTrack || 'N/A'}"`,
      `"${u.status || 'active'}"`,
      u.applicationCount || 0,
      u.offerCount || 0,
      `"${u.lastActiveAt || 'N/A'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pathpoint_candidates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Candidate directory exported to CSV.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="ui-page-title flex items-center gap-2.5">
            <Users className="h-7 w-7 text-brand-600" />
            <span>Job Seeker & Student Directory</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Review candidate cohorts, monitor individual pipeline progress, and manage student accounts.
          </p>
        </div>

      </div>

      {/* Action Controls & Filters */}
      <div className="ui-card flex flex-col items-center justify-between gap-3 p-4 md:flex-row">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidates by name, email..."
            className="ui-input pl-9"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ui-input w-auto cursor-pointer text-xs"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="ui-input w-auto cursor-pointer text-xs"
          >
            <option value="user">Job Seekers Only</option>
            <option value="provider">Providers Only</option>
            <option value="admin">Administrators / Counselors</option>
            <option value="All">All Roles</option>
          </select>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={showArchived} onChange={(event) => { setPage(1); setShowArchived(event.target.checked); }} />
            Archived
          </label>

          <button
            onClick={handleExportCSV}
            className="ui-btn ui-btn-primary ui-btn-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Roster</span>
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="ui-table-shell">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="ui-th">Candidate / Seeker</th>
                <th className="ui-th">Career Track</th>
                <th className="ui-th text-center">Applications</th>
                <th className="ui-th text-center">Interviews</th>
                <th className="ui-th text-center">Offers</th>
                <th className="ui-th">Status</th>
                <th className="ui-th">Last Active</th>
                <th className="ui-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-slate-50/60">
                    {/* User Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-sm font-semibold text-brand-700">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                          {u.isArchived && <span className="ui-badge ui-badge-danger mt-1 uppercase">Archived</span>}
                        </div>
                      </div>
                    </td>

                    {/* Career Track */}
                    <td className="px-4 py-3.5">
                      <span className="ui-badge ui-badge-neutral">
                        <Briefcase className="h-3 w-3 text-slate-400" />
                        <span>{u.careerTrack || 'General'}</span>
                      </span>
                    </td>

                    {/* Applications */}
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                      {u.applicationCount || 0}
                    </td>

                    {/* Interviews */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="ui-badge ui-badge-warning">
                        {u.interviewCount || 0}
                      </span>
                    </td>

                    {/* Offers */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`ui-badge ${
                          (u.offerCount || 0) > 0
                            ? 'ui-badge-success'
                            : 'ui-badge-neutral'
                        }`}
                      >
                        {u.offerCount || 0}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`ui-badge uppercase ${
                          u.status === 'suspended'
                            ? 'ui-badge-danger'
                            : 'ui-badge-success'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.status === 'suspended' ? 'bg-danger-600' : 'bg-success-600'
                          }`}
                        />
                        <span>{u.status || 'active'}</span>
                      </span>
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {u.lastActiveAt
                        ? new Date(u.lastActiveAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Recent'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleInspectPortfolio(u)}
                          className="ui-btn ui-btn-secondary ui-btn-sm"
                          title="Review seeker's pipeline portfolio"
                        >
                          Review Portfolio
                        </button>
                        {u.role !== 'admin' && (
                          <>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`ui-btn ui-btn-sm ${
                              u.status === 'suspended'
                                ? 'ui-btn-ghost text-success-700 hover:bg-success-50'
                                : 'ui-btn-ghost text-slate-500 hover:bg-danger-50 hover:text-danger-700'
                            }`}
                            title={u.status === 'suspended' ? 'Re-activate profile' : 'Suspend account'}
                            aria-label={u.status === 'suspended' ? `Re-activate ${u.name}` : `Suspend ${u.name}`}
                          >
                            {u.status === 'suspended' ? (
                              <CircleCheck className="h-3.5 w-3.5" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleArchiveUser(u)}
                            className="ui-btn ui-btn-secondary ui-btn-sm hover:border-danger-200 hover:bg-danger-50 hover:text-danger-700"
                            title={u.isArchived ? 'Restore account' : 'Archive account'}
                            aria-label={u.isArchived ? `Restore ${u.name}` : `Archive ${u.name}`}
                          >
                            {u.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                          </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-sm text-slate-500">
                    No candidates matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Previous</button>
          <button disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)} className="ui-btn ui-btn-secondary ui-btn-sm">Next</button>
        </div>
      </div>

      {/* Candidate Portfolio Review Drawer Modal */}
      <Modal
        isOpen={Boolean(inspectedUser)}
        onClose={() => setInspectedUser(null)}
        title={inspectedUser?.name}
        maxWidth="max-w-2xl"
      >
        {inspectedUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-base font-semibold text-white">
                {inspectedUser.name?.charAt(0).toUpperCase()}
              </div>
              <p className="text-xs text-slate-500">
                {inspectedUser.email} • {inspectedUser.careerTrack || 'General'}
              </p>
            </div>

            <div className="ui-eyebrow flex items-center justify-between">
              <span>Application Portfolio ({inspectedApps.length})</span>
              <span className="font-semibold text-brand-600">Counselor Advisory View</span>
            </div>

            {loadingApps ? (
              <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                Loading portfolio…
              </div>
            ) : inspectedApps.length > 0 ? (
              inspectedApps.map((app) => (
                <div
                  key={app._id}
                  className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>{app.company}</span>
                      <span className="text-xs font-normal text-slate-500">— {app.role}</span>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {app.salaryRange && <span>Salary: {app.salaryRange}</span>}
                    {app.dateApplied && (
                      <span>
                        Applied: {new Date(app.dateApplied).toLocaleDateString()}
                      </span>
                    )}
                    {app.contactPerson && <span>Contact: {app.contactPerson}</span>}
                  </div>

                  {app.jobDescriptionNotes && (
                    <p className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600">
                      {app.jobDescriptionNotes}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-500">
                This candidate has not logged any job applications yet.
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => setInspectedUser(null)}
                className="ui-btn ui-btn-primary"
              >
                Close Review
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsers;
