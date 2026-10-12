import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiAdapter } from '../services/apiAdapter';
import { useAuth } from './AuthContext';

const TrackedItemsContext = createContext(null);
export const trackedItemKey = ({ itemType, itemId, applicationKind = '' }) => `${itemType}:${applicationKind}:${itemId}`;

export const TrackedItemsProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [busyKeys, setBusyKeys] = useState(() => new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.role !== 'user') {
      setItems([]);
      return [];
    }
    setLoading(true);
    try {
      const pinnedItems = await apiAdapter.getPinnedItems();
      setItems(pinnedItems);
      return pinnedItems;
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    let active = true;
    if (user?.role !== 'user') {
      setItems([]);
      return undefined;
    }
    apiAdapter.getPinnedItems()
      .then((pinnedItems) => { if (active) setItems(pinnedItems); })
      .catch((error) => console.warn('[Tracked items] Unable to load pins:', error.message))
      .finally(() => { if (active) setLoading(false); });
    setLoading(true);
    return () => { active = false; };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user?.role !== 'user') return undefined;
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh().catch((error) => console.warn('[Tracked items] Unable to refresh pins:', error.message));
    };
    const intervalId = window.setInterval(syncWhenVisible, 30000);
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', syncWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', syncWhenVisible);
    };
  }, [refresh, user?.role]);

  const isPinned = useCallback((reference) => items.some((item) => trackedItemKey(item) === trackedItemKey(reference)), [items]);

  const togglePin = useCallback(async (reference, details = {}) => {
    const key = trackedItemKey(reference);
    if (busyKeys.has(key)) return;
    const wasPinned = items.some((item) => trackedItemKey(item) === key);
    const previousItem = items.find((item) => trackedItemKey(item) === key);
    setBusyKeys((current) => new Set(current).add(key));
    setItems((current) => wasPinned
      ? current.filter((item) => trackedItemKey(item) !== key)
      : [...current, { ...reference, ...details, id: `optimistic-${key}`, itemType: reference.itemType, itemId: reference.itemId, applicationKind: reference.applicationKind }]);

    try {
      if (wasPinned) await apiAdapter.unpinItem(reference);
      else await apiAdapter.pinItem(reference);
    } catch (error) {
      setItems((current) => {
        if (!wasPinned) return current.filter((item) => trackedItemKey(item) !== key);
        return current.some((item) => trackedItemKey(item) === key) || !previousItem ? current : [...current, previousItem];
      });
      throw error;
    } finally {
      setBusyKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }

    try { await refresh(); } catch (error) { console.warn('[Tracked items] Pin saved, but refresh failed:', error.message); }
  }, [busyKeys, items, refresh]);

  const value = useMemo(() => ({ items, loading, isPinned, togglePin, refresh, busyKeys }), [items, loading, isPinned, togglePin, refresh, busyKeys]);
  return <TrackedItemsContext.Provider value={value}>{children}</TrackedItemsContext.Provider>;
};

export const useTrackedItems = () => {
  const context = useContext(TrackedItemsContext);
  if (!context) throw new Error('useTrackedItems must be used within a TrackedItemsProvider');
  return context;
};
