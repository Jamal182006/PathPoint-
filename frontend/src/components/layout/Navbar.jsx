import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BackendStatusModal from '../common/BackendStatusModal';
import {
  Compass,
  LayoutDashboard,
  Calendar,
  BarChart3,
  ShieldAlert,
  Users,
  Server,
  Building2,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';

export const Navbar = ({ onOpenBrowseModal }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [backendModalOpen, setBackendModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Adaptive nav links based on role
  const candidateNavLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Interviews', path: '/interviews', icon: Calendar },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  const adminNavLinks = [
    { label: 'Cohort KPIs', path: '/admin', icon: BarChart3, exact: true },
    { label: 'Seeker Directory', path: '/admin/users', icon: Users },
    { label: 'System Health', path: '/admin/system', icon: Server },
    { label: 'Seeker View', path: '/dashboard', icon: LayoutDashboard },
  ];

  const navLinks = isAdmin ? adminNavLinks : candidateNavLinks;

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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-8">
              <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2.5 group">
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
              <nav className="hidden md:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link);
                  return (
                    <Link
                      key={link.path + link.label}
                      to={link.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Header Actions */}
            <div className="hidden md:flex items-center gap-3">
              {/* Company browser button */}
              {onOpenBrowseModal && (
                <button
                  onClick={onOpenBrowseModal}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-200 transition active:scale-95"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Browse Companies</span>
                </button>
              )}

              {/* User Avatar Dropdown */}
              <div className="relative pl-2 border-l border-slate-200" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 hover:opacity-80 transition"
                  title="User menu"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner ${
                      isAdmin ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      userDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Panel */}
                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden z-50 animate-fade-in">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
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
              {onOpenBrowseModal && (
                <button
                  onClick={onOpenBrowseModal}
                  className="p-2 rounded-lg bg-indigo-600 text-white"
                  title="Browse Companies"
                >
                  <Building2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
            {/* Mobile user info */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  isAdmin ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>

            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link);
              return (
                <Link
                  key={link.path + link.label}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
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
