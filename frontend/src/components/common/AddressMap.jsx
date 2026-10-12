import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapPin, Search } from 'lucide-react';

const defaultIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const hasCoordinates = (latitude, longitude) => latitude !== '' && longitude !== '' && latitude != null && longitude != null && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
const MapViewport = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, map, zoom]);
  return null;
};

const MapPinEvents = ({ onPlace }) => {
  useMapEvents({ click: ({ latlng }) => onPlace(latlng.lat, latlng.lng) });
  return null;
};

export const LocationMap = ({ address = '', latitude, longitude, className = 'h-64', compact = false }) => {
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
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`);
      if (!response.ok) throw new Error('The map could not look up this address.');
      const results = await response.json();
      if (!results.length) throw new Error('No map location was found for this address.');
      setMapPoint([Number(results[0].lat), Number(results[0].lon)]);
    } catch (error) {
      setMapError(error.message || 'The map is temporarily unavailable.');
    } finally {
      setMapLoading(false);
    }
  };

  const mapCenter = mapPoint || [20, 0];

  if (!hasCoordinates(latitude, longitude)) {
    return <><div className={`flex items-start gap-2 text-slate-600 ${compact ? 'py-0.5 text-xs' : 'border-y border-slate-200 py-3 text-sm'}`}><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" /><div className="min-w-0"><p>{address || 'Location not provided'}</p>{address && <button type="button" onClick={openMap} className="mt-1 inline-block text-xs font-semibold text-indigo-700 hover:underline">View map</button>}</div></div>{mapOpen && <LocationMapDialog address={address} center={mapCenter} loading={mapLoading} error={mapError} onClose={() => setMapOpen(false)} />}</>;
  }

  const center = [Number(latitude), Number(longitude)];
  return <><div className={compact ? 'space-y-1' : 'space-y-2'}><div className={`${className} overflow-hidden border border-slate-200`}><MapContainer center={center} zoom={14} scrollWheelZoom={false} className="h-full w-full"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={center} icon={defaultIcon} /></MapContainer></div><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><p className="min-w-0 truncate text-slate-600">{address || `${center[0].toFixed(5)}, ${center[1].toFixed(5)}`}</p><button type="button" onClick={openMap} className="shrink-0 font-semibold text-indigo-700 hover:underline">View map</button></div></div>{mapOpen && <LocationMapDialog address={address} center={center} onClose={() => setMapOpen(false)} />}</>;
};

const LocationMapDialog = ({ address, center, loading = false, error = '', onClose }) => <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
  <section role="dialog" aria-modal="true" aria-labelledby="location-map-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-xl">
    <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3"><div className="min-w-0"><h2 id="location-map-title" className="text-base font-bold text-slate-900">Location map</h2><p className="mt-1 truncate text-xs text-slate-600">{address || 'Selected location'}</p></div><button type="button" autoFocus onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Close</button></header>
    <div className="min-h-0 flex-1 p-3">{loading ? <div role="status" className="flex h-64 items-center justify-center text-sm text-slate-500">Finding this address on the map…</div> : error ? <p role="alert" className="border-y border-amber-200 py-4 text-sm text-amber-900">{error} Address: {address}</p> : <div className="h-[min(65vh,34rem)] overflow-hidden border border-slate-200"><MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full"><MapViewport center={center} zoom={14} /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={center} icon={defaultIcon} /></MapContainer></div>}</div>
  </section>
</div>;

const AddressMap = ({ location = '', formattedAddress = '', latitude, longitude, onChange, readOnly = false, compact = false, className }) => {
  const [search, setSearch] = useState(formattedAddress || location);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const coordsAvailable = hasCoordinates(latitude, longitude);
  const center = coordsAvailable ? [Number(latitude), Number(longitude)] : [20, 0];
  const zoom = coordsAvailable ? 14 : 2;

  useEffect(() => { setSearch(formattedAddress || location); }, [formattedAddress, location]);

  const setPin = async (lat, lon) => {
    onChange({ latitude: lat, longitude: lon });
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
      if (!response.ok) return;
      const result = await response.json();
      const address = String(result.display_name || '').slice(0, 300);
      if (address) {
        setSearch(address);
        onChange({ latitude: lat, longitude: lon, location: address.slice(0, 200), formattedAddress: address });
      }
    } catch {
      setError('Coordinates saved; address lookup was unavailable.');
    }
  };

  const searchAddress = async (event) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Address search is unavailable. Try again later.');
      const results = await response.json();
      if (!results.length) throw new Error('No matching address found. Try a more specific search.');
      const result = results[0];
      const address = String(result.display_name || '').slice(0, 300);
      const next = { latitude: Number(result.lat), longitude: Number(result.lon), location: address.slice(0, 200), formattedAddress: address };
      onChange(next);
      setSearch(result.display_name);
    } catch (searchError) {
      setError(searchError.message || 'Unable to search this address.');
    } finally {
      setSearching(false);
    }
  };

  if (readOnly) return <LocationMap address={formattedAddress || location} latitude={latitude} longitude={longitude} compact={compact} className={className} />;

  return <div className="space-y-2">
    <form onSubmit={searchAddress} className="flex gap-2"><label className="sr-only" htmlFor="address-map-search">Search address</label><input id="address-map-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={300} placeholder="Search an address" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" /><button type="submit" disabled={searching} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><Search className="h-4 w-4" />{searching ? 'Searching' : 'Search'}</button></form>
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    <div className="h-64 overflow-hidden border border-slate-200"><MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full"><MapViewport center={center} zoom={zoom} /><MapPinEvents onPlace={setPin} /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{coordsAvailable && <Marker position={center} icon={defaultIcon} draggable eventHandlers={{ dragend: (event) => { const point = event.target.getLatLng(); setPin(point.lat, point.lng); } }} />}</MapContainer></div>
    <p className="text-[11px] text-slate-500">Search for an address, or click the map to place a pin. Drag the pin to fine-tune it.</p>
  </div>;
};

export default AddressMap;