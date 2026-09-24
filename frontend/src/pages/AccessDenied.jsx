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
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-700 mb-2">
            403 Forbidden
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Administrative Access Required
          </h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            You are currently signed in as{' '}
            <strong className="text-slate-800 font-semibold">{user?.name || user?.email || 'Candidate'}</strong> (
            <span className="capitalize">{user?.role || 'user'}</span>), which does not have permission to access the Career Counselor & Administrative Suite.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
          >
            <Home className="w-4 h-4" />
            <span>Candidate Dashboard</span>
          </Link>

          <button
            onClick={handleAccountSwitch}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in with another account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
