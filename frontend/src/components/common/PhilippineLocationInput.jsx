import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { findPhilippineLocation, matchesPhilippineLocation, suggestPhilippineLocations } from '../../utils/phLocations';

// Text input with Philippine type-ahead suggestions.
// Only places from the Philippine city/province dataset can be suggested, so a
// location outside the country is never offered to the user.
const PhilippineLocationInput = ({
  value = '',
  onChange,
  onSelect,
  id,
  name,
  placeholder = 'Search a Philippine city or municipality',
  required = false,
  disabled = false,
  maxLength = 200,
  className = '',
  autoFocus = false,
}) => {
  const generatedId = useId();
  const inputId = id || `ph-location-${generatedId}`;
  const listId = `${inputId}-suggestions`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [highlighted, setHighlighted] = useState([]);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const suggestions = useMemo(() => suggestPhilippineLocations(value, 10), [value]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open || activeIndex < 0) {
      setHighlighted([]);
      return;
    }
    setHighlighted(suggestions.map((entry, index) => (index === activeIndex ? 'bg-brand-50 text-brand-900' : '')));
  }, [activeIndex, open, suggestions]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const option = listRef.current.children[activeIndex];
    if (option?.scrollIntoView) option.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const [isTouched, setIsTouched] = useState(false);

  const isValidPh = useMemo(() => {
    if (!value || !value.trim()) return true;
    return matchesPhilippineLocation(value);
  }, [value]);

  const handleBlur = () => {
    setIsTouched(true);
    if (value && value.trim()) {
      const match = findPhilippineLocation(value);
      if (match && match.label && match.label.toLowerCase() !== value.trim().toLowerCase()) {
        commit(match);
      }
    }
  };

  const commit = (entry) => {
    const label = entry?.label || entry?.city || '';
    if (!label) return;
    onChange?.(label);
    onSelect?.(entry);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleChange = (event) => {
    onChange?.(event.target.value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      setActiveIndex((current) => (suggestions.length ? (current + 1) % suggestions.length : -1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (suggestions.length ? (current - 1 + suggestions.length) % suggestions.length : -1));
      return;
    }
    if (event.key === 'Enter') {
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        event.preventDefault();
        commit(suggestions[activeIndex]);
        return;
      }
      if (open) {
        const match = findPhilippineLocation(value);
        if (match) {
          event.preventDefault();
          commit(match);
        }
      }
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const showSuggestions = open && suggestions.length > 0;

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <MapPin className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${!isValidPh && value ? 'text-amber-500' : 'text-slate-400'}`} />
        <input
          id={inputId}
          name={name}
          ref={inputRef}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 ${
            !isValidPh && value ? 'border-amber-400 bg-amber-50/20' : 'border-slate-300 bg-white'
          } ${className}`}
        />
      </div>
      {showSuggestions && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Philippine location suggestions"
          ref={listRef}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((entry, index) => (
            <li
              key={`${entry.label}-${index}`}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commit(entry)}
              className={`flex items-center justify-between cursor-pointer px-3.5 py-2.5 text-sm text-slate-700 hover:bg-brand-50 ${highlighted[index] || ''}`}
            >
              <div>
                <span className="font-semibold text-slate-900">{entry.kind === 'barangay' ? entry.barangay : entry.city}</span>
                <span className="text-slate-500">, {entry.kind === 'barangay' ? `${entry.municipality}, ${entry.province}` : entry.province}</span>
              </div>
              {entry.isAutocorrect && (
                <span className="ml-2 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                  Autocorrect
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {!isValidPh && value ? (
        <p className="mt-1 text-xs font-medium text-amber-600 flex items-center gap-1">
          <span>⚠️ Philippines only. Choose a city, municipality, or Pangasinan barangay from the suggestions.</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Philippines only. Search cities, municipalities, or Pangasinan barangays.</p>
      )}
    </div>
  );
};

export default PhilippineLocationInput;
