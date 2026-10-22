import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { findPhilippineLocation, suggestPhilippineLocations } from '../../utils/phLocations';

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
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 ${className}`}
        />
      </div>
      {showSuggestions && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Philippine location suggestions"
          ref={listRef}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-popover"
        >
          {suggestions.map((entry, index) => (
            <li
              key={`${entry.label}-${index}`}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commit(entry)}
              className={`cursor-pointer px-3 py-2 text-sm text-slate-700 ${highlighted[index] || ''}`}
            >
              <span className="font-semibold text-slate-900">{entry.city}</span>
              <span className="text-slate-500">, {entry.province}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-slate-500">Philippines only. Type to search cities and municipalities.</p>
    </div>
  );
};

export default PhilippineLocationInput;
