import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import KanbanBoard from '../components/kanban/KanbanBoard';
import ApplicationTable from '../components/list/ApplicationTable';
import Modal from '../components/common/Modal';
import ApplicationForm from '../components/forms/ApplicationForm';
import GoalTracker from '../components/dashboard/GoalTracker';
import ExportImportModal from '../components/common/ExportImportModal';
import ShortcutsModal from '../components/common/ShortcutsModal';
import { COMPANY_DIRECTORY } from '../mock/companyDirectory';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Plus,
  Briefcase,
  Calendar,
  Award,
  Bookmark,
  Download,
  HelpCircle,
  Building2,
  ArrowRight,
} from 'lucide-react';

export const Dashboard = ({
  isAddModalOpen,
  setIsAddModalOpen,
  browseModalOpen: browseModalOpenProp,
  setBrowseModalOpen: setBrowseModalOpenProp,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') === 'list' ? 'list' : 'board';

  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [prefillCompany, setPrefillCompany] = useState('');
  const [prefillRole, setPrefillRole] = useState('');

  // Modals
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [localBrowseModalOpen, setLocalBrowseModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const modalOpen = isAddModalOpen !== undefined ? isAddModalOpen : localModalOpen;
  const setModalOpen = setIsAddModalOpen !== undefined ? setIsAddModalOpen : setLocalModalOpen;
  const browseModalOpen = browseModalOpenProp !== undefined ? browseModalOpenProp : localBrowseModalOpen;
  const setBrowseModalOpen = setBrowseModalOpenProp || setLocalBrowseModalOpen;

  const loadApplications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await apiAdapter.getApplications(user.id);
      setApplications(list);
    } catch (err) {
      console.error('Failed to load applications:', err);
      toast('Failed to load applications', 'error');
    }
  }, [user?.id, toast]);


  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleViewChange = (view) => {
    if (view === 'list') {
      setSearchParams({ view: 'list' });
    } else {
      setSearchParams({});
    }
  };

  const handleStatusChange = (appId, newStatus) => {
    const updated = storageService.updateStatus(appId, newStatus);
    if (updated) {
      setApplications((prev) =>
        prev.map((app) => (app._id === appId ? updated : app))
      );
      toast(`Status moved to "${newStatus}"`, 'success', 2000);
    }
  };

  const handleDelete = (appId) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    storageService.deleteApplication(appId);
    setApplications((prev) => prev.filter((app) => app._id !== appId));
    toast('Application deleted', 'success');
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    setSelectedCompany(null);
    setPrefillCompany('');
    setPrefillRole('');
    loadApplications();
  };

  const openApplicationForm = (companyName, roleName = '') => {
    setPrefillCompany(companyName || '');
    setPrefillRole(roleName || '');
    setBrowseModalOpen(false);
    setSelectedCompany(null);
    setModalOpen(true);
  };

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return COMPANY_DIRECTORY;

    const q = companySearch.toLowerCase();
    return COMPANY_DIRECTORY.filter((company) => {
      return (
        company.name.toLowerCase().includes(q) ||
        company.industry.toLowerCase().includes(q) ||
        company.roles.some((role) => role.toLowerCase().includes(q)) ||
        company.location.toLowerCase().includes(q)
      );
    });
  }, [companySearch]);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        !searchTerm ||
        app.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || app.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  // Quick summary counts
  const counts = useMemo(() => {
    return {
      total: applications.length,
      saved: applications.filter((a) => a.status === 'Saved').length,
      interviewing: applications.filter((a) => a.status === 'Interviewing').length,
      offered: applications.filter((a) => a.status === 'Offered').length,
    };
  }, [applications]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Weekly Goal Tracker & Research Telemetry */}
      <GoalTracker applications={applications} />

      {/* Metrics Header Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{counts.total}</div>
            <div className="text-xs text-slate-500 font-medium">Total Tracked</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{counts.interviewing}</div>
            <div className="text-xs text-slate-500 font-medium">Interviewing</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{counts.offered}</div>
            <div className="text-xs text-slate-500 font-medium">Offers Received</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{counts.saved}</div>
            <div className="text-xs text-slate-500 font-medium">Saved / Wishlist</div>
          </div>
        </div>
      </div>

      {/* Action and Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="dashboard-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by company, role, recruiter... (or press /)"
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs sm:text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Stages ({applications.length})</option>
              <option value="Saved">Saved</option>
              <option value="Applied">Applied</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Offered">Offered</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2 justify-end">
          {/* Export / Backup button */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Export to CSV or backup JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export / Import</span>
          </button>

          {/* Shortcuts button */}
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs transition"
            title="Keyboard shortcuts (or press ?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Board vs List toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => handleViewChange('board')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                currentView === 'board'
                  ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            <button
              onClick={() => handleViewChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                currentView === 'list'
                  ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main View Area */}
      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto mt-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No applications logged yet</h3>
          <p className="text-xs text-slate-500 mt-1.5 mb-5 max-w-sm mx-auto">
            Log your target companies, track interview stages, attach resumes, and monitor outcomes.
          </p>
        </div>
      ) : currentView === 'board' ? (
        <KanbanBoard
          applications={filteredApps}
          onStatusChange={handleStatusChange}
          onAddClick={() => setModalOpen(true)}
        />
      ) : (
        <ApplicationTable
          applications={filteredApps}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      <Modal
        isOpen={browseModalOpen}
        onClose={() => setBrowseModalOpen(false)}
        title="Browse Companies"
        maxWidth="max-w-5xl"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Explore companies, review open roles, and start an application.</p>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {filteredCompanies.length} companies
          </span>
        </div>

        <div className="relative mb-5 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            placeholder="Search companies, industries, or roles"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        </div>

        {filteredCompanies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center">
            <Building2 className="mx-auto mb-3 h-7 w-7 text-slate-400" />
            <p className="text-sm font-semibold text-slate-800">No companies found</p>
            <p className="mt-1 text-xs text-slate-500">Try a different company, industry, location, or role.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{company.name}</h4>
                    <p className="mt-1 text-[11px] font-medium text-indigo-700">{company.industry}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCompany(company)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                  >
                    View
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <p className="mt-3 line-clamp-2 text-xs text-slate-600">{company.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span><span className="text-slate-500">Location:</span> {company.location}</span>
                  <span><span className="text-slate-500">Comp:</span> {company.salaryRange}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.roles.slice(0, 3).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => openApplicationForm(company.name, role)}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Add Application Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPrefillCompany('');
          setPrefillRole('');
        }}
        title="Log New Job Application"
      >
        <ApplicationForm
          defaultCompany={prefillCompany}
          defaultRole={prefillRole}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setModalOpen(false);
            setPrefillCompany('');
            setPrefillRole('');
          }}
        />
      </Modal>

      <Modal
        isOpen={Boolean(selectedCompany)}
        onClose={() => setSelectedCompany(null)}
        title={selectedCompany?.name || 'Company Details'}
        maxWidth="max-w-xl"
      >
        {selectedCompany && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedCompany.name}</h4>
                  <p className="text-xs text-slate-500">{selectedCompany.industry}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold">
                  {selectedCompany.location}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600">{selectedCompany.description}</p>

              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <div className="text-slate-500 mb-1">Salary range</div>
                  <div className="font-semibold text-slate-800">{selectedCompany.salaryRange}</div>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <div className="text-slate-500 mb-1">Contact</div>
                  <div className="font-semibold text-slate-800">{selectedCompany.contactPerson}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Available roles</div>
              <div className="flex flex-wrap gap-2">
                {selectedCompany.roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => openApplicationForm(selectedCompany.name, role)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-indigo-200 hover:text-indigo-700 transition"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => openApplicationForm(selectedCompany.name, selectedCompany.roles[0])}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm"
              >
                Start application
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Export & Import Modal */}
      <ExportImportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        applications={applications}
        user={user}
        onDataImported={loadApplications}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
