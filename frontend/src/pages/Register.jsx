import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import Modal from '../components/common/Modal';
import {
  Compass,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check,
  FileText,
  Upload,
} from 'lucide-react';

export const Register = () => {
  const { register, logout, backendOnline } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    careerTrack: 'Software Engineering',
    businessProfile: {
      companyName: '',
      industry: '',
      location: '',
      description: '',
      website: '',
    },
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [businessDocument, setBusinessDocument] = useState(null);

  // Password criteria checklist
  const pass = formData.password;
  const hasLength = pass.length >= 6;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass);

  const getStrengthScore = () => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let points = 0;
    if (hasLength) points += 25;
    if (hasUpper && hasLower) points += 25;
    if (hasNumberOrSpecial) points += 25;
    if (pass.length >= 10) points += 25;

    if (points <= 25) return { score: points, label: 'Weak', color: 'bg-rose-500' };
    if (points <= 50) return { score: points, label: 'Fair', color: 'bg-amber-500' };
    if (points <= 75) return { score: points, label: 'Good', color: 'bg-blue-500' };
    return { score: points, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getStrengthScore();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrorMessage('');
  };

  const selectRole = (role) => {
    setFormData((prev) => ({ ...prev, role }));
    setErrorMessage('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.role) {
      setErrorMessage('Choose Applicant or Company / Business Owner to continue.');
      return;
    }
    const normalizedName = formData.name.trim();
    const normalizedEmail = formData.email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const namePattern = /^[a-zA-Z][a-zA-Z .'-]*$/;

    if (!normalizedName || !normalizedEmail || !formData.password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (formData.role === 'provider' && (!formData.businessProfile.companyName.trim() || !formData.businessProfile.industry.trim())) {
      setErrorMessage('Please enter your business name and industry.');
      return;
    }

    if (formData.role === 'provider' && !businessDocument) {
      setErrorMessage('Upload a business registration document to verify your company.');
      return;
    }

    if (businessDocument && businessDocument.size > 5 * 1024 * 1024) {
      setErrorMessage('The verification document must be 5 MB or smaller.');
      return;
    }

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      setErrorMessage('Name must be between 2 and 100 characters.');
      return;
    }

    if (!namePattern.test(normalizedName)) {
      setErrorMessage('Name may only contain letters, spaces, apostrophes, periods, and hyphens.');
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (!/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setErrorMessage('Password must include an uppercase letter, lowercase letter, and number.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    if (!formData.agreeTerms) {
      setErrorMessage('You must accept the Terms of Service to proceed.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const verificationDocument = businessDocument
        ? await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
              fileName: businessDocument.name,
              mimeType: businessDocument.type,
              data: String(reader.result).split(',')[1],
            });
            reader.onerror = () => reject(new Error('Unable to read the selected document.'));
            reader.readAsDataURL(businessDocument);
          })
        : undefined;
      const result = await register({
        name: normalizedName,
        email: normalizedEmail,
        password: formData.password,
        role: formData.role,
        careerTrack: formData.careerTrack,
        businessProfile: formData.role === 'provider' ? formData.businessProfile : undefined,
        businessDocument: verificationDocument,
      });

      logout();
      toast('Account created and saved. Please sign in to continue.', 'success');
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err) {
      const msg = err.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'user', label: 'Applicant', description: 'I am looking for a job', icon: Briefcase },
    { value: 'provider', label: 'Company / Business Owner', description: 'I want to list my company for applicants', icon: Building2 },
  ];

  return (
    <div className="auth-page min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="auth-brand sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="auth-brand-mark inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-brand-500 text-white shadow-lg shadow-indigo-200 mb-3">
          <Compass className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Create Account
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Choose an account for your job search or your business
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="auth-card bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200 sm:px-10">
          <fieldset>
            <legend className="mb-3 text-sm font-bold text-slate-900">
              Choose your account type
            </legend>
            <div className="grid gap-3">
              {roleOptions.map(({ value, label, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectRole(value)}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    formData.role === value && modalOpen
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50'
                  }`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{label}</span>
                    <span className="mt-1 block text-xs text-slate-600">{description}</span>
                  </span>
                  <ArrowRight className="ml-auto h-5 w-5 text-slate-400" />
                </button>
              ))}
            </div>
          </fieldset>

          {/* Link to Login */}
          <div className="mt-6 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 underline"
            >
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>

      {/* Registration Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          formData.role === 'provider'
            ? 'Register as Company / Business Owner'
            : 'Register as Applicant'
        }
        maxWidth="max-w-lg"
      >
        {/* Role badge */}
        <div className="mb-5 flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            {formData.role === 'provider' ? (
              <Building2 className="w-4 h-4 text-indigo-700" />
            ) : (
              <Briefcase className="w-4 h-4 text-indigo-700" />
            )}
            <span className="text-xs font-semibold text-indigo-800">
              {formData.role === 'user' ? 'Applicant' : 'Company / Business Owner'}
            </span>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="text-xs font-semibold text-indigo-700 underline hover:text-indigo-900"
          >
            Change
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                id="register-name"
                type="text"
                autoComplete="off"
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Jordan Smith"
                className="auth-input w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                id="register-email"
                type="email"
                autoComplete="off"
                required
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="jordan@example.com"
                className="auth-input w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Target Career Track (Applicants only) */}
          {formData.role === 'user' && <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Career Field
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <select
                name="careerTrack"
                value={formData.careerTrack}
                onChange={handleChange}
                className="auth-input w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer transition"
              >
                <option value="Software Engineering">Software Engineering / Tech</option>
                <option value="Product & Design">Product Management & UI/UX Design</option>
                <option value="Data Science & AI">Data Science, Analytics & AI</option>
                <option value="Finance & Consulting">Finance, Banking & Consulting</option>
                <option value="Marketing & Growth">Marketing, Sales & Growth</option>
                <option value="General">General / Other Track</option>
              </select>
            </div>
          </div>}

          {/* Business Profile Fields (Providers only) */}
          {formData.role === 'provider' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Business name *
                </label>
                <input
                  required
                  maxLength={120}
                  value={formData.businessProfile.companyName}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    businessProfile: { ...prev.businessProfile, companyName: e.target.value },
                  }))}
                  placeholder="Company or business name"
                  className="auth-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Industry *
                </label>
                <input
                  required
                  maxLength={100}
                  value={formData.businessProfile.industry}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    businessProfile: { ...prev.businessProfile, industry: e.target.value },
                  }))}
                  placeholder="e.g. Healthcare, Technology"
                  className="auth-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Location
                </label>
                <input
                  maxLength={120}
                  value={formData.businessProfile.location}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    businessProfile: { ...prev.businessProfile, location: e.target.value },
                  }))}
                  placeholder="City, region, or remote"
                  className="auth-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  About the business
                </label>
                <textarea
                  maxLength={1000}
                  rows={3}
                  value={formData.businessProfile.description}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    businessProfile: { ...prev.businessProfile, description: e.target.value },
                  }))}
                  placeholder="What does your business do?"
                  className="auth-input w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Website
                </label>
                <input
                  type="url"
                  maxLength={200}
                  value={formData.businessProfile.website}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    businessProfile: { ...prev.businessProfile, website: e.target.value },
                  }))}
                  placeholder="https://example.com"
                  className="auth-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Business verification document *
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm hover:border-indigo-400">
                  <Upload className="h-4 w-4 shrink-0 text-indigo-700" />
                  <span className="min-w-0 flex-1 truncate text-slate-600">
                    {businessDocument?.name || 'Choose PDF, JPG, or PNG (max 5 MB)'}
                  </span>
                  <input
                    type="file"
                    required={!businessDocument}
                    accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setBusinessDocument(file);
                      setErrorMessage('');
                    }}
                    className="sr-only"
                  />
                </label>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                  <FileText className="h-3 w-3" />
                  Provide a business registration, license, or other official ownership record.
                </p>
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                required
                maxLength={12}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="auth-input w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                  <span>Password Strength:</span>
                  <span className="capitalize">{strength.label}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1">
                  <div className={`flex items-center gap-1 ${hasLength ? 'text-emerald-600' : ''}`}>
                    <Check className="w-3 h-3" />
                    <span>6+ Characters</span>
                  </div>
                  <div className={`flex items-center gap-1 ${hasUpper && hasLower ? 'text-emerald-600' : ''}`}>
                    <Check className="w-3 h-3" />
                    <span>Upper & lower case</span>
                  </div>
                  <div className={`flex items-center gap-1 ${hasNumberOrSpecial ? 'text-emerald-600' : ''}`}>
                    <Check className="w-3 h-3" />
                    <span>Number or symbol</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                required
                maxLength={12}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                className={`auth-input w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300'
                }`}
              />
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="mt-1 text-[11px] text-rose-600">Passwords do not match.</p>
            )}
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="agreeTerms"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="agreeTerms" className="text-xs text-slate-600 select-none">
              I agree to the{' '}
              <a href="#terms" className="text-indigo-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-indigo-600 hover:underline">
                Privacy Policy
              </a>
              .
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="auth-submit w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-200 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Register;
