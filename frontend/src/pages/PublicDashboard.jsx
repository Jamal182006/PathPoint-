import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/common/BrandLogo';
import {
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
    <div className="space-y-4">
      {/* Applicant workspace */}
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p className="text-xs font-semibold text-slate-700">Applicant workspace</p>
        </div>
        {/* pb-6 gives the floating review card clean whitespace to dock into */}
        <div className="space-y-3 p-4 pb-6">
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

      {/* Administrator verification queue — a floating review layer docked over
          the workspace edge. Prominent surfaces drop the border and carry the
          popover shadow (elevation contract); it arrives after the base card
          so the depth reads as sequence, not decoration. */}
      <div className="animate-fade-up relative z-10 rounded-2xl bg-white shadow-popover lg:-ml-6 lg:-mt-5 lg:mr-10" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-700">
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
    <figcaption className="mt-4 text-center text-xs text-slate-500 lg:mt-6">
      Illustrative views — sample data for the applicant workspace and the administrator’s verification queue.
    </figcaption>
  </figure>
);

// One workflow, viewed from each role. Selecting a role reveals that role's
// side of the same records — the tabs replace three parallel card columns.
const roleViews = [
  {
    key: 'applicants',
    icon: Briefcase,
    title: 'Applicants',
    summary: 'Find company-backed roles and keep every application moving.',
    points: ['Search verified company listings', 'Track status from saved to offer', 'Plan interviews and log your work'],
    selected: 'border-teal-300 bg-teal-50/60',
    iconActive: 'bg-teal-600 text-white',
    check: 'text-teal-600',
    steps: [
      { label: 'Saved', tone: 'bg-slate-100 text-slate-600' },
      { label: 'Applied', tone: 'bg-sky-50 text-sky-700' },
      { label: 'Interview', tone: 'bg-amber-50 text-amber-700' },
      { label: 'Offer', tone: 'bg-emerald-50 text-emerald-700' },
    ],
  },
  {
    key: 'providers',
    icon: Building2,
    title: 'Providers',
    summary: 'Publish roles and manage applicants from one console.',
    points: ['Submit a company for verification', 'Create and publish job listings', 'Review and respond to applications'],
    selected: 'border-blue-300 bg-blue-50/60',
    iconActive: 'bg-blue-600 text-white',
    check: 'text-blue-600',
    steps: [
      { label: 'Company review', tone: 'bg-blue-50 text-blue-700' },
      { label: 'Job listings', tone: 'bg-sky-50 text-sky-700' },
      { label: 'Applicants', tone: 'bg-emerald-50 text-emerald-700' },
    ],
  },
  {
    key: 'admins',
    icon: ShieldCheck,
    title: 'Administrators',
    summary: 'Verify providers, approve listings, and watch the pipeline.',
    points: ['Review provider and company records', 'Approve or reject job listings', 'Monitor activity and platform metrics'],
    selected: 'border-brand-300 bg-brand-50/60',
    iconActive: 'bg-brand-600 text-white',
    check: 'text-brand-600',
    steps: [
      { label: 'Verify providers', tone: 'bg-brand-50 text-brand-700' },
      { label: 'Review listings', tone: 'bg-warning-50 text-warning-700' },
      { label: 'Platform metrics', tone: 'bg-success-50 text-success-700' },
    ],
  },
];

const verificationSteps = [
  {
    icon: Building2,
    title: 'Providers submit their business',
    body: 'Companies send their registration details and documents before they can publish anything on PathPoint.',
  },
  {
    icon: ShieldCheck,
    title: 'An administrator reviews it',
    body: 'Our team checks provider records, company information, and every job listing individually.',
  },
  {
    icon: BadgeCheck,
    title: 'Approved work goes live',
    body: 'Verified companies publish roles applicants can trust, with status visible at every step.',
  },
];

