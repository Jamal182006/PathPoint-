import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessDenied = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleAccountSwitch = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="ui-panel max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-danger-50 text-danger-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" aria-hidden="true" />
        </div>

        <div>
          <span className="ui-badge ui-badge-danger mb-2">403 Forbidden</span>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Administrative access required
          </h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            You are currently signed in as{' '}
            <strong className="text-slate-800 font-semibold">{user?.name || user?.email || 'Candidate'}</strong> (
            <span className="capitalize">{user?.role || 'user'}</span>), which does not have permission to access the Admin area.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="ui-btn ui-btn-primary w-full sm:w-auto"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Candidate dashboard</span>
          </Link>

          <button
            onClick={handleAccountSwitch}
            className="ui-btn ui-btn-secondary w-full sm:w-auto"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>Sign in with another account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
