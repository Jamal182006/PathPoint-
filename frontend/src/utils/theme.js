// Single source of truth for the interactive accent hue.
//
// The accent drives the CSS variables `--accent-100/500/600/700` set by the
// application shell; the shared `.ui-*` layer consumes them for primary
// actions, focus, selection, and the caret. The `600` value is the fill used
// under white text and is chosen to clear a 4.5:1 contrast ratio.
//
// Stored on the user's preferences as a *name* (`accent`), never a raw hex, so
// the palette stays curated and contrast-safe.

export const ACCENTS = {
  indigo: { name: 'Indigo', '100': '#e0e7ff', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca' },
  violet: { name: 'Violet', '100': '#ede9fe', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9' },
  teal: { name: 'Teal', '100': '#ccfbf1', '500': '#14b8a6', '600': '#0f766e', '700': '#115e59' },
  blue: { name: 'Blue', '100': '#dbeafe', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8' },
  rose: { name: 'Rose', '100': '#ffe4e6', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c' },
  emerald: { name: 'Emerald', '100': '#d1fae5', '500': '#10b981', '600': '#047857', '700': '#065f46' },
  amber: { name: 'Amber', '100': '#fef3c7', '500': '#f59e0b', '600': '#b45309', '700': '#92400e' },
};

export const DEFAULT_ACCENT = 'indigo';

// Legacy preferences stored the accent as a hex string; map those back to a
// name so an existing account keeps its choice.
const HEX_TO_NAME = Object.entries(ACCENTS).reduce((map, [name, scale]) => {
  Object.values(scale).forEach((hex) => {
    if (typeof hex === 'string' && hex.startsWith('#')) map[hex.toLowerCase()] = name;
  });
  return map;
}, {});

export const resolveAccent = (value) => {
  if (value && ACCENTS[value]) return value;
  if (typeof value === 'string' && HEX_TO_NAME[value.toLowerCase()]) return HEX_TO_NAME[value.toLowerCase()];
  return DEFAULT_ACCENT;
};

// The hex the API stores for a given accent name.
export const accentToHex = (value) => ACCENTS[resolveAccent(value)]['600'];

export const accentToCssVars = (value) => {
  const scale = ACCENTS[resolveAccent(value)];
  return {
    '--accent-100': scale['100'],
    '--accent-500': scale['500'],
    '--accent-600': scale['600'],
    '--accent-700': scale['700'],
  };
};

/**
 * Applies the user's preferences to the document shell.
 *
 * The accent swaps the `--accent-*` custom properties that drive primary
 * actions, focus rings, selection, and the caret. Compact mode flips a
 * `data-compact` flag that the shared `.ui-*` layer reads to tighten density.
 */
export const applyAccentToDocument = (accent) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.entries(accentToCssVars(accent)).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

export const applyCompactModeToDocument = (compact) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-compact', compact ? 'true' : 'false');
};
