import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BriefcaseBusiness, Building2, ChevronLeft, ChevronRight, LayoutDashboard, Menu, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ProviderSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const approved = user?.businessVerification?.status === 'approved';
  const links = approved ? [
    { label: 'Overview', path: '/provider', icon: LayoutDashboard, exact: true },
    { label: 'Companies', path: '/provider/companies', icon: Building2 },
    { label: 'Job listings', path: '/provider/jobs', icon: BriefcaseBusiness },
  ] : [
    { label: 'Business verification', path: '/provider', icon: ShieldAlert, exact: true },
  ];

  const activeLink = (link) => link.exact
    ? location.pathname === link.path
    : location.pathname.startsWith(link.path);

  const items = (mobile = false) => links.map((link) => {
    const Icon = link.icon;
    const active = activeLink(link);
    return <Link
      key={link.path}
      to={link.path}
      onClick={() => mobile && setDrawerOpen(false)}
      title={collapsed && !mobile ? link.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-blue-50 text-blue-900 border border-blue-200/60 shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'} ${collapsed && !mobile ? 'justify-center px-2' : ''}`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
      {(!collapsed || mobile) && <span>{link.label}</span>}
    </Link>;
  });

  return <>
    <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 md:block ${collapsed ? 'w-[72px]' : 'w-60'}`}>
      <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'justify-between px-4'}`}>
        {!collapsed && <p className="ui-eyebrow">Provider workspace</p>}
        <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand provider sidebar' : 'Collapse provider sidebar'} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      {!collapsed && <div className="mx-3 mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <p className="truncate text-sm font-semibold text-slate-900">{user?.businessName || 'Your workspace'}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{user?.name || 'Provider account'}</p>
        <span className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${approved ? 'text-success-700' : 'text-warning-700'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${approved ? 'bg-success-600' : 'bg-warning-600'}`} aria-hidden="true" />
          {approved ? 'Verified provider' : 'Verification pending'}
        </span>
      </div>}
      <nav aria-label="Provider navigation" className="space-y-1 px-3">{items()}</nav>
      {!collapsed && !approved && <div className="absolute inset-x-3 bottom-4 border-t border-slate-100 pt-3">
        <Link to="/provider" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-warning-700 transition-colors hover:bg-warning-50">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          Complete verification
        </Link>
      </div>}
    </aside>
    <div className="border-b border-slate-200 bg-white px-4 py-2 md:hidden">
      <button type="button" onClick={() => setDrawerOpen(true)} className="ui-btn ui-btn-secondary ui-btn-sm"><Menu className="h-4 w-4" />Workspace menu</button>
      {drawerOpen && <div className="fixed inset-0 z-50 bg-slate-900/40" onClick={() => setDrawerOpen(false)}>
        <aside role="dialog" aria-modal="true" aria-label="Provider navigation" className="h-full w-[min(20rem,85vw)] bg-white p-4 shadow-popover" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><p className="ui-eyebrow">Provider workspace</p><button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.businessName || 'Your workspace'}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{user?.name || 'Provider account'}</p>
            <span className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${approved ? 'text-success-700' : 'text-warning-700'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${approved ? 'bg-success-600' : 'bg-warning-600'}`} aria-hidden="true" />
              {approved ? 'Verified provider' : 'Verification pending'}
            </span>
          </div>
          <nav className="space-y-1">{items(true)}</nav>
        </aside>
      </div>}
    </div>
  </>;
};

export default ProviderSidebar;