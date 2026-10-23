import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { suggestEducationItems } from '../../utils/educationSuggestions';

const EducationAutocompleteInput = ({
  value = '',
  onChange,
  type = 'school', // 'school' | 'degree' | 'field'
  placeholder = '',
  maxLength = 160,
  className = '',
  id,
  icon: Icon,
}) => {
  const generatedId = useId();
  const inputId = id || `edu-auto-${generatedId}`;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  const suggestions = useMemo(() => {
    return suggestEducationItems(value, type, 8);
  }, [value, type]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open || !listRef.current || activeIndex < 0) return;
    const item = listRef.current.children[activeIndex];
    if (item?.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const commit = (item) => {
    if (!item) return;
    onChange?.(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleChange = (e) => {
    onChange?.(e.target.value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActiveIndex((prev) => (suggestions.length ? (prev + 1) % suggestions.length : -1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (suggestions.length ? (prev - 1 + suggestions.length) % suggestions.length : -1));
      return;
    }
    if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        commit(suggestions[activeIndex]);
      }
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const showDropdown = open && suggestions.length > 0;

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        <input
          id={inputId}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-item-${activeIndex}` : undefined}
          autoComplete="off"
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            Icon ? 'pl-9' : ''
          } ${className}`}
        />
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          ref={listRef}
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((item, index) => {
            const isSelected = index === activeIndex;
            return (
              <li
                key={`${item}-${index}`}
                id={`${listId}-item-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(item)}
                className={`cursor-pointer px-3.5 py-2 text-sm transition-colors ${
                  isSelected ? 'bg-brand-50 text-brand-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default EducationAutocompleteInput;
