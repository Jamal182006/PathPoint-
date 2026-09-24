import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { systemApi } from '../api/systemApi';
import {
  Activity,
  Server,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCode,
  Sliders,
  Terminal,
  ExternalLink,
  Users,
} from 'lucide-react';

export const AdminSystem = () => {
  const { backendOnline, apiUrl, updateApiUrl, recheckBackend, token, user } = useAuth();
  const { toast } = useToast();

  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [testing, setTesting] = useState(false);
  const [pingData, setPingData] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const runDiagnostics = async () => {
    setTesting(true);
    try {
      const result = await systemApi.checkHealth();
      setPingData(result);
      setLastChecked(new Date().toLocaleTimeString());
      await recheckBackend();
      if (result.online) {
        toast(`Backend online (${result.latency} ms)`, 'success');
      } else {
        toast('Backend offline or unreachable. Using offline mock mode.', 'info');
      }
    } catch (err) {
      setPingData({ online: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleSaveUrl = async () => {
    const isOnline = await updateApiUrl(inputUrl);
    toast(
      isOnline ? 'Connected to backend URL!' : 'API URL saved. Server currently offline.',
      isOnline ? 'success' : 'info'
    );
    runDiagnostics();
  };

  const handleResetDefaultUrl = async () => {
    setInputUrl('http://localhost:5000/api');
    await updateApiUrl('http://localhost:5000/api');
    toast('API URL reset to http://localhost:5000/api', 'info');
    runDiagnostics();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Server className="w-7 h-7 text-indigo-600" />
            <span>Backend Integration & System Health</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor REST API connectivity, test roundtrip latency, and inspect JWT bearer session security.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <Link
            to="/admin"
            className="px-3.5 py-1.5 rounded-lg font-medium text-slate-600 hover:text-slate-900 transition"
          >
            Cohort KPIs
          </Link>
          <Link
            to="/admin/users"
            className="px-3.5 py-1.5 rounded-lg font-medium text-slate-600 hover:text-slate-900 transition"
          >
            Seeker Directory
          </Link>
          <Link
            to="/admin/system"
            className="px-3.5 py-1.5 rounded-lg font-semibold bg-white text-indigo-700 shadow-sm"
          >
            System Health
          </Link>
        </div>
      </div>

      {/* Grid: Server Health + API Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Overview Card */}

        {/* API Base URL Configuration Card */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">API Endpoint Configuration</h3>
            <span className="text-xs text-indigo-600 font-semibold">Dynamic Switcher</span>
          </div>
          <p className="text-xs text-slate-500">
            Set the backend host URL. This allows testing against a local Express / FastAPI server (`http://localhost:5000/api`) or a deployed staging server.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://localhost:5000/api"
                className="flex-1 px-3 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleSaveUrl}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Apply & Connect
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                onClick={handleResetDefaultUrl}
                className="text-slate-500 hover:text-slate-800 underline"
              >
                Reset to default (http://localhost:5000/api)
              </button>
              <span className="text-[11px] text-slate-400">Auto-appends `/api/health` for diagnostics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & JWT Session Inspection Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Key className="w-4 h-4 text-indigo-600" />
            <span>Active Administrative Authentication Session</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Admin Bearer Session
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-slate-400 font-semibold mb-1">Authenticated Account</div>
            <div className="font-bold text-slate-800">{user?.name}</div>
            <div className="text-slate-500 text-[11px]">{user?.email}</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-slate-400 font-semibold mb-1">Assigned Role</div>
            <div className="font-bold text-indigo-700 capitalize">{user?.role}</div>
            <div className="text-slate-500 text-[11px]">Full Administrative Privileges</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-slate-400 font-semibold mb-1">Authorization Token</div>
            <div className="font-mono text-[11px] text-slate-700 truncate">
              {token ? `${token.slice(0, 24)}...` : 'No token present'}
            </div>
            <div className="text-emerald-600 font-medium text-[11px]">Attached to all Axios requests</div>
          </div>
        </div>
      </div>

      {/* API Specification Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-white/10 text-indigo-300">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Need to build or connect the backend server?</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Review the complete REST API specification and Mongoose schemas in <code>BACKEND_SPECIFICATION.md</code>.
            </p>
          </div>
        </div>

        <button
          onClick={() => toast('Specification file located at: /BACKEND_SPECIFICATION.md', 'info')}
          className="px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition whitespace-nowrap"
        >
          View Contract Specs
        </button>
      </div>
    </div>
  );
};

export default AdminSystem;
