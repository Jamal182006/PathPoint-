import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import ForgotPasswordModal from '../components/common/ForgotPasswordModal';
import BackendStatusModal from '../components/common/BackendStatusModal';
import LoginVerificationModal from '../components/common/LoginVerificationModal';
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
  const { login, requestLoginCode, verifyLoginCode, backendOnline, settings } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [verificationDestination, setVerificationDestination] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loginCodeRequired, setLoginCodeRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [registrationNotice, setRegistrationNotice] = useState(false);

  // Modals
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [backendModalOpen, setBackendModalOpen] = useState(false);

  const getRoleHome = (role) => role === 'admin' ? '/admin' : role === 'provider' ? '/provider' : '/dashboard';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('session_expired')) {
      setSessionExpired(true);
    }

    if (location.state?.registered === true) {
      setRegistrationNotice(true);
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setLockoutSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedIdentifier = identifier.trim().toLowerCase();

    if (lockoutSeconds > 0) {
      setErrorMessage(`Login is temporarily locked. Try again in ${lockoutSeconds} seconds.`);
      return;
    }

    if (!normalizedIdentifier || !password) {
      setErrorMessage('Please enter your email or username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (loginCodeRequired) {
        const result = await verifyLoginCode(normalizedIdentifier, password, verificationCode.trim(), rememberMe);
        toast(result.source === 'backend' ? 'Connected to live backend! Signed in.' : 'Signed in successfully!', 'success');
        const from = location.state?.from?.pathname || getRoleHome(result.user?.role);
        navigate(from, { replace: true });
        return;
      }

      const result = await requestLoginCode(normalizedIdentifier, password, rememberMe);
      if (result.token) {
        toast(result.user?.role === 'admin' ? 'Administrator signed in successfully.' : 'Signed in successfully.', 'success');
        const defaultPath = result.user?.role === 'admin'
          ? '/admin'
          : result.user?.role === 'provider'
            ? '/provider'
            : '/dashboard';
        const from = location.state?.from?.pathname || defaultPath;
        navigate(from, { replace: true });
        return;
      }

      if (result.requiresCode) {
        setLoginCodeRequired(true);
        setVerificationDestination(result.destinationEmail || '');
        setVerificationCode('');
        toast('A 6-digit verification code was sent to your email.', 'success');
        return;
      }

      const loginResult = await login(normalizedIdentifier, password, rememberMe);
      toast(
        loginResult.source === 'backend'
          ? 'Connected to live backend! Signed in.'
          : 'Signed in successfully!',
        'success'
      );
      const from = location.state?.from?.pathname || getRoleHome(loginResult.user?.role);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.lockoutSeconds) {
        setLockoutSeconds(err.lockoutSeconds);
      }
      setRegistrationNotice(false);
      const msg = err.message || 'Invalid credentials';
      setErrorMessage(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetCodeChallenge = () => {
    setLoginCodeRequired(false);
    setVerificationCode('');
    setErrorMessage('');
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setErrorMessage('');
    try {
      await requestLoginCode(identifier.trim().toLowerCase(), password, rememberMe);
      setVerificationCode('');
      toast('A new verification code was sent to your email.', 'success');
    } catch (err) {
      const msg = err.message || 'Unable to resend the verification code.';
      setErrorMessage(msg);
      toast(msg, 'error');
      throw err;
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className={`auth-page min-h-screen flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,0.94fr)_minmax(32rem,1.06fr)] ${settings?.theme === 'dark' ? 'auth-dark' : ''}`}>
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-slate-950 px-10 py-10 text-white lg:flex xl:px-16 xl:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-950/40"><Compass className="h-6 w-6" /></span>
            <span className="text-lg font-bold">PathPoint</span>
          </Link>
        </div>
        <div className="relative max-w-xl py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">One workspace. Every next step.</p>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-white xl:text-5xl">Bring your career journey into focus.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Applicants, providers, and career teams move through one shared platform, with every application and review connected.</p>
          <div className="mt-10 grid gap-0 border-y border-white/15 sm:grid-cols-3">
            <div className="py-4 sm:pr-4"><p className="text-sm font-semibold text-white">Applicants</p><p className="mt-1 text-xs leading-5 text-slate-400">Discover listings and follow every decision.</p></div>
            <div className="border-t border-white/15 py-4 sm:border-l sm:border-t-0 sm:px-4"><p className="text-sm font-semibold text-white">Providers</p><p className="mt-1 text-xs leading-5 text-slate-400">Publish companies and review candidates.</p></div>
            <div className="border-t border-white/15 py-4 sm:border-l sm:border-t-0 sm:pl-4"><p className="text-sm font-semibold text-white">Career teams</p><p className="mt-1 text-xs leading-5 text-slate-400">Verify listings and monitor platform health.</p></div>
          </div>
        </div>
        <div className="relative flex items-center justify-between border-t border-white/15 pt-5 text-xs text-slate-400">
          <span>Built for the work behind every opportunity.</span>
          <span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />{backendOnline ? 'Services connected' : 'Service connection check'}</span>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-1 flex-col bg-white/55">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5 sm:px-8 lg:justify-end lg:px-12">
          <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900 lg:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white"><Compass className="h-5 w-5" /></span><span className="font-bold">PathPoint</span></Link>
          <span className="hidden text-xs text-slate-500 lg:block">Secure access to your workspace</span>
        </div>

        <section className="auth-card mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 pb-8 sm:px-8 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md">
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

          {registrationNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              Your account was created successfully. Sign in to open your dashboard.
            </div>
          )}

          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Secure sign in
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to continue to your role-based PathPoint workspace.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="on">
            <div>
              <label htmlFor="login-identifier" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Email or Username</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="login-identifier"
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email address or username"
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:text-slate-600"
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
                disabled={loading || loginCodeRequired || lockoutSeconds > 0}
                className="auth-submit w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-200 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{lockoutSeconds > 0 ? `Try again in ${lockoutSeconds}s` : 'Send Code & Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
            <button type="button" onClick={() => setBackendModalOpen(true)} className="inline-flex items-center gap-2 rounded-md py-1 font-medium hover:text-slate-900">
              <span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {backendOnline ? 'Services connected' : 'Connection status'}
            </button>
            <p>Don&apos;t have an account? <Link to="/register" className="font-semibold text-indigo-700 hover:text-indigo-900">Create one</Link></p>
          </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        defaultEmail={identifier}
      />
      <BackendStatusModal
        isOpen={backendModalOpen}
        onClose={() => setBackendModalOpen(false)}
      />
      <LoginVerificationModal
        isOpen={loginCodeRequired}
        email={verificationDestination || identifier.trim().toLowerCase()}
        code={verificationCode}
        loading={loading}
        resendLoading={resendLoading}
        errorMessage={errorMessage}
        onCodeChange={setVerificationCode}
        onSubmit={handleSubmit}
        onResend={handleResendCode}
        onClose={resetCodeChallenge}
      />
    </div>
  );
};

export default Login;
