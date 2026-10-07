import React from 'react';
import { Link } from 'react-router-dom';
import { Award, CheckCircle2, DollarSign } from 'lucide-react';

export const OfferComparison = ({ applications = [] }) => {
  const offers = applications.filter((application) => application.status === 'Offered');

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="offer-comparison-title">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Award className="h-5 w-5" /></div>
        <div>
          <h2 id="offer-comparison-title" className="text-sm font-bold text-slate-900">Your job offers</h2>
          <p className="text-xs text-slate-500">Offers saved in your application tracker.</p>
        </div>
      </div>

      {offers.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {offers.map((offer) => (
            <article key={offer._id || offer.id} className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">{offer.company}</h3>
                  <p className="mt-1 truncate text-sm text-indigo-700">{offer.role}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> Offer</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-emerald-200 pt-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><DollarSign className="h-4 w-4 text-emerald-700" />{offer.salaryRange || 'Salary not added'}</span>
                <Link to={`/applications/${offer._id || offer.id}`} className="text-xs font-semibold text-indigo-700 hover:underline">View details</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">When you mark an application as offered, it will appear here.</p>
      )}
    </section>
  );
};

export default OfferComparison;
