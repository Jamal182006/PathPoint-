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
} from 'lucide-react';

export const AdminMetrics = () => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await apiAdapter.getAdminMetrics();
      setMetrics(data);
    };
    fetchMetrics();
  }, []);

  if (!metrics) return null;

  const {
    totalUsers = 0,
    totalApplications = 0,
    usersWithOfferCount = 0,
    avgApplicationsPerUser = 0,
    avgApplicationsBeforeOffer = 0,
    platformInterviewRate = 0,
    platformOfferRate = 0,
    statusCounts = {},
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
