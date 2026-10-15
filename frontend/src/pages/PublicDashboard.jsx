import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  LogIn,
  UserPlus,
  Briefcase,
  Building2,
  ShieldCheck,
  Check,
  Search,
  FileText,
  CalendarCheck,
  ArrowRight,
  BadgeCheck,
} from 'lucide-react';

const roles = [
  {
    key: 'applicants',
    icon: Briefcase,
    title: 'For applicants',
    summary: 'Find company-backed roles and keep every application moving.',
    points: ['Search verified company listings', 'Track status from saved to offer', 'Plan interviews and log your work'],
    accent: 'text-teal-700',
    ring: 'bg-teal-50 ring-teal-100',
  },
  {
    key: 'providers',
    icon: Building2,
    title: 'For providers',
    summary: 'Publish roles and manage applicants from one console.',
    points: ['Submit a company for verification', 'Create and publish job listings', 'Review and respond to applications'],
    accent: 'text-blue-700',
    ring: 'bg-blue-50 ring-blue-100',
  },
  {
    key: 'admins',
    icon: ShieldCheck,
    title: 'For administrators',
    summary: 'Verify providers, approve listings, and watch the pipeline.',
    points: ['Review provider and company records', 'Approve or reject job listings', 'Monitor activity and platform metrics'],
    accent: 'text-indigo-700',
    ring: 'bg-indigo-50 ring-indigo-100',
  },
];

const pipeline = [
  { stage: 'Saved', role: 'UX Researcher', company: 'Harbor Studio', tone: 'bg-slate-100 text-slate-600' },
  { stage: 'Applied', role: 'Product Designer', company: 'Cedar Health', tone: 'bg-sky-50 text-sky-700' },
  { stage: 'Interview', role: 'Frontend Engineer', company: 'Northstar', tone: 'bg-amber-50 text-amber-700' },
  { stage: 'Offer', role: 'Data Analyst', company: 'Brightpath', tone: 'bg-emerald-50 text-emerald-700' },
];

const ProductPreview = () => (
  <div aria-hidden="true" className="relative">
    <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-100/60 via-transparent to-teal-100/50 blur-2xl" />
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 truncate text-xs font-medium text-slate-500">pathpoint / my applications</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-28 rounded-full bg-slate-200" />
          <div className="h-2.5 w-16 rounded-full bg-slate-100" />
        </div>
        {pipeline.map((item) => (
          <div key={item.stage} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-xs">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{item.role}</p>
              <p className="truncate text-xs text-slate-500">{item.company}</p>
            </div>
            <span className={`ui-badge ${item.tone}`}>{item.stage}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="absolute -bottom-5 -right-4 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-elevated sm:flex">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <CalendarCheck className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-semibold text-slate-800">Interview scheduled</p>
        <p className="text-[11px] text-slate-500">Thu, 2:30 PM · Technical round</p>
      </div>
    </div>
  </div>
);

const PublicDashboard = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="ui-container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Compass className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">PathPoint</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="ui-btn ui-btn-ghost ui-btn-sm sm:px-4 sm:py-2.5 sm:text-sm">
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
            <Link to="/register" className="ui-btn ui-btn-primary ui-btn-sm sm:px-4 sm:py-2.5 sm:text-sm">
              <UserPlus className="h-4 w-4" />
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="ui-container grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="animate-fade-in">
              <h1 className="max-w-xl text-4xl font-bold leading-[1.05] tracking-tightest text-slate-900 sm:text-5xl lg:text-6xl">
                Keep every application moving forward.
              </h1>
              <p className="mt-6 max-w-measure text-lg leading-8 text-slate-600">
                PathPoint connects applicants, providers, and administrators in one verified hiring workflow. Track applications,
                manage interviews, and measure your progress from one focused workspace.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/register" className="ui-btn ui-btn-primary ui-btn-lg">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className="ui-btn ui-btn-secondary ui-btn-lg">
                  <LogIn className="h-4 w-4" />
                  Sign in to your workspace
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-brand-600" />
                  Verified companies and providers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-600" />
                  Role-based access
                </li>
              </ul>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* Roles — three points of view, one workflow */}
        <section className="border-y border-slate-200 bg-white py-16 lg:py-20">
          <div className="ui-container">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                One workflow, three points of view.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Each role gets exactly the tools it needs — and only what it needs.
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-3">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <article
                    key={role.key}
                    className="group flex flex-col bg-white p-7 transition-colors duration-200 hover:bg-slate-50/80"
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${role.ring} ${role.accent}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900">{role.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{role.summary}</p>
                    <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
                      {role.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5 text-sm text-slate-600">
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${role.accent}`} />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="py-16 lg:py-24">
          <div className="ui-container">
            <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-teal-50 px-8 py-14 text-center shadow-sm sm:px-14">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Start with the role that fits you.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
                Create an applicant account to find work, or register as a provider to publish roles for your company.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/register" className="ui-btn ui-btn-primary ui-btn-lg">
                  <UserPlus className="h-4 w-4" />
                  Create an account
                </Link>
                <Link to="/login" className="ui-btn ui-btn-secondary ui-btn-lg">
                  <Search className="h-4 w-4" />
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="ui-container flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5 text-slate-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Compass className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">PathPoint</span>
          </div>
          <p className="text-xs text-slate-500">
            A verified workflow for applicants, providers, and administrators.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicDashboard;
