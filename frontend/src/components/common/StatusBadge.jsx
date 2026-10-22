import React from 'react';

const STATUS_CONFIGS = {
  Saved: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  },
  Applied: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
  },
  Interviewing: {
    bg: 'bg-warning-50',
    text: 'text-warning-700',
    dot: 'bg-warning-600 animate-pulse',
  },
  Offered: {
    bg: 'bg-success-50',
    text: 'text-success-700',
    dot: 'bg-success-600',
  },
  Rejected: {
    bg: 'bg-danger-50',
    text: 'text-danger-700',
    dot: 'bg-danger-600',
  },
};

export const StatusBadge = ({ status, size = 'sm', showDot = true }) => {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.Saved;
  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm font-semibold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${config.bg} ${config.text} ${sizeClasses}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />}
      <span>{status || 'Unknown'}</span>
    </span>
  );
};

export default StatusBadge;
