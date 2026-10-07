import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, Building2, FileText, Server, ShieldCheck, Users } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Overview', icon: BarChart3, end: true },
  { to: '/admin/providers', label: 'Provider verification', icon: ShieldCheck },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/jobs', label: 'Job listings', icon: BriefcaseBusiness },
  { to: '/admin/applications', label: 'Applications', icon: FileText },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/system', label: 'System health', icon: Server },
];

const AdminLayout = ({ children }) => (
  <div className="mx-auto flex max-w-[1600px] flex-1 gap-7 px-4 py-6 sm:px-6 lg:px-8">
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav aria-label="Admin navigation" className="sticky top-24 space-y-1 border-r border-slate-200 pr-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Administration</p>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-3 py-2.5 text-xs font-semibold transition ${isActive ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            {({ isActive }) => <><Icon className={`h-4 w-4 ${isActive ? 'text-indigo-700' : 'text-slate-400'}`} /><span>{label}</span></>}
          </NavLink>
        ))}
      </nav>
    </aside>
    <div className="min-w-0 flex-1">
      <nav aria-label="Admin navigation" className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2 lg:hidden">
        {links.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `shrink-0 rounded-md px-3 py-2 text-xs font-semibold ${isActive ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-100'}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  </div>
);

export default AdminLayout;
