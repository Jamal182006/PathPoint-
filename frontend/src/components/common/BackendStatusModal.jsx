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
        : 'API URL saved. Backend currently offline (running in client fallback mode).',
      online ? 'success' : 'info'
    );
    onClose();
  };

  const handleResetDefault = async () => {
    setInputUrl('http://localhost:5000/api');
    await updateApiUrl('http://localhost:5000/api');
    toast('API endpoint reset to default http://localhost:5000/api', 'info');
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
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
                <span>{backendOnline ? 'Backend Live & Synchronized' : 'Client Standalone / Mock Mode'}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {backendOnline
                  ? 'Active JWT bearer requests streaming to live REST backend'
                  : 'Backend server not detected on port 5000; all features are operating in seamless offline mock mode.'}
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
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                testResult.online
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.online ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>
                  {testResult.online
                    ? `Status 200 OK — Roundtrip Latency: ${testResult.latency} ms`
                    : `Connection refused: ${testResult.error || 'Server unreachable'}`}
                </span>
              </div>
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
