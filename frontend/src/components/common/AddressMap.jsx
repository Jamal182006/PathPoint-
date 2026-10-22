import React, { useCallback, useEffect, useState } from 'react';
import L from 'leaflet';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Crosshair, Loader2, MapPin, Search } from 'lucide-react';
import { PH_BOUNDS, PH_CENTER, PH_DEFAULT_ZOOM, isWithinPhilippines } from '../../utils/phLocations';
import { geocodePhilippineLocation, reverseGeocodePhilippineLocation } from '../../utils/phGeocode';

const defaultIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const hasCoordinates = (latitude, longitude) => latitude !== '' && longitude !== '' && latitude != null && longitude != null && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

const geolocationErrorMessage = (error) => {
  if (!error) return 'Unable to read your current position.';
  if (error.code === 1) return 'Location access was blocked. Allow location access in your browser to use your current position.';
  if (error.code === 2) return 'Your current position is unavailable right now.';
  if (error.code === 3) return 'Getting your current position timed out. Try again.';
  return error.message || 'Unable to read your current position.';
};

const readCurrentPosition = () => new Promise((resolve, reject) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    reject(new Error('This browser does not support location access.'));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => resolve({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    }),
    reject,
    GEOLOCATION_OPTIONS,
  );
});

// Resolve the visitor's real position. When the browser already granted access we
// locate silently so maps open on the user without nagging for permission.
const useCurrentPosition = () => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const locate = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLocationError('');
    setLocating(true);
    try {
      const position = await readCurrentPosition();
      // The map only ever covers the Philippines, so a position from another
      // country is discarded instead of dragging the map out of bounds.
      if (!isWithinPhilippines(position.latitude, position.longitude)) {
        setCurrentPosition(null);
        if (!silent) setLocationError('Your current position is outside the Philippines. Pick a Philippine location on the map instead.');
        return null;
      }
      setCurrentPosition(position);
      setLocationError('');
      return position;
    } catch (error) {
      if (!silent) setLocationError(geolocationErrorMessage(error));
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation || !navigator.permissions?.query) return undefined;
    let active = true;
    navigator.permissions.query({ name: 'geolocation' })
      .then((status) => { if (active && status.state === 'granted') locate({ silent: true }); })
      .catch(() => {});
    return () => { active = false; };
  }, [locate]);

  return { currentPosition, locating, locationError, locate };
};

const distanceInMeters = (from, to) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(to[0] - from[0]);
  const dLon = toRadians(to[1] - from[1]);
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
};

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
};

const CurrentPositionLayer = ({ position }) => {
  if (!position) return null;
  const center = [position.latitude, position.longitude];
  return <>
    <Circle center={center} radius={Math.max(Number(position.accuracy) || 0, 20)} pathOptions={{ color: '#4f46e5', weight: 1, fillColor: '#6366f1', fillOpacity: 0.12 }} />
    <CircleMarker center={center} radius={7} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#4f46e5', fillOpacity: 1 }} />
  </>;
};

const MapViewport = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, map, zoom]);
  return null;
};

const MapPinEvents = ({ onPlace }) => {
  useMapEvents({ click: ({ latlng }) => onPlace(latlng.lat, latlng.lng) });
  return null;
};

// Keeps every map inside the Philippine archipelago.
// `maxBounds` stops the map from being panned to another country, and the
// minimum zoom is derived from the container size so the viewport never spills
// past the coastline either.
const PhBoundsController = () => {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(PH_BOUNDS);
    const apply = () => {
      map.setMaxBounds(bounds);
      const size = map.getSize();
      if (!size || !size.x || !size.y) return;
      // Zoom in until the Philippine bounding box covers the whole viewport.
      // That keeps neighbouring countries out of sight even at the lowest
      // allowed zoom level.
      const zoom = map.getZoom() || PH_DEFAULT_ZOOM;
      const nw = map.project(bounds.getNorthWest(), zoom);
      const se = map.project(bounds.getSouthEast(), zoom);
      const boundsWidth = Math.abs(se.x - nw.x) || 1;
      const boundsHeight = Math.abs(se.y - nw.y) || 1;
      const scale = Math.max(size.x / boundsWidth, size.y / boundsHeight);
      const fitZoom = Math.ceil(zoom + Math.log(scale) / Math.LN2);
      const minZoom = Math.min(Math.max(fitZoom, 4), 11);
      map.setMinZoom(minZoom);
      if (map.getZoom() < minZoom) map.setZoom(minZoom, { animate: false });
    };
    apply();
    map.on('load', apply);
    map.on('resize', apply);
    return () => {
      map.off('load', apply);
      map.off('resize', apply);
    };
  }, [map]);
  return null;
};

