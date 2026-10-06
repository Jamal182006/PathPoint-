import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Briefcase, CalendarCheck, Compass, LogIn, UserPlus } from 'lucide-react';

const PublicDashboard = () => {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <Link to="/" className="flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Compass className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">PathPoint</span>
          </Link>
        </header>

        <main className="py-12 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Your job search dashboard</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Keep every application moving forward.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Sign in to track applications, manage interviews, and measure your progress from one focused workspace.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <LogIn className="h-4 w-4" />
                Login to dashboard
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                <UserPlus className="h-4 w-4" />
                Create an account
              </Link>
            </div>
          </div>

          <section className="mt-14 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Briefcase className="h-6 w-6 text-indigo-600" />
              <h2 className="mt-4 text-base font-semibold text-slate-900">Application tracking</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Organize roles and follow each application through its pipeline stages.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <CalendarCheck className="h-6 w-6 text-amber-600" />
              <h2 className="mt-4 text-base font-semibold text-slate-900">Interview planning</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Keep interview dates and preparation tasks together in one calendar.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
              <h2 className="mt-4 text-base font-semibold text-slate-900">Progress insights</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">See your activity, conversion rates, and momentum over time.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PublicDashboard;
