import React, { useState } from 'react';
import Modal from './Modal';
import { exportService } from '../../services/exportService';
import { useToast } from './Toast';
import { apiAdapter } from '../../services/apiAdapter';
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
  const [importing, setImporting] = useState(false);

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

  const handleImportSubmit = async () => {
    if (!importJsonText.trim()) {
      setImportError('Please provide JSON text or select a JSON file.');
      return;
    }

    setImporting(true);
    try {
      const validApps = exportService.parseImportJSON(importJsonText);
      const result = await apiAdapter.importApplications(validApps, replaceMode);
      toast(`Imported ${result.imported} applications${result.skipped ? `; skipped ${result.skipped} duplicates` : ''}.`, 'success');
      if (onDataImported) onDataImported();
      onClose();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
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
              ? 'border-brand-600 text-brand-600'
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
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Import Data</span>
        </button>
      </div>

      {activeTab === 'export' ? (
        <div key="export" className="animate-tab-panel space-y-4 text-slate-700">
          <p className="text-xs text-slate-500">
            Export all <strong>{applications.length}</strong> tracked job applications to use in spreadsheets or save as an archival backup.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* CSV Export Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-brand-600 font-semibold text-sm mb-1">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>CSV Spreadsheet</span>
                </div>
                <p className="text-xs text-slate-500">
                  Formatted for Microsoft Excel, Google Sheets, or Apple Numbers.
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                className="ui-btn ui-btn-primary ui-btn-sm w-full"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to .CSV</span>
              </button>
            </div>

            {/* JSON Export Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-success-600 font-semibold text-sm mb-1">
                  <FileCode className="w-5 h-5" />
                  <span>JSON Raw Backup</span>
                </div>
                <p className="text-xs text-slate-500">
                  Complete dataset preserving all statusHistory timestamps and audit logs.
                </p>
              </div>
              <button
                onClick={handleExportJSON}
                className="ui-btn ui-btn-secondary ui-btn-sm w-full"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to .JSON</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div key="import" className="animate-tab-panel space-y-4 text-slate-700">
          <p className="text-xs text-slate-500">
            Restore a previous JSON backup or import a list of job applications:
          </p>

          <div>
            <label className="ui-label">
              Select Backup File (.json)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="ui-input text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>

          <div>
            <label className="ui-label">
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
              className="ui-input font-mono"
            />
          </div>

          {/* Replace option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="replaceMode"
              checked={replaceMode}
              onChange={(e) => setReplaceMode(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="replaceMode" className="text-xs text-slate-700 font-medium">
              Replace existing applications (unchecked: append without overwriting)
            </label>
          </div>

          {importError && (
            <div className="ui-alert ui-alert-danger">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="ui-btn ui-btn-ghost ui-btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={importing}
              className="ui-btn ui-btn-primary ui-btn-sm"
            >
              {importing ? 'Importing…' : 'Complete Import'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ExportImportModal;