export const LocationMap = ({ address = '', latitude, longitude, className = 'h-64', compact = false }) => {
  const { currentPosition } = useCurrentPosition();
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPoint, setMapPoint] = useState(hasCoordinates(latitude, longitude) ? [Number(latitude), Number(longitude)] : null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    if (!mapOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMapOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mapOpen]);

  const openMap = async () => {
    setMapOpen(true);
    setMapError('');
    if (hasCoordinates(latitude, longitude)) {
      setMapPoint([Number(latitude), Number(longitude)]);
      return;
    }
    if (!address) return;
    setMapLoading(true);
    try {
      const result = await geocodePhilippineLocation(address);
      if (!result) throw new Error('No map location was found in the Philippines for this address.');
      setMapPoint([result.latitude, result.longitude]);
    } catch (error) {
      setMapError(error.message || 'The map is temporarily unavailable.');
    } finally {
      setMapLoading(false);
    }
  };

  const mapCenter = mapPoint || [PH_CENTER.latitude, PH_CENTER.longitude];
  const userPoint = currentPosition ? [currentPosition.latitude, currentPosition.longitude] : null;

  if (!hasCoordinates(latitude, longitude)) {
    return <><div className={`flex items-start gap-2 text-slate-600 ${compact ? 'py-0.5 text-xs' : 'border-y border-slate-200 py-3 text-sm'}`}><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" /><div className="min-w-0"><p>{address || 'Location not provided'}</p>{address && <button type="button" onClick={openMap} className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline">View map</button>}</div></div>{mapOpen && <LocationMapDialog address={address} center={mapCenter} loading={mapLoading} error={mapError} currentPosition={currentPosition} onClose={() => setMapOpen(false)} />}</>;
  }

  const center = [Number(latitude), Number(longitude)];
  const distance = userPoint ? distanceInMeters(userPoint, center) : null;
  return <><div className={compact ? 'space-y-1' : 'space-y-2'}><div className={`${className} overflow-hidden border border-slate-200`}><MapContainer center={center} zoom={14} scrollWheelZoom={false} maxBounds={PH_BOUNDS} maxBoundsViscosity={1} className="h-full w-full"><PhBoundsController /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{userPoint && <CurrentPositionLayer position={currentPosition} />}<Marker position={center} icon={defaultIcon} /></MapContainer></div><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><p className="min-w-0 truncate text-slate-600">{address || `${center[0].toFixed(5)}, ${center[1].toFixed(5)}`}</p><button type="button" onClick={openMap} className="shrink-0 font-semibold text-brand-700 hover:underline">View map</button></div>{distance != null && <p className="text-xs text-slate-500">{formatDistance(distance)} away from your current position</p>}</div>{mapOpen && <LocationMapDialog address={address} center={center} currentPosition={currentPosition} onClose={() => setMapOpen(false)} />}</>;
};

const LocationMapDialog = ({ address, center, loading = false, error = '', currentPosition = null, onClose }) => <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
  <section role="dialog" aria-modal="true" aria-labelledby="location-map-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-popover">
    <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3"><div className="min-w-0"><h2 id="location-map-title" className="text-base font-bold text-slate-900">Location map</h2><p className="mt-1 truncate text-xs text-slate-600">{address || 'Selected location'}</p></div><button type="button" autoFocus onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Close</button></header>
    <div className="min-h-0 flex-1 p-3">{loading ? <div role="status" className="flex h-64 items-center justify-center text-sm text-slate-500">Finding this address on the map…</div> : error ? <p role="alert" className="border-y border-amber-200 py-4 text-sm text-amber-900">{error} Address: {address}</p> : <div className="h-[min(65vh,34rem)] overflow-hidden border border-slate-200"><MapContainer center={center} zoom={14} scrollWheelZoom maxBounds={PH_BOUNDS} maxBoundsViscosity={1} className="h-full w-full"><PhBoundsController /><MapViewport center={center} zoom={14} /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{currentPosition && <CurrentPositionLayer position={currentPosition} />}<Marker position={center} icon={defaultIcon} /></MapContainer></div>}</div>
  </section>
</div>;

