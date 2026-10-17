/**
 * Safe date parsing and formatting helpers to prevent fatal RangeError: Invalid time value crashes.
 */

export const safeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  // Handle nested date objects such as { date: '...' }
  const raw = typeof value === 'object' && value !== null && 'date' in value ? value.date : value;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const safeIsoString = (value, fallback = '') => {
  const d = safeDate(value);
  return d ? d.toISOString() : fallback;
};

export const safeDateString = (value, fallback = '') => {
  const d = safeDate(value);
  return d ? d.toISOString().slice(0, 10) : fallback;
};

export const safeDateTimeString = (value, fallback = '') => {
  const d = safeDate(value);
  if (!d) return fallback;
  // datetime-local inputs expect local wall-clock time, not a UTC slice.
  const pad = (part) => String(part).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDateDisplay = (value, options = { month: 'short', day: 'numeric', year: 'numeric' }, fallback = 'N/A') => {
  const d = safeDate(value);
  return d ? d.toLocaleDateString(undefined, options) : fallback;
};

export const formatDateTimeDisplay = (value, options = undefined, fallback = 'N/A') => {
  const d = safeDate(value);
  return d ? d.toLocaleString(undefined, options) : fallback;
};
