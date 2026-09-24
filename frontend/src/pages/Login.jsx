import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import ForgotPasswordModal from '../components/common/ForgotPasswordModal';
import BackendStatusModal from '../components/common/BackendStatusModal';
import {
  Compass,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const Login = () => {
  const { login, backendOnline } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Modals
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [backendModalOpen, setBackendModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('session_expired')) {
      setSessionExpired(true);
    }
  }, [location]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setLockoutSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (lockoutSeconds > 0) {
      setErrorMessage(`Login is temporarily locked. Try again in ${lockoutSeconds} seconds.`);
      return;
    }

    if (!normalizedEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await login(normalizedEmail, password, rememberMe);
      toast(
        result.source === 'backend'
          ? 'Connected to live backend! Signed in.'
          : 'Signed in successfully!',
        'success'
      );
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      if (err.lockoutSeconds) {
        setLockoutSeconds(err.lockoutSeconds);
      }
      const msg = err.message || 'Invalid email or password.';
      setErrorMessage(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="auth-brand sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="auth-brand-mark inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-brand-500 text-white shadow-lg shadow-indigo-200 mb-3">
          <Compass className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          PathPoint
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Personal Job Application Progress & Interview Tracker
        </p>

      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="auth-card bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200 sm:px-10">
          {sessionExpired && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {location.state?.registered && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              Your account was created successfully. Sign in to open your dashboard.
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="auth-input w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="off"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 select-none">Stay signed in for 30 days</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="shrink-0 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || lockoutSeconds > 0}
                className="auth-submit w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-200 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{lockoutSeconds > 0 ? `Try again in ${lockoutSeconds}s` : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Link to Register */}
          <div className="mt-6 text-center text-xs text-slate-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-indigo-600 hover:text-indigo-700 underline"
            >
              Create Account
            </Link>
          </div>
        </div>

        </div>

      {/* Modals */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        defaultEmail={email}
      />
      <BackendStatusModal
        isOpen={backendModalOpen}
        onClose={() => setBackendModalOpen(false)}
      />
    </div>
  );
};

export default Login;