const PublicDashboard = () => {
  const [activeRole, setActiveRole] = useState('applicants');

  const handleTabKey = (event, index) => {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    const next = (index + direction + roleViews.length) % roleViews.length;
    setActiveRole(roleViews[next].key);
    document.getElementById(`role-tab-${roleViews[next].key}`)?.focus();
  };

  const activeView = roleViews.find((view) => view.key === activeRole);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="ui-container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo role="brand" size={30} />
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
                  className="text-sm font-semibold text-slate-700 underline-offset-4 transition hover:text-brand-700 hover:underline"
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
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-600" />
                  Interviews and work logs built in
                </li>
              </ul>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* Roles — one workflow, viewed from each role */}
        <section className="border-y border-slate-200 bg-white py-16 lg:py-20">
          <div className="ui-container grid items-start gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16">
            <div>
              <h2 className="max-w-md text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                One platform, three points of view.
              </h2>
              <p className="mt-4 max-w-measure text-base leading-7 text-slate-600">
                Each role gets exactly the tools it needs — and only what it needs. Pick a role to see its side of the same workflow.
              </p>

              <div role="tablist" aria-label="Platform roles" aria-orientation="vertical" className="mt-8 flex flex-col gap-3">
                {roleViews.map((view, index) => {
                  const Icon = view.icon;
                  const selected = view.key === activeRole;
                  return (
                    <button
                      key={view.key}
                      id={`role-tab-${view.key}`}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      aria-controls={`role-panel-${view.key}`}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActiveRole(view.key)}
                      onKeyDown={(event) => handleTabKey(event, index)}
                      className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:ring-offset-2 ${selected ? `${view.selected} shadow-xs` : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'}`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${selected ? `${view.iconActive} text-white` : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">{view.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-600">{view.summary}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              key={activeView.key}
              role="tabpanel"
              id={`role-panel-${activeView.key}`}
              aria-labelledby={`role-tab-${activeView.key}`}
              className="animate-tab-panel ui-panel p-7 sm:p-8"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${activeView.iconActive}`}>
                  <activeView.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{activeView.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{activeView.summary}</p>
              <ul className="mt-5 space-y-3">
                {activeView.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${activeView.check}`} aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="ui-label mb-2.5">Your workflow</p>
                <div className="flex flex-wrap items-center gap-2">
                  {activeView.steps.map((step, index) => (
                    <React.Fragment key={step.label}>
                      {index > 0 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />}
                      <span className={`ui-badge ${step.tone}`}>{step.label}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verification — the review behind every listing */}
        <section className="py-16 lg:py-20">
          <div className="ui-container">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Every listing is reviewed before it goes live.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                PathPoint verifies providers and companies so applicants can trust the roles they apply to.
              </p>
            </div>

            <div className="mt-12 grid gap-10 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start md:gap-8">
              {verificationSteps.map((step, index) => (
                <React.Fragment key={step.title}>
                  {index > 0 && (
                    <div className="hidden pt-3.5 md:flex md:justify-center" aria-hidden="true">
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                    </div>
                  )}
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <step.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-1.5 max-w-measure text-sm leading-6 text-slate-600">{step.body}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action — one path per role */}
        <section className="pb-16 lg:pb-24">
          <div className="ui-container">
            <div className="ui-panel overflow-hidden">
              <div className="px-8 pt-12 text-center sm:px-14">
                <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Start in the role that fits you.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
                  Create an applicant account to find work, or register as a provider to publish roles for your company.
                </p>
              </div>

              <div className="mt-10 grid gap-px bg-slate-200 sm:grid-cols-2">
                <div className="bg-white px-8 py-9 text-center sm:px-10">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                    <Briefcase className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Looking for work</h3>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-slate-600">
                    Create one profile and apply to verified roles in a couple of clicks.
                  </p>
                  <Link to="/register" className="ui-btn ui-btn-primary mt-6">
                    <UserPlus className="h-4 w-4" />
                    Create applicant account
                  </Link>
                </div>
                <div className="bg-white px-8 py-9 text-center sm:px-10">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Hiring for your company</h3>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-slate-600">
                    Register your business, complete verification, and start publishing roles.
                  </p>
                  <Link to="/register?role=provider" className="ui-btn ui-btn-secondary mt-6">
                    Register your company
                  </Link>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/70 px-8 py-4 text-center text-xs text-slate-500">
                Already on PathPoint?{' '}
                <Link to="/login" className="font-semibold text-brand-700 underline-offset-4 transition hover:text-brand-900 hover:underline">
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
            <BrandLogo role="brand" size={24} />
            <span className="text-sm font-semibold">PathPoint</span>
          </div>
          <nav className="flex items-center gap-5 text-xs font-medium text-slate-600">
            <Link to="/login" className="underline-offset-4 transition hover:text-brand-700 hover:underline">Sign in</Link>
            <Link to="/register" className="underline-offset-4 transition hover:text-brand-700 hover:underline">Create account</Link>
          </nav>
          <p className="text-xs text-slate-500">
            A verified workflow for applicants, providers, and administrators.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicDashboard;
