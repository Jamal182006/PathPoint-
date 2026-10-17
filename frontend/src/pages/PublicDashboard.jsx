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
  FileText,
  ArrowRight,
  BadgeCheck,
  Clock,
} from 'lucide-react';

// Two role viewpoints of the same workspace, shown in the hero. The applicant
// panel is the visitor-facing value; the administrator panel makes the
// verification step visible instead of asserting it. Sample data only.
const applicantPipeline = [
  { stage: 'Saved', role: 'UX Researcher', company: 'Harbor Studio', tone: 'bg-slate-100 text-slate-600' },
  { stage: 'Applied', role: 'Product Designer', company: 'Cedar Health', tone: 'bg-sky-50 text-sky-700' },
  { stage: 'Interview', role: 'Frontend Engineer', company: 'Northstar', tone: 'bg-amber-50 text-amber-700', meta: 'Thu, 2:30 PM · Technical round' },
  { stage: 'Offer', role: 'Data Analyst', company: 'Brightpath', tone: 'bg-emerald-50 text-emerald-700' },
];

const verificationQueue = [
  { company: 'Northstar', status: 'Pending review', icon: Clock, tone: 'bg-warning-50 text-warning-700', meta: 'Submitted Sep 12' },
  { company: 'Cedar Health', status: 'Approved', icon: BadgeCheck, tone: 'bg-success-50 text-success-700', meta: 'Reviewed Sep 14' },
  { company: 'Brightpath', status: 'Pending review', icon: Clock, tone: 'bg-warning-50 text-warning-700', meta: 'Submitted Sep 13' },
];

const HeroPreview = () => (
  <figure className="relative">
    <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-100/60 via-transparent to-teal-100/50 blur-2xl" />
    <div className="space-y-4">
      {/* Applicant workspace */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p className="text-xs font-semibold text-slate-700">Applicant workspace</p>
        </div>
        <div className="space-y-3 p-4">
          {applicantPipeline.map((item) => (
            <div key={item.stage} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-xs">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{item.role}</p>
                <p className="truncate text-xs text-slate-500">{item.company}</p>
                {item.meta && <p className="mt-0.5 truncate text-xs text-slate-500">{item.meta}</p>}
              </div>
              <span className={`ui-badge ${item.tone}`}>{item.stage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Administrator verification queue */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="text-xs font-semibold text-slate-700">Administrator — verification queue</p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {verificationQueue.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.company} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-xs">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.company}</p>
                  <p className="truncate text-xs text-slate-500">{item.meta}</p>
                </div>
                <span className={`ui-badge ${item.tone}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    <figcaption className="mt-3 text-center text-xs text-slate-500">
      Illustrative views — sample data for the applicant workspace and the administrator’s verification queue.
    </figcaption>
  </figure>
);

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

      <div>
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
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Link to="/register" className="ui-btn ui-btn-primary ui-btn-lg">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 underline-offset-4 transition hover:text-indigo-700 hover:underline"
                >
                  Sign in
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
            <HeroPreview />
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
                  Create account
                </Link>
                <Link to="/login" className="ui-btn ui-btn-secondary ui-btn-lg">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

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
