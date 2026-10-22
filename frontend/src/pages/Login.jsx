import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import BrandLogo from '../components/common/BrandLogo';
import ForgotPasswordModal from '../components/common/ForgotPasswordModal';
import LoginVerificationModal from '../components/common/LoginVerificationModal';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const Login = () => {
  const { login, requestLoginCode, verifyLoginCode, backendOnline } = useAuth();
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
    <div className="auth-page min-h-screen flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,0.94fr)_minmax(32rem,1.06fr)]">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-slate-950 px-10 py-10 text-white lg:flex xl:px-16 xl:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3 text-white">
            <BrandLogo tone="light" size={38} />
            <span className="text-lg font-bold">PathPoint</span>
          </Link>
        </div>
        <div className="relative max-w-xl py-12">
          <h2 className="mt-5 text-4xl font-bold leading-tight text-white xl:text-5xl">Bring your career journey into focus.</h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Applicants, providers, and administrators move through one shared platform, with every application and review connected.</p>
          <div className="mt-10 grid gap-0 border-y border-white/15 sm:grid-cols-3">
            <div className="py-4 sm:pr-4"><p className="text-sm font-semibold text-white">Applicants</p><p className="mt-1 text-xs leading-5 text-slate-400">Discover listings and follow every decision.</p></div>
            <div className="border-t border-white/15 py-4 sm:border-l sm:border-t-0 sm:px-4"><p className="text-sm font-semibold text-white">Providers</p><p className="mt-1 text-xs leading-5 text-slate-400">Publish companies and review candidates.</p></div>
            <div className="border-t border-white/15 py-4 sm:border-l sm:border-t-0 sm:pl-4"><p className="text-sm font-semibold text-white">Administrators</p><p className="mt-1 text-xs leading-5 text-slate-400">Verify listings and monitor platform health.</p></div>
          </div>
        </div>
        <div className="relative flex items-center justify-between border-t border-white/15 pt-5 text-xs text-slate-400">
          <span>Built for the work behind every opportunity.</span>
          <span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />{backendOnline ? 'Services connected' : 'Service connection check'}</span>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-1 flex-col bg-white/55">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5 sm:px-8 lg:justify-end lg:px-12">
          <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900 lg:hidden"><BrandLogo role="brand" size={28} /><span className="font-bold">PathPoint</span></Link>
          <span className="hidden text-xs text-slate-500 lg:block">Secure access to your workspace</span>
        </div>

        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 pb-8 sm:px-8 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            {/* The form card: same shell as the signup page — banded header,
                body, and footer band, resting on the shadow-card elevation. */}
            <div className="auth-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <header className="border-b border-slate-100 px-6 pb-6 pt-7 sm:px-8">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Welcome back
                </h1>
                <p className="mt-2 max-w-measure text-sm leading-6 text-slate-600">Sign in to continue to your role-based PathPoint workspace.</p>
              </header>

              <div className="px-6 py-7 sm:px-8">
                {sessionExpired && (
                  <div className="ui-alert ui-alert-warning mb-4" role="status">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Your session has expired. Please sign in again.</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="ui-alert ui-alert-danger mb-4" role="alert">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {registrationNotice && (
                  <div className="ui-alert ui-alert-success mb-4" role="status">
                    <span>Your account was created successfully. Sign in to open your dashboard.</span>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit} autoComplete="on">
                  <div>
                    <label htmlFor="login-identifier" className="ui-label">Email or username</label>
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
                        className="auth-input ui-input pl-9"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="login-password" className="ui-label">Password</label>
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
                        className="auth-input ui-input pl-9 pr-10"
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
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 select-none">Stay signed in for 30 days</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="shrink-0 text-xs font-semibold text-brand-700 underline-offset-4 transition hover:text-brand-900 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || loginCodeRequired || lockoutSeconds > 0}
                      className="auth-submit ui-btn ui-btn-primary w-full py-3 text-sm disabled:opacity-60"
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
              </div>

              <footer className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-center text-xs text-slate-500 sm:px-8">
                <p>Don&apos;t have an account? <Link to="/register" className="font-semibold text-brand-700 underline-offset-4 hover:text-brand-900 hover:underline">Create one</Link></p>
              </footer>
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
