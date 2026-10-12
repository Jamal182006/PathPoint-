import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import KanbanBoard from '../components/kanban/KanbanBoard';
import ApplicationTable from '../components/list/ApplicationTable';
import Modal from '../components/common/Modal';
import ApplicationForm from '../components/forms/ApplicationForm';
import ExportImportModal from '../components/common/ExportImportModal';
import ShortcutsModal from '../components/common/ShortcutsModal';
import TrackedItemsWidget from '../components/dashboard/TrackedItemsWidget';
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
} from 'lucide-react';

export const Dashboard = ({
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') === 'list' ? 'list' : 'board';

  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const modalOpen = isAddModalOpen !== undefined ? isAddModalOpen : localModalOpen;
  const setModalOpen = setIsAddModalOpen !== undefined ? setIsAddModalOpen : setLocalModalOpen;

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

  const handleStatusChange = async (appId, newStatus) => {
    try {
    const updated = await apiAdapter.updateStatus(appId, newStatus);
    if (updated) {
      setApplications((prev) =>
        prev.map((app) => (app._id === appId ? updated : app))
      );
      toast(`Status moved to "${newStatus}"`, 'success', 2000);
    }
    } catch (error) {
      toast(error.message || 'Unable to update application status.', 'error');
    }
  };

  const handleDelete = async (appId) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      await apiAdapter.deleteApplication(appId);
      setApplications((prev) => prev.filter((app) => app._id !== appId));
      toast('Application deleted', 'success');
    } catch (error) {
      toast(error.message || 'Unable to delete application.', 'error');
    }
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    loadApplications();
  };

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

      <TrackedItemsWidget />

      {/* Action and Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="dashboard-search-input"
              data-global-search
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

      {/* Add Application Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log New Job Application"
      >
        <ApplicationForm
          onSuccess={handleFormSuccess}
          onCancel={() => setModalOpen(false)}
        />
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
