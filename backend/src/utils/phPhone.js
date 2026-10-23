// Philippine phone numbers only.
//
// National formats accepted:
//   Mobile    9XXXXXXXXX  (10 digits, e.g. 917 123 4567)
//   Landline  2 + 8 digits (Metro Manila)
//             2-digit area code + 7 digits (provincial)
//             2 + 2-digit area code + 7 digits when the trunk prefix is typed
// The country code is always +63.

export const PH_PHONE_COUNTRY_CODE = '+63';

const MOBILE = /^9\d{9}$/;
const LANDLINE_WITH_TRUNK = /^2\d{9}$/;
const METRO_MANILA_LANDLINE = /^2\d{8}$/;
const PROVINCIAL_LANDLINE = /^[3-8]\d{8}$/;

// Reduces any stored or typed value to the national digits only.
export const normalizePhilippinePhone = (value) => {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length > 10 && digits.startsWith('63')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
};

// True when the value is a valid Philippine mobile or landline number.
export const isValidPhilippinePhone = (value) => {
  const digits = normalizePhilippinePhone(value);
  return MOBILE.test(digits) || LANDLINE_WITH_TRUNK.test(digits)
    || METRO_MANILA_LANDLINE.test(digits) || PROVINCIAL_LANDLINE.test(digits);
};
