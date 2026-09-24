import React, { useState } from 'react';
import Modal from './Modal';
import { exportService } from '../../services/exportService';
import { useToast } from './Toast';
import {
  FileSpreadsheet,
  FileCode,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const ExportImportModal = ({
  isOpen,
  onClose,
  applications = [],
  user,
  onDataImported,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('export');
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  const [replaceMode, setReplaceMode] = useState(false);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    try {
      exportService.exportToCSV(applications);
      toast('CSV file downloaded successfully!', 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleExportJSON = () => {
    try {
      exportService.exportToJSON(applications, user);
      toast('JSON backup downloaded successfully!', 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImportJsonText(event.target?.result || '');
      setImportError('');
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (!importJsonText.trim()) {
      setImportError('Please provide JSON text or select a JSON file.');
      return;
    }

    try {
      const validApps = exportService.parseImportJSON(importJsonText);
      const storageKey = 'pathpoint_applications';
      let current = [];
      try {
        current = JSON.parse(localStorage.getItem(storageKey)) || [];
      } catch {
        current = [];
      }

      let updated = [];
      if (replaceMode) {
        updated = validApps;
      } else {
        // Append unique
        const existingIds = new Set(current.map((a) => a._id));
        const newApps = validApps.map((a) => ({
          ...a,
          _id: existingIds.has(a._id) ? `app-${Date.now()}-${Math.random()}` : a._id,
        }));
        updated = [...current, ...newApps];
      }

      localStorage.setItem(storageKey, JSON.stringify(updated));
      toast(`Successfully imported ${validApps.length} applications!`, 'success');
      if (onDataImported) onDataImported();
      onClose();
    } catch (err) {
      setImportError(err.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Data Export & Backup Center" maxWidth="max-w-xl">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition ${
            activeTab === 'export'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Export Data</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition ${
            activeTab === 'import'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Import Data</span>
        </button>
      </div>

      {activeTab === 'export' ? (
        <div className="space-y-4 text-slate-700">
          <p className="text-xs text-slate-500">
            Export all <strong>{applications.length}</strong> tracked job applications to use in spreadsheets or save as an archival backup.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* CSV Export Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-1">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>CSV Spreadsheet</span>
                </div>
                <p className="text-xs text-slate-500">
                  Formatted for Microsoft Excel, Google Sheets, or Apple Numbers.
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to .CSV</span>
              </button>
            </div>

            {/* JSON Export Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-1">
                  <FileCode className="w-5 h-5" />
                  <span>JSON Raw Backup</span>
                </div>
                <p className="text-xs text-slate-500">
                  Complete dataset preserving all statusHistory timestamps and audit logs.
                </p>
              </div>
              <button
                onClick={handleExportJSON}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to .JSON</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-slate-700">
          <p className="text-xs text-slate-500">
            Restore a previous JSON backup or import a list of job applications:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Backup File (.json)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Or Paste JSON Content
            </label>
            <textarea
              rows={4}
              value={importJsonText}
              onChange={(e) => {
                setImportJsonText(e.target.value);
                setImportError('');
              }}
              placeholder='[ { "company": "Acme", "role": "Engineer", "status": "Applied" } ]'
              className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Replace option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="replaceMode"
              checked={replaceMode}
              onChange={(e) => setReplaceMode(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="replaceMode" className="text-xs text-slate-700 font-medium">
              Replace existing applications (unchecked: append without overwriting)
            </label>
          </div>

          {importError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSubmit}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
            >
              Complete Import
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ExportImportModal;
