import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiAdapter } from '../services/apiAdapter';

const THEME_PRESETS = [
  { id: 'light', label: 'Light', desc: 'Crisp, high-clarity daylight theme', bg: 'bg-white', text: 'text-slate-900', border: 'border-slate-300' },
  { id: 'dark', label: 'Dark', desc: 'Deep obsidian for low-light focus', bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-700' },
  { id: 'dark_modern', label: 'Dark Modern', desc: 'Indigo-tinted sleek night mode', bg: 'bg-slate-950', text: 'text-indigo-200', border: 'border-indigo-800' },
  { id: 'minimal', label: 'Minimal', desc: 'Monochrome simplicity and focus', bg: 'bg-neutral-100', text: 'text-neutral-900', border: 'border-neutral-300' },
  { id: 'creative_tech', label: 'Creative Tech', desc: 'Electric accents & modern vibe', bg: 'bg-slate-900', text: 'text-cyan-300', border: 'border-cyan-700' },
];

const ACCENT_COLORS = [
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Rose', hex: '#E11D48' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Blue', hex: '#2563EB' },
];

const TOGGLE_OPTIONS = [
  ['compactMode', 'Compact Mode', 'Reduced spacing for denser data tables and cards'],
  ['notifications', 'Activity Notifications', 'Receive reminders for upcoming interviews and submissions'],
  ['showWelcomeBanner', 'Welcome Banner', 'Show greeting banner on the primary dashboard view'],
];

const normalizePreferences = (source) => ({
  themePreset: source?.themePreset || 'light',
  accentColor: source?.accentColor || '#4F46E5',
  compactMode: Boolean(source?.compactMode),
  notifications: source?.notifications !== false,
  showWelcomeBanner: source?.showWelcomeBanner !== false,
  layoutBlocks: Array.isArray(source?.layoutBlocks) && source.layoutBlocks.length > 0
    ? source.layoutBlocks
    : [
        { id: 'summary', order: 0, visible: true },
        { id: 'skills', order: 1, visible: true },
        { id: 'resumes', order: 2, visible: true },
      ],
});

const WebsiteSettings = () => {
  const { user, updateSettings } = useAuth();
  const { toast } = useToast();

  const [preferences, setPreferences] = useState(() => normalizePreferences(user?.customization));
  const [savedPreferences, setSavedPreferences] = useState(() => normalizePreferences(user?.customization));
  const [loading, setLoading] = useState(!user);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(preferences) !== JSON.stringify(savedPreferences),
    [preferences, savedPreferences]
  );

  const loadPreferences = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await apiAdapter.getProfileCustomization();
      const normalized = normalizePreferences(result?.customization || user?.customization);
      setPreferences(normalized);
      setSavedPreferences(normalized);
      if (isSilent) toast('Preferences synchronized with server.', 'success');
    } catch (err) {
      console.warn('[WebsiteSettings] Load error:', err);
      if (!isSilent) toast(err.message || 'Unable to load your website settings.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user]);

  useEffect(() => {
    loadPreferences(false);
  }, [loadPreferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await apiAdapter.updateProfileCustomization({ customization: preferences });
      const updated = normalizePreferences(result?.customization || preferences);

      updateSettings({
        theme: updated.themePreset.includes('dark') ? 'dark' : 'light',
        accent: updated.accentColor,
        compactMode: updated.compactMode,
        notifications: updated.notifications,
        showWelcomeBanner: updated.showWelcomeBanner,
      });

      setPreferences(updated);
      setSavedPreferences(updated);
      toast('Website settings saved.', 'success');
    } catch (err) {
      console.error('[WebsiteSettings] Save failed:', err);
      toast(err.message || 'Unable to save your settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => setPreferences(savedPreferences);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Preferences
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Website Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Appearance, accent, and interface preferences for your PathPoint workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={() => loadPreferences(true)}
            disabled={refreshing || saving}
            title="Reload preferences from the server"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing…' : 'Sync'}</span>
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty || saving}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white py-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span>Loading your preferences…</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Appearance Theme */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Appearance Theme</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Select your preferred PathPoint visual style.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {THEME_PRESETS.map((preset) => {
                const isSelected = preferences.themePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setPreferences({ ...preferences, themePreset: preset.id })}
                    className={`group relative rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{preset.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{preset.desc}</p>
                    <div className={`mt-3 h-5 w-full rounded-md border ${preset.bg} ${preset.border} shadow-2xs`} />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Accent Highlight Color */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Accent Highlight Color</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose an accent color for interactive buttons and highlights.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {ACCENT_COLORS.map((color) => {
                const isSelected = preferences.accentColor.toLowerCase() === color.hex.toLowerCase();
                return (
                  <button
                    key={color.name}
                    type="button"
                    aria-label={`Use ${color.name} accent`}
                    aria-pressed={isSelected}
                    onClick={() => setPreferences({ ...preferences, accentColor: color.hex })}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-xl shadow-xs transition-transform hover:scale-105 ${
                      isSelected ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })}

              {/* Custom Color Input */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                <input
                  type="color"
                  value={preferences.accentColor}
                  onChange={(e) => setPreferences({ ...preferences, accentColor: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded-xl border border-slate-300 p-1"
                  aria-label="Custom accent color"
                  title="Custom Accent"
                />
                <span className="font-mono text-xs text-slate-500">{preferences.accentColor}</span>
              </div>
            </div>
          </section>

          {/* Application Settings */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Application Settings</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Control how the PathPoint interface behaves for your account.
            </p>

            <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {TOGGLE_OPTIONS.map(([key, title, subtitle]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-4 p-4 hover:bg-slate-50/50"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{title}</p>
                    <p className="text-[11px] text-slate-500">{subtitle}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences[key])}
                    onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-500">
            Looking to update your username, name, resume, or password? Visit{' '}
            <Link to="/profile" className="font-semibold text-indigo-700 hover:text-indigo-900">
              My Account Settings
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
};

export default WebsiteSettings;
