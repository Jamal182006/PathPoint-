import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Compass, Eye, EyeOff, Loader2, Upload, UserRound } from 'lucide-react';
import { apiAdapter } from '../services/apiAdapter';

const steps = ['Account', 'Personal', 'Address', 'Details', 'Review'];
const usernamePattern = /^[a-z0-9_]{3,20}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneCodes = [
  ['+1', 'United States / Canada (+1)'], ['+44', 'United Kingdom (+44)'], ['+61', 'Australia (+61)'],
  ['+63', 'Philippines (+63)'], ['+64', 'New Zealand (+64)'], ['+65', 'Singapore (+65)'], ['+91', 'India (+91)'],
];
const countries = ['Australia', 'Canada', 'India', 'New Zealand', 'Philippines', 'Singapore', 'United Kingdom', 'United States'];

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Unable to read the selected file.'));
  reader.readAsDataURL(file);
});

const getAge = (dateValue) => {
  if (!dateValue) return null;
  const birth = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
};

const InputField = ({ label, name, value, onChange, error, type = 'text', required = false, ...props }) => (
  <label className="block text-sm font-semibold text-slate-700">
    {label}{required ? ' *' : ''}
    <input id={`signup-${name}`} name={name} type={type} value={value} onChange={onChange} required={required}
      aria-invalid={Boolean(error)} aria-describedby={error ? `signup-${name}-error` : undefined}
      className={`mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:ring-2 ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'}`}
      {...props} />
    {error && <span id={`signup-${name}-error`} role="alert" className="mt-1 block text-xs font-medium text-rose-700">{error}</span>}
  </label>
);

