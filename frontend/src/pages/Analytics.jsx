import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import OfferComparison from '../components/analytics/OfferComparison';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Briefcase,
  Award,
  Sparkles,
} from 'lucide-react';

const STATUS_COLORS = {
  Saved: '#94a3b8',        // slate-400
  Applied: '#3b82f6',      // blue-500
  Interviewing: '#f59e0b', // amber-500
  Offered: '#10b981',      // emerald-500
  Rejected: '#f43f5e',     // rose-500
};

export const Analytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (user?.id) {
      const summary = storageService.getAnalyticsSummary(user.id);
      setData(summary);
      const apps = storageService.getApplications(user.id);
      setApplications(apps);
    }
  }, [user?.id]);

  if (!data) return null;

  const {
    totalApplications = 0,
    submittedCount = 0,
    interviewedCount = 0,
    offeredCount = 0,
    interviewRate = 0,
    offerRate = 0,
    avgDaysToFirstStatusChange = 0,
    statusData = [],
    funnelData = [],
  } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <span>Job Search Analytics & Progress</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Objective telemetry on application volume, conversion velocity, and interview success rates.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Applications
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalApplications}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {submittedCount} submitted ({totalApplications - submittedCount} wishlist)
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Interview Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Interview Rate
            </div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              {interviewRate}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {interviewedCount} applications reached interview
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Offer Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Offer Conversion Rate
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {offerRate}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {offeredCount} job offer{offeredCount === 1 ? '' : 's'} secured
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Avg Time to First Response */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Response Velocity
            </div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">
              {avgDaysToFirstStatusChange}{' '}
              <span className="text-sm font-semibold text-slate-500">days</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              From Applied to first status transition
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Application Status Breakdown
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Proportion of applications in each active pipeline stage
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={STATUS_COLORS[entry.name] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} applications`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-700">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Stage Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Application Pipeline Funnel
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Volume progression from initial target to secured offers
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => [`${value} applications`, 'Volume']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry) => (
                    <Cell
                      key={`cell-funnel-${entry.stage}`}
                      fill={STATUS_COLORS[entry.stage] || '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Offer Comparison & Salary Calculator */}
      <OfferComparison applications={applications} />

      {/* Research & Progress Insights Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-6 shadow-md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <Sparkles className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-base font-bold">Research & Metric Insights</h3>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 leading-relaxed">
              PathPoint automatically records every status transition in <code className="bg-white/10 px-1 py-0.5 rounded text-white font-mono">statusHistory</code>. 
              This structured log helps you identify your average hiring velocity ({avgDaysToFirstStatusChange} days to first response) and maintain an organized search without missing interview deadlines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