const AddressMap = ({ location = '', formattedAddress = '', latitude, longitude, onChange, readOnly = false, compact = false, className }) => {
  const { currentPosition, locating, locationError, locate } = useCurrentPosition();
  const [search, setSearch] = useState(formattedAddress || location);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const coordsAvailable = hasCoordinates(latitude, longitude);
  const userPoint = currentPosition ? [currentPosition.latitude, currentPosition.longitude] : null;
  const center = coordsAvailable ? [Number(latitude), Number(longitude)] : (userPoint || [PH_CENTER.latitude, PH_CENTER.longitude]);
  const zoom = coordsAvailable ? 14 : (userPoint ? 15 : PH_DEFAULT_ZOOM);

  useEffect(() => { setSearch(formattedAddress || location); }, [formattedAddress, location]);

  const setPin = async (lat, lon) => {
    if (!isWithinPhilippines(lat, lon)) {
      setError('That point is outside the Philippines. Drop the pin somewhere inside the country.');
      return;
    }
    setError('');
    onChange({ latitude: lat, longitude: lon });
    try {
      const result = await reverseGeocodePhilippineLocation(lat, lon);
      if (!result) {
        setError('Coordinates saved; the address lookup only covers the Philippines.');
        return;
      }
      setSearch(result.formattedAddress);
      onChange({ latitude: lat, longitude: lon, location: result.location, formattedAddress: result.formattedAddress });
    } catch {
      setError('Coordinates saved; address lookup was unavailable.');
    }
  };

  const searchAddress = async (event) => {
    event?.preventDefault();
    const query = search.trim();
    if (!query) return;
    setSearching(true);
    setError('');
    try {
      const result = await geocodePhilippineLocation(query);
      if (!result) throw new Error('No matching Philippine address found. Try a city or municipality in the Philippines.');
      onChange({
        latitude: result.latitude,
        longitude: result.longitude,
        location: result.location,
        formattedAddress: result.formattedAddress,
      });
      setSearch(result.formattedAddress);
    } catch (searchError) {
      setError(searchError.message || 'Unable to search this address.');
    } finally {
      setSearching(false);
    }
  };

  const applyCurrentLocation = async () => {
    const position = await locate();
    if (!position) return;
    setError('');
    await setPin(position.latitude, position.longitude);
  };

  if (readOnly) return <LocationMap address={formattedAddress || location} latitude={latitude} longitude={longitude} compact={compact} className={className} />;

  const distance = coordsAvailable && userPoint ? distanceInMeters(userPoint, center) : null;
  const hint = coordsAvailable
    ? `${distance != null ? `${formatDistance(distance)} from your current position. ` : ''}Drag the pin or click the map to fine-tune it.`
    : userPoint
      ? 'Centered on your current position. Search for an address or click the map to place a pin.'
      : 'Search for an address, or click the map to place a pin. Drag the pin to fine-tune it.';

  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="address-map-search">Search address</label><input id="address-map-search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') searchAddress(event); }} maxLength={300} placeholder="Search an address" className="ui-input min-w-0 flex-1" /><button type="button" onClick={searchAddress} disabled={searching} className="ui-btn ui-btn-secondary ui-btn-sm shrink-0"><Search className="h-4 w-4" />{searching ? 'Searching' : 'Search'}</button><button type="button" onClick={applyCurrentLocation} disabled={locating} title="Use my current location" className="inline-flex shrink-0 items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-50">{locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}{locating ? 'Locating…' : 'Use my location'}</button></div>
    {(error || locationError) && <p role="alert" className="text-xs text-rose-700">{error || locationError}</p>}
    <div className="h-64 overflow-hidden border border-slate-200"><MapContainer center={center} zoom={zoom} scrollWheelZoom maxBounds={PH_BOUNDS} maxBoundsViscosity={1} className="h-full w-full"><PhBoundsController /><MapViewport center={center} zoom={zoom} /><MapPinEvents onPlace={setPin} /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{userPoint && <CurrentPositionLayer position={currentPosition} />}{coordsAvailable && <Marker position={[Number(latitude), Number(longitude)]} icon={defaultIcon} draggable eventHandlers={{ dragend: (event) => { const point = event.target.getLatLng(); setPin(point.lat, point.lng); } }} />}</MapContainer></div>
    <p className="text-xs text-slate-500">{hint} Map is limited to the Philippines.</p>
  </div>;
};

export default AddressMap;
