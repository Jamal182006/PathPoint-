import { useEffect, useState } from 'react';

/**
 * Delays a fast-changing value so typing in a filter does not fire a request
 * on every keystroke. The input stays instant; only the expensive work waits.
 *
 * @param {*} value value to debounce
 * @param {number} delay quiet period in milliseconds
 */
export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
