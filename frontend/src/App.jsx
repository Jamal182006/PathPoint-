import React, { useState, useEffect, Suspense, lazy, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrackedItemsProvider } from './context/TrackedItemsContext';
import { ToastProvider } from './components/common/Toast';
import Navbar from './components/layout/Navbar';
import ProviderSidebar from './components/layout/ProviderSidebar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ShortcutsModal from './components/common/ShortcutsModal';

import AdminLayout from './components/layout/AdminLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import { accentToCssVars } from './utils/theme';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/RegisterWizard'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail'));
const InterviewScheduler = lazy(() => import('./pages/InterviewScheduler'));
const Profile = lazy(() => import('./pages/ProfileWorkspace'));
const WebsiteSettings = lazy(() => import('./pages/WebsiteSettings'));
const AdminMetrics = lazy(() => import('./pages/AdminMetrics'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminProviders = lazy(() => import('./pages/AdminProviders'));
const PublicDashboard = lazy(() => import('./pages/PublicDashboard'));
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'));
const ProviderCompanies = lazy(() => import('./pages/ProviderCompanies'));
const ProviderCompanyForm = lazy(() => import('./pages/ProviderCompanyForm'));
const ProviderCompanyDetail = lazy(() => import('./pages/ProviderCompanyDetail'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const JobsDirectory = lazy(() => import('./pages/JobsDirectory'));
const MyApplications = lazy(() => import('./pages/MyApplications'));
const AdminCompanies = lazy(() => import('./pages/AdminCompanies'));
const ProviderJobs = lazy(() => import('./pages/ProviderJobs'));
const ProviderJobForm = lazy(() => import('./pages/ProviderJobForm'));
const ProviderJobApplicants = lazy(() => import('./pages/ProviderJobApplicants'));
const JobDetail = lazy(() => import('./pages/JobApplicationWizard'));
const WorkLogDashboard = lazy(() => import('./pages/WorkLogDashboard'));
const AdminJobs = lazy(() => import('./pages/AdminJobs'));
const AdminApplications = lazy(() => import('./pages/AdminApplications'));

const AppLayout = React.memo(({ children, onOpenShortcutsModal }) => {
  const { isAuthenticated, isAdmin, settings, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = !isAuthenticated && ['/login', '/register'].includes(location.pathname);
  const isProvider = isAuthenticated && user?.role === 'provider';

  // The accent is the only user-selectable theme input; it resolves to the
  // `--accent-*` tokens consumed by the shared `.ui-*` layer.
  const appStyle = useMemo(() => accentToCssVars(settings?.accent), [settings?.accent]);

  const handleKeyDown = useCallback(
    (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        onOpenShortcutsModal();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate('/jobs');
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('dashboard-search-input');
        if (searchInput) {
          searchInput.focus();
        } else {
          navigate('/dashboard');
          setTimeout(() => {
            document.getElementById('dashboard-search-input')?.focus();
          }, 100);
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        navigate('/dashboard?view=board');
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        navigate('/dashboard?view=list');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        navigate('/interviews');
      }
    },
    [navigate, onOpenShortcutsModal]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      style={appStyle}
      data-role={user?.role || (isAdmin ? 'admin' : 'guest')}
      className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 ${settings?.compactMode ? 'text-[15px]' : ''}`}
    >
      {isAuthenticated && <Navbar />}
      <div className="flex flex-1">
        {isProvider && <ProviderSidebar />}
        <main
          key={location.pathname}
          className={`app-main animate-fade-in min-w-0 flex-1 ${isAuthPage ? 'pb-0' : 'pb-12'}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
});

const PublicAuthRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Restoring your session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : user?.role === 'provider' ? '/provider' : '/dashboard'} replace />;
  }

  return children;
};

const HomeRoute = ({ dashboardProps }) => {
  const { isAuthenticated, isAdmin, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Restoring your session...</p>
      </div>
    );
  }

  return isAdmin
    ? <Navigate to="/admin" replace />
    : isAuthenticated
    ? (user?.role === 'provider' ? <ProviderDashboard /> : <Dashboard {...dashboardProps} />)
    : <PublicDashboard />;
};

export const App = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <ErrorBoundary>
          <AuthProvider>
            <TrackedItemsProvider>
            <ToastProvider>
          <AppLayout
            onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          >
            <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading page…</div>}>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<PublicAuthRoute><Login /></PublicAuthRoute>} />
              <Route path="/register" element={<PublicAuthRoute><Register /></PublicAuthRoute>} />
              <Route path="/signup" element={<PublicAuthRoute><Navigate to="/register" replace /></PublicAuthRoute>} />
              <Route path="/admin/access-denied" element={<AccessDenied />} />

              {/* Protected Candidate Application Routes */}
              <Route
                path="/provider"
                element={
                  <ProtectedRoute providerOnly>
                    <ProviderDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider/companies"
                element={<ProtectedRoute providerOnly providerApprovalRequired><ProviderCompanies /></ProtectedRoute>}
              />
              <Route
                path="/provider/companies/new"
                element={<ProtectedRoute providerOnly providerApprovalRequired><ProviderCompanyForm /></ProtectedRoute>}
              />
              <Route
                path="/provider/companies/:companyId/edit"
                element={<ProtectedRoute providerOnly providerApprovalRequired><ProviderCompanyForm /></ProtectedRoute>}
              />
              <Route
                path="/provider/companies/:companyId"
                element={<ProtectedRoute providerOnly providerApprovalRequired><ProviderCompanyDetail /></ProtectedRoute>}
              />
              <Route path="/provider/jobs" element={<ProtectedRoute providerOnly providerApprovalRequired><ProviderJobs /></ProtectedRoute>} />
              <Route path="/provider/jobs/new" element={<ProtectedRoute providerOnly providerApprovalRequired><ProviderJobForm /></ProtectedRoute>} />
              <Route path="/provider/jobs/:jobId/edit" element={<ProtectedRoute providerOnly providerApprovalRequired><ProviderJobForm /></ProtectedRoute>} />
              <Route path="/provider/jobs/:jobId/applicants" element={<ProtectedRoute providerOnly providerApprovalRequired><ProviderJobApplicants /></ProtectedRoute>} />
              <Route
                path="/"
                element={<HomeRoute dashboardProps={{
                  isAddModalOpen,
                  setIsAddModalOpen,
                }} />}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard
                      isAddModalOpen={isAddModalOpen}
                      setIsAddModalOpen={setIsAddModalOpen}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications/:id"
                element={
                  <ProtectedRoute>
                    <ApplicationDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/companies/:companyId"
                element={<ProtectedRoute><CompanyDetail /></ProtectedRoute>}
              />
              <Route path="/companies" element={<ProtectedRoute applicantOnly><Navigate to="/jobs" replace /></ProtectedRoute>} />
              <Route path="/my-company-applications" element={<ProtectedRoute applicantOnly><Navigate to="/my-applications" replace /></ProtectedRoute>} />
              <Route path="/my-job-applications" element={<ProtectedRoute applicantOnly><Navigate to="/my-applications" replace /></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute applicantOnly><JobsDirectory /></ProtectedRoute>} />
              <Route path="/jobs/:jobId" element={<ProtectedRoute applicantOnly><JobDetail /></ProtectedRoute>} />
              <Route path="/my-applications" element={<ProtectedRoute applicantOnly><MyApplications /></ProtectedRoute>} />
              <Route path="/work-log" element={<ProtectedRoute applicantOnly><WorkLogDashboard /></ProtectedRoute>} />
              <Route
                path="/interviews"
                element={
                  <ProtectedRoute>
                    <InterviewScheduler />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>}
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <WebsiteSettings />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout><AdminMetrics /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout><AdminUsers /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/providers"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout><AdminProviders /></AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/companies"
                element={<ProtectedRoute adminOnly><AdminLayout><AdminCompanies /></AdminLayout></ProtectedRoute>}
              />
              <Route path="/admin/jobs" element={<ProtectedRoute adminOnly><AdminLayout><AdminJobs /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/applications" element={<ProtectedRoute adminOnly><AdminLayout><AdminApplications /></AdminLayout></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Suspense>
          </AppLayout>

            <ShortcutsModal
              isOpen={isShortcutsModalOpen}
              onClose={() => setIsShortcutsModalOpen(false)}
            />
            </ToastProvider>
            </TrackedItemsProvider>
          </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
