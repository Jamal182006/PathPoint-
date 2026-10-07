import React, { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
const AccessDenied = lazy(() => import('../../pages/AccessDenied'));

export const ProtectedRoute = ({ children, adminOnly = false, providerOnly = false, providerApprovalRequired = false, applicantOnly = false }) => {
  const { isAuthenticated, isAdmin, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-500 font-medium">Verifying authorization...</p>
      </div>
    );
  }

  // Not signed in
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Signed in, but route requires admin role and user is not admin
  if (adminOnly && !isAdmin) {
    return <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}><AccessDenied /></Suspense>;
  }

  if (providerOnly && user?.role !== 'provider') {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  if (providerApprovalRequired && user?.businessVerification?.status !== 'approved') {
    return <Navigate to="/provider" replace />;
  }

  if (applicantOnly && user?.role !== 'user') {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/provider'} replace />;
  }

  if (!providerOnly && !adminOnly && location.pathname !== '/profile') {
    if (user?.role === 'provider') return <Navigate to="/provider" replace />;
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;
