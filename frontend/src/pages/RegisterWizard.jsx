import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { AlertCircle, Building2, Check, CheckCircle2, Compass, Eye, EyeOff, Loader2, ShieldCheck, UserRound } from 'lucide-react';
import { apiAdapter } from '../services/apiAdapter';

const usernamePattern = /^[a-z0-9_]{3,20}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Unicode-aware: accepts accented names (e.g. "José", "Peña") in line with the API.
const namePattern = /^\p{L}[\p{L}\p{M} .'-]*$/u;
const MAX_PASSWORD_BYTES = 72;
const byteLength = (value) => new TextEncoder().encode(String(value || '')).length;

const getAge = (dateValue) => {
  if (!dateValue) return null;
  const birth = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
};

const suggestUsername = (email) => {
  const local = String(email || '').split('@')[0] || '';
  return local.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
};

const FieldLabel = ({ htmlFor, children, required = false }) => (
  <label htmlFor={htmlFor} className="ui-label">
    {children}{required && <span className="text-danger-600"> *</span>}
  </label>
);

const FieldError = ({ id, children }) => children ? (
  <p id={id} role="alert" className="ui-error-text">
    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{children}
  </p>
) : null;

const TextInput = ({ label, name, value, onChange, error, hint, type = 'text', required = false, trailing, wrapperClassName = '', ...props }) => {
  const id = `signup-${name}`;
  return (
    <div className={wrapperClassName}>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <div className="relative">
        <input id={id} name={name} type={type} value={value} onChange={onChange} required={required}
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
          className={`ui-input auth-input ${error ? 'ui-input-error' : ''} ${trailing ? 'pr-11' : ''}`} {...props} />
        {trailing}
      </div>
      {hint && !error ? <p className="ui-hint">{hint}</p> : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
};

const RegisterWizard = () => {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameStatus, setUsernameStatus] = useState({ state: 'idle', message: '', username: '' });
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [form, setForm] = useState({
    role: '', username: '', email: '', password: '',
    firstName: '', lastName: '', dateOfBirth: '',
    businessName: '', businessType: '', agreeTerms: false,
  });

  const age = getAge(form.dateOfBirth);
  const passwordRules = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
  };
  const strength = Object.values(passwordRules).filter(Boolean).length;
  const maxDob = useMemo(() => {
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - 18);
    return limit.toISOString().slice(0, 10);
  }, []);

  const perks = form.role === 'provider'
    ? ['Set up your business listing', 'Submit verification when you are ready', 'Publish roles once approved']
    : ['A single profile reused across applications', 'Apply to roles in a couple of clicks', 'Track interviews and outcomes in one place'];

  // Suggest a username from the email address until the user edits it themselves.
  useEffect(() => {
    if (usernameTouched) return;
    const suggested = suggestUsername(form.email);
    if (suggested.length >= 3 && suggested !== form.username) {
      setForm((current) => ({ ...current, username: suggested }));
      setErrors((current) => ({ ...current, username: '' }));
    }
  }, [form.email, form.username, usernameTouched]);

  useEffect(() => {
    const username = form.username.trim().toLowerCase();
    if (!usernamePattern.test(username)) {
      setUsernameStatus({ state: 'idle', message: '', username: '' });
      return undefined;
    }
    let active = true;
    setUsernameStatus({ state: 'checking', message: 'Checking availability…', username });
    const timer = window.setTimeout(async () => {
      try {
        const result = await apiAdapter.checkUsernameAvailability(username);
        if (active) setUsernameStatus(result.available
          ? { state: 'available', message: 'Username is available.', username }
          : { state: 'taken', message: 'That username is already taken.', username });
      } catch (error) {
        if (active) setUsernameStatus({ state: 'error', message: error.message || 'Could not check this username.', username });
      }
    }, 400);
    return () => { active = false; window.clearTimeout(timer); };
  }, [form.username]);

  const setValue = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleInput = (event) => {
    const { name, value, type, checked } = event.target;
    setValue(name, type === 'checkbox' ? checked : value);
  };

  // Deep links such as /register?role=provider preselect the account type so
  // entry points (e.g. the landing page) can send visitors to the right flow.
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const requestedRole = searchParams.get('role');
    if (['user', 'provider'].includes(requestedRole)) {
      setValue('role', requestedRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = async () => {
    const nextErrors = {};
    if (!['user', 'provider'].includes(form.role)) nextErrors.role = 'Choose an account type.';

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (!firstName) nextErrors.firstName = 'First name is required.';
    else if (!namePattern.test(firstName)) nextErrors.firstName = 'Use letters, spaces, apostrophes, periods, or hyphens.';
    if (!lastName) nextErrors.lastName = 'Last name is required.';
    else if (!namePattern.test(lastName)) nextErrors.lastName = 'Use letters, spaces, apostrophes, periods, or hyphens.';

    if (!form.dateOfBirth) nextErrors.dateOfBirth = 'Enter your date of birth.';
    else if (age === null) nextErrors.dateOfBirth = 'Enter a valid date of birth.';
    else if (age < 18) nextErrors.dateOfBirth = 'You must be at least 18 years old to use PathPoint.';
    else if (age > 130) nextErrors.dateOfBirth = 'Enter a valid date of birth.';

    const username = form.username.trim().toLowerCase();
    if (!usernamePattern.test(username)) {
      nextErrors.username = 'Use 3–20 letters, numbers, or underscores.';
    } else if (usernameStatus.username === username && usernameStatus.state === 'taken') {
      // Reuse the debounced check's result instead of firing another request.
      nextErrors.username = 'That username is already taken.';
    } else if (!(usernameStatus.username === username && usernameStatus.state === 'available')) {
      try {
        const result = await apiAdapter.checkUsernameAvailability(username);
        setUsernameStatus(result.available
          ? { state: 'available', message: 'Username is available.', username }
          : { state: 'taken', message: 'That username is already taken.', username });
        if (!result.available) nextErrors.username = 'That username is already taken.';
      } catch (error) {
        setUsernameStatus({ state: 'idle', message: 'Username will be confirmed when you create the account.', username: '' });
      }
    }

    const email = form.email.trim();
    if (!emailPattern.test(email)) nextErrors.email = 'Enter a valid email address.';
    else if (email.length > 254) nextErrors.email = 'That email address is too long.';

    if (!Object.values(passwordRules).every(Boolean)) nextErrors.password = 'Use at least 8 characters with uppercase, lowercase, and a number.';
    else if (byteLength(form.password) > MAX_PASSWORD_BYTES) nextErrors.password = 'Password is too long.';

    if (form.role === 'provider') {
      if (!form.businessName.trim()) nextErrors.businessName = 'Business name is required.';
      if (!form.businessType.trim()) nextErrors.businessType = 'Business type is required.';
    }
    if (!form.agreeTerms) nextErrors.agreeTerms = 'You must accept the Terms of Service and Privacy Policy.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setErrors({});
    try {
      if (!(await validate())) return;
      await register({
        role: form.role,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.password,
        dateOfBirth: form.dateOfBirth,
        age,
        ...(form.role === 'provider' ? {
          businessName: form.businessName.trim(),
          businessType: form.businessType.trim(),
        } : {}),
      });

      toast('Account created. Welcome to PathPoint!', 'success');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = error.message || 'Unable to create your account.';
      setErrors({ submit: message });
      toast(message, 'error');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const usernameStatusNode = usernameStatus.state === 'available'
    ? <p className="flex items-center gap-1.5 text-xs font-medium text-success-700"><Check className="h-3.5 w-3.5" aria-hidden="true" />{usernameStatus.message}</p>
    : usernameStatus.state === 'checking'
      ? <p className="flex items-center gap-1.5 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{usernameStatus.message}</p>
      : (usernameStatus.state === 'taken' || usernameStatus.state === 'error')
        ? <p className="flex items-center gap-1.5 text-xs font-medium text-danger-700"><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{usernameStatus.message}</p>
        : <p className="ui-hint">3–20 letters, numbers, or underscores.</p>;

  const strengthLabel = strength <= 2 ? 'Weak' : strength === 3 ? 'Good' : 'Strong';
  const strengthTone = strength < 3 ? 'text-warning-700' : 'text-success-700';
  const strengthBarTone = strength < 3 ? 'bg-warning-600' : 'bg-success-600';

  return (
    <div className="auth-page flex min-h-screen flex-col lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-slate-950 px-10 py-10 text-white lg:flex xl:px-16 xl:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600"><Compass className="h-6 w-6" /></span>
            <span className="text-lg font-bold">PathPoint</span>
          </Link>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-3xl font-bold leading-tight text-white xl:text-[2.5rem]">Create your PathPoint account.</h2>
          <p className="mt-4 max-w-md text-base leading-7 text-slate-400">One account keeps your applications, listings, and reviews connected.</p>

          <ul className="mt-10 space-y-5">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-sm leading-6 text-slate-200">{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 border-t border-white/15 pt-5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          Your information is stored securely and only used to support your PathPoint account.
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-5 sm:px-8 lg:px-14">
          <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white"><Compass className="h-5 w-5" /></span>
            <span className="font-bold">PathPoint</span>
          </Link>
          <p className="text-xs text-slate-500 lg:ml-auto">Already registered? <Link to="/login" className="font-semibold text-brand-700 transition hover:text-brand-900">Sign in</Link></p>
        </div>

        <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 pb-10 sm:px-8 lg:px-14">
          <form onSubmit={submit} className="w-full" noValidate>
            <div className="auth-card auth-surface overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <header className="border-b border-slate-100 px-6 pb-6 pt-7 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Create your account</h1>
                  {/* The chosen account type brands the card: the same role
                      tints the picker uses, so the choice feels consequential. */}
                  {form.role && (
                    <span className={`animate-fade-in ui-badge ${form.role === 'provider' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'}`}>
                      {form.role === 'provider'
                        ? <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                        : <UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
                      {form.role === 'provider' ? 'Provider account' : 'Applicant account'}
                    </span>
                  )}
                </div>
                <p className="mt-2 max-w-measure text-sm leading-6 text-slate-600">It takes less than a minute. You can add the rest of your details later from your profile.</p>
              </header>

              <div className="px-6 py-7 sm:px-8">
                {errors.submit && (
                  <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{errors.submit}</span>
                  </div>
                )}

                <div className="space-y-5">
                  <fieldset>
                    <legend className="ui-label">Account type <span className="text-danger-600">*</span></legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ['user', 'User', 'Find companies and apply to opportunities.', UserRound, 'border-teal-400 bg-teal-50/70', 'bg-teal-600 text-white', 'border-teal-600 bg-teal-600 text-white'],
                        ['provider', 'Provider', 'List your business and review applicants.', Building2, 'border-blue-400 bg-blue-50/70', 'bg-blue-600 text-white', 'border-blue-600 bg-blue-600 text-white'],
                      ].map(([role, title, description, Icon, selectedCard, selectedIcon, selectedCheck]) => {
                        const selected = form.role === role;
                        return (
                          <button key={role} type="button" onClick={() => setValue('role', role)} aria-pressed={selected}
                            className={`group relative flex items-start gap-3 rounded-xl border p-4 text-left transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:ring-offset-2 ${selected ? `${selectedCard} shadow-xs` : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${selected ? selectedIcon : 'bg-slate-100 text-slate-500 group-hover:text-slate-700'}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-900">{title}</span>
                              <span className="mt-0.5 block text-xs leading-5 text-slate-600">{description}</span>
                            </span>
                            <span className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${selected ? selectedCheck : 'border-slate-300 bg-white text-transparent'}`}><Check className="h-3 w-3" aria-hidden="true" /></span>
                          </button>
                        );
                      })}
                    </div>
                    <FieldError>{errors.role}</FieldError>
                  </fieldset>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextInput label="First name" name="firstName" value={form.firstName} onChange={handleInput} error={errors.firstName} required autoComplete="given-name" maxLength={80} />
                    <TextInput label="Last name" name="lastName" value={form.lastName} onChange={handleInput} error={errors.lastName} required autoComplete="family-name" maxLength={80} />
                  </div>

                  {form.role === 'provider' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextInput label="Business name" name="businessName" value={form.businessName} onChange={handleInput} error={errors.businessName} required autoComplete="organization" maxLength={120} />
                      <TextInput label="Business type" name="businessType" value={form.businessType} onChange={handleInput} error={errors.businessType} required placeholder="e.g. Recruitment agency" maxLength={100} />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextInput label="Email" name="email" type="email" value={form.email} onChange={handleInput} error={errors.email} required autoComplete="email" maxLength={254} />
                    <TextInput label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleInput} error={errors.dateOfBirth} required
                      min="1900-01-01" max={maxDob} hint={age !== null && age >= 0 ? `You are ${age} years old.` : 'You must be at least 18.'} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="signup-username" required>Username</FieldLabel>
                    <input id="signup-username" name="username" value={form.username}
                      onChange={(event) => { setUsernameTouched(true); setValue('username', event.target.value.replace(/\s/g, '')); }}
                      required autoComplete="username" minLength={3} maxLength={20}
                      aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? 'signup-username-error' : undefined}
                      className={`ui-input auth-input ${errors.username ? 'ui-input-error' : ''}`} />
                    <div className="mt-1.5" aria-live="polite">{usernameStatusNode}</div>
                    <FieldError id="signup-username-error">{errors.username}</FieldError>
                  </div>

                  <div>
                    <FieldLabel htmlFor="signup-password" required>Password</FieldLabel>
                    <div className="relative">
                      <input id="signup-password" type={showPassword ? 'text' : 'password'} value={form.password}
                        onChange={(event) => setValue('password', event.target.value)} autoComplete="new-password" maxLength={72}
                        aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'signup-password-error' : undefined}
                        className={`ui-input auth-input pr-11 ${errors.password ? 'ui-input-error' : ''}`} />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center gap-3">
                        <span className="flex flex-1 gap-1.5" aria-hidden="true">
                          {[1, 2, 3, 4].map((item) => (
                            <span key={item} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${strength >= item ? strengthBarTone : 'bg-slate-200'}`} />
                          ))}
                        </span>
                        {form.password ? <span className={`w-12 shrink-0 text-right text-xs font-semibold ${strengthTone}`}>{strengthLabel}</span> : null}
                      </div>
                      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {Object.entries({ length: '8+ characters', upper: 'Uppercase letter', lower: 'Lowercase letter', number: 'Number' }).map(([key, label]) => {
                          const met = passwordRules[key];
                          return (
                            <li key={key} className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-success-700' : 'text-slate-500'}`}>
                              <Check className={`h-3.5 w-3.5 shrink-0 ${met ? 'text-success-600' : 'text-slate-300'}`} aria-hidden="true" />{label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <FieldError id="signup-password-error">{errors.password}</FieldError>
                  </div>

                  <div>
                    <label className="flex items-start gap-3 text-sm text-slate-700">
                      <input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={handleInput}
                        aria-invalid={Boolean(errors.agreeTerms)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      <span>I agree to the Terms of Service and Privacy Policy.</span>
                    </label>
                    <FieldError>{errors.agreeTerms}</FieldError>
                  </div>
                </div>
              </div>

              <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p className="text-xs leading-5 text-slate-500">You can update your details anytime from your profile.</p>
                <button type="submit" disabled={loading} className="ui-btn ui-btn-primary w-full justify-center sm:w-auto">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Creating account…</> : <><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Create account</>}
                </button>
              </footer>
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500 lg:hidden">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              Your information is stored securely and only used to support your PathPoint account.
            </p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default RegisterWizard;
