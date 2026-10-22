import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiAdapter } from '../services/apiAdapter';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import StatusBadge from '../components/common/StatusBadge';
import { safeDate, safeIsoString, formatDateTimeDisplay, formatDateDisplay } from '../utils/dateUtils';
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

  const loadApplication = useCallback(async () => {
    try {
      const app = await apiAdapter.getApplicationById(id);
      if (!app) {
        toast('Application not found', 'error');
        navigate('/dashboard');
        return;
      }
      setApplication(app);
    } catch (error) {
      toast(error.message || 'Unable to load application.', 'error');
      navigate('/dashboard');
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const handleStatusChange = async (newStatus) => {
    if (!application || application.status === newStatus) return;
    try {
      const updated = await apiAdapter.updateStatus(id, newStatus);
      setApplication(updated);
      toast(`Status updated to ${newStatus}`, 'success');
    } catch (error) { toast(error.message || 'Unable to update status.', 'error'); }
  };

  const handleAddInterviewDate = async () => {
    if (!newInterviewDate) return;
    const updatedDates = [...(application.interviewDates || []), newInterviewDate].sort();
    try {
      const updated = await apiAdapter.updateApplication(id, { interviewDates: updatedDates });
      setApplication(updated);
      setNewInterviewDate('');
      toast('Interview date scheduled', 'success');
    } catch (error) { toast(error.message || 'Unable to schedule interview.', 'error'); }
  };

  const handleRemoveInterviewDate = async (dateToRemove) => {
    const targetIso = safeIsoString(dateToRemove);
    const updatedDates = (application.interviewDates || []).filter(
      (d) => safeIsoString(d) !== targetIso
    );
    try {
      const updated = await apiAdapter.updateApplication(id, { interviewDates: updatedDates });
      setApplication(updated);
      toast('Interview date removed', 'success');
    } catch (error) { toast(error.message || 'Unable to remove interview date.', 'error'); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete application for ${application?.role} at ${application?.company}?`)) {
      return;
    }
    try {
      await apiAdapter.deleteApplication(id);
      toast('Application deleted', 'success');
      navigate('/dashboard');
    } catch (error) { toast(error.message || 'Unable to delete application.', 'error'); }
  };

  if (!application) return null;

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="ui-container py-6">
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
            className="ui-btn ui-btn-secondary ui-btn-sm"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>
          <button
            onClick={handleDelete}
            className="ui-btn ui-btn-danger ui-btn-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Primary Role & Status Header Card */}
      <div className="ui-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="ui-page-title leading-tight">
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
              className="ui-input w-auto text-xs font-semibold"
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
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview & Status History
          </button>

          <button
            onClick={() => setActiveTab('prep')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'prep'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-warning-600" />
            <span>Interview Prep & STAR Stories</span>
          </button>
        </div>
      </div>

      {activeTab === 'prep' ? (
        <div key="prep" className="animate-tab-panel">
          <InterviewPrepChecklist company={application.company} role={application.role} />
        </div>
      ) : (
        /* Overview Grid */
        <div key="overview" className="animate-tab-panel grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Details, History, Notes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="ui-card p-6">
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

            </div>

            {/* Status History Timeline */}
            <div className="ui-card p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-brand-600" />
                <span>Status Transition Audit Trail (`statusHistory`)</span>
              </h3>

              {application.statusHistory && application.statusHistory.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {application.statusHistory.map((item, index) => {
                    const dateStr = formatDateTimeDisplay(item.changedAt);

                    return (
                      <div key={index} className="relative flex items-center justify-between text-xs">
                        <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.status} size="xs" />
                          <span className="font-medium text-slate-700">
                            {index === 0 ? 'Application initialized' : `Transitioned to ${item.status}`}
                          </span>
                        </div>
                        <span className="text-slate-500 font-mono">{dateStr}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No status transitions recorded yet.</p>
              )}
            </div>
          </div>

          {/* Right 1 Column: Interview Dates & Resume Management */}
          <div className="space-y-6">
            {/* Scheduled Interviews Card */}
            <div className="ui-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-warning-600" />
                <span>Interview Schedule</span>
              </h3>

              {/* Add Date input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={newInterviewDate}
                  onChange={(e) => setNewInterviewDate(e.target.value)}
                  className="ui-input flex-1 text-xs"
                />
                <button
                  onClick={handleAddInterviewDate}
                  disabled={!newInterviewDate}
                  className="ui-btn ui-btn-primary ui-btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* List of dates */}
              {application.interviewDates && application.interviewDates.length > 0 ? (
                <div className="space-y-2">
                  {application.interviewDates
                    .map((d) => safeDate(d))
                    .filter(Boolean)
                    .sort((a, b) => a - b)
                    .map((dateObj, idx) => {
                      const isUpcomingWithin7Days = dateObj >= now && dateObj <= next7Days;
                      const isPast = dateObj < now;

                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                            isUpcomingWithin7Days
                              ? 'bg-warning-50 border-warning-200 text-warning-700'
                              : isPast
                              ? 'bg-slate-50 border-slate-200 text-slate-500 line-through'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-3.5 h-3.5 ${isUpcomingWithin7Days ? 'text-warning-600' : 'text-slate-400'}`} />
                            <span className="font-medium">
                              {dateObj.toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {isUpcomingWithin7Days && (
                              <span className="ui-badge ui-badge-warning">
                                <Sparkles className="w-2.5 h-2.5" /> &lt;7d
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleRemoveInterviewDate(dateObj)}
                            className="text-slate-500 hover:text-rose-600 p-1 rounded transition"
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
                  <p className="text-xs text-slate-500">No interviews scheduled yet.</p>
                </div>
              )}
            </div>

            {/* Resume & Documents Card */}
            <div className="ui-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-600" />
                <span>Resume & Documents</span>
              </h3>

              {application.resumeVersion ? (
                <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <div className="p-2 rounded-lg bg-brand-100 text-brand-700">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {application.resumeVersion}
                      </div>
                      <div className="text-xs text-slate-500">
                        Tailored version attached
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsResumeModalOpen(true)}
                    className="p-1.5 text-brand-600 hover:text-brand-800 hover:bg-brand-100 rounded-lg transition"
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
                className="ui-btn ui-btn-secondary w-full"
              >
                <Eye className="w-4 h-4 text-brand-600" />
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
