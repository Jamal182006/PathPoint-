import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import { systemApi } from '../../api/systemApi';
import {
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  ExternalLink,
  SlidersHorizontal,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const BackendStatusModal = ({ isOpen, onClose }) => {
  const { backendOnline, apiUrl, updateApiUrl, recheckBackend } = useAuth();
  const { toast } = useToast();

  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Backend API Connection</h3>
              <p className="text-xs text-slate-500">
                Configure REST endpoint & test live server connectivity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Banner */}
        <div className="mt-4 p-3.5 rounded-xl border flex items-center justify-between bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <span>{backendOnline ? 'Backend connected' : 'Backend unavailable'}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {backendOnline
                  ? 'Authenticated requests use the configured REST API and database.'
                  : 'Database-backed features are unavailable until the API reconnects. Your data is not saved offline.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => recheckBackend()}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Refresh connection status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* URL Input */}
        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              API Base URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://localhost:5000/api"
                className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleTestEndpoint}
                disabled={testing}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition disabled:opacity-50"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>Test Ping</span>
              </button>
            </div>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${
                testResult.online
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {testResult.online ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-medium">
                    {testResult.online
                      ? `API Responding (${testResult.latency}ms)`
                      : `Connection refused: ${testResult.error || 'Server unreachable'}`}
                  </span>
                </div>
                {testResult.online && (
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    HTTP 200
                  </span>
                )}
              </div>
              {testResult.online && testResult.data && (
                <div className="text-[11px] text-emerald-700 pl-6 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Database: <strong>{testResult.data.database === 'connected' ? 'Connected' : testResult.data.database}</strong></span>
                  {testResult.data.databaseName && <span>Target DB: <strong>{testResult.data.databaseName}</strong></span>}
                  <span>Engine: <strong>{testResult.data.isMemoryFallback ? 'In-Memory Fallback' : 'MongoDB Atlas'}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefault}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Reset Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveUrl}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-200 transition"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackendStatusModal;
