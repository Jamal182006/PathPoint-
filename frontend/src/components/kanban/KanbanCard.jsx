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
          className={`group relative bg-white p-3.5 rounded-xl border transition duration-200 ease-out shadow-sm ${
            snapshot.isDragging
              ? 'border-brand-500 ring-2 ring-brand-300 shadow-elevated scale-[1.02] bg-brand-50/20'
              : hasUrgentInterview
              ? 'border-warning-200 bg-warning-50/10 hover:border-warning-600/40'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          {/* Urgent Interview Banner */}
          {hasUrgentInterview && (
            <div className="mb-2 flex items-center gap-1.5 rounded-full bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-700">
              <Sparkles className="w-3 h-3 text-warning-600 animate-pulse" />
              <span>Interview within 7 days!</span>
            </div>
          )}

          {/* Role & Company */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
                to={`/applications/${application._id}`}
                className="font-semibold text-slate-900 text-sm hover:text-brand-600 transition block truncate"
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
              className="text-slate-500 hover:text-brand-600 p-1 rounded-lg hover:bg-slate-100 transition"
              title="View details"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Salary & Details */}
          <div className="mt-2.5 flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-slate-500">
            {application.salaryRange && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
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
              <span className="inline-flex items-center gap-1 text-brand-600" title="Resume Attached">
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[80px]">Resume</span>
              </span>
            )}

            {application.interviewDates?.length > 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium ${
                  hasUrgentInterview
                    ? 'bg-warning-100 text-warning-700'
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
            <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 truncate">
              Contact: <span className="text-slate-700 font-medium">{application.contactPerson}</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;
