import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import MonthCalendar from '../components/calendar/MonthCalendar';
import {
  Calendar,
  Clock,
  Building,
  ExternalLink,
  Sparkles,
  CalendarCheck,
  CalendarDays,
  List,
} from 'lucide-react';

export const InterviewScheduler = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'

  useEffect(() => {
    if (user?.id) {
      const apps = storageService.getApplications(user.id);
      setApplications(apps);
    }
  }, [user?.id]);

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const allInterviews = useMemo(() => {
    const list = [];
    applications.forEach((app) => {
      (app.interviewDates || []).forEach((dateStr) => {
        const dateObj = new Date(dateStr);
        list.push({
          date: dateObj,
          appId: app._id,
          company: app.company,
          role: app.role,
          status: app.status,
          contactPerson: app.contactPerson,
          isUpcomingWithin7Days: dateObj >= now && dateObj <= next7Days,
          isPast: dateObj < now,
        });
      });
    });

    return list.sort((a, b) => a.date - b.date);
  }, [applications, now, next7Days]);

  const urgentInterviews = allInterviews.filter((i) => i.isUpcomingWithin7Days);
  const futureInterviews = allInterviews.filter((i) => i.date >= now && !i.isUpcomingWithin7Days);
  const pastInterviews = allInterviews.filter((i) => i.isPast);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-indigo-600" />
            <span>Interview Scheduler & Calendar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized schedule of technical screens, virtual loops, and managerial rounds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Calendar vs List View Toggle */}
          <div className="flex items-center bg-white border border-slate-300 p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                viewMode === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Month Calendar</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Timeline List</span>
            </button>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <span>Applications</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Urgent 7-Day Interview Alert Section */}
      {urgentInterviews.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-r-2xl p-5 border-y border-r border-slate-200">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-3">
            <Sparkles className="w-5 h-5 text-amber-600 animate-pulse" />
            <span>Upcoming in the Next 7 Days ({urgentInterviews.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentInterviews.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-start justify-between gap-3 hover:border-amber-400 transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {item.date.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <StatusBadge status={item.status} size="xs" />
                  </div>

                  <Link
                    to={`/applications/${item.appId}`}
                    className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition block"
                  >
                    {item.role}
                  </Link>
                  <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span>{item.company}</span>
                    {item.contactPerson && ` • ${item.contactPerson}`}
                  </div>
                </div>

                <Link
                  to={`/applications/${item.appId}`}
                  className="p-2 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition"
                  title="Prepare notes"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main View Mode */}
      {viewMode === 'calendar' ? (
        <MonthCalendar interviews={allInterviews} />
      ) : (
        <div className="space-y-6">
          {/* Later Upcoming Interviews */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Upcoming Scheduled Interviews</span>
            </h2>

            {futureInterviews.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {futureInterviews.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-left">
                        <div className="text-xs font-bold text-indigo-700">
                          {item.date.toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.date.getFullYear()}
                        </div>
                      </div>

                      <div>
                        <Link
                          to={`/applications/${item.appId}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 text-sm transition"
                        >
                          {item.role}
                        </Link>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <span>{item.company}</span>
                          {item.contactPerson && ` • ${item.contactPerson}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <StatusBadge status={item.status} size="xs" />
                      <Link
                        to={`/applications/${item.appId}`}
                        className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : urgentInterviews.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No upcoming interviews scheduled</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add interview dates in any application detail card to track them here!
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">All upcoming interviews are in the next 7 days above.</p>
            )}
          </div>

          {/* Past Interviews */}
          {pastInterviews.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm opacity-80">
              <h2 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-slate-400" />
                <span>Completed / Past Interviews ({pastInterviews.length})</span>
              </h2>

              <div className="divide-y divide-slate-100">
                {pastInterviews.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-2.5 flex items-center justify-between text-xs text-slate-500"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400">
                        {item.date.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <Link
                        to={`/applications/${item.appId}`}
                        className="font-medium text-slate-700 hover:text-indigo-600 truncate"
                      >
                        {item.role} @ {item.company}
                      </Link>
                    </div>
                    <StatusBadge status={item.status} size="xs" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewScheduler;
