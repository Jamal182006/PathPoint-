import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BackendStatusModal from '../common/BackendStatusModal';
import NotificationBell from './NotificationBell';
import {
  Compass,
  LayoutDashboard,
  Calendar,
  ShieldAlert,
  Server,
  BriefcaseBusiness,
  FileText,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [backendModalOpen, setBackendModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target)) {
        setMoreDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
        setMoreDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setUserDropdownOpen(false);
    setMoreDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Adaptive nav links based on role
  const candidateNavLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Jobs', path: '/jobs', icon: BriefcaseBusiness },
    { label: 'My Applications', path: '/my-applications', icon: FileText },
    { label: 'Work log', path: '/work-log', icon: Calendar },
    { label: 'Interviews', path: '/interviews', icon: Calendar },
  ];

  const navLinks = isAdmin || user?.role === 'provider' ? [] : candidateNavLinks;
  const primaryNavLinks = navLinks.slice(0, 4);
  const moreNavLinks = navLinks.slice(4);

  const isActive = (link) => {
    if (link.exact) {
      return location.pathname === link.path;
    }
    if (link.path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(link.path);
  };

  const handleLogout = () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_4px_18px_-16px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-8">
              <Link to={isAdmin ? '/admin' : user?.role === 'provider' ? '/provider' : '/dashboard'} className="flex items-center gap-2.5 group">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 ${
                    isAdmin
                      ? 'bg-gradient-to-tr from-slate-900 to-indigo-700 shadow-indigo-200'
                      : 'bg-gradient-to-tr from-indigo-600 to-brand-500 shadow-indigo-200'
                  }`}
                >
                  {isAdmin ? <ShieldAlert className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-lg leading-tight tracking-tight">
                      PathPoint
                    </span>
                    {isAdmin && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Admin Suite
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-600">
                    {isAdmin ? 'Counselor Portal' : 'Job Tracker'}
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
                {primaryNavLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link);
                  return (
                    <Link
                      key={link.path + link.label}
                      to={link.path}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        active
                          ? 'bg-indigo-50 text-indigo-800 shadow-sm shadow-indigo-950/5'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
                {moreNavLinks.length > 0 && (
                  <div className="relative" ref={moreDropdownRef}>
                    <button
                      type="button"
                      aria-expanded={moreDropdownOpen}
                      onClick={() => setMoreDropdownOpen((open) => !open)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-200 ${
                        moreNavLinks.some(isActive) || moreDropdownOpen
                          ? 'bg-indigo-50 text-indigo-800'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950'
                      }`}
                    >
                      More
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {moreDropdownOpen && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-52 origin-top-left rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-fade-in">
                        {moreNavLinks.map((link) => {
                          const Icon = link.icon;
                          const active = isActive(link);
                          return (
                            <Link
                              key={link.path + link.label}
                              to={link.path}
                              onClick={() => setMoreDropdownOpen(false)}
                              aria-current={active ? 'page' : undefined}
                              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                active ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                              }`}
                            >
                              <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </nav>
            </div>

            {/* Right Header Actions */}
            <div className="hidden md:flex items-center gap-3">
              <NotificationBell />
              {/* User Avatar Dropdown */}
              <div className="relative pl-2 border-l border-slate-200" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 rounded-lg py-1 pl-1.5 pr-1 transition-colors hover:bg-slate-50"
                  aria-expanded={userDropdownOpen}
                  title="User menu"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner ${
                      isAdmin ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {user?.avatar
                      ? <img src={user.avatar} alt={`${user.name || 'User'} profile`} className="h-full w-full rounded-full object-cover" />
                      : (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      userDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Panel */}
                {userDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 animate-fade-in">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
                      {user?.username && <p className="text-xs font-medium text-indigo-700 truncate">@{user.username}</p>}
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${
                          isAdmin
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {user?.role || 'user'} Profile
                      </span>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>My Account Settings</span>
                      </Link>

                      {user?.role === 'user' && <Link to="/my-applications" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"><FileText className="h-4 w-4 text-slate-400" /><span>My Applications</span></Link>}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setBackendModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Server className="w-4 h-4 text-slate-400" />
                        <span>Backend Connection</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition border-t border-slate-100"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <NotificationBell />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 animate-fade-in">
            {/* Mobile user info */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  isAdmin ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {user?.avatar
                  ? <img src={user.avatar} alt={`${user.name || 'User'} profile`} className="h-full w-full rounded-full object-cover" />
                  : (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>

            <nav aria-label="Mobile navigation" className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link);
              return (
                <Link
                  key={link.path + link.label}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            </nav>

            <Link to="/profile" onClick={() => setMobileMenuOpen(false)} aria-current={location.pathname.startsWith('/profile') ? 'page' : undefined} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <User className="h-4 w-4 text-slate-400" />
              <span>My account settings</span>
            </Link>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setBackendModalOpen(true);
                }}
                className="text-xs text-indigo-600 font-medium"
              >
                Backend Diagnostics
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Backend Status Diagnostics Modal */}
      <BackendStatusModal
        isOpen={backendModalOpen}
        onClose={() => setBackendModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
