import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ApplicationForm from '../components/forms/ApplicationForm';
import ResumeViewerModal from '../components/common/ResumeViewerModal';
import InterviewPrepChecklist from '../components/prep/InterviewPrepChecklist';
import {
  ArrowLeft,
  Building,
  DollarSign,
  Calendar,
  User,
  Clock,
  FileText,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  History,
  Eye,
  CheckCircle2,
} from 'lucide-react';

const STATUS_OPTIONS = ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'];

export const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [application, setApplication] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'prep'
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [newInterviewDate, setNewInterviewDate] = useState('');

  const loadApplication = useCallback(() => {
    const app = storageService.getApplicationById(id);
    if (!app) {
      toast('Application not found', 'error');
      navigate('/dashboard');
      return;
    }
    setApplication(app);
  }, [id, navigate, toast]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const handleStatusChange = (newStatus) => {
    if (!application || application.status === newStatus) return;
    const updated = storageService.updateStatus(id, newStatus);
    if (updated) {
      setApplication(updated);
      toast(`Status updated to ${newStatus}`, 'success');
    }
  };

  const handleAddInterviewDate = () => {
    if (!newInterviewDate) return;
    const updatedDates = [...(application.interviewDates || []), newInterviewDate].sort();
    const updated = storageService.updateApplication(id, { interviewDates: updatedDates });
    if (updated) {
      setApplication(updated);
      setNewInterviewDate('');
      toast('Interview date scheduled', 'success');
    }
  };

  const handleRemoveInterviewDate = (dateToRemove) => {
    const updatedDates = (application.interviewDates || []).filter(
      (d) => new Date(d).toISOString() !== new Date(dateToRemove).toISOString()
    );
    const updated = storageService.updateApplication(id, { interviewDates: updatedDates });
    if (updated) {
      setApplication(updated);
      toast('Interview date removed', 'success');
    }
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete application for ${application?.role} at ${application?.company}?`)) {
      return;
    }
    storageService.deleteApplication(id);
    toast('Application deleted', 'success');
    navigate('/dashboard');
  };

  if (!application) return null;

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back Navigation & Actions Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Primary Role & Status Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              {application.role}
            </h1>
            <div className="flex items-center gap-2 text-base text-slate-600 font-medium mt-1">
              <Building className="w-4 h-4 text-slate-400" />
              <span>{application.company}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={application.status} size="lg" />
            <select
              value={application.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  Move to {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Switcher: Overview vs Interview Prep */}
        <div className="flex gap-4 pt-4 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview & Status History
          </button>

          <button
            onClick={() => setActiveTab('prep')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'prep'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Interview Prep & STAR Stories</span>
          </button>
        </div>
      </div>

      {activeTab === 'prep' ? (
        <InterviewPrepChecklist company={application.company} role={application.role} />
      ) : (
        /* Overview Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Details, History, Notes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Application Specifications
              </h3>

              {/* Quick Metadata Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Salary Range</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {application.salaryRange || 'Not specified'}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Date Applied</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {application.dateApplied
                      ? new Date(application.dateApplied).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Contact / Recruiter</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {application.contactPerson || 'None specified'}
                  </div>
                </div>
              </div>

              {/* Job Description & Notes */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Job Description & Role Notes</span>
                </h3>
                {application.jobDescriptionNotes ? (
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {application.jobDescriptionNotes}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No notes recorded yet. Click "Edit Details" to add keywords or interview requirements.
                  </p>
                )}
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Status Transition Audit Trail (`statusHistory`)</span>
              </h3>

              {application.statusHistory && application.statusHistory.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {application.statusHistory.map((item, index) => {
                    const dateStr = new Date(item.changedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={index} className="relative flex items-center justify-between text-xs">
                        <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.status} size="xs" />
                          <span className="font-medium text-slate-700">
                            {index === 0 ? 'Application initialized' : `Transitioned to ${item.status}`}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono">{dateStr}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No status transitions recorded yet.</p>
              )}
            </div>
          </div>

          {/* Right 1 Column: Interview Dates & Resume Management */}
          <div className="space-y-6">
            {/* Scheduled Interviews Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Interview Schedule</span>
              </h3>

              {/* Add Date input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={newInterviewDate}
                  onChange={(e) => setNewInterviewDate(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAddInterviewDate}
                  disabled={!newInterviewDate}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* List of dates */}
              {application.interviewDates && application.interviewDates.length > 0 ? (
                <div className="space-y-2">
                  {application.interviewDates
                    .map((d) => new Date(d))
                    .sort((a, b) => a - b)
                    .map((dateObj, idx) => {
                      const isUpcomingWithin7Days = dateObj >= now && dateObj <= next7Days;
                      const isPast = dateObj < now;

                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                            isUpcomingWithin7Days
                              ? 'bg-amber-50 border-amber-200 text-amber-900'
                              : isPast
                              ? 'bg-slate-50 border-slate-200 text-slate-500 line-through'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-3.5 h-3.5 ${isUpcomingWithin7Days ? 'text-amber-600' : 'text-slate-400'}`} />
                            <span className="font-medium">
                              {dateObj.toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {isUpcomingWithin7Days && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded">
                                <Sparkles className="w-2.5 h-2.5" /> &lt;7d
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleRemoveInterviewDate(dateObj)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                            title="Remove date"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">No interviews scheduled yet.</p>
                </div>
              )}
            </div>

            {/* Resume & Documents Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Resume & Documents</span>
              </h3>

              {application.resumeVersion ? (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {application.resumeVersion}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Tailored version attached
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsResumeModalOpen(true)}
                    className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition"
                    title="Preview Document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  No resume version assigned.
                </div>
              )}

              {/* Action: Preview Resume Document */}
              <button
                onClick={() => setIsResumeModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Open Resume Previewer</span>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Application Details"
      >
        <ApplicationForm
          initialData={application}
          onSuccess={(updated) => {
            setApplication(updated);
            setIsEditModalOpen(false);
          }}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      {/* Resume Viewer Modal */}
      <ResumeViewerModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        application={application}
        user={user}
      />
    </div>
  );
};

export default ApplicationDetail;
