import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import { systemApi } from '../../api/systemApi';
import Modal from './Modal';
import { Server, Activity, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export const BackendStatusModal = ({ isOpen, onClose }) => {
  const { backendOnline, apiUrl, updateApiUrl, recheckBackend } = useAuth();
  const { toast } = useToast();

  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestEndpoint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await systemApi.testEndpoint(inputUrl);
      setTestResult(res);
      if (res.online) {
        toast(`Backend responded in ${res.latency}ms!`, 'success');
      } else {
        toast('Endpoint did not respond. Server offline or CORS blocked.', 'warning');
      }
    } catch (err) {
      setTestResult({ online: false, error: err.message });
      toast('Failed to reach endpoint.', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveUrl = async () => {
    const online = await updateApiUrl(inputUrl);
    toast(
      online
        ? 'Connected to new backend API!'
        : 'API URL saved. The backend is currently unavailable; database-backed features are paused.',
      online ? 'success' : 'info'
    );
    onClose();
  };

  const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleResetDefault = async () => {
    setInputUrl(DEFAULT_API_URL);
    await updateApiUrl(DEFAULT_API_URL);
    toast(`API endpoint reset to default ${DEFAULT_API_URL}`, 'info');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      title={
        <span className="flex items-center gap-2">
          <Server className="h-5 w-5 text-brand-600" aria-hidden="true" />
          Backend API connection
        </span>
      }
    >
      <p className="-mt-1 mb-4 text-xs text-slate-500">
        Configure the REST endpoint and test live server connectivity.
      </p>

      {/* Current connection state */}
      <div className={`ui-alert ${backendOnline ? 'ui-alert-success' : 'ui-alert-warning'} items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${backendOnline ? 'bg-success-600 animate-pulse' : 'bg-warning-600'}`}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold">{backendOnline ? 'Backend connected' : 'Backend unavailable'}</p>
            <p className="text-xs opacity-80">
              {backendOnline
                ? 'Authenticated requests use the configured REST API and database.'
                : 'Database-backed features are unavailable until the API reconnects. Your data is not saved offline.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => recheckBackend()}
          className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/70"
          title="Refresh connection status"
          aria-label="Refresh connection status"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Endpoint */}
      <div className="mt-5">
        <label htmlFor="backend-api-url" className="ui-label">API base URL</label>
        <div className="flex gap-2">
          <input
            id="backend-api-url"
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://localhost:5000/api"
            className="ui-input flex-1 font-mono"
          />
          <button
            type="button"
            onClick={handleTestEndpoint}
            disabled={testing}
            className="ui-btn ui-btn-secondary shrink-0"
          >
            {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            <span>Test ping</span>
          </button>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`ui-alert mt-4 flex-col items-stretch ${testResult.online ? 'ui-alert-success' : 'ui-alert-danger'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {testResult.online ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span className="font-medium">
                {testResult.online
                  ? `API responding (${testResult.latency}ms)`
                  : `Connection refused: ${testResult.error || 'Server unreachable'}`}
              </span>
            </div>
            {testResult.online && (
              <span className="ui-badge ui-badge-success shrink-0">HTTP 200</span>
            )}
          </div>
          {testResult.online && testResult.data && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 text-xs opacity-90">
              <span>Database: <strong>{testResult.data.database === 'connected' ? 'Connected' : testResult.data.database}</strong></span>
              {testResult.data.databaseName && <span>Target DB: <strong>{testResult.data.databaseName}</strong></span>}
              <span>Engine: <strong>{testResult.data.isMemoryFallback ? 'In-memory fallback' : 'MongoDB Atlas'}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button type="button" onClick={handleResetDefault} className="ui-btn ui-btn-ghost ui-btn-sm">
          Reset default
        </button>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="ui-btn ui-btn-secondary ui-btn-sm">
            Cancel
          </button>
          <button type="button" onClick={handleSaveUrl} className="ui-btn ui-btn-primary ui-btn-sm">
            Apply settings
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BackendStatusModal;
