import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import Modal from './Modal';
import { Mail, KeyRound, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';

export const ForgotPasswordModal = ({ isOpen, onClose, defaultEmail = '' }) => {
  const { forgotPassword, verifyResetCode, resetPassword } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState(defaultEmail);
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('email');
  const [resultMessage, setResultMessage] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setVerificationCode('');
      setNewPassword('');
      setConfirmPassword('');
      setPhase('email');
      setResultMessage('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, defaultEmail]);

  const resetState = () => {
    setEmail(defaultEmail);
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setLoading(false);
    setPhase('email');
    setResultMessage('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    const normalizedIdentifier = email.trim();
    if (!normalizedIdentifier) {
      toast('Please enter your email address or username.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(normalizedIdentifier);
      setPhase('code');
      setResultMessage(res?.message || 'A verification code has been sent to your email.');
      toast('Verification code sent.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to process request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast('Please enter the 6-digit code.', 'error');
      return;
    }

    setLoading(true);
    try {
      await verifyResetCode(email.trim(), verificationCode.trim());
      setPhase('password');
      setResultMessage('Code verified. Please choose a new password.');
      toast('Code verified.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to verify the code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast('Use at least 8 characters with uppercase, lowercase, and a number.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email.trim(), verificationCode.trim(), newPassword);
      setPhase('success');
      setResultMessage(res?.message || 'Your password has been reset successfully.');
      toast('Password reset complete.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to reset password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const titleByPhase = {
    email: 'Reset your password',
    code: 'Verify reset code',
    password: 'Create new password',
    success: 'Password updated',
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md" title={titleByPhase[phase]}>
      {phase === 'email' && (
        <form onSubmit={handleSubmitEmail} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-500">
              Enter your email or username to receive a code at your registered email.
            </p>
          </div>

          <div>
            <label htmlFor="forgot-email" className="ui-label">Email or username</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" aria-hidden="true" />
              <input
                id="forgot-email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address or username"
                className="ui-input pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={handleClose} className="ui-btn ui-btn-secondary ui-btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="ui-btn ui-btn-primary ui-btn-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Sending…</span></> : <span>Send code</span>}
            </button>
          </div>
        </form>
      )}

      {phase === 'code' && (
        <form onSubmit={handleSubmitCode} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-500">{resultMessage}</p>
          </div>

          <div>
            <label htmlFor="forgot-code" className="ui-label">6-digit code</label>
            <input
              id="forgot-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="ui-input text-center text-lg font-semibold tracking-[0.35em]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPhase('email')} className="ui-btn ui-btn-secondary ui-btn-sm">
              Back
            </button>
            <button type="submit" disabled={loading} className="ui-btn ui-btn-primary ui-btn-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Verifying…</span></> : <span>Verify code</span>}
            </button>
          </div>
        </form>
      )}

      {phase === 'password' && (
        <form onSubmit={handleSubmitPassword} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-500">{resultMessage}</p>
          </div>

          <div>
            <label htmlFor="forgot-new-password" className="ui-label">New password</label>
            <div className="relative">
              <input
                id="forgot-new-password"
                type={showNewPassword ? 'text' : 'password'}
                required
                maxLength={72}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="ui-input pr-11"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((value) => !value)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="forgot-confirm-password" className="ui-label">Confirm new password</label>
            <div className="relative">
              <input
                id="forgot-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                maxLength={72}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="ui-input pr-11"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPhase('code')} className="ui-btn ui-btn-secondary ui-btn-sm">
              Back
            </button>
            <button type="submit" disabled={loading} className="ui-btn ui-btn-primary ui-btn-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Resetting…</span></> : <span>Update password</span>}
            </button>
          </div>
        </form>
      )}

      {phase === 'success' && (
        <div className="text-center py-4 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600 mx-auto">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-900">Password updated</h4>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {resultMessage}
            </p>
          </div>
          <button onClick={handleClose} className="ui-btn ui-btn-primary w-full">
            Back to sign in
          </button>
        </div>
      )}
    </Modal>
  );
};

export default ForgotPasswordModal;
