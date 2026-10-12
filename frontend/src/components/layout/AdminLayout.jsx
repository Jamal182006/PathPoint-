import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, Building2, ChevronLeft, ChevronRight, FileText, Menu, Server, ShieldCheck, Users, X } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Overview', icon: BarChart3, end: true },
  { to: '/admin/providers', label: 'Provider verification', icon: ShieldCheck },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/jobs', label: 'Job listings', icon: BriefcaseBusiness },
  { to: '/admin/applications', label: 'Applications', icon: FileText },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/system', label: 'System health', icon: Server },
];

const AdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const renderLinks = (mobile = false) => links.map(({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} onClick={() => mobile && setDrawerOpen(false)} title={collapsed && !mobile ? label : undefined}
      className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-3 py-2.5 text-xs font-semibold transition ${isActive ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} ${collapsed && !mobile ? 'justify-center px-2' : ''}`}>
      {({ isActive }) => <><Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-700' : 'text-slate-400'}`} />{(!collapsed || mobile) && <span>{label}</span>}</>}
    </NavLink>
  ));

  return <div className="mx-auto flex max-w-[1600px] flex-1 gap-4 px-4 py-6 sm:px-6 lg:gap-7 lg:px-8">
    <aside className={`sticky top-24 hidden h-[calc(100vh-7rem)] shrink-0 border-r border-slate-200 pr-3 transition-[width] duration-200 lg:block ${collapsed ? 'w-[64px]' : 'w-56'}`}>
      <div className={`mb-3 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'}`}>
        {!collapsed && <p className="text-[10px] font-bold uppercase text-slate-400">Administration</p>}
        <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
      </div>
      <nav aria-label="Admin navigation" className="space-y-1">{renderLinks()}</nav>
    </aside>
    <div className="min-w-0 flex-1">
      <div className="mb-4 lg:hidden">
        <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Menu className="h-4 w-4" />Administration</button>
      </div>
      {drawerOpen && <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" onClick={() => setDrawerOpen(false)}>
        <aside role="dialog" aria-modal="true" aria-label="Admin navigation" className="h-full w-[min(20rem,85vw)] bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between"><p className="text-xs font-bold uppercase text-slate-400">Administration</p><button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <nav className="space-y-1">{renderLinks(true)}</nav>
        </aside>
      </div>}
      {children}
    </div>
  </div>;
};

export default AdminLayout;
