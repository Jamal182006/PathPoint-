import React, { useState, useEffect } from 'react';
import { LoadingState } from '../components/common/Loading';
import { Link } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { SystemHealthCard } from '../components/admin/SystemHealthCard';
import {
  ShieldAlert,
  Users,
  Briefcase,
  Award,
  TrendingUp,
  Building2,
  UserCheck,
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

  const renderMetrics = () => {
    if (loading) return <div className="ui-card"><LoadingState label="Loading platform overview…" /></div>;
    if (error) return <div className="mx-auto max-w-3xl py-12 text-center"><p role="alert" className="ui-alert ui-alert-danger text-left">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="ui-btn ui-btn-primary mt-4"><RefreshCw className="h-4 w-4" /> Try again</button></div>;
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
      <>
        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="ui-card flex items-start justify-between p-5">
            <div>
              <div className="ui-eyebrow">
                Total Job Seekers
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {totalUsers}
              </div>
              <div className="mt-1 text-xs text-slate-500">Registered students & seekers</div>
            </div>
            <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="ui-card flex items-start justify-between p-5">
            <div>
              <div className="ui-eyebrow">
                Total Applications
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {totalApplications}
              </div>
              <div className="mt-1 text-xs text-slate-500">Logged across all cohorts</div>
            </div>
            <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>

          <div className="ui-card flex items-start justify-between p-5">
            <div>
              <div className="ui-eyebrow">
                Avg Apps per Seeker
              </div>
              <div className="mt-1 text-2xl font-semibold text-brand-600">
                {avgApplicationsPerUser}
              </div>
              <div className="mt-1 text-xs text-slate-500">Average portfolio size</div>
            </div>
            <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="ui-card flex items-start justify-between p-5">
            <div>
              <div className="ui-eyebrow">
                Avg Apps Before Offer
              </div>
              <div className="mt-1 text-2xl font-semibold text-success-600">
                {avgApplicationsBeforeOffer || 'N/A'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {usersWithOfferCount} seekers with confirmed offers
              </div>
            </div>
            <div className="rounded-xl bg-success-50 p-3 text-success-600">
              <Award className="h-5 w-5" />
            </div>
          </div>
        </div>

        <section aria-label="Company marketplace metrics" className="grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/providers" className="group -m-2 rounded-xl p-2 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"><p className="ui-eyebrow group-hover:text-brand-700">Providers</p><p className="mt-1 text-2xl font-semibold text-slate-900">{totalProviders}</p><span className="text-xs font-medium text-brand-700 underline decoration-transparent group-hover:decoration-current">Manage providers</span></Link>
          <Link to="/admin/providers" className="group -m-2 rounded-xl p-2 transition hover:bg-warning-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning-600"><p className="ui-eyebrow group-hover:text-warning-700">Pending verifications</p><p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-warning-700"><UserCheck className="h-5 w-5" />{pendingVerifications}</p><span className="text-xs font-medium text-warning-700 underline decoration-transparent group-hover:decoration-current">Review queue</span></Link>
          <Link to="/admin/companies" className="group -m-2 rounded-xl p-2 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
            <p className="ui-eyebrow group-hover:text-brand-700">Companies</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900"><Building2 className="h-5 w-5 text-brand-700" />{totalCompanies}</p>
            <span className="text-xs font-medium text-brand-700 underline decoration-transparent group-hover:decoration-current">Review companies</span>
          </Link>
          <div><p className="ui-eyebrow">Company applications</p><p className="mt-1 text-2xl font-semibold text-slate-900">{totalCompanyApplications}</p></div>
        </section>
        <section aria-label="Job and local work metrics" className="grid gap-4 border-b border-slate-200 pb-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="ui-eyebrow">Active listings</p><p className="mt-1 text-2xl font-semibold text-slate-900">{activeJobListings}</p><p className="text-xs text-slate-500">{totalJobListings} total listings</p></div>
          <div><p className="ui-eyebrow">Pending job review</p><p className="mt-1 text-2xl font-semibold text-warning-700">{pendingJobReviews}</p></div>
          <div><p className="ui-eyebrow">Job applications</p><p className="mt-1 text-2xl font-semibold text-slate-900">{totalJobApplications}</p></div>
          <div><p className="ui-eyebrow">Local work logs / paid earnings</p><p className="mt-1 text-2xl font-semibold text-slate-900">{totalWorkLogs} / {totalWorkLogEarnings.toLocaleString()}</p></div>
        </section>

        <section className="ui-card p-5" aria-labelledby="recent-activity-title">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 id="recent-activity-title" className="text-sm font-semibold text-slate-900">Recent activity</h2>
            <span className="text-xs text-slate-500">Latest database updates</span>
          </div>
          {recentActivity.length ? <ul className="divide-y divide-slate-100">{recentActivity.map((item, index) => <li key={`${item.href}-${item.occurredAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><Link to={item.href} className="font-medium text-slate-700 hover:text-brand-700 hover:underline">{item.label}</Link><time className="text-xs text-slate-500" dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString()}</time></li>)}</ul> : <p className="py-6 text-sm text-slate-500">There is no recent activity yet.</p>}
        </section>

        {/* Conversion Rates & Pipeline Distribution */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="ui-card space-y-4 p-6">
            <h3 className="text-sm font-semibold text-slate-900">
              Platform Conversion Benchmarks
            </h3>

            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">Interview Rate (Platform Average)</span>
                  <span className="text-warning-700">{platformInterviewRate}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-warning-600"
                    style={{ width: `${Math.min(100, platformInterviewRate)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">Offer Rate (Platform Average)</span>
                  <span className="text-success-700">{platformOfferRate}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-success-600"
                    style={{ width: `${Math.min(100, platformOfferRate)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="ui-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Status Breakdown Across All Users
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-lg font-semibold text-slate-800">{count}</div>
                  <div className="text-xs font-medium text-slate-500">{status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="ui-page-title flex items-center gap-2.5">
          <ShieldAlert className="h-7 w-7 text-brand-600" />
          <span>Admin</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Anonymized, platform-wide cohort metrics to evaluate job seeker outcomes and guidance impact.
        </p>
      </div>

      {renderMetrics()}

      <SystemHealthCard />
    </div>
  );
};

export default AdminMetrics;
