import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import {
  ShieldAlert,
  Users,
  Briefcase,
  Award,
  TrendingUp,
  Lock,
  Building2,
  UserCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const AdminMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchMetrics = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiAdapter.getAdminMetrics();
        if (active) setMetrics(data);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load platform metrics.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchMetrics();
    return () => { active = false; };
  }, [reload]);

  if (loading) return <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading platform overview…</div>;
  if (error) return <div className="mx-auto max-w-3xl py-16 text-center"><p role="alert" className="text-sm text-rose-700">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><RefreshCw className="h-4 w-4" /> Try again</button></div>;
  if (!metrics) return null;

  const {
    totalUsers = 0,
    totalApplications = 0,
    totalProviders = 0,
    pendingVerifications = 0,
    totalCompanies = 0,
    totalCompanyApplications = 0,
    totalJobListings = 0,
    activeJobListings = 0,
    pendingJobReviews = 0,
    totalJobApplications = 0,
    totalWorkLogs = 0,
    totalWorkLogEarnings = 0,
    usersWithOfferCount = 0,
    avgApplicationsPerUser = 0,
    avgApplicationsBeforeOffer = 0,
    platformInterviewRate = 0,
    platformOfferRate = 0,
    statusCounts = {},
    recentActivity = [],
  } = metrics;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShieldAlert className="w-7 h-7 text-indigo-600" />
          <span>Career Counselor & Admin Suite</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Anonymized, platform-wide cohort metrics to evaluate job seeker outcomes and guidance impact.
        </p>
      </div>

      {/* Aggregate KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Job Seekers
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalUsers}
            </div>
            <div className="text-xs text-slate-500 mt-1">Registered students & seekers</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Applications
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalApplications}
            </div>
            <div className="text-xs text-slate-500 mt-1">Logged across all cohorts</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Apps per Seeker
            </div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">
              {avgApplicationsPerUser}
            </div>
            <div className="text-xs text-slate-500 mt-1">Average portfolio size</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Apps Before Offer
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {avgApplicationsBeforeOffer || 'N/A'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {usersWithOfferCount} seekers with confirmed offers
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      <section aria-label="Company marketplace metrics" className="grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Providers</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{totalProviders}</p></div>
        <Link to="/admin/providers" className="group rounded-xl p-2 -m-2 transition hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-amber-800">Pending verifications</p><p className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-amber-700"><UserCheck className="h-5 w-5" />{pendingVerifications}</p><span className="text-xs font-medium text-amber-800 underline decoration-transparent group-hover:decoration-current">Review queue</span></Link>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Companies</p><p className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-slate-900"><Building2 className="h-5 w-5 text-indigo-700" />{totalCompanies}</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company applications</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{totalCompanyApplications}</p></div>
      </section>
      <section aria-label="Job and local work metrics" className="grid gap-4 border-b border-slate-200 pb-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active listings</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{activeJobListings}</p><p className="text-xs text-slate-500">{totalJobListings} total listings</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending job review</p><p className="mt-1 text-2xl font-extrabold text-amber-700">{pendingJobReviews}</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job applications</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{totalJobApplications}</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Local work logs / paid earnings</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{totalWorkLogs} / {totalWorkLogEarnings.toLocaleString()}</p></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="recent-activity-title">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 id="recent-activity-title" className="text-sm font-bold text-slate-900">Recent activity</h2>
          <span className="text-xs text-slate-500">Latest database updates</span>
        </div>
        {recentActivity.length ? <ul className="divide-y divide-slate-100">{recentActivity.map((item, index) => <li key={`${item.href}-${item.occurredAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><Link to={item.href} className="font-medium text-slate-700 hover:text-indigo-700 hover:underline">{item.label}</Link><time className="text-xs text-slate-500" dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString()}</time></li>)}</ul> : <p className="py-6 text-sm text-slate-500">There is no recent activity yet.</p>}
      </section>

      {/* Conversion Rates & Pipeline Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Platform Conversion Benchmarks
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Interview Rate (Platform Average)</span>
                <span className="text-amber-700">{platformInterviewRate}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, platformInterviewRate)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Offer Rate (Platform Average)</span>
                <span className="text-emerald-700">{platformOfferRate}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, platformOfferRate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Status Breakdown Across All Users
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-bold text-slate-800">{count}</div>
                <div className="text-xs text-slate-500 font-medium">{status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMetrics;
