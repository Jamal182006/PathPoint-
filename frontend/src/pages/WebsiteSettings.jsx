import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { apiAdapter } from '../services/apiAdapter';
import { ACCENTS, DEFAULT_ACCENT, resolveAccent } from '../utils/theme';

const TOGGLE_OPTIONS = [
  ['compactMode', 'Compact mode', 'Reduced spacing for denser tables and lists'],
  ['notifications', 'Activity notifications', 'Remind me about upcoming interviews and submissions'],
  ['showWelcomeBanner', 'Welcome banner', 'Show the greeting banner on the dashboard'],
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

  const loadPreferences = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await apiAdapter.getProfileCustomization();
      const source = result?.customization || user?.customization;
      const normalized = normalizePreferences(source);
      setPreferences(normalized);
      setSavedPreferences(normalized);
      updateSettings({
        accent: normalized.accent,
        compactMode: normalized.compactMode,
        notifications: normalized.notifications,
        showWelcomeBanner: normalized.showWelcomeBanner,
      });
      if (isSilent) toast('Preferences synchronized with the server.', 'success');
    } catch (err) {
      console.warn('[WebsiteSettings] Load error:', err);
      if (!isSilent) toast(err.message || 'Unable to load your website settings.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user, updateSettings]);

  useEffect(() => {
    loadPreferences(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await apiAdapter.updateProfileCustomization({ customization: preferences });
      const updated = normalizePreferences(result?.customization || preferences);

      updateSettings({
        accent: updated.accent,
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
            <h2 className="text-base font-semibold text-slate-900">Accent color</h2>
            <p className="mt-1 max-w-measure text-sm text-slate-500">
              Sets the hue for primary actions, focus rings, text selection, and the text caret.
            </p>

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
                    onClick={() => setPreferences({ ...preferences, accent: key })}
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
                {ACCENTS[preferences.accent || DEFAULT_ACCENT].name}
              </span>
            </div>
          </section>

          {/* Application settings */}
          <section className="ui-card p-6">
            <h2 className="text-base font-semibold text-slate-900">Application settings</h2>
            <p className="mt-1 max-w-measure text-sm text-slate-500">
              Control how the PathPoint interface behaves for your account.
            </p>

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
                    onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })}
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
