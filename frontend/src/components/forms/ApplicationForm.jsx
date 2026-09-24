import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Plus, Trash2, Calendar, FileText, DollarSign, Building, Briefcase, User, Loader2 } from 'lucide-react';

const STATUS_OPTIONS = ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'];

export const ApplicationForm = ({ initialData, defaultCompany = '', defaultRole = '', onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    company: '',
    role: '',
    salaryRange: '',
    dateApplied: new Date().toISOString().split('T')[0],
    status: 'Saved',
    jobDescriptionNotes: '',
    contactPerson: '',
    resumeVersion: '',
    interviewDates: [],
  });

  const [newInterviewDate, setNewInterviewDate] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        company: initialData.company || '',
        role: initialData.role || '',
        salaryRange: initialData.salaryRange || '',
        dateApplied: initialData.dateApplied
          ? new Date(initialData.dateApplied).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        status: initialData.status || 'Saved',
        jobDescriptionNotes: initialData.jobDescriptionNotes || '',
        contactPerson: initialData.contactPerson || '',
        resumeVersion: initialData.resumeVersion || '',
        interviewDates: (initialData.interviewDates || []).map(
          (d) => new Date(d).toISOString().split('T')[0]
        ),
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        company: defaultCompany || prev.company,
        role: defaultRole || prev.role,
      }));
    }
  }, [initialData, defaultCompany, defaultRole]);

  const validate = () => {
    const errs = {};
    if (!formData.company.trim()) errs.company = 'Company name is required';
    if (!formData.role.trim()) errs.role = 'Job role is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleAddInterviewDate = () => {
    if (!newInterviewDate) return;
    if (!formData.interviewDates.includes(newInterviewDate)) {
      setFormData((prev) => ({
        ...prev,
        interviewDates: [...prev.interviewDates, newInterviewDate].sort(),
      }));
      setNewInterviewDate('');
    }
  };

  const handleRemoveInterviewDate = (dateToRemove) => {
    setFormData((prev) => ({
      ...prev,
      interviewDates: prev.interviewDates.filter((d) => d !== dateToRemove),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      let savedApp;
      if (initialData?._id) {
        savedApp = storageService.updateApplication(initialData._id, formData);
        toast('Application updated successfully', 'success');
      } else {
        savedApp = storageService.createApplication(user?.id || 'user-alex', formData);
        toast('Application created successfully', 'success');
      }

      if (onSuccess) onSuccess(savedApp);
    } catch (err) {
      toast('Failed to save application', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-slate-800">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Company */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Company Name *
          </label>
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="e.g. Stripe, Google, Acme Corp"
              className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                errors.company ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
              }`}
            />
          </div>
          {errors.company && (
            <p className="mt-1 text-xs text-rose-600 font-medium">{errors.company}</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Job Role *
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder="e.g. Frontend Engineer, Product Designer"
              className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                errors.role ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
              }`}
            />
          </div>
          {errors.role && (
            <p className="mt-1 text-xs text-rose-600 font-medium">{errors.role}</p>
          )}
        </div>

        {/* Salary Range */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Salary Range / Compensation
          </label>
          <div className="relative">
            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              name="salaryRange"
              value={formData.salaryRange}
              onChange={handleChange}
              placeholder="e.g. $120k - $140k or $60/hr"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Current Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Date Applied */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Date Applied / Saved
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="date"
              name="dateApplied"
              value={formData.dateApplied}
              onChange={handleChange}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Contact Person */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Recruiter / Contact Person
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="e.g. Sarah Jenkins (Recruiter)"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Resume Version */}
      <div className="pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Resume Version Tag
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              name="resumeVersion"
              value={formData.resumeVersion}
              onChange={handleChange}
              placeholder="e.g. Resume_Frontend_v2.pdf"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Scheduled Interviews */}
      <div className="pt-1">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Scheduled Interview Dates
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="date"
            value={newInterviewDate}
            onChange={(e) => setNewInterviewDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleAddInterviewDate}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Date</span>
          </button>
        </div>

        {formData.interviewDates.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {formData.interviewDates.map((date) => (
              <span
                key={date}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
              >
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveInterviewDate(date)}
                  className="hover:text-rose-600 text-amber-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes / Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Job Description, Requirements & Notes
        </label>
        <textarea
          name="jobDescriptionNotes"
          value={formData.jobDescriptionNotes}
          onChange={handleChange}
          rows={3}
          placeholder="Paste requirements, interview loops, prep notes..."
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{initialData?._id ? 'Update Application' : 'Create Application'}</span>
        </button>
      </div>
    </form>
  );
};

export default ApplicationForm;
