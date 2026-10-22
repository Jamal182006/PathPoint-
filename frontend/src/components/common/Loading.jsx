import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Canonical loading affordances. The spinner and its wrapping were previously
 * hand-rolled a dozen different ways; these components keep the size, spacing,
 * and token color consistent everywhere.
 */

/** A bare spinner. Compose inline (in buttons, badges) or via the states below. */
export const Spinner = ({ className = 'h-5 w-5', label }) => (
  <Loader2 className={`animate-spin ${className}`} aria-hidden="true" {...(label ? { 'aria-label': label } : {})} />
);

/** Centered, full-panel loading block used while a page or card resolves. */
export const LoadingState = ({ label = 'Loading…', className = '' }) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-16 text-sm text-slate-500 ${className}`}>
    <Spinner className="h-6 w-6 text-brand-600" />
    {label && <p>{label}</p>}
  </div>
);

/** Loading row for `ui-table-shell` tables; spans every column. */
export const TableLoadingRow = ({ colSpan, label = 'Loading…' }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-slate-500">
      <Spinner className="mx-auto h-5 w-5 text-brand-600" />
      <p className="mt-2">{label}</p>
    </td>
  </tr>
);

export default LoadingState;
