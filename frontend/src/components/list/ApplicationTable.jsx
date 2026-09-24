import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import {
  ExternalLink,
  Trash2,
  Calendar,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

export const ApplicationTable = ({
  applications = [],
  onDelete,
  onStatusChange,
}) => {
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">No applications match your filter</h3>
        <p className="text-xs text-slate-500 mt-1">Try resetting search or status filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Company & Role</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Salary</th>
              <th className="py-3.5 px-4">Date Applied</th>
              <th className="py-3.5 px-4">Interviews</th>
              <th className="py-3.5 px-4">Resume</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((app) => {
              const urgentInterviews = (app.interviewDates || [])
                .map((d) => new Date(d))
                .filter((d) => d >= now && d <= next7Days);

              const nextInterview = (app.interviewDates || [])
                .map((d) => new Date(d))
                .filter((d) => d >= now)
                .sort((a, b) => a - b)[0];

              return (
                <tr
                  key={app._id}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <Link
                        to={`/applications/${app._id}`}
                        className="font-semibold text-slate-900 hover:text-indigo-600 transition"
                      >
                        {app.role}
                      </Link>
                      <span className="text-xs text-slate-500 font-medium">
                        {app.company}
                        {app.contactPerson && ` • ${app.contactPerson}`}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <select
                      value={app.status}
                      onChange={(e) => onStatusChange(app._id, e.target.value)}
                      className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                    >
                      {['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'].map(
                        (st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        )
                      )}
                    </select>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                    {app.salaryRange ? (
                      <span className="font-medium text-slate-700">
                        {app.salaryRange}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                    {app.dateApplied ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(app.dateApplied).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                    {urgentInterviews.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
                        <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                        <span>
                          {urgentInterviews[0].toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                    ) : nextInterview ? (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {nextInterview.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">None scheduled</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                    {app.resumeVersion ? (
                      <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="max-w-[120px] truncate">{app.resumeVersion}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-right text-xs">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/applications/${app._id}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="View Full Details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>

                      {onDelete && (
                        <button
                          onClick={() => onDelete(app._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Application"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApplicationTable;
