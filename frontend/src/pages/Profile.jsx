import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import ForgotPasswordModal from '../components/common/ForgotPasswordModal';
import {
  User,
  Mail,
  Shield,
  Check,
  Key,
  Copy,
  LogOut,
  Lock,
  Palette,
  SlidersHorizontal,
  Bell,
} from 'lucide-react';

export const Profile = () => {
  const {
    user,
    token,
    logout,
    settings,
    updateSettings,
    changePassword,
  } = useAuth();
  const { toast } = useToast();

  const [copiedToken, setCopiedToken] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const savePreference = (key, value) => {
    updateSettings({ [key]: value });
    toast('Preferences saved to this browser.', 'success');
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast('JWT token copied to clipboard!', 'success');
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!passwordForm.currentPassword) {
      toast('Please enter your current password.', 'error');
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      toast('New password must be at least 6 characters.', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast('New passwords do not match.', 'error');
      return;
    }

    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      toast(result?.message || 'Password updated successfully!', 'success');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      toast(err.message || 'Unable to update password.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Profile Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-600 via-indigo-700 to-brand-500" />

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 mb-6 gap-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md border border-slate-200">
                <div className="w-full h-full rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-3xl font-extrabold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold capitalize">
                <Shield className="w-3.5 h-3.5" />
                <span>{user?.role} Profile</span>
              </span>

              <button
                onClick={logout}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <User className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Full Name</div>
                <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Mail className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Email Address</div>
                <div className="text-sm font-semibold text-slate-800">{user?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Shield className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Role Permissions</div>
                <div className="text-sm font-semibold text-slate-800 capitalize">
                  {user?.role === 'admin'
                    ? 'Administrator / Counselor (Access to aggregate metrics)'
                    : 'Standard Job Seeker (Personal application logging)'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Website Customization */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Website Preferences</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Theme
            </label>
            <select
              value={settings?.theme || 'light'}
              onChange={(e) => savePreference('theme', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Accent Color
            </label>
            <select
              value={settings?.accent || 'indigo'}
              onChange={(e) => savePreference('accent', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="indigo">Indigo</option>
              <option value="teal">Teal</option>
              <option value="rose">Rose</option>
              <option value="violet">Violet</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Compact layout</span>
            </div>
            <button
              type="button"
              onClick={() => savePreference('compactMode', !settings?.compactMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings?.compactMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings?.compactMode ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Enable alerts</span>
            </div>
            <button
              type="button"
              onClick={() => savePreference('notifications', !settings?.notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings?.notifications ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings?.notifications ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Change Password & Account Security */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Security & Password Management</h3>
        </div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-xs text-slate-500">
            Update your account password or use the reset-code workflow when needed.
          </p>
          <button
            type="button"
            onClick={() => setShowForgotPasswordModal(true)}
            className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 transition"
          >
            Reset with code
          </button>
        </div>

        {passwordSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Password updated successfully!</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              New Password
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
              }
              placeholder="Min 6 chars"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Confirm New
            </label>
            <input
              type="password"
              value={passwordForm.confirmNewPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })
              }
              placeholder="Re-type new"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        defaultEmail={user?.email || ''}
      />

      {/* Developer API & JWT Token Inspector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Developer API Token Inspector</h3>
          </div>
          <button
            onClick={handleCopyToken}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedToken ? 'Copied' : 'Copy Bearer Token'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          This JWT token is automatically injected in the <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">Authorization: Bearer &lt;token&gt;</code> header on every backend API request:
        </p>

        <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto break-all select-all">
          {token || 'No active JWT token generated'}
        </div>
      </div>

    </div>
  );
};

export default Profile;
