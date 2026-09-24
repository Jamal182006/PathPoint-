import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useToast } from '../components/common/Toast';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  UserCheck,
  UserX,
  ExternalLink,
  Download,
  Briefcase,
  Award,
  Clock,
  ChevronRight,
  X,
  Building2,
  Calendar,
  Layers,
  Activity,
} from 'lucide-react';

export const AdminUsers = () => {
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('user'); // Default to job seekers

  // Candidate Portfolio Inspection Modal
  const [inspectedUser, setInspectedUser] = useState(null);
  const [inspectedApps, setInspectedApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await apiAdapter.getAdminUsers({
        search: searchTerm,
        status: statusFilter,
        role: roleFilter,
      });
      setUsers(list);
    } catch (err) {
      toast('Failed to load candidate directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchTerm, statusFilter, roleFilter]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            <span>Job Seeker & Student Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review candidate cohorts, monitor individual pipeline progress, and manage student accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <Link
            to="/admin"
            className="px-3.5 py-1.5 rounded-lg font-medium text-slate-600 hover:text-slate-900 transition"
          >
            Cohort KPIs
          </Link>
          <Link
            to="/admin/users"
            className="px-3.5 py-1.5 rounded-lg font-semibold bg-white text-indigo-700 shadow-sm"
          >
            Seeker Directory
          </Link>
          <Link
            to="/admin/system"
            className="px-3.5 py-1.5 rounded-lg font-medium text-slate-600 hover:text-slate-900 transition"
          >
            System Health
          </Link>
        </div>
      </div>

      {/* Action Controls & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidates by name, email..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="user">Job Seekers Only</option>
            <option value="admin">Administrators / Counselors</option>
            <option value="All">All Roles</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster</span>
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Candidate / Seeker</th>
                <th className="px-4 py-3.5">Career Track</th>
                <th className="px-4 py-3.5 text-center">Applications</th>
                <th className="px-4 py-3.5 text-center">Interviews</th>
                <th className="px-4 py-3.5 text-center">Offers</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Last Active</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* User Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Career Track */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span>{u.careerTrack || 'General'}</span>
                      </span>
                    </td>

                    {/* Applications */}
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                      {u.applicationCount || 0}
                    </td>

                    {/* Interviews */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {u.interviewCount || 0}
                      </span>
                    </td>

                    {/* Offers */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          (u.offerCount || 0) > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {u.offerCount || 0}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          u.status === 'suspended'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'suspended' ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span>{u.status || 'active'}</span>
                      </span>
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
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
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition"
                          title="Review seeker's pipeline portfolio"
                        >
                          Review Portfolio
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg border transition ${
                              u.status === 'suspended'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                            }`}
                            title={u.status === 'suspended' ? 'Re-activate profile' : 'Suspend account'}
                          >
                            {u.status === 'suspended' ? (
                              <UserCheck className="w-3.5 h-3.5" />
                            ) : (
                              <UserX className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    No candidates matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Portfolio Review Drawer Modal */}
      {inspectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-indigo-200">
                  {inspectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{inspectedUser.name}</h3>
                  <p className="text-xs text-slate-500">
                    {inspectedUser.email} • {inspectedUser.careerTrack || 'General'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectedUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Seeker's applications */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <span>Application Portfolio ({inspectedApps.length})</span>
                <span className="text-indigo-600 font-bold">Counselor Advisory View</span>
              </div>

              {loadingApps ? (
                <div className="py-12 text-center text-slate-400">Loading portfolio...</div>
              ) : inspectedApps.length > 0 ? (
                inspectedApps.map((app) => (
                  <div
                    key={app._id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>{app.company}</span>
                        <span className="text-xs font-normal text-slate-500">— {app.role}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          app.status === 'Offered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'Interviewing'
                            ? 'bg-amber-100 text-amber-800'
                            : app.status === 'Applied'
                            ? 'bg-blue-100 text-blue-800'
                            : app.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      {app.salaryRange && <span>Salary: {app.salaryRange}</span>}
                      {app.dateApplied && (
                        <span>
                          Applied: {new Date(app.dateApplied).toLocaleDateString()}
                        </span>
                      )}
                      {app.contactPerson && <span>Contact: {app.contactPerson}</span>}
                    </div>

                    {app.jobDescriptionNotes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {app.jobDescriptionNotes}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400">
                  This candidate has not logged any job applications yet.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setInspectedUser(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
