import React from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { useToast } from './Toast';
import { trackedItemKey, useTrackedItems } from '../../context/TrackedItemsContext';

const PinButton = ({ itemType, itemId, applicationKind, details = {}, className = '' }) => {
  const { items, busyKeys, togglePin } = useTrackedItems();
  const { toast } = useToast();
  const reference = { itemType, itemId: String(itemId), ...(applicationKind ? { applicationKind } : {}) };
  const key = trackedItemKey(reference);
  const pinned = items.some((item) => trackedItemKey(item) === key);
  const busy = busyKeys.has(key);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await togglePin(reference, details);
      toast(pinned ? 'Removed from tracked items.' : 'Added to tracked items.', 'success');
    } catch (error) {
      toast(error.message || 'Unable to update tracked items.', 'error');
    }
  };

  return <button type="button" onClick={handleClick} disabled={busy || !itemId} aria-pressed={pinned} aria-label={`${pinned ? 'Unpin' : 'Pin'} ${details.title || itemType}`} title={pinned ? 'Remove from tracked items' : 'Track this item'} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 ${className}`}>
    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={`h-4 w-4 ${pinned ? 'fill-amber-400 text-amber-700' : ''}`} />}
  </button>;
};

export default PinButton;
