import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Building2, BriefcaseBusiness, Loader2 } from 'lucide-react';
import PinButton from '../common/PinButton';
import { useTrackedItems } from '../../context/TrackedItemsContext';

const TrackedItemsWidget = () => {
  const { items, loading } = useTrackedItems();

  return <section aria-labelledby="tracked-items-heading" className="mb-6 border-y border-slate-200 py-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 id="tracked-items-heading" className="flex items-center gap-2 text-base font-semibold text-slate-900"><Bookmark className="h-4 w-4 text-amber-600" />Pinned / Tracked</h2><p className="mt-1 text-xs text-slate-500">Companies, jobs, and applications you follow.</p></div>
      <span className="text-xs text-slate-500">{items.length} tracked</span>
    </div>
    {loading ? <div className="flex justify-center py-6 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
      : items.length ? <div className="mt-2 divide-y divide-slate-200">{items.map((item) => {
        const Icon = item.itemType === 'company' ? Building2 : BriefcaseBusiness;
        return <article key={`${item.itemType}-${item.applicationKind || ''}-${item.itemId}`} className="flex items-center gap-3 py-3">
          <Icon className="h-4 w-4 shrink-0 text-slate-500" />
          <div className="min-w-0 flex-1"><Link to={item.href || '/my-applications'} className="truncate text-sm font-semibold text-slate-900 hover:text-brand-700">{item.title}</Link><p className="truncate text-xs text-slate-500">{item.subtitle} · {item.itemType === 'application' ? 'Application' : item.itemType === 'company' ? 'Company' : 'Job'} · {item.status}</p><p className="truncate text-xs text-slate-500">{item.latestUpdate}</p></div>
          <PinButton itemType={item.itemType} itemId={item.itemId} applicationKind={item.applicationKind} details={item} />
        </article>;
      })}</div> : <div className="ui-empty mt-3"><p className="text-sm font-semibold text-slate-800">Nothing pinned yet</p><p className="mt-1 text-xs text-slate-500">Pin a company, job, or application to keep it close.</p></div>}
  </section>;
};

export default TrackedItemsWidget;
