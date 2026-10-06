import React, { useEffect, useState } from 'react';
import { Mail, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import Modal from './Modal';

export const LoginVerificationModal = ({
  isOpen,
  email,
  code,
  loading,
  resendLoading,
  errorMessage,
  onCodeChange,
  onSubmit,
  onResend,
  onClose,
}) => {
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleResend = async () => {
    await onResend();
    setResendSeconds(30);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verify your sign-in" maxWidth="max-w-md">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h4 className="text-lg font-semibold text-slate-900">Enter your verification code</h4>
        <p className="mt-2 text-sm text-slate-600">
          We sent a 6-digit code to <span className="font-medium text-slate-800">{email}</span>.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {errorMessage}
        </div>
      )}

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="login-verification-code" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Verification code
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              id="login-verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              value={code}
              onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-center text-lg tracking-[0.35em] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Verify and sign in
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-500">Code expires in 10 minutes.</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendLoading || resendSeconds > 0}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resendLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
        </button>
      </div>
    </Modal>
  );
};

export default LoginVerificationModal;
