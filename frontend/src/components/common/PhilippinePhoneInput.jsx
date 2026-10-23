import React, { useId, useMemo } from 'react';
import { Phone } from 'lucide-react';
import {
  PH_PHONE_COUNTRY_CODE,
  describePhilippinePhone,
  formatPhilippinePhone,
  hasForeignCountryCode,
  isValidPhilippinePhone,
  normalizePhilippinePhone,
} from '../../utils/phPhone';

// Phone field locked to the Philippines: the +63 country code is fixed and the
// local number is validated against the Philippine numbering plan, so no
// international number can be saved from the account settings.
const PhilippinePhoneInput = ({
  value = '',
  onChange,
  id,
  name,
  placeholder = '917 123 4567',
  required = false,
  disabled = false,
  className = '',
}) => {
  const generatedId = useId();
  const inputId = id || `ph-phone-${generatedId}`;
  const errorId = `${inputId}-status`;

  const raw = String(value ?? '');
  const digits = useMemo(() => normalizePhilippinePhone(raw), [raw]);
  const foreign = useMemo(() => hasForeignCountryCode(raw), [raw]);
  const valid = useMemo(() => isValidPhilippinePhone(raw), [raw]);
  const lineType = useMemo(() => describePhilippinePhone(raw), [raw]);

  // A number saved with a different country code is shown untouched so the
  // owner can recognise it and replace it with a Philippine one.
  const displayValue = foreign ? raw : digits;
  const showError = Boolean(raw.trim()) && (foreign || !valid);
  const preview = valid ? `${PH_PHONE_COUNTRY_CODE} ${formatPhilippinePhone(raw)}` : '';

  const handleChange = (event) => {
    const next = event.target.value.replace(/\D/g, '').slice(0, 10);
    onChange?.(next);
  };

  const statusText = foreign
    ? 'That number is not a Philippine one. Replace it with a local number.'
    : showError
      ? 'Enter a valid Philippine mobile (9XXXXXXXXX) or landline number.'
      : preview
        ? `${preview}${lineType ? ` · ${lineType}` : ''}`
        : 'Philippines only. Mobile numbers start with 9; landlines use a 2 area code.';

  const statusTone = showError ? 'text-rose-700' : 'text-slate-500';

  return (
    <div className={className}>
      <div className="mt-1 flex rounded-xl border border-slate-300 bg-white transition focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600">
        <span className="pointer-events-none flex select-none items-center gap-1.5 border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
          <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
          {PH_PHONE_COUNTRY_CODE}
        </span>
        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={20}
          required={required}
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          aria-invalid={showError || undefined}
          aria-describedby={errorId}
          className="min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-0 disabled:bg-slate-100"
        />
      </div>
      <p id={errorId} className={`mt-1 text-xs ${statusTone}`}>{statusText}</p>
    </div>
  );
};

export default PhilippinePhoneInput;
