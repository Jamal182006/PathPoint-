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
import { formatDateTimeDisplay } from '../utils/dateUtils';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Briefcase,
  Calendar,
  CalendarCheck,
  Bookmark,
  Download,
  HelpCircle,
  Sparkles,
  Clock,
  ArrowRight,
} from 'lucide-react';

const STAGES = [
  { key: 'Saved', label: 'Saved' },
  { key: 'Applied', label: 'Applied' },
  { key: 'Interviewing', label: 'Interviewing' },
  { key: 'Offered', label: 'Offered' },
  { key: 'Rejected', label: 'Rejected' },
];

const QUICK_ACTIONS = [
  { label: 'Browse jobs', to: '/jobs', icon: Briefcase },
  { label: 'Applications', to: '/my-applications', icon: CalendarCheck },
  { label: 'Interviews', to: '/interviews', icon: Calendar },
  { label: 'Work log', to: '/work-log', icon: Clock },
];

export const Dashboard = ({
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') === 'list' ? 'list' : 'board';

  const { user, settings } = useAuth();
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
      setPlatformInterviews((scheduled?.data || []).filter((sub) => sub?.interviewDate));
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
    // Only poll while the tab is actually visible: a background dashboard
    // should not keep hitting the API every 30 seconds.
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') loadApplications({ silent: true });
    }, 45000);
    const handleFocus = () => {
      if (document.visibilityState === 'visible') loadApplications({ silent: true });
    };
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

  // Every scheduled interview, from the manual tracker and the platform store.
  const upcomingInterviews = useMemo(() => {
    const now = Date.now();
    const entries = [];

    applications.forEach((app) => {
      (app.interviewDates || []).forEach((raw) => {
        const time = new Date(raw).getTime();
        if (!Number.isNaN(time) && time >= now) {
          entries.push({
            key: `${app._id}-${raw}`,
            at: time,
            company: app.company || 'Personal target',
            role: app.role || 'Tracked application',
            source: 'tracked',
          });
        }
      });
    });

    platformInterviews.forEach((sub) => {
      const time = new Date(sub.interviewDate).getTime();
      if (!Number.isNaN(time) && time >= now) {
        entries.push({
          key: sub._id || `platform-${time}`,
          at: time,
          company: sub.organization || 'Company application',
          role: sub.title || 'Application',
          source: 'platform',
        });
      }
    });

    return entries.sort((a, b) => a.at - b.at).slice(0, 5);
  }, [applications, platformInterviews]);

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
    platformInterviews.forEach((sub) => {
      const time = new Date(sub.interviewDate).getTime();
      if (!Number.isNaN(time)) interviewTimes.push(time);
    });
    const currentInterviews = interviewTimes.filter((time) => time >= now).length;
    return {
      tracked: applications.length,
      submitted: submissionCount,
      currentInterviews,
      completedInterviews: interviewTimes.length - currentInterviews,
      saved: applications.filter((a) => a.status === 'Saved').length,
    };
  }, [applications, submissionCount, platformInterviews]);

  // Stage distribution of the tracked targets; clicking a stage filters the board.
  const stageBreakdown = useMemo(() => {
    const tally = {};
    applications.forEach((app) => {
      const stage = app.status || 'Saved';
      tally[stage] = (tally[stage] || 0) + 1;
    });
    return STAGES.map((stage) => ({
      ...stage,
      count: tally[stage.key] || 0,
    }));
  }, [applications]);

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

  const showWelcomeBanner = settings?.showWelcomeBanner !== false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {showWelcomeBanner && (
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">Here's where your search stands today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_ACTIONS.map(({ label, to, icon: Icon }) => (
              <Link key={to} to={to} className="ui-btn ui-btn-secondary ui-btn-sm">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>
        </header>
      )}

      {profileCompletion.percentage < 100 && (
        <section aria-label="Profile completion" className="ui-card mb-5 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Applications sent', value: counts.submitted, icon: Briefcase, tint: 'bg-brand-50 text-brand-600', href: '/my-applications' },
          { label: 'Tracked targets', value: counts.tracked, icon: Bookmark, tint: 'bg-slate-100 text-slate-600', href: null },
          { label: 'Interviews ahead', value: counts.currentInterviews, icon: Calendar, tint: 'bg-amber-50 text-amber-600', href: '/interviews' },
          { label: 'Interviews done', value: counts.completedInterviews, icon: CalendarCheck, tint: 'bg-emerald-50 text-emerald-600', href: '/interviews' },
        ].map(({ label, value, icon: Icon, tint, href }) => {
          const content = (
            <>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-xl font-semibold leading-none tabular-nums text-slate-900">{value}</div>
                <div className="mt-1.5 truncate text-xs font-medium text-slate-500">{label}</div>
              </div>
            </>
          );
          return href ? (
            <Link key={label} to={href} className="ui-card flex items-center gap-3 p-3 transition hover:border-slate-300 hover:shadow-sm">
              {content}
            </Link>
          ) : (
            <div key={label} className="ui-card flex items-center gap-3 p-3">
              {content}
            </div>
          );
        })}
      </div>

      {/* Next up + stage breakdown */}
      <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-labelledby="up-next-heading" className="ui-card flex flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="up-next-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Calendar className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Up next
            </h2>
            <Link to="/interviews" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
              All interviews
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          {upcomingInterviews.length ? (
            <ul className="mt-2 divide-y divide-slate-100">
              {upcomingInterviews.map((item) => (
                <li key={item.key} className="flex items-center gap-3 py-2.5">
                  <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-slate-50 px-2 py-1 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {new Date(item.at).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-sm font-bold leading-tight tabular-nums text-slate-900">
                      {new Date(item.at).getDate()}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.role}</p>
                    <p className="truncate text-xs text-slate-500">{item.company}</p>
                  </div>
                  <span className="hidden shrink-0 text-xs tabular-nums text-slate-500 sm:block">
                    {formatDateTimeDisplay(item.at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-700">No interviews scheduled</p>
              <p className="mt-1 text-xs text-slate-500">Scheduled interviews from your applications and tracked targets appear here.</p>
            </div>
          )}
        </section>

        <section aria-labelledby="stage-heading" className="ui-card flex flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="stage-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Filter className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Stages
            </h2>
            {statusFilter !== 'All' && (
              <button type="button" onClick={() => setStatusFilter('All')} className="text-xs font-semibold text-brand-700 hover:text-brand-900">
                Clear filter
              </button>
            )}
          </div>

          {stageBreakdown.some((stage) => stage.count > 0) ? (
            <ul className="mt-2 space-y-1">
              {stageBreakdown.map((stage) => {
                const isActive = statusFilter === stage.key;
                return (
                  <li key={stage.key}>
                    <button
                      type="button"
                      onClick={() => setStatusFilter(isActive ? 'All' : stage.key)}
                      aria-pressed={isActive}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                        isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex-1 truncate text-xs font-medium">{stage.label}</span>
                      <span className="text-xs font-semibold tabular-nums">{stage.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-700">No tracked targets yet</p>
              <p className="mt-1 text-xs text-slate-500">Log a personal target to track it through every stage.</p>
            </div>
          )}
        </section>
      </div>

      <TrackedItemsWidget />

      {/* Action and Filter Controls Bar */}
      <div className="ui-card mb-5 flex flex-col items-stretch justify-between gap-3 p-3 sm:flex-row sm:items-center">
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
            {submissionCount > 0 ? 'Track platform applications here' : 'No applications yet'}
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500">
            {submissionCount > 0
              ? `You have ${submissionCount} ${submissionCount === 1 ? 'application' : 'applications'} submitted through job listings. Manage them in My Applications. Log personal targets or use Work Log to track your job search activities.`
              : 'Use Work Log to track your job search activities, interviews, and follow-ups. You can also apply directly to jobs in the Jobs Directory.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {submissionCount > 0 && (
              <Link to="/my-applications" className="ui-btn ui-btn-primary">
                View platform applications
              </Link>
            )}
            <Link to="/work-log" className="ui-btn ui-btn-secondary">
              Open Work Log
            </Link>
            <Link to="/jobs" className="ui-btn ui-btn-secondary">
              Browse jobs
            </Link>
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
        title="Log Personal Job Target"
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
