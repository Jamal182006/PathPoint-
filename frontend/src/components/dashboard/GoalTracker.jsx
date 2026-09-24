import React, { useState } from 'react';
import { Target, CheckCircle2, Award, Sparkles, TrendingUp, Info } from 'lucide-react';

export const GoalTracker = ({ applications = [] }) => {
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [showResearchInfo, setShowResearchInfo] = useState(false);

  // Count applications applied this week (last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const appliedThisWeek = applications.filter((a) => {
    const appliedDate = a.dateApplied ? new Date(a.dateApplied) : null;
    return appliedDate && appliedDate >= sevenDaysAgo;
  }).length;

  const progressPercent = Math.min(100, Math.round((appliedThisWeek / weeklyGoal) * 100));

  // Accuracy metric: percentage of applications with valid statusHistory
  const appsWithHistory = applications.filter(
    (a) => a.statusHistory && a.statusHistory.length > 0
  ).length;
  const accuracyScore =
    applications.length > 0
      ? Math.round((appsWithHistory / applications.length) * 100)
      : 100;

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-2xl p-5 shadow-sm mb-6 border border-indigo-700/50">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Weekly Target Progress */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30">
                <Target className="w-4 h-4 text-indigo-300" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Weekly Target: {appliedThisWeek} of {weeklyGoal} Applications
              </span>
            </div>

            <span className="text-xs font-bold text-indigo-300">
              {progressPercent}% Complete
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-indigo-950/60 rounded-full overflow-hidden border border-indigo-700/40">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-indigo-300/80 pt-0.5">
            <span>
              {appliedThisWeek >= weeklyGoal
                ? '🎉 Weekly goal achieved! Excellent momentum.'
                : `${weeklyGoal - appliedThisWeek} more application(s) to reach this week's target`}
            </span>
            <button
              onClick={() => {
                const val = prompt('Set your weekly application goal:', weeklyGoal);
                if (val && !isNaN(val) && Number(val) > 0) {
                  setWeeklyGoal(Number(val));
                }
              }}
              className="hover:text-white underline text-[10px]"
            >
              Adjust Goal
            </button>
          </div>
        </div>

        {/* Right: SDG & Research Telemetry Badge */}
        <div className="flex items-center gap-4 lg:pl-6 lg:border-l lg:border-indigo-700/60">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Status Accuracy: {accuracyScore}%</span>
            </div>
            <div className="text-[11px] text-indigo-200 mt-0.5">
              SDG 8 & 4 Research Telemetry Active
            </div>
          </div>

          <button
            onClick={() => setShowResearchInfo(!showResearchInfo)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition"
            title="Learn about measured research variables"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Research Note */}
      {showResearchInfo && (
        <div className="mt-4 pt-4 border-t border-indigo-700/60 text-xs text-indigo-200 leading-relaxed space-y-1 animate-fadeIn">
          <p className="font-bold text-white">Research Context & SDGs:</p>
          <p>
            PathPoint measures how centralized logging impacts <strong>tracking velocity</strong> and <strong>status accuracy</strong> among job seekers (SDG 8: Decent Work, SDG 4: Quality Education). Every status change logs an immutable entry to <code className="bg-white/10 px-1 py-0.5 rounded text-white">statusHistory</code> to evaluate response times objectively.
          </p>
        </div>
      )}
    </div>
  );
};

export default GoalTracker;
