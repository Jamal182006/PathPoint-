import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import {
  Compass,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const Register = () => {
  const { register, logout, backendOnline } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    careerTrack: 'Software Engineering',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedName = formData.name.trim();
    const normalizedEmail = formData.email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const namePattern = /^[a-zA-Z][a-zA-Z .'-]*$/;

    if (!normalizedName || !normalizedEmail || !formData.password) {
      setErrorMessage('Please fill in all required fields.');
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
      const result = await register({
        name: normalizedName,
        email: normalizedEmail,
        password: formData.password,
        role: 'user',
        careerTrack: formData.careerTrack,
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

  return (
    <div className="auth-page min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="auth-brand sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="auth-brand-mark inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-brand-500 text-white shadow-lg shadow-indigo-200 mb-3">
          <Compass className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Create Candidate Account
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Track job applications, schedule interviews, and visualize pipeline metrics
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="auth-card bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200 sm:px-10">
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

            {/* Target Career Track */}
            <div>
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
            </div>

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

          {/* Link to Login */}
          <div className="mt-6 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 underline"
            >
              Sign in to candidate portal
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