const RegisterWizard = () => {
  const { register, settings } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameStatus, setUsernameStatus] = useState({ state: 'idle', message: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [businessDocument, setBusinessDocument] = useState(null);
  const [form, setForm] = useState({
    role: '', username: '', email: '', password: '', confirmPassword: '',
    firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: 'prefer_not_to_say',
    phoneCountryCode: '+1', phone: '', country: '', province: '', city: '', barangay: '', streetAddress: '', postalCode: '',
    education: '', occupation: '', employmentStatus: '', bio: '', businessName: '', businessType: '', businessAddress: '', businessRegistrationNumber: '', contactPerson: '', agreeTerms: false,
  });
  const avatarPreview = useMemo(() => avatarFile ? URL.createObjectURL(avatarFile) : '', [avatarFile]);
  const age = getAge(form.dateOfBirth);
  const passwordRules = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
  };
  const strength = Object.values(passwordRules).filter(Boolean).length;

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  useEffect(() => {
    const username = form.username.trim().toLowerCase();
    if (!usernamePattern.test(username)) {
      setUsernameStatus({ state: 'idle', message: '' });
      return undefined;
    }
    let active = true;
    setUsernameStatus({ state: 'checking', message: 'Checking availability…' });
    const timer = window.setTimeout(async () => {
      try {
        const result = await apiAdapter.checkUsernameAvailability(username);
        if (active) setUsernameStatus(result.available
          ? { state: 'available', message: 'Username is available.' }
          : { state: 'taken', message: 'That username is already taken.' });
      } catch (error) {
        if (active) setUsernameStatus({ state: 'error', message: error.message || 'Could not check this username.' });
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

  const validateCurrentStep = async () => {
    const nextErrors = {};
    if (step === 0) {
      if (!['user', 'provider'].includes(form.role)) nextErrors.role = 'Choose an account type.';
      const username = form.username.trim().toLowerCase();
      if (!usernamePattern.test(username)) {
        nextErrors.username = 'Use 3–20 letters, numbers, or underscores.';
      } else {
        try {
          const result = await apiAdapter.checkUsernameAvailability(username);
          setUsernameStatus(result.available ? { state: 'available', message: 'Username is available.' } : { state: 'taken', message: 'That username is already taken.' });
          if (!result.available) nextErrors.username = 'That username is already taken.';
        } catch (error) {
          setUsernameStatus({ state: 'idle', message: 'Username will be confirmed when you create the account.' });
        }
      }
      if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
      if (!Object.values(passwordRules).every(Boolean)) nextErrors.password = 'Use at least 8 characters with uppercase, lowercase, and a number.';
      if (form.password.trim() && form.confirmPassword.trim() && form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match.';
      }
    }
    if (step === 1) {
      if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.';
      if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required.';
      if (!form.dateOfBirth || age === null) nextErrors.dateOfBirth = 'Enter a valid date of birth.';
      else if (age < 18) nextErrors.dateOfBirth = 'You must be at least 18 years old to use PathPoint.';
      if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.';
    }
    if (step === 2) {
      for (const [field, label] of [['country', 'Country'], ['province', 'Province or state'], ['city', 'City or municipality'], ['streetAddress', 'Street address'], ['postalCode', 'Postal code']]) {
        if (!form[field].trim()) nextErrors[field] = `${label} is required.`;
      }
    }
    if (step === 3) {
      if (form.role === 'provider') {
        for (const [field, label] of [['businessName', 'Business name'], ['businessType', 'Business type'], ['businessAddress', 'Business address'], ['contactPerson', 'Contact person']]) {
          if (!form[field].trim()) nextErrors[field] = `${label} is required.`;
        }
        if (!businessDocument) nextErrors.businessDocument = 'A business verification document is required.';
        else if (businessDocument.size > 5 * 1024 * 1024) nextErrors.businessDocument = 'Document must be 5 MB or smaller.';
        else if (!['application/pdf', 'image/jpeg', 'image/png'].includes(businessDocument.type)) nextErrors.businessDocument = 'Choose a PDF, JPG, or PNG document.';
      } else if (!form.education) nextErrors.education = 'Choose your highest education level.';
      else if (!form.employmentStatus) nextErrors.employmentStatus = 'Choose your current employment status.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (await validateCurrentStep()) setStep((current) => Math.min(4, current + 1));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] || null;
    setErrors((current) => ({ ...current, avatar: '' }));
    if (file && (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 3 * 1024 * 1024)) {
      setErrors((current) => ({ ...current, avatar: 'Choose a PNG or JPG up to 3 MB.' }));
      event.target.value = '';
      return;
    }
    setAvatarFile(file);
  };

  const handleBusinessDocumentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setBusinessDocument(file);
    setErrors((current) => ({ ...current, businessDocument: '' }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!(await validateCurrentStep())) return;
    if (!form.agreeTerms) {
      setErrors({ agreeTerms: 'You must accept the Terms of Service and Privacy Policy.' });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const avatar = avatarFile ? await readFile(avatarFile) : '';
      const businessDocumentPayload = businessDocument ? {
        fileName: businessDocument.name,
        mimeType: businessDocument.type,
        data: String(await readFile(businessDocument)).split(',')[1],
      } : undefined;
      const registrationData = Object.fromEntries(Object.entries(form).filter(([key]) => key !== 'agreeTerms'));
      await register({
        ...registrationData,
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        age,
        avatar,
        businessDocument: businessDocumentPayload,
        businessProfile: form.role === 'provider' ? {
          companyName: form.businessName,
          industry: form.businessType,
          location: form.businessAddress,
          description: '',
          website: '',
        } : undefined,
      });

      toast('Account created. Please sign in to continue.', 'success');
      navigate('/login', { replace: true });
    } catch (error) {
      const message = error.message || 'Unable to create your account.';
      setErrors({ submit: message });
      toast(message, 'error');
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const reviewRow = (label, value, editStep) => (
    <div key={label} className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0"><p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 break-words text-sm text-slate-900">{value || 'Not provided'}</p></div>
      <button type="button" onClick={() => { setStep(editStep); setErrors({}); }} className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Edit</button>
    </div>
  );

  const dark = settings?.theme === 'dark';

  return (
    <div className={`auth-page min-h-screen px-4 py-7 sm:px-6 sm:py-10 ${dark ? 'auth-dark' : ''}`}>
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><Compass className="h-5 w-5" /></span><span className="font-bold">PathPoint</span></Link>
          <p className="text-xs text-slate-500">Already registered? <Link to="/login" className="font-semibold text-indigo-700 hover:underline">Sign in</Link></p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Create your account</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{steps[step]}</h1></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Step {step + 1} of {steps.length}</span>
            </div>
            <div className="mt-5 flex items-center gap-2" aria-label={`Step ${step + 1} of ${steps.length}`}>
              {steps.map((label, index) => <div key={label} className="min-w-0 flex-1"><div className={`h-1.5 rounded-full transition-colors duration-300 ${index <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} /><span className={`mt-1.5 hidden text-[10px] font-semibold sm:block ${index === step ? 'text-indigo-700' : 'text-slate-400'}`}>{label}</span></div>)}
            </div>
          </div>

          <form onSubmit={step === 4 ? submit : (event) => { event.preventDefault(); handleNext(); }}>
            <div className="min-h-[390px] px-5 py-6 sm:px-8 sm:py-8">
              {errors.submit && <p role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errors.submit}</p>}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                  {step === 0 && <div className="space-y-5">
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold text-slate-700">Account type</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ['user', 'User', 'Find companies and apply to opportunities.', UserRound],
                          ['provider', 'Provider', 'List your business and review applicants.', Building2],
                        ].map(([role, title, description, Icon]) => <button key={role} type="button" onClick={() => setValue('role', role)} aria-pressed={form.role === role} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${form.role === role ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-700"><Icon className="h-5 w-5" /></span><span><span className="block text-sm font-bold text-slate-900">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span></button>)}
                      </div>
                      {errors.role && <p role="alert" className="mt-1 text-xs text-rose-700">{errors.role}</p>}
                    </fieldset>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <InputField label="Username" name="username" value={form.username} onChange={(event) => setValue('username', event.target.value.replace(/\s/g, ''))} error={errors.username} required autoComplete="username" minLength={3} maxLength={20} />
                        <p aria-live="polite" className={`mt-1 text-xs ${usernameStatus.state === 'available' ? 'text-emerald-700' : usernameStatus.state === 'taken' || usernameStatus.state === 'error' ? 'text-rose-700' : 'text-slate-500'}`}>{usernameStatus.message || '3–20 letters, numbers, or underscores.'}</p>
                      </div>
                      <InputField label="Email" name="email" type="email" value={form.email} onChange={handleInput} error={errors.email} required autoComplete="email" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-700">Password *<span className="relative mt-1.5 block"><input id="signup-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setValue('password', event.target.value)} autoComplete="new-password" maxLength={72} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'signup-password-error' : undefined} className={`w-full rounded-lg border bg-white px-3 py-2.5 pr-11 text-sm font-normal text-slate-900 outline-none focus:ring-2 ${errors.password ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'}`} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span>
                        <span className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100">{[1, 2, 3, 4].map((item) => <span key={item} className={`flex-1 border-r border-white last:border-0 ${strength >= item ? strength < 3 ? 'bg-amber-500' : 'bg-emerald-500' : ''}`} />)}</span>
                        <span className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-normal text-slate-500">{Object.entries({ length: '8+ characters', upper: 'Uppercase letter', lower: 'Lowercase letter', number: 'Number' }).map(([key, label]) => <span key={key} className={`inline-flex items-center gap-1 ${passwordRules[key] ? 'text-emerald-700' : ''}`}><Check className="h-3 w-3" />{label}</span>)}</span>
                        {errors.password && <span id="signup-password-error" role="alert" className="mt-1 block text-xs font-medium text-rose-700">{errors.password}</span>}
                      </label>
                      <InputField label="Confirm password" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={handleInput} error={errors.confirmPassword} required autoComplete="new-password" maxLength={72} />
                    </div>
                  </div>}

                  {step === 1 && <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-3"><InputField label="First name" name="firstName" value={form.firstName} onChange={handleInput} error={errors.firstName} required autoComplete="given-name" maxLength={80} /><InputField label="Middle name" name="middleName" value={form.middleName} onChange={handleInput} autoComplete="additional-name" maxLength={80} /><InputField label="Last name" name="lastName" value={form.lastName} onChange={handleInput} error={errors.lastName} required autoComplete="family-name" maxLength={80} /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-700">Date of birth *<input id="signup-dateOfBirth" name="dateOfBirth" type="date" value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={handleInput} aria-invalid={Boolean(errors.dateOfBirth)} aria-describedby={errors.dateOfBirth ? 'signup-dateOfBirth-error' : undefined} className={`mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-normal text-slate-900 ${errors.dateOfBirth ? 'border-rose-400' : 'border-slate-300'}`} />{age !== null && age >= 0 && <span className="mt-1 block text-xs font-normal text-slate-500">Age: {age}</span>}{errors.dateOfBirth && <span id="signup-dateOfBirth-error" role="alert" className="mt-1 block text-xs font-medium text-rose-700">{errors.dateOfBirth}</span>}</label>
                      <label className="block text-sm font-semibold text-slate-700">Gender<select name="gender" value={form.gender} onChange={handleInput} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900"><option value="prefer_not_to_say">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option></select></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[210px_1fr]">
                      <label className="block text-sm font-semibold text-slate-700">Country code<select name="phoneCountryCode" value={form.phoneCountryCode} onChange={handleInput} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900">{phoneCodes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
                      <InputField label="Phone number" name="phone" type="tel" value={form.phone} onChange={handleInput} error={errors.phone} required autoComplete="tel-national" maxLength={32} />
                    </div>
                    <div>
                      <label htmlFor="signup-avatar" className="block text-sm font-semibold text-slate-700">Profile photo <span className="font-normal text-slate-500">(optional, PNG/JPG up to 3 MB)</span></label>
                      <div className="mt-2 flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-slate-400">{avatarPreview ? <img src={avatarPreview} alt="Profile photo preview" className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7" />}</span><input id="signup-avatar" type="file" accept="image/png,image/jpeg" onChange={handleAvatarChange} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-800" /></div>
                      {errors.avatar && <p role="alert" className="mt-1 text-xs text-rose-700">{errors.avatar}</p>}
                    </div>
                  </div>}

                  {step === 2 && <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">Country *<select name="country" value={form.country} onChange={handleInput} aria-invalid={Boolean(errors.country)} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900"><option value="">Choose a country</option>{countries.map((country) => <option key={country} value={country}>{country}</option>)}<option value="Other">Other</option></select>{errors.country && <span role="alert" className="mt-1 block text-xs text-rose-700">{errors.country}</span>}</label>
                    <div><InputField label="Province / State" name="province" value={form.province} onChange={handleInput} error={errors.province} required maxLength={100} list="signup-provinces" /><datalist id="signup-provinces"><option value="California" /><option value="New York" /><option value="Ontario" /><option value="Metro Manila" /><option value="England" /><option value="Singapore" /></datalist></div>
                    <InputField label="City / Municipality" name="city" value={form.city} onChange={handleInput} error={errors.city} required maxLength={100} />
                    <InputField label="Barangay / District" name="barangay" value={form.barangay} onChange={handleInput} maxLength={100} />
                    <div className="sm:col-span-2"><InputField label="Street address" name="streetAddress" value={form.streetAddress} onChange={handleInput} error={errors.streetAddress} required autoComplete="street-address" maxLength={200} /></div>
                    <InputField label="Postal / ZIP code" name="postalCode" value={form.postalCode} onChange={handleInput} error={errors.postalCode} required autoComplete="postal-code" maxLength={20} />
                  </div>}

                  {step === 3 && (form.role === 'user' ? <div className="space-y-5">
                    <label className="block text-sm font-semibold text-slate-700">Highest education level<select name="education" value={form.education} onChange={handleInput} aria-invalid={Boolean(errors.education)} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900"><option value="">Choose education level</option>{['High school', 'Vocational / Certificate', 'Associate degree', 'Bachelor degree', 'Master degree', 'Doctoral degree', 'Other'].map((option) => <option key={option} value={option}>{option}</option>)}</select>{errors.education && <span role="alert" className="mt-1 block text-xs text-rose-700">{errors.education}</span>}</label>
                    <div className="grid gap-4 sm:grid-cols-2"><InputField label="Current occupation" name="occupation" value={form.occupation} onChange={handleInput} maxLength={120} /><label className="block text-sm font-semibold text-slate-700">Employment status<select name="employmentStatus" value={form.employmentStatus} onChange={handleInput} aria-invalid={Boolean(errors.employmentStatus)} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900"><option value="">Choose status</option>{['Employed', 'Self-employed', 'Unemployed', 'Student', 'Seeking work', 'Prefer not to say'].map((option) => <option key={option} value={option}>{option}</option>)}</select>{errors.employmentStatus && <span role="alert" className="mt-1 block text-xs text-rose-700">{errors.employmentStatus}</span>}</label></div>
                    <label className="block text-sm font-semibold text-slate-700">Short bio / skills <span className="font-normal text-slate-500">(optional)</span><textarea name="bio" rows={5} maxLength={2000} value={form.bio} onChange={handleInput} placeholder="Share a few skills or a short introduction." className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900" /></label>
                  </div> : <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2"><InputField label="Company / business name" name="businessName" value={form.businessName} onChange={handleInput} error={errors.businessName} required maxLength={120} /><InputField label="Business type" name="businessType" value={form.businessType} onChange={handleInput} error={errors.businessType} required maxLength={100} /></div>
                    <InputField label="Business address" name="businessAddress" value={form.businessAddress} onChange={handleInput} error={errors.businessAddress} required maxLength={300} />
                    <div className="grid gap-4 sm:grid-cols-2"><InputField label="Business registration number" name="businessRegistrationNumber" value={form.businessRegistrationNumber} onChange={handleInput} maxLength={100} /><InputField label="Contact person" name="contactPerson" value={form.contactPerson} onChange={handleInput} error={errors.contactPerson} required maxLength={160} /></div>
                    <div><label htmlFor="signup-business-document" className="block text-sm font-semibold text-slate-700">Business verification document *</label><p className="mt-1 text-xs text-slate-500">PDF, JPG, or PNG up to 5 MB. Providers must be verified before managing listings.</p><input id="signup-business-document" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={handleBusinessDocumentChange} className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-800" />{businessDocument && <p className="mt-1 text-xs text-emerald-700">Selected: {businessDocument.name}</p>}{errors.businessDocument && <p role="alert" className="mt-1 text-xs text-rose-700">{errors.businessDocument}</p>}</div>
                  </div>)}

                  {step === 4 && <div className="space-y-5">
                    <div className="rounded-xl border border-slate-200 px-4">
                      {reviewRow('Account', `${form.role === 'provider' ? 'Provider' : 'User'} · @${form.username} · ${form.email}`, 0)}
                      {reviewRow('Personal information', `${[form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')} · ${form.dateOfBirth} · age ${age} · ${form.gender.replaceAll('_', ' ')} · ${form.phoneCountryCode} ${form.phone}${avatarFile ? ' · profile photo added' : ''}`, 1)}
                      {reviewRow('Address', [form.streetAddress, form.barangay, form.city, form.province, form.country, form.postalCode].filter(Boolean).join(', '), 2)}
                      {reviewRow('Role details', form.role === 'provider'
                        ? `${form.businessName} · ${form.businessType} · ${form.businessAddress}${form.businessRegistrationNumber ? ` · Registration: ${form.businessRegistrationNumber}` : ''} · Contact: ${form.contactPerson} · Document: ${businessDocument?.name || 'Not attached'}`
                        : `${form.education} · ${form.employmentStatus}${form.occupation ? ` · ${form.occupation}` : ''}${form.bio ? ` · ${form.bio}` : ''}`, 3)}
                    </div>
                    <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm text-slate-700"><input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={handleInput} aria-invalid={Boolean(errors.agreeTerms)} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /><span>I agree to the Terms of Service and Privacy Policy.</span></label>
                    {errors.agreeTerms && <p role="alert" className="text-xs text-rose-700">{errors.agreeTerms}</p>}
                  </div>}
                </motion.div>
              </AnimatePresence>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-8">
              <button type="button" onClick={() => { setErrors({}); setStep((current) => Math.max(0, current - 1)); }} disabled={step === 0 || loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Back</button>
              {step < 4 ? <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98]">Next<ArrowRight className="h-4 w-4" /></button>
                : <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Creating account…</> : <><CheckCircle2 className="h-4 w-4" />Create account</>}</button>}
            </footer>
          </form>
          <p className="mt-4 text-center text-[11px] text-slate-500">Your information is stored securely and only used to support your PathPoint account.</p>
        </section>
      </div>
    </div>
  );
};

export default RegisterWizard;