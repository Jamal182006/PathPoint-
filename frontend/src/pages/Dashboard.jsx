import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  CalendarCheck,
  Bookmark,
  Download,
  HelpCircle,
  Sparkles,
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

  // Applications submitted through /jobs and company listings (separate store)
  const [submissionCount, setSubmissionCount] = useState(0);
  const [platformInterviews, setPlatformInterviews] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const modalOpen = isAddModalOpen !== undefined ? isAddModalOpen : localModalOpen;
  const setModalOpen = setIsAddModalOpen !== undefined ? setIsAddModalOpen : setLocalModalOpen;

  const loadApplications = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!user?.id) return;
    try {
      const list = await apiAdapter.getApplications(user.id);
      setApplications(list);
    } catch (err) {
      if (!silent) {
        console.error('Failed to load applications:', err);
        toast('Failed to load applications', 'error');
      }
    }

    // Platform submissions (job / company listings) are stored separately from the manual tracker.
    if (user.role !== 'user') {
      setSubmissionCount(0);
      setPlatformInterviews([]);
      return;
    }
    try {
      const [totals, scheduled] = await Promise.all([
        apiAdapter.getApplicationSubmissions({ limit: 1 }),
        apiAdapter.getApplicationSubmissions({ status: 'interview', limit: 50 }),
      ]);
      setSubmissionCount(Number(totals?.count) || 0);
      setPlatformInterviews((scheduled?.data || []).map((sub) => sub.interviewDate).filter(Boolean));
    } catch (err) {
      if (!silent) console.error('Failed to load platform applications:', err);
      setSubmissionCount(0);
      setPlatformInterviews([]);
    }
  }, [user?.id, user?.role, toast]);


  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    if (!user?.id) return undefined;
    if (typeof window === 'undefined') return undefined;
    const intervalId = setInterval(() => {
      loadApplications({ silent: true });
    }, 30000);
    const handleFocus = () => loadApplications({ silent: true });
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.id, loadApplications]);

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

  // Quick summary counts — manual tracker plus applications submitted through the platform
  const counts = useMemo(() => {
    const now = Date.now();
    const interviewTimes = [];
    applications.forEach((app) => {
      (app.interviewDates || []).forEach((raw) => {
        const time = new Date(raw).getTime();
        if (!Number.isNaN(time)) interviewTimes.push(time);
      });
    });
    platformInterviews.forEach((raw) => {
      const time = new Date(raw).getTime();
      if (!Number.isNaN(time)) interviewTimes.push(time);
    });
    const currentInterviews = interviewTimes.filter((time) => time >= now).length;
    return {
      total: applications.length + submissionCount,
      saved: applications.filter((a) => a.status === 'Saved').length,
      currentInterviews,
      completedInterviews: interviewTimes.length - currentInterviews,
    };
  }, [applications, submissionCount, platformInterviews]);

  // Completeness of the details a candidate can defer past signup.
  const profileCompletion = useMemo(() => {
    const items = [
      { label: 'your phone number', complete: Boolean(user?.phone?.trim()) },
      { label: 'a professional summary', complete: Boolean(user?.bio?.trim()) },
      { label: 'your target role', complete: Boolean(user?.profileInfo?.headline?.trim() || (user?.profileInfo?.targetRoles?.length > 0)) },
      { label: 'your work experience', complete: Boolean(user?.experience?.length) },
      { label: 'your education', complete: Boolean(user?.educationHistory?.length || user?.education?.trim()) },
      { label: 'your skills', complete: Boolean(user?.skills?.length) },
      { label: 'your resume', complete: Boolean(user?.resume) },
    ];
    const done = items.filter((item) => item.complete).length;
    return {
      percentage: Math.round((done / items.length) * 100),
      next: items.find((item) => !item.complete)?.label || 'the last details',
    };
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">Here's where your search stands today.</p>
      </header>

      {profileCompletion.percentage < 100 && (
        <section aria-label="Profile completion" className="ui-card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900">Finish your profile</h2>
              <span className="ml-auto text-xs font-semibold tabular-nums text-brand-600 sm:ml-0">{profileCompletion.percentage}%</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Add {profileCompletion.next} so providers and recruiters can understand your background.</p>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${profileCompletion.percentage}%` }} />
            </div>
          </div>
          <Link to="/profile" className="ui-btn ui-btn-primary ui-btn-sm shrink-0 justify-center">Complete profile</Link>
        </section>
      )}

      {/* Metrics Header Summary Bar */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total tracked', value: counts.total, icon: Briefcase, tint: 'bg-brand-50 text-brand-600', href: null },
          { label: 'Interviews', value: counts.currentInterviews, icon: Calendar, tint: 'bg-amber-50 text-amber-600', href: '/my-applications' },
          { label: 'Interviews completed', value: counts.completedInterviews, icon: CalendarCheck, tint: 'bg-emerald-50 text-emerald-600', href: '/my-applications' },
          { label: 'Saved / wishlist', value: counts.saved, icon: Bookmark, tint: 'bg-slate-100 text-slate-600', href: null },
        ].map(({ label, value, icon: Icon, tint, href }) => {
          const content = (
            <>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-2xl font-semibold leading-none tabular-nums text-slate-900">{value}</div>
                <div className="mt-1.5 truncate text-xs font-medium text-slate-500">{label}</div>
              </div>
            </>
          );
          return href ? (
            <Link key={label} to={href} className="ui-card flex items-center gap-3 p-4 transition hover:border-slate-300 hover:shadow-sm">
              {content}
            </Link>
          ) : (
            <div key={label} className="ui-card flex items-center gap-3 p-4">
              {content}
            </div>
          );
        })}
      </div>

      <TrackedItemsWidget />

      {/* Action and Filter Controls Bar */}
      <div className="ui-card mb-6 flex flex-col items-stretch justify-between gap-3 p-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="dashboard-search-input"
              data-global-search
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by company, role, recruiter… (or press /)"
              aria-label="Filter applications"
              className="ui-input pl-9"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="hidden h-4 w-4 text-slate-400 sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by stage"
              className="ui-input w-auto py-2 text-sm"
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
        <div className="flex items-center justify-end gap-2">
          {/* Export / Backup button */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="ui-btn ui-btn-secondary ui-btn-sm"
            title="Export to CSV or backup JSON"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export / Import</span>
          </button>

          {/* Shortcuts button */}
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="ui-btn ui-btn-secondary ui-btn-sm px-2.5"
            title="Keyboard shortcuts (or press ?)"
            aria-label="Keyboard shortcuts"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Board vs List toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => handleViewChange('board')}
              aria-pressed={currentView === 'board'}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                currentView === 'board'
                  ? 'bg-white font-semibold text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            <button
              onClick={() => handleViewChange('list')}
              aria-pressed={currentView === 'list'}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                currentView === 'list'
                  ? 'bg-white font-semibold text-brand-700 shadow-sm'
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
        <div className="ui-empty mx-auto mt-8 max-w-lg">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Briefcase className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {submissionCount > 0 ? 'No manual applications logged yet' : 'No applications yet'}
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500">
            {submissionCount > 0
              ? `You have ${submissionCount} ${submissionCount === 1 ? 'application' : 'applications'} submitted through job listings. Log target companies to track them on this board, or manage platform applications in My Applications.`
              : 'Log your target companies, track interview stages, attach resumes, and monitor outcomes — all in one board. You can also apply directly to jobs in the Jobs Directory.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => setModalOpen(true)} className="ui-btn ui-btn-primary">
              <Plus className="h-4 w-4" />
              Log your first application
            </button>
            {submissionCount > 0 && (
              <Link to="/my-applications" className="ui-btn ui-btn-secondary">
                View platform applications
              </Link>
            )}
            {submissionCount === 0 && (
              <Link to="/jobs" className="ui-btn ui-btn-secondary">
                Browse jobs
              </Link>
            )}
          </div>
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
