// Philippine-only geocoding helpers built on Nominatim.
// Every lookup is scoped with `countrycodes=ph` and every result is verified
// against the Philippine bounding box before it is returned.

import { isWithinPhilippines } from './phLocations';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const PH_COUNTRY_CODES = 'ph';

const clean = (value) => String(value || '').trim().slice(0, 300);

export const geocodePhilippineLocation = async (query, { signal } = {}) => {
  const text = clean(query);
  if (!text) return null;

  const url = `${NOMINATIM_BASE}/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=${PH_COUNTRY_CODES}&q=${encodeURIComponent(`${text}, Philippines`)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('The map could not look up this address.');
  const results = await response.json();
  if (!Array.isArray(results) || !results.length) return null;

  const result = results[0];
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!isWithinPhilippines(latitude, longitude)) return null;

  const displayName = clean(result.display_name) || text;
  return {
    latitude,
    longitude,
    formattedAddress: displayName,
    location: displayName.slice(0, 200),
  };
};

export const reverseGeocodePhilippineLocation = async (latitude, longitude, { signal } = {}) => {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!isWithinPhilippines(lat, lon)) return null;

  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&countrycodes=${PH_COUNTRY_CODES}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return null;
  const result = await response.json();
  if (!result) return null;

  const displayName = clean(result.display_name);
  if (!displayName) return null;
  return {
    latitude: lat,
    longitude: lon,
    formattedAddress: displayName,
    location: displayName.slice(0, 200),
  };
};
