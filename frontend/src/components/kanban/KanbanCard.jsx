import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Building,
  DollarSign,
  FileText,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const KanbanCard = ({ application, index }) => {
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingInterviews = (application.interviewDates || [])
    .map((d) => new Date(d))
    .filter((d) => d >= now && d <= next7Days);

  const hasUrgentInterview = upcomingInterviews.length > 0;

  const appliedFormatted = application.dateApplied
    ? new Date(application.dateApplied).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Draggable draggableId={application._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group relative bg-white p-3.5 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
            snapshot.isDragging
              ? 'border-indigo-500 ring-2 ring-indigo-300 shadow-lg scale-102 bg-indigo-50/20'
              : hasUrgentInterview
              ? 'border-amber-300 bg-amber-50/10 hover:border-amber-400'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          {/* Urgent Interview Banner */}
          {hasUrgentInterview && (
            <div className="mb-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
              <span>Interview within 7 days!</span>
            </div>
          )}

          {/* Role & Company */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
                to={`/applications/${application._id}`}
                className="font-semibold text-slate-900 text-sm hover:text-indigo-600 transition block truncate"
                title={application.role}
              >
                {application.role}
              </Link>
              <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="truncate">{application.company}</span>
              </div>
            </div>

            <Link
              to={`/applications/${application._id}`}
              className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition"
              title="View details"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Salary & Details */}
          <div className="mt-2.5 flex flex-wrap items-center gap-y-1 gap-x-2 text-[11px] text-slate-500">
            {application.salaryRange && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                <DollarSign className="w-3 h-3 text-slate-500" />
                <span>{application.salaryRange}</span>
              </span>
            )}

            {appliedFormatted && (
              <span className="inline-flex items-center gap-1 text-slate-500" title="Applied Date">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{appliedFormatted}</span>
              </span>
            )}

            {application.resumeVersion && (
              <span className="inline-flex items-center gap-1 text-indigo-600" title="Resume Attached">
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[80px]">Resume</span>
              </span>
            )}

            {application.interviewDates?.length > 0 && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${
                  hasUrgentInterview
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>{application.interviewDates.length} intv</span>
              </span>
            )}
          </div>

          {/* Contact Person preview if available */}
          {application.contactPerson && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 truncate">
              Contact: <span className="text-slate-700 font-medium">{application.contactPerson}</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;
