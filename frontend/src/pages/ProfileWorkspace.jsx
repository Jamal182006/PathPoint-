import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CheckCircle2,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Plus,
  Trash2,
  UserRound,
  Wrench,
  Camera,
  Download,
  ExternalLink,
  FileText,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Building,
  MapPin,
  Calendar,
  X,
  Check,
  Upload,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import Modal from '../components/common/Modal';
import ForgotPasswordModal from '../components/common/ForgotPasswordModal';
import { apiAdapter } from '../services/apiAdapter';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const sections = [
  { id: 'basic', label: 'Basic Info', icon: UserRound, description: 'Personal details, contact, and career preferences' },
  { id: 'experience', label: 'Experience', icon: BriefcaseBusiness, description: 'Work history, roles, and achievements' },
  { id: 'education', label: 'Education', icon: GraduationCap, description: 'Degrees, academic history, and qualifications' },
  { id: 'skills', label: 'Skills & Resume', icon: Wrench, description: 'Core capabilities and verified resume document' },
  { id: 'privacy', label: 'Privacy', icon: ShieldCheck, description: 'Control who can see your profile and resume' },
  { id: 'security', label: 'Security', icon: LockKeyhole, description: 'Password, authentication, and session security' },
];

const SKILL_SUGGESTIONS = [
  { label: 'IT related', skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Python', 'SQL', 'Git', 'Data Analysis', 'Cloud (AWS / Azure)', 'Cybersecurity'] },
  { label: 'Accounting & Finance', skills: ['Bookkeeping', 'Financial Reporting', 'Payroll', 'Accounts Payable', 'Tax Preparation', 'Auditing', 'QuickBooks', 'Excel'] },
  { label: 'Customer Service', skills: ['Customer Service', 'Call Handling', 'Chat Support', 'CRM', 'Conflict Resolution'] },
  { label: 'Sales & Marketing', skills: ['Sales', 'Digital Marketing', 'SEO', 'Social Media Marketing', 'Lead Generation', 'Negotiation'] },
  { label: 'Design', skills: ['UI/UX Design', 'Graphic Design', 'Figma', 'Adobe Photoshop', 'Wireframing', 'Video Editing'] },
  { label: 'Project Management', skills: ['Project Management', 'Agile', 'Scrum', 'Time Management', 'Leadership', 'Documentation'] },
  { label: 'Healthcare', skills: ['Patient Care', 'Medical Terminology', 'First Aid', 'Nursing', 'Phlebotomy'] },
  { label: 'Education', skills: ['Teaching', 'Lesson Planning', 'Curriculum Development', 'Classroom Management', 'Tutoring'] },
  { label: 'Skilled Trades', skills: ['Electrical Wiring', 'Plumbing', 'Carpentry', 'Welding', 'Machine Operation'] },
  { label: 'Logistics & Driving', skills: ['Professional Driving', 'Delivery', 'Inventory Management', 'Warehouse Operations', 'Forklift Operation'] },
  { label: 'General', skills: ['Problem Solving', 'Communication', 'Teamwork', 'Microsoft Office', 'Adaptability'] },
];

const emptyExperience = () => ({
  title: '',
  company: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
});

const emptyEducation = () => ({
  school: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
  description: '',
});

const formatDateInput = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const normalizeProfile = (source) => ({
  name: source?.name || '',
  username: source?.username || '',
  phone: source?.phone || '',
  address: source?.address || '',
  bio: source?.bio || '',
  occupation: source?.occupation || '',
  employmentStatus: source?.employmentStatus || '',
  avatar: source?.avatar || '',
  experience: (source?.experience || []).map((entry) => ({
    _id: entry?._id,
    title: entry?.title || '',
    company: entry?.company || '',
    location: entry?.location || '',
    startDate: formatDateInput(entry?.startDate),
    endDate: formatDateInput(entry?.endDate),
    current: Boolean(entry?.current),
    description: entry?.description || '',
  })),
  educationHistory: (source?.educationHistory || []).map((entry) => ({
    _id: entry?._id,
    school: entry?.school || '',
    degree: entry?.degree || '',
    fieldOfStudy: entry?.fieldOfStudy || '',
    startDate: formatDateInput(entry?.startDate),
    endDate: formatDateInput(entry?.endDate),
    description: entry?.description || '',
  })),
  education: source?.education || '',
  skills: Array.isArray(source?.skills) ? source.skills : [],
  resume: source?.resume || null,
  profileInfo: {
    headline: source?.profileInfo?.headline || '',
    bio: source?.profileInfo?.bio || source?.bio || '',
    targetRoles: Array.isArray(source?.profileInfo?.targetRoles) ? source.profileInfo.targetRoles : [],
    desiredSalary: {
      min: Number(source?.profileInfo?.desiredSalary?.min) || 0,
      max: Number(source?.profileInfo?.desiredSalary?.max) || 0,
      currency: source?.profileInfo?.desiredSalary?.currency || 'USD',
    },
    workPreference: source?.profileInfo?.workPreference || '',
  },
});

const normalizePrivacySettings = (source) => ({
  profileVisibility: ['private', 'counselors_only', 'public'].includes(source?.profileVisibility)
    ? source.profileVisibility
    : 'private',
  shareResumeToPublic: Boolean(source?.shareResumeToPublic),
});

const ProfileWorkspace = () => {
  const { user, updateMyProfile, changePassword, logout } = useAuth();
  const { toast } = useToast();
  const avatarInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  const [activeSection, setActiveSection] = useState('basic');
  const [editingSection, setEditingSection] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(!user);

  // Profile data
  const [profile, setProfile] = useState(() => normalizeProfile(user));
  const [savedProfile, setSavedProfile] = useState(() => normalizeProfile(user));

  // Privacy
  const [privacySettings, setPrivacySettings] = useState(() => normalizePrivacySettings(user?.privacySettings));
  const [savedPrivacySettings, setSavedPrivacySettings] = useState(() => normalizePrivacySettings(user?.privacySettings));

  // Skills interactive input
  const [skillInput, setSkillInput] = useState('');
  const [skillCategory, setSkillCategory] = useState(null);

  // Async busy states
  const [resumeBusy, setResumeBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Security & password
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });

  // Account handle (username) — debounced availability check while editing.
  const currentUsername = (user?.username || '').toLowerCase();
  const [usernameStatus, setUsernameStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    const value = (profile.username || '').trim().toLowerCase();
    if (!value) {
      setUsernameStatus({ state: 'idle', message: '', value });
      return undefined;
    }
    if (value === currentUsername) {
      setUsernameStatus({ state: 'current', message: `Currently signed in as @${value}.`, value });
      return undefined;
    }
    if (!USERNAME_PATTERN.test(value)) {
      setUsernameStatus({ state: 'invalid', message: 'Use 3–20 characters: lowercase letters, numbers, or underscores.', value });
      return undefined;
    }

    let cancelled = false;
    setUsernameStatus({ state: 'checking', message: 'Checking availability…', value });
    const timer = setTimeout(async () => {
      try {
        const result = await apiAdapter.checkUsernameAvailability(value);
        if (cancelled) return;
        setUsernameStatus(result?.available
          ? { state: 'available', message: `@${value} is available.`, value }
          : { state: 'taken', message: result?.message || `@${value} is already taken.`, value });
      } catch (err) {
        if (cancelled) return;
        setUsernameStatus({ state: 'error', message: err.message || 'Unable to check availability right now.', value });
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [profile.username, currentUsername]);

  const usernameStatusTone = {
    available: 'text-emerald-600',
    current: 'text-slate-500',
    checking: 'text-slate-500',
    idle: 'text-slate-500',
    invalid: 'text-rose-600',
    taken: 'text-rose-600',
    error: 'text-rose-600',
  }[usernameStatus.state] || 'text-slate-500';

  // Load profile and customization data safely
  const loadProfileData = useCallback(async (isSilent = false) => {
    if (!isSilent && !user) setProfileLoading(true);
    if (isSilent) setRefreshing(true);

    try {
      const [customizationResult, fullUserResult] = await Promise.allSettled([
        apiAdapter.getProfileCustomization(),
        apiAdapter.getMe(),
      ]);

      let fullUser = null;
      if (fullUserResult.status === 'fulfilled' && fullUserResult.value) {
        fullUser = fullUserResult.value;
      } else if (user) {
        fullUser = user;
      }

      if (fullUser) {
        const normalized = normalizeProfile(fullUser);
        setProfile(normalized);
        setSavedProfile(normalized);
      }

      let custData = null;
      if (customizationResult.status === 'fulfilled' && customizationResult.value) {
        custData = customizationResult.value;
      } else if (fullUser) {
        custData = {
          customization: fullUser.customization,
          privacySettings: fullUser.privacySettings,
        };
      }

      if (custData) {
        const normPriv = normalizePrivacySettings(custData.privacySettings);
        setPrivacySettings(normPriv);
        setSavedPrivacySettings(normPriv);
      }

      if (isSilent) {
        toast('Profile synchronized with server.', 'success');
      }
    } catch (err) {
      console.warn('[ProfileWorkspace] Load error:', err);
      if (!isSilent) {
        toast(err.message || 'Unable to load profile data from the server.', 'error');
      }
    } finally {
      setProfileLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  useEffect(() => {
    let active = true;
    loadProfileData(false);
    return () => {
      active = false;
    };
  }, [loadProfileData]);

  // Synchronize with user context changes if available
  useEffect(() => {
    if (user && !savedProfile.name) {
      const normalized = normalizeProfile(user);
      setProfile(normalized);
      setSavedProfile(normalized);
    }
  }, [user, savedProfile.name]);

  // Completion calculation & interactive checklists
  const completionItems = useMemo(() => [
    { label: 'Full name', complete: Boolean(profile.name.trim()), section: 'basic' },
    { label: 'Phone number', complete: Boolean(profile.phone.trim()), section: 'basic' },
    { label: 'Professional summary', complete: Boolean(profile.bio.trim()), section: 'basic' },
    { label: 'Target role / headline', complete: Boolean(profile.profileInfo.headline.trim() || profile.profileInfo.targetRoles.length > 0), section: 'basic' },
    { label: 'Work experience', complete: profile.experience.some((e) => e.title || e.company), section: 'experience' },
    { label: 'Education history', complete: profile.educationHistory.some((e) => e.school || e.degree) || Boolean(profile.education.trim()), section: 'education' },
    { label: 'Skills & expertise', complete: profile.skills.length > 0, section: 'skills' },
    { label: 'Resume / CV', complete: Boolean(profile.resume), section: 'skills' },
  ], [profile]);

  const completionPercentage = useMemo(() => {
    const completedCount = completionItems.filter((i) => i.complete).length;
    return Math.round((completedCount / completionItems.length) * 100);
  }, [completionItems]);

  // Section dirty check
  const isSectionDirty = useMemo(() => {
    if (activeSection === 'basic') {
      return (
        profile.name !== savedProfile.name ||
        profile.username !== savedProfile.username ||
        profile.phone !== savedProfile.phone ||
        profile.address !== savedProfile.address ||
        profile.bio !== savedProfile.bio ||
        profile.occupation !== savedProfile.occupation ||
        profile.employmentStatus !== savedProfile.employmentStatus ||
        profile.avatar !== savedProfile.avatar ||
        JSON.stringify(profile.profileInfo) !== JSON.stringify(savedProfile.profileInfo)
      );
    }
    if (activeSection === 'experience') {
      return JSON.stringify(profile.experience) !== JSON.stringify(savedProfile.experience);
    }
    if (activeSection === 'education') {
      return (
        profile.education !== savedProfile.education ||
        JSON.stringify(profile.educationHistory) !== JSON.stringify(savedProfile.educationHistory)
      );
    }
    if (activeSection === 'skills') {
      return JSON.stringify(profile.skills) !== JSON.stringify(savedProfile.skills);
    }
    if (activeSection === 'privacy') {
      return JSON.stringify(privacySettings) !== JSON.stringify(savedPrivacySettings);
    }
    return false;
  }, [activeSection, profile, savedProfile, privacySettings, savedPrivacySettings]);

  // Cancel changes in section
  const handleCancelSection = () => {
    setProfile(savedProfile);
    setPrivacySettings(savedPrivacySettings);
    setEditingSection('');
  };

  // Save current section
  const handleSaveSection = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      if (activeSection === 'privacy') {
        const result = await apiAdapter.updateProfileCustomization({ privacySettings });

        const updatedPriv = normalizePrivacySettings(result?.privacySettings || privacySettings);
        setPrivacySettings(updatedPriv);
        setSavedPrivacySettings(updatedPriv);
      } else {
        let payload = {};

        if (activeSection === 'basic') {
          if (!profile.name.trim() || profile.name.trim().length < 2) {
            toast('Please enter a valid full name (at least 2 characters).', 'error');
            setSaving(false);
            return;
          }
          const normalizedUsername = (profile.username || '').trim().toLowerCase();
          const usernameChanged = normalizedUsername !== currentUsername;
          if (usernameChanged) {
            if (!USERNAME_PATTERN.test(normalizedUsername)) {
              toast('Username must be 3–20 characters using lowercase letters, numbers, or underscores.', 'error');
              setSaving(false);
              return;
            }
            if (usernameStatus.state === 'taken') {
              toast(usernameStatus.message || 'That username is already taken.', 'error');
              setSaving(false);
              return;
            }
          }
          payload = {
            name: profile.name.trim(),
            phone: profile.phone.trim(),
            address: profile.address.trim(),
            bio: profile.bio.trim(),
            occupation: profile.occupation.trim(),
            employmentStatus: profile.employmentStatus.trim(),
            avatar: profile.avatar,
            profileInfo: profile.profileInfo,
          };
          if (usernameChanged) payload.username = normalizedUsername;
        } else if (activeSection === 'experience') {
          const cleanedExperience = profile.experience.map((entry) => ({
            ...entry,
            title: entry.title.trim(),
            company: entry.company.trim(),
            location: entry.location.trim(),
            startDate: entry.startDate || undefined,
            endDate: entry.current ? undefined : (entry.endDate || undefined),
            description: entry.description.trim(),
          }));
          payload = { experience: cleanedExperience };
        } else if (activeSection === 'education') {
          const cleanedEducation = profile.educationHistory.map((entry) => ({
            ...entry,
            school: entry.school.trim(),
            degree: entry.degree.trim(),
            fieldOfStudy: entry.fieldOfStudy.trim(),
            startDate: entry.startDate || undefined,
            endDate: entry.endDate || undefined,
            description: entry.description.trim(),
          }));
          payload = {
            educationHistory: cleanedEducation,
            education: profile.education.trim(),
          };
        } else if (activeSection === 'skills') {
          payload = { skills: profile.skills.slice(0, 50) };
        }

        const updated = await updateMyProfile(payload);
        const normalized = normalizeProfile(updated);
        setProfile(normalized);
        setSavedProfile(normalized);
      }

      setEditingSection('');
      toast('Section saved successfully.', 'success');
    } catch (err) {
      console.error('Save failed:', err);
      toast(err.message || 'Unable to save changes. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Avatar handling
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast('Please select a PNG or JPG image file.', 'error');
      event.target.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast('Profile image size must be 3 MB or smaller.', 'error');
      event.target.value = '';
      return;
    }

    setAvatarBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, avatar: String(reader.result || '') }));
      setEditingSection('basic');
      setAvatarBusy(false);
      toast('Avatar photo updated. Click "Save Changes" to apply.', 'success');
    };
    reader.onerror = () => {
      toast('Could not read this image file.', 'error');
      setAvatarBusy(false);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setProfile((prev) => ({ ...prev, avatar: '' }));
    setEditingSection('basic');
    toast('Avatar removed. Click "Save Changes" to apply.', 'success');
  };

  // Resume handling
  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast('Choose a PDF, JPG, or PNG document up to 5 MB.', 'error');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('Resume file must be 5 MB or smaller.', 'error');
      event.target.value = '';
      return;
    }

    setResumeBusy(true);
    try {
      const res = await apiAdapter.uploadMyResume(file);
      const resumeData = res?.resume || res;
      setProfile((prev) => ({ ...prev, resume: resumeData }));
      setSavedProfile((prev) => ({ ...prev, resume: resumeData }));
      toast('Resume successfully uploaded and attached to your profile.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to upload resume.', 'error');
    } finally {
      setResumeBusy(false);
      event.target.value = '';
    }
  };

  const handleRemoveResume = async () => {
    if (!window.confirm('Are you sure you want to remove your resume?')) return;
    setResumeBusy(true);
    try {
      await apiAdapter.deleteMyResume();
      setProfile((prev) => ({ ...prev, resume: null }));
      setSavedProfile((prev) => ({ ...prev, resume: null }));
      toast('Resume removed from your profile.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to remove resume.', 'error');
    } finally {
      setResumeBusy(false);
    }
  };

  const handlePreviewResume = async () => {
    try {
      const blob = await apiAdapter.getMyResume(true);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast(err.message || 'Unable to open resume preview.', 'error');
    }
  };

  const handleDownloadResume = async () => {
    try {
      const blob = await apiAdapter.getMyResume(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = profile.resume?.fileName || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      toast(err.message || 'Unable to download resume.', 'error');
    }
  };

  // Skill management
  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || skillInput).trim();
    if (!trimmed) return;

    const existingLower = profile.skills.map((s) => s.toLowerCase());
    if (existingLower.includes(trimmed.toLowerCase())) {
      toast(`"${trimmed}" is already in your skills list.`, 'info');
      setSkillInput('');
      return;
    }

    if (profile.skills.length >= 50) {
      toast('You can have up to 50 skills.', 'error');
      return;
    }

    setProfile((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setEditingSection('skills');
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
    setEditingSection('skills');
  };

  // Experience array manipulation
  const updateExperienceEntry = (index, changes) => {
    setProfile((prev) => ({
      ...prev,
      experience: prev.experience.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)),
    }));
    setEditingSection('experience');
  };

  const addExperienceEntry = () => {
    setProfile((prev) => ({ ...prev, experience: [...prev.experience, emptyExperience()] }));
    setEditingSection('experience');
  };

  const removeExperienceEntry = (index) => {
    setProfile((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
    setEditingSection('experience');
  };

  // Education array manipulation
  const updateEducationEntry = (index, changes) => {
    setProfile((prev) => ({
      ...prev,
      educationHistory: prev.educationHistory.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)),
    }));
    setEditingSection('education');
  };

  const addEducationEntry = () => {
    setProfile((prev) => ({ ...prev, educationHistory: [...prev.educationHistory, emptyEducation()] }));
    setEditingSection('education');
  };

  const removeEducationEntry = (index) => {
    setProfile((prev) => ({
      ...prev,
      educationHistory: prev.educationHistory.filter((_, i) => i !== index),
    }));
    setEditingSection('education');
  };

  // Password update
  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      toast('New password must be at least 8 characters.', 'error');
      return;
    }
    if (!/[A-Z]/.test(passwordForm.newPassword) || !/[a-z]/.test(passwordForm.newPassword) || !/[0-9]/.test(passwordForm.newPassword)) {
      toast('Password must contain uppercase, lowercase, and a number.', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast('New passwords do not match.', 'error');
      return;
    }

    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      toast(result?.message || 'Password updated successfully.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to update password.', 'error');
    }
  };

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isSectionDirty && !saving) {
          handleSaveSection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Loading skeleton
  if (profileLoading && !user) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-44 w-full animate-pulse rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          <div className="space-y-4">
            <div className="h-10 w-1/3 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  const activeTab = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Header Card */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Avatar with upload trigger */}
            <div className="group relative h-24 w-24 shrink-0 rounded-2xl border-2 border-white/20 bg-white/10 shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-white/40">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={`${profile.name} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-indigo-600 to-purple-600 text-3xl font-extrabold text-white">
                  {profile.name ? profile.name.slice(0, 1).toUpperCase() : 'U'}
                </div>
              )}

              {/* Hover overlay for changing avatar */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100"
                title="Change profile avatar"
              >
                {avatarBusy ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <>
                    <Camera className="h-5 w-5 text-white" />
                    <span className="mt-1 text-[10px] font-semibold tracking-wide text-white">Upload</span>
                  </>
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleAvatarChange}
                className="sr-only"
              />
            </div>

            {/* Profile info */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-indigo-100 backdrop-blur-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  {user?.role?.toUpperCase() || 'USER'} ACCOUNT
                </span>
                {user?.username && (
                  <span className="text-xs font-medium text-indigo-200/90">
                    @{user.username}
                  </span>
                )}
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {profile.name || 'Your Profile'}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-100/80">
                <span>{user?.email}</span>
                {profile.occupation && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-white">{profile.occupation}</span>
                  </>
                )}
                {profile.address && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.address}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => loadProfileData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-xs transition hover:bg-white/20 disabled:opacity-50"
              title="Refresh profile state from server"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing…' : 'Sync'}</span>
            </button>

            {user?.role === 'provider' && (
              <Link
                to="/provider/companies"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-xs transition hover:bg-white/20"
              >
                <Building className="h-3.5 w-3.5" />
                Company Profile
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Completion & Profile Health Tracker */}
      <section
        aria-label="Profile Strength"
        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all sm:p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Profile Strength
              </span>
              <span className={completionPercentage >= 80 ? 'text-emerald-600 font-bold' : 'text-indigo-600 font-bold'}>
                {completionPercentage}%
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all duration-700 ease-out ${
                  completionPercentage >= 80
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : completionPercentage >= 50
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                    : 'bg-gradient-to-r from-amber-500 to-indigo-500'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Interactive Checklist Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {completionItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setActiveSection(item.section);
                  setEditingSection(item.section);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  item.complete
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
                title={item.complete ? `${item.label} completed` : `Click to add ${item.label}`}
              >
                {item.complete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Workspace Layout */}
      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* Navigation Sidebar */}
        <aside aria-label="Profile navigation" className="min-w-0">
          <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm lg:block lg:space-y-1 lg:overflow-visible">
            {sections.map(({ id, label, icon: Icon, description }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveSection(id);
                    setEditingSection('');
                  }}
                  className={`group flex w-full shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-none ${isActive ? 'text-white' : 'text-slate-800'}`}>
                      {label}
                    </p>
                    <p
                      className={`mt-1 hidden truncate text-[10px] lg:block ${
                        isActive ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main
          role="tabpanel"
          aria-label={activeTab.label}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          {/* Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {activeTab.label}
                </h2>
                {isSectionDirty && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Unsaved changes
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {activeTab.description}
              </p>
            </div>

            {/* Action Buttons for non-security sections */}
            {activeSection !== 'security' && (
              <div className="flex items-center gap-2">
                {isSectionDirty && (
                  <button
                    type="button"
                    onClick={handleCancelSection}
                    disabled={saving}
                    className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Discard
                  </button>
                )}
                <button
                  type="submit"
                  form="profile-section-form"
                  disabled={saving || !isSectionDirty}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-40"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{saving ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Form Content */}
          {activeSection === 'security' ? (
            /* SECURITY SECTION */
            <div key={activeSection} className="animate-tab-panel space-y-8 pt-6">
              {/* Password update form */}
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Ensure your account is using a strong, unique password.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Current Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        required
                        type={showCurrentPassword ? 'text' : 'password'}
                        maxLength={72}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="••••••••"
                        className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      New Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        required
                        type={showNewPassword ? 'text' : 'password'}
                        maxLength={72}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="••••••••"
                        className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Confirm New Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        maxLength={72}
                        value={passwordForm.confirmNewPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                        placeholder="••••••••"
                        className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password requirement chips */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-xs font-semibold text-slate-700">Password requirements:</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                    <span className={`inline-flex items-center gap-1 ${passwordForm.newPassword.length >= 8 ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      <Check className="h-3.5 w-3.5" /> 8+ characters
                    </span>
                    <span className={`inline-flex items-center gap-1 ${/[A-Z]/.test(passwordForm.newPassword) ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      <Check className="h-3.5 w-3.5" /> Uppercase letter
                    </span>
                    <span className={`inline-flex items-center gap-1 ${/[a-z]/.test(passwordForm.newPassword) ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      <Check className="h-3.5 w-3.5" /> Lowercase letter
                    </span>
                    <span className={`inline-flex items-center gap-1 ${/[0-9]/.test(passwordForm.newPassword) ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      <Check className="h-3.5 w-3.5" /> Number
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Forgot password? Reset with code
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Update Password
                  </button>
                </div>
              </form>

              {/* Session Termination / Sign Out */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                  <div>
                    <h4 className="text-xs font-bold text-rose-900">Account Session</h4>
                    <p className="mt-0.5 text-xs text-rose-700">
                      Sign out of this session on this computer or device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Sign out of your account now?')) logout();
                    }}
                    className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-xs transition hover:bg-rose-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form key={activeSection} id="profile-section-form" onSubmit={handleSaveSection} className="animate-tab-panel space-y-6 pt-6">
              {/* BASIC INFO */}
              {activeSection === 'basic' && (
                <div className="space-y-6">
                  {/* Avatar row */}
                  <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="Avatar preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-xl font-bold text-indigo-700">
                          {profile.name ? profile.name.slice(0, 1).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50">
                          <Camera className="h-3.5 w-3.5 text-slate-500" />
                          <span>{avatarBusy ? 'Reading image…' : 'Change Photo'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleAvatarChange}
                            disabled={avatarBusy}
                            className="sr-only"
                          />
                        </label>
                        {profile.avatar && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Supports PNG or JPG under 3 MB.
                      </p>
                    </div>
                  </div>

                  {/* Personal details grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Full Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        required
                        maxLength={100}
                        value={profile.name}
                        onChange={(e) => {
                          setProfile({ ...profile, name: e.target.value });
                          setEditingSection('basic');
                        }}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Email Address
                      </label>
                      <input
                        readOnly
                        value={user?.email || ''}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2 text-sm text-slate-600 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-username" className="block text-xs font-semibold text-slate-700">
                        Username
                      </label>
                      <div className="relative mt-1">
                        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">@</span>
                        <input
                          id="profile-username"
                          name="username"
                          type="text"
                          inputMode="text"
                          autoComplete="username"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          maxLength={20}
                          value={profile.username}
                          onChange={(e) => {
                            setProfile({ ...profile, username: e.target.value });
                            setEditingSection('basic');
                          }}
                          placeholder="your_handle"
                          aria-describedby="profile-username-status"
                          className={`block w-full rounded-xl border px-3.5 py-2 pl-8 text-sm text-slate-900 transition focus:outline-hidden focus:ring-1 ${
                            ['taken', 'invalid', 'error'].includes(usernameStatus.state)
                              ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600'
                              : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-600'
                          }`}
                        />
                      </div>
                      <p id="profile-username-status" aria-live="polite" className={`mt-1 text-[11px] font-medium ${usernameStatusTone}`}>
                        {usernameStatus.message || 'Your public handle. You can sign in with it instead of your email address.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Phone Number
                      </label>
                      <input
                        maxLength={40}
                        value={profile.phone}
                        onChange={(e) => {
                          setProfile({ ...profile, phone: e.target.value });
                          setEditingSection('basic');
                        }}
                        placeholder="+1 (555) 012-3456"
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Location / Address
                      </label>
                      <input
                        maxLength={300}
                        value={profile.address}
                        onChange={(e) => {
                          setProfile({ ...profile, address: e.target.value });
                          setEditingSection('basic');
                        }}
                        placeholder="San Francisco, CA or Singapore"
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Current Occupation / Title
                      </label>
                      <input
                        maxLength={120}
                        value={profile.occupation}
                        onChange={(e) => {
                          setProfile({ ...profile, occupation: e.target.value });
                          setEditingSection('basic');
                        }}
                        placeholder="Senior Software Engineer"
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Employment Status
                      </label>
                      <select
                        value={profile.employmentStatus}
                        onChange={(e) => {
                          setProfile({ ...profile, employmentStatus: e.target.value });
                          setEditingSection('basic');
                        }}
                        className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      >
                        <option value="">Select status…</option>
                        <option value="Actively Looking">Actively Looking</option>
                        <option value="Open to Offers">Open to Offers</option>
                        <option value="Employed">Employed</option>
                        <option value="Freelancing / Consulting">Freelancing / Consulting</option>
                        <option value="Not Looking">Not Looking</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                          Professional Bio / Summary
                        </label>
                        <span className="text-[11px] text-slate-500">
                          {profile.bio.length} / 2000
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        maxLength={2000}
                        value={profile.bio}
                        onChange={(e) => {
                          setProfile({ ...profile, bio: e.target.value });
                          setEditingSection('basic');
                        }}
                        placeholder="Write a concise overview of your background, strengths, and goals…"
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Career preferences card */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <h3 className="text-sm font-bold text-slate-900">Career & Work Preferences</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Specify what roles and working styles you are targeting.
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Profile Headline
                        </label>
                        <input
                          maxLength={160}
                          value={profile.profileInfo?.headline || ''}
                          onChange={(e) => {
                            setProfile({
                              ...profile,
                              profileInfo: { ...profile.profileInfo, headline: e.target.value },
                            });
                            setEditingSection('basic');
                          }}
                          placeholder="e.g. Full-Stack Developer passionate about UX"
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Work Style Preference
                        </label>
                        <select
                          value={profile.profileInfo?.workPreference || ''}
                          onChange={(e) => {
                            setProfile({
                              ...profile,
                              profileInfo: { ...profile.profileInfo, workPreference: e.target.value },
                            });
                            setEditingSection('basic');
                          }}
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                        >
                          <option value="">Any / Flexible</option>
                          <option value="Remote">Remote</option>
                          <option value="Hybrid">Hybrid</option>
                          <option value="On-site">On-site</option>
                          <option value="Flexible">Flexible</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Target Roles <span className="font-normal text-slate-500">(comma separated)</span>
                        </label>
                        <input
                          maxLength={900}
                          value={(profile.profileInfo?.targetRoles || []).join(', ')}
                          onChange={(e) => {
                            setProfile({
                              ...profile,
                              profileInfo: {
                                ...profile.profileInfo,
                                targetRoles: e.target.value
                                  .split(',')
                                  .map((r) => r.trim())
                                  .filter(Boolean)
                                  .slice(0, 10),
                              },
                            });
                            setEditingSection('basic');
                          }}
                          placeholder="Frontend Engineer, UI Designer, Product Manager"
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Desired Salary (Minimum)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={profile.profileInfo?.desiredSalary?.min || 0}
                          onChange={(e) => {
                            setProfile({
                              ...profile,
                              profileInfo: {
                                ...profile.profileInfo,
                                desiredSalary: {
                                  ...profile.profileInfo?.desiredSalary,
                                  min: Number(e.target.value) || 0,
                                },
                              },
                            });
                            setEditingSection('basic');
                          }}
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Desired Salary (Maximum)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={profile.profileInfo?.desiredSalary?.max || 0}
                          onChange={(e) => {
                            setProfile({
                              ...profile,
                              profileInfo: {
                                ...profile.profileInfo,
                                desiredSalary: {
                                  ...profile.profileInfo?.desiredSalary,
                                  max: Number(e.target.value) || 0,
                                },
                              },
                            });
                            setEditingSection('basic');
                          }}
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 transition focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EXPERIENCE */}
              {activeSection === 'experience' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Add positions and achievements to showcase your professional trajectory.
                    </p>
                    <button
                      type="button"
                      onClick={addExperienceEntry}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Role
                    </button>
                  </div>

                  {profile.experience.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                      <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" />
                      <h4 className="mt-2 text-sm font-semibold text-slate-800">No work experience added yet</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Add past and current roles so companies can evaluate your career track.
                      </p>
                      <button
                        type="button"
                        onClick={addExperienceEntry}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add First Role
                      </button>
                    </div>
                  ) : (
                    profile.experience.map((entry, index) => (
                      <div
                        key={entry._id || index}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Position #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeExperienceEntry(index)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700">Role Title</label>
                            <input
                              maxLength={120}
                              value={entry.title}
                              onChange={(e) => updateExperienceEntry(index, { title: e.target.value })}
                              placeholder="Software Engineer"
                              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700">Company</label>
                            <input
                              maxLength={120}
                              value={entry.company}
                              onChange={(e) => updateExperienceEntry(index, { company: e.target.value })}
                              placeholder="Acme Corp"
                              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700">Location</label>
                            <input
                              maxLength={120}
                              value={entry.location}
                              onChange={(e) => updateExperienceEntry(index, { location: e.target.value })}
                              placeholder="New York, NY or Remote"
                              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700">Start Date</label>
                              <input
                                type="date"
                                value={entry.startDate || ''}
                                onChange={(e) => updateExperienceEntry(index, { startDate: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700">End Date</label>
                              <input
                                type="date"
                                disabled={entry.current}
                                value={entry.endDate || ''}
                                onChange={(e) => updateExperienceEntry(index, { endDate: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(entry.current)}
                                onChange={(e) =>
                                  updateExperienceEntry(index, {
                                    current: e.target.checked,
                                    endDate: e.target.checked ? '' : entry.endDate,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              I currently work here
                            </label>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700">
                              Details & Responsibilities
                            </label>
                            <textarea
                              rows={3}
                              maxLength={2000}
                              value={entry.description}
                              onChange={(e) => updateExperienceEntry(index, { description: e.target.value })}
                              placeholder="Key projects, technologies used, and notable outcomes…"
                              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* EDUCATION */}
              {activeSection === 'education' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Education Summary Statement
                    </label>
                    <input
                      maxLength={100}
                      value={profile.education}
                      onChange={(e) => {
                        setProfile({ ...profile, education: e.target.value });
                        setEditingSection('education');
                      }}
                      placeholder="e.g. B.S. in Computer Science — Stanford University"
                      className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">
                      Degrees, institutions, diplomas, and relevant coursework.
                    </p>
                    <button
                      type="button"
                      onClick={addEducationEntry}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Degree
                    </button>
                  </div>

                  {profile.educationHistory.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                      <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
                      <h4 className="mt-2 text-sm font-semibold text-slate-800">No education entries added</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Add degrees or training programs to strengthen your candidate profile.
                      </p>
                      <button
                        type="button"
                        onClick={addEducationEntry}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add First Degree
                      </button>
                    </div>
                  ) : (
                    profile.educationHistory.map((entry, index) => (
                      <div
                        key={entry._id || index}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Degree #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeEducationEntry(index)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700">Institution / School</label>
                            <input
                              maxLength={160}
                              value={entry.school}
                              onChange={(e) => updateEducationEntry(index, { school: e.target.value })}
                              placeholder="University of California, Berkeley"
                              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700">Degree / Certificate</label>
                            <input
                              maxLength={120}
                              value={entry.degree}
                              onChange={(e) => updateEducationEntry(index, { degree: e.target.value })}
                              placeholder="Bachelor of Science"
                              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700">Field of Study</label>
                            <input
                              maxLength={120}
                              value={entry.fieldOfStudy}
                              onChange={(e) => updateEducationEntry(index, { fieldOfStudy: e.target.value })}
                              placeholder="Computer Science & Engineering"
                              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700">Start Date</label>
                              <input
                                type="date"
                                value={entry.startDate || ''}
                                onChange={(e) => updateEducationEntry(index, { startDate: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700">End Date</label>
                              <input
                                type="date"
                                value={entry.endDate || ''}
                                onChange={(e) => updateEducationEntry(index, { endDate: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700">Details</label>
                            <textarea
                              rows={2}
                              maxLength={1000}
                              value={entry.description}
                              onChange={(e) => updateEducationEntry(index, { description: e.target.value })}
                              placeholder="Honors, thesis, GPA, or notable achievements…"
                              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SKILLS & RESUME */}
              {activeSection === 'skills' && (
                <div className="space-y-8">
                  {/* Skills Section */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Skills & Competencies ({profile.skills.length}/50)
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Type and press Enter to add
                      </span>
                    </div>

                    {/* Skill Add Input */}
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        maxLength={80}
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        placeholder="Add a skill (e.g. React, Python, Product Strategy)…"
                        className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSkill()}
                        disabled={!skillInput.trim()}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>

                    {/* Current Skill Chips */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-xs font-medium text-indigo-900"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="rounded-full text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 p-0.5"
                            title={`Remove ${skill}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      {profile.skills.length === 0 && (
                        <p className="text-xs italic text-slate-500">
                          No skills added yet. Use the suggestions below or type a skill above.
                        </p>
                      )}
                    </div>

                    {/* Suggested Skills */}
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Quick Add Suggestions
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Choose an area to see the skills you can add.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {SKILL_SUGGESTIONS.map(({ label, skills }) => {
                          const remaining = skills.filter(
                            (ps) => !profile.skills.some((s) => s.toLowerCase() === ps.toLowerCase())
                          );
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setSkillCategory(label)}
                              disabled={!remaining.length}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {label}
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                {remaining.length}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Resume / CV Section */}
                  <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-sm font-bold text-slate-900">Resume / CV Document</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Your primary resume file is stored securely in MongoDB and attached to job applications.
                    </p>

                    {profile.resume ? (
                      /* Active resume card */
                      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {profile.resume.fileName || 'Uploaded Resume'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(Number(profile.resume.fileSize || 0) / 1024 / 1024).toFixed(2)} MB • {profile.resume.mimeType || 'Document'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePreviewResume}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadResume}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700">
                            {resumeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Replace
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png"
                              disabled={resumeBusy}
                              onChange={handleResumeUpload}
                              className="sr-only"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={resumeBusy}
                            onClick={handleRemoveResume}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Resume upload dropzone */
                      <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-indigo-400">
                        <FileText className="mx-auto h-10 w-10 text-slate-400" />
                        <h4 className="mt-2 text-sm font-semibold text-slate-800">No resume attached</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Upload your resume in PDF, JPG, or PNG format (max 5 MB).
                        </p>
                        <div className="mt-4">
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700">
                            {resumeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            <span>{resumeBusy ? 'Uploading…' : 'Choose File to Upload'}</span>
                            <input
                              ref={resumeInputRef}
                              type="file"
                              accept="application/pdf,image/jpeg,image/png"
                              disabled={resumeBusy}
                              onChange={handleResumeUpload}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PRIVACY */}
              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Privacy & Visibility</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Control who can see your profile on PathPoint.
                    </p>

                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Profile Visibility
                        </label>
                        <select
                          value={privacySettings.profileVisibility}
                          onChange={(e) => {
                            setPrivacySettings({ ...privacySettings, profileVisibility: e.target.value });
                            setEditingSection('privacy');
                          }}
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                        >
                          <option value="private">Private (Only You)</option>
                          <option value="counselors_only">Counselors Only (PathPoint Staff)</option>
                          <option value="public">Public (Visible in Candidate Directory)</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <label className="inline-flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer pt-5">
                          <input
                            type="checkbox"
                            checked={Boolean(privacySettings.shareResumeToPublic)}
                            onChange={(e) => {
                              setPrivacySettings({ ...privacySettings, shareResumeToPublic: e.target.checked });
                              setEditingSection('privacy');
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Allow verified recruiters to download my resume
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </main>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        defaultEmail={user?.email || user?.username || ''}
      />

      {/* Skill category quick-add Modal */}
      <Modal
        isOpen={Boolean(skillCategory)}
        onClose={() => setSkillCategory(null)}
        title={skillCategory ? `${skillCategory} skills` : 'Skills'}
        maxWidth="max-w-lg"
      >
        {(() => {
          const category = SKILL_SUGGESTIONS.find((item) => item.label === skillCategory);
          if (!category) return null;
          const remaining = category.skills.filter(
            (ps) => !profile.skills.some((s) => s.toLowerCase() === ps.toLowerCase())
          );
          if (!remaining.length) {
            return <p className="text-sm text-slate-500">You&apos;ve added every skill in this area.</p>;
          }
          return (
            <>
              <p className="text-xs text-slate-500">
                Click a skill to add it to your profile. {remaining.length} available.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {remaining.map((ps) => (
                  <button
                    key={ps}
                    type="button"
                    onClick={() => handleAddSkill(ps)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-800"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                    {ps}
                  </button>
                ))}
              </div>
            </>
          );
        })()}
      </Modal>
    </div>
  );
};

export default ProfileWorkspace;