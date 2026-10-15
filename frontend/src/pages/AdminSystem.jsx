import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminApi';
import { Activity, RefreshCw, ScrollText } from 'lucide-react';

export const AdminSystem = () => {
  const [activity, setActivity] = useState([]);
  const [logLoading, setLogLoading] = useState(true);

  const loadActivity = () => {
    setLogLoading(true);
    adminApi
      .getActivityLog({ limit: 30 })
      .then((result) => setActivity(result.data?.data || []))
      .catch(() => {})
      .finally(() => setLogLoading(false));
  };

  useEffect(() => {
    loadActivity();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
          <ScrollText className="h-7 w-7 text-indigo-600" />
          <span>System log</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Audit trail of recent activity across provider, company, job, and application workflows.
        </p>
      </header>

      <section aria-labelledby="activity-log-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="activity-log-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Activity className="h-4 w-4 text-indigo-600" />
              Recent activity
            </h2>
            <p className="mt-1 text-xs text-slate-500">Newest first. Each entry records the actor and the action performed.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">{activity.length} events</span>
            <button type="button" onClick={loadActivity} className="ui-btn ui-btn-secondary ui-btn-sm">
              <RefreshCw className={`h-3.5 w-3.5 ${logLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>
        {logLoading && !activity.length ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Loading activity…</p>
        ) : activity.length ? (
          <ol className="divide-y divide-slate-100">
            {activity.map((item) => (
              <li key={item._id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs">
                <span className="text-slate-800">
                  <strong className="font-semibold">{item.actorId?.name || 'System'}</strong> {item.action}
                </span>
                <time className="text-slate-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No recorded activity yet.</p>
        )}
      </section>
    </div>
  );
};

export default AdminSystem;
