import React from 'react';
import markUrl from '../../assets/pathpoint-mark.png';

/**
 * PathPoint brand mark.
 *
 * The mark ships as a transparent PNG and is recoloured per audience with a CSS
 * mask, so the same artwork renders in the role identity colour (teal for
 * candidates, blue for providers, indigo for admins) without needing a tinted
 * asset for every surface.
 */
const ROLE_LOGO_COLOR = {
  candidate: '#0d9488', // teal-600
  provider: '#2563eb', // blue-600
  admin: '#4f46e5', // brand indigo-600
  brand: '#4f46e5',
};

const LIGHT_COLOR = '#ffffff';

// The artwork is a portrait mark (143x182), so the box follows its ratio to
// keep the layout tight next to the wordmark.
const MARK_RATIO = 143 / 182;

export const BrandLogo = ({ role = 'brand', tone, size = 34, className = '' }) => {
  const color = tone === 'light' ? LIGHT_COLOR : ROLE_LOGO_COLOR[role] || ROLE_LOGO_COLOR.brand;

  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: `${Math.round(size * MARK_RATIO)}px`,
        height: `${size}px`,
        backgroundColor: color,
        WebkitMaskImage: `url(${markUrl})`,
        maskImage: `url(${markUrl})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
};

export default BrandLogo;
