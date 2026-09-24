import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ShortcutsModal from './components/common/ShortcutsModal';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AccessDenied from './pages/AccessDenied';
import Dashboard from './pages/Dashboard';
import ApplicationDetail from './pages/ApplicationDetail';
import InterviewScheduler from './pages/InterviewScheduler';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import AdminMetrics from './pages/AdminMetrics';
import AdminUsers from './pages/AdminUsers';
import AdminSystem from './pages/AdminSystem';

const AppLayout = ({ children, onOpenBrowseModal, onOpenShortcutsModal }) => {
  const { isAuthenticated, settings } = useAuth();
  const navigate = useNavigate();

  const accentMap = {
    indigo: { 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 100: '#e0e7ff' },
    teal: { 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 100: '#ccfbf1' },
    rose: { 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 100: '#ffe4e6' },
    violet: { 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 100: '#ede9fe' },
  };

  const accent = accentMap[settings?.accent] || accentMap.indigo;
  const appStyle = {
    '--accent-500': accent[500],
    '--accent-600': accent[600],
    '--accent-700': accent[700],
    '--accent-100': accent[100],
    '--page-bg': settings?.theme === 'dark' ? '#020817' : '#f8fafc',
    '--page-text': settings?.theme === 'dark' ? '#e2e8f0' : '#0f172a',
    '--surface-bg': settings?.theme === 'dark' ? '#0f172a' : '#ffffff',
  };

  const openBrowseModal = () => {
    if (window.location.pathname !== '/dashboard' && window.location.pathname !== '/') {
      navigate('/dashboard');
    }
    onOpenBrowseModal();
  };

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is focused inside input, textarea, or select
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        onOpenShortcutsModal();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openBrowseModal();
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
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        navigate('/analytics');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onOpenBrowseModal, onOpenShortcutsModal]);

  return (
    <div
      style={appStyle}
      className={`min-h-screen flex flex-col ${settings?.theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} ${settings?.compactMode ? 'text-[15px]' : ''}`}
    >
      {isAuthenticated && <Navbar onOpenBrowseModal={openBrowseModal} />}
      <main className="flex-1 pb-12">{children}</main>
    </div>
  );
};

const PublicAuthRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Restoring your session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

export const App = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppLayout
            onOpenBrowseModal={() => setIsBrowseModalOpen(true)}
            onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          >
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<PublicAuthRoute><Login /></PublicAuthRoute>} />
              <Route path="/register" element={<PublicAuthRoute><Register /></PublicAuthRoute>} />
              <Route path="/signup" element={<PublicAuthRoute><Navigate to="/register" replace /></PublicAuthRoute>} />
              <Route path="/admin/access-denied" element={<AccessDenied />} />

              {/* Protected Candidate Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard
                      isAddModalOpen={isAddModalOpen}
                      setIsAddModalOpen={setIsAddModalOpen}
                      browseModalOpen={isBrowseModalOpen}
                      setBrowseModalOpen={setIsBrowseModalOpen}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard
                      isAddModalOpen={isAddModalOpen}
                      setIsAddModalOpen={setIsAddModalOpen}
                      browseModalOpen={isBrowseModalOpen}
                      setBrowseModalOpen={setIsBrowseModalOpen}
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
                path="/interviews"
                element={
                  <ProtectedRoute>
                    <InterviewScheduler />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Protected Administrative Suite Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminMetrics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/system"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminSystem />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppLayout>

          <ShortcutsModal
            isOpen={isShortcutsModalOpen}
            onClose={() => setIsShortcutsModalOpen(false)}
          />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
