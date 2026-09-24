import React from 'react';
import { Award, DollarSign, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';

export const OfferComparison = ({ applications = [] }) => {
  const offeredApps = applications.filter((a) => a.status === 'Offered');

  // Fallback demo offers if none yet to showcase calculator
  const displayOffers =
    offeredApps.length > 0
      ? offeredApps
      : [
          {
            _id: 'demo-off-1',
            company: 'Spotify',
            role: 'Web Platform Engineer',
            salaryRange: '$150,000 Base',
            bonus: '$35,000 Signing Bonus',
            equity: '$50,000 / 4 yrs ($12.5k/yr)',
            totalYear1: '$197,500',
            deadline: 'In 12 days',
          },
          {
            _id: 'demo-off-2',
            company: 'Canva',
            role: 'Frontend Systems Engineer',
            salaryRange: '$140,000 Base',
            bonus: '$20,000 Signing Bonus',
            equity: '$40,000 / 4 yrs ($10k/yr)',
            totalYear1: '$170,000',
            deadline: 'In 18 days',
          },
        ];

  const isDemo = offeredApps.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Job Offer Evaluation & Compensation Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              {isDemo
                ? 'Sample Offer Benchmarking (Move applications to "Offered" to evaluate your real offers)'
                : `Comparing ${offeredApps.length} active job offer(s)`}
            </p>
          </div>
        </div>

        {isDemo && (
          <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
            Interactive Preview
          </span>
        )}
      </div>

      {/* Side-by-side comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayOffers.map((offer, idx) => (
          <div
            key={offer._id || idx}
            className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-base">{offer.company}</h4>
                <p className="text-xs text-indigo-600 font-semibold">{offer.role}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Offer Confirmed</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-100">
              <div className="p-2 rounded-lg bg-white border border-emerald-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Base Salary
                </span>
                <span className="font-bold text-slate-800">
                  {offer.salaryRange || '$145,000'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white border border-emerald-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Signing Bonus
                </span>
                <span className="font-bold text-slate-800">
                  {offer.bonus || '$25,000'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white border border-emerald-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Equity / RSUs
                </span>
                <span className="font-bold text-slate-800">
                  {offer.equity || '$40,000 / 4 yrs'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-emerald-100/70 border border-emerald-200">
                <span className="text-emerald-800 block text-[10px] uppercase font-bold">
                  Est. Year 1 Comp
                </span>
                <span className="font-extrabold text-emerald-900 text-sm">
                  {offer.totalYear1 || '$180,000'}
                </span>
              </div>
            </div>

            {offer.deadline && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Decision Window: <strong>{offer.deadline}</strong></span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OfferComparison;
