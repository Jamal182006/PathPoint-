import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Server } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { systemApi } from '../../api/systemApi';

const Metric = ({ label, value, tone = 'default' }) => (
  <div className="flex items-baseline gap-1.5">
    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
    <dd className={`text-xs font-semibold tabular-nums ${tone === 'positive' ? 'text-emerald-700' : 'text-slate-800'}`}>
      {value}
    </dd>
  </div>
);

/**
 * Compact, live system-health summary for the admin overview.
 * The full audit trail and backend configuration live on the System log page.
 */
export const SystemHealthCard = () => {
  const { apiUrl, backendOnline, recheckBackend } = useAuth();
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const runCheck = useCallback(async () => {
    setChecking(true);
    const result = await systemApi.checkHealth();
    setHealth(result);
    setLastChecked(new Date());
    await recheckBackend();
    setChecking(false);
  }, [recheckBackend]);

  useEffect(() => {
    let active = true;
    (async () => {
      setChecking(true);
      const result = await systemApi.checkHealth();
      if (!active) return;
      setHealth(result);
      setLastChecked(new Date());
      await recheckBackend();
      if (active) setChecking(false);
    })();
    return () => { active = false; };
  }, [recheckBackend]);

  const online = health ? health.online : backendOnline;
  const db = health?.data || null;
  const apiHost = (apiUrl || '').replace(/\/api\/?$/, '');

  return (
    <section aria-labelledby="system-health-title" className="ui-panel px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Server className="h-4 w-4" />
          </span>
          <div>
            <h2 id="system-health-title" className="text-sm font-bold text-slate-900">System health</h2>
            <p className="text-[11px] text-slate-500">Backend connectivity, latency, and database status.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              online ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden="true" />
            {online ? 'Operational' : 'Unavailable'}
          </span>
          <button type="button" onClick={runCheck} disabled={checking} className="ui-btn ui-btn-secondary ui-btn-sm">
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Run diagnostics'}
          </button>
        </div>
      </div>

      <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-slate-100 pt-3">
        <Metric label="Latency" value={online && health?.latency != null ? `${health.latency} ms` : '—'} />
        <Metric
          label="Database"
          value={db?.database ? (db.database === 'connected' ? 'Connected' : db.database) : '—'}
          tone={db?.database === 'connected' ? 'positive' : 'default'}
        />
        <Metric label="Engine" value={db ? (db.isMemoryFallback ? 'In-memory' : 'MongoDB Atlas') : '—'} />
        <Metric label="API host" value={apiHost || '—'} />
        <div className="flex items-baseline gap-1.5">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Checked</dt>
          <dd className="text-xs font-medium text-slate-600">{lastChecked ? lastChecked.toLocaleTimeString() : '—'}</dd>
        </div>
      </dl>

      {!online && health?.error && <p className="mt-2 text-[11px] text-rose-700">{health.error}</p>}
      {db?.databaseName && (online || !health?.error) && (
        <p className="mt-2 text-[11px] text-slate-500">
          Target database: <span className="font-medium text-slate-700">{db.databaseName}</span>
        </p>
      )}
    </section>
  );
};

export default SystemHealthCard;
