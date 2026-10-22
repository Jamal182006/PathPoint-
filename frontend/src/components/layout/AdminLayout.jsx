import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, Building2, ChevronLeft, ChevronRight, FileText, Menu, ShieldCheck, Users, X } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Overview', icon: BarChart3, end: true },
  { to: '/admin/providers', label: 'Business Verification', icon: ShieldCheck },
  { to: '/admin/companies', label: 'Company Listings', icon: Building2 },
  { to: '/admin/jobs', label: 'Job listings', icon: BriefcaseBusiness },
  { to: '/admin/applications', label: 'Applications', icon: FileText },
  { to: '/admin/users', label: 'Users', icon: Users },
];

const AdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const renderLinks = (mobile = false) => links.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={() => mobile && setDrawerOpen(false)}
      title={collapsed && !mobile ? label : undefined}
      className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} ${collapsed && !mobile ? 'justify-center px-2' : ''}`}
    >
      {({ isActive }) => (<><Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} aria-hidden="true" />{(!collapsed || mobile) && <span>{label}</span>}</>)}
    </NavLink>
  ));

  return (
    <div className="ui-container flex flex-1 gap-4 py-6 lg:gap-7">
      <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-slate-200 pr-3 transition-[width] duration-200 lg:block ${collapsed ? 'w-[72px]' : 'w-56'}`}>
        <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'justify-between px-3'}`}>
          {!collapsed && <p className="ui-eyebrow">Administration</p>}
          <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
        </div>
        <nav aria-label="Admin navigation" className="space-y-1">{renderLinks()}</nav>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-4 lg:hidden">
          <button type="button" onClick={() => setDrawerOpen(true)} className="ui-btn ui-btn-secondary ui-btn-sm"><Menu className="h-4 w-4" />Administration</button>
        </div>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden" onClick={() => setDrawerOpen(false)}>
            <aside role="dialog" aria-modal="true" aria-label="Admin navigation" className="h-full w-[min(20rem,85vw)] bg-white p-4 shadow-popover" onClick={(event) => event.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between"><p className="ui-eyebrow">Administration</p><button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
              <nav className="space-y-1">{renderLinks(true)}</nav>
            </aside>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
