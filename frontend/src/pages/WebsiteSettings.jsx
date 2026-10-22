import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiAdapter } from '../services/apiAdapter';
import { ACCENTS, DEFAULT_ACCENT, accentToHex, resolveAccent } from '../utils/theme';

const DEFAULT_PREFERENCES = {
  accent: DEFAULT_ACCENT,
  compactMode: false,
  notifications: true,
  showWelcomeBanner: true,
};

const TOGGLE_OPTIONS = [
  ['compactMode', 'Compact mode', 'Tightens spacing across cards, tables, and lists so more fits on screen'],
  ['notifications', 'Activity notifications', 'Shows the notification bell and new-activity alerts in the top bar'],
  ['showWelcomeBanner', 'Welcome banner', 'Shows the greeting and progress summary on your dashboard'],
];

const normalizePreferences = (source) => ({
  accent: resolveAccent(source?.accent ?? source?.accentColor),
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

  const pushToShell = useCallback((next) => {
    updateSettings({
      accent: next.accent,
      compactMode: next.compactMode,
      notifications: next.notifications,
      showWelcomeBanner: next.showWelcomeBanner,
    });
  }, [updateSettings]);

  const loadPreferences = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await apiAdapter.getProfileCustomization();
      const source = result?.customization || user?.customization;
      const normalized = normalizePreferences(source);
      setPreferences(normalized);
      setSavedPreferences(normalized);
      pushToShell(normalized);
      if (isSilent) toast('Preferences synchronized with the server.', 'success');
    } catch (err) {
      console.warn('[WebsiteSettings] Load error:', err);
      if (!isSilent) toast(err.message || 'Unable to load your website settings.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user, pushToShell]);

  useEffect(() => {
    loadPreferences(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // The API stores the accent as a name *and* a hex; send both so either
      // representation round-trips cleanly.
      const result = await apiAdapter.updateProfileCustomization({
        customization: { ...preferences, accentColor: accentToHex(preferences.accent) },
      });
      const updated = normalizePreferences(result?.customization || preferences);

      pushToShell(updated);

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

  const handleDiscard = () => {
    setPreferences(savedPreferences);
    pushToShell(savedPreferences);
  };

  const handleReset = () => {
    const reset = { ...DEFAULT_PREFERENCES, layoutBlocks: savedPreferences.layoutBlocks };
    setPreferences(reset);
    pushToShell(reset);
    toast('Preferences reset to their defaults. Save to keep them.', 'info');
  };

  const toggle = (key, value) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    pushToShell(next);
  };

  const accentScale = ACCENTS[preferences.accent] || ACCENTS[DEFAULT_ACCENT];

  return (
    <div className="ui-container space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="ui-page-title">Website settings</h1>
          <p className="mt-1.5 max-w-measure text-sm text-slate-500">
            Appearance and interface preferences for your PathPoint workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <span className="ui-badge ui-badge-warning">Unsaved changes</span>
          )}
          <button
            type="button"
            onClick={() => loadPreferences(true)}
            disabled={refreshing || saving}
            title="Reload preferences from the server"
            className="ui-btn ui-btn-secondary ui-btn-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing…' : 'Sync'}</span>
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty || saving}
            className="ui-btn ui-btn-secondary ui-btn-sm"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="ui-btn ui-btn-primary ui-btn-sm"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{saving ? 'Saving…' : 'Save changes'}</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ui-card flex items-center justify-center gap-2.5 py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <span>Loading your preferences…</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Accent color — drives primary actions, focus, and selection. */}
          <section className="ui-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Accent color</h2>
                <p className="mt-1 max-w-measure text-sm text-slate-500">
                  Sets the hue for primary actions, focus rings, text selection, and the text caret.
                </p>
              </div>
              <span className="ui-badge ui-badge-neutral">{accentScale.name}</span>
            </div>

            <div role="radiogroup" aria-label="Accent color" className="mt-5 flex flex-wrap items-center gap-3">
              {Object.entries(ACCENTS).map(([key, scale]) => {
                const isSelected = preferences.accent === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${scale.name} accent`}
                    onClick={() => toggle('accent', key)}
                    title={scale.name}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-xs transition-transform hover:scale-105 ${
                      isSelected ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: scale['600'] }}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })}
              <span className="ml-1 text-sm font-medium text-slate-600">
                {accentScale.name}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</span>
              <span className="ui-btn ui-btn-primary ui-btn-sm pointer-events-none">Primary action</span>
              <span className="ui-btn ui-btn-secondary ui-btn-sm pointer-events-none">Secondary</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentScale['600'] }} />
                {accentScale.name}
              </span>
            </div>
          </section>

          {/* Application settings */}
          <section className="ui-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Application settings</h2>
                <p className="mt-1 max-w-measure text-sm text-slate-500">
                  Control how the PathPoint interface behaves for your account.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="ui-btn ui-btn-ghost ui-btn-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>

            <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {TOGGLE_OPTIONS.map(([key, title, subtitle]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50/70"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{subtitle}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences[key])}
                    onChange={(e) => toggle(key, e.target.checked)}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </label>
              ))}
            </div>
          </section>

          <p className="text-center text-xs text-slate-500">
            Looking to update your username, name, résumé, or password? Visit{' '}
            <Link to="/profile" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
              My account settings
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
};

export default WebsiteSettings;
