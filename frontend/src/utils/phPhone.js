// Philippine phone numbers only.
//
// National formats accepted:
//   Mobile    9XXXXXXXXX  (10 digits, e.g. 917 123 4567)
//   Landline  2 + 8 digits (Metro Manila, e.g. 2 8123 4567)
//             2-digit area code + 7 digits (e.g. 32 255 1234)
//             2 + 2-digit area code + 7 digits when the trunk prefix is typed
// The country code is always +63 and is shown as a fixed prefix in the UI.

export const PH_PHONE_COUNTRY_CODE = '+63';
export const PH_PHONE_MAX_DIGITS = 10;

const MOBILE = /^9\d{9}$/;
const LANDLINE_WITH_TRUNK = /^2\d{9}$/;
const METRO_MANILA_LANDLINE = /^2\d{8}$/;
const PROVINCIAL_LANDLINE = /^[3-8]\d{8}$/;

// Reduces any stored or typed value to the national digits only.
export const normalizePhilippinePhone = (value) => {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  // "+63 917 123 4567" -> "9171234567"
  if (digits.length > PH_PHONE_MAX_DIGITS && digits.startsWith('63')) digits = digits.slice(2);
  // "0917 123 4567" -> "9171234567"
  if (digits.length === PH_PHONE_MAX_DIGITS + 1 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, PH_PHONE_MAX_DIGITS);
};

// True when the value is a valid Philippine mobile or landline number.
export const isValidPhilippinePhone = (value) => {
  const digits = normalizePhilippinePhone(value);
  return MOBILE.test(digits) || LANDLINE_WITH_TRUNK.test(digits)
    || METRO_MANILA_LANDLINE.test(digits) || PROVINCIAL_LANDLINE.test(digits);
};

// "Mobile" or "Landline" once the number is complete, otherwise null.
export const describePhilippinePhone = (value) => {
  const digits = normalizePhilippinePhone(value);
  if (MOBILE.test(digits)) return 'Mobile';
  if (LANDLINE_WITH_TRUNK.test(digits) || METRO_MANILA_LANDLINE.test(digits) || PROVINCIAL_LANDLINE.test(digits)) {
    return 'Landline';
  }
  return null;
};

// Groups the digits the way a Philippine subscriber writes them.
export const formatPhilippinePhone = (value) => {
  const digits = normalizePhilippinePhone(value);
  if (!digits) return '';
  if (MOBILE.test(digits)) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (LANDLINE_WITH_TRUNK.test(digits)) return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (METRO_MANILA_LANDLINE.test(digits)) return `${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5)}`;
  if (PROVINCIAL_LANDLINE.test(digits)) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return digits;
};

// Detects a number that carries a country code other than +63 so the field can
// explain that it has to be replaced.
export const hasForeignCountryCode = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw.startsWith('+')) return false;
  const match = /^\+\s*(\d{1,3})/.exec(raw);
  if (!match) return false;
  return match[1] !== '63';
};
