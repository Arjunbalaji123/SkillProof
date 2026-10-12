import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import {
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Search,
  CheckCircle2,
  Award,
  FolderGit2,
  BookOpen,
  LayoutDashboard,
  ShieldAlert,
  ExternalLink,
  Bookmark,
  FileCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isDeveloper, isRecruiter, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  SKILL<span className="text-indigo-400">PROOF</span>
                </span>
                <span className="text-[10px] tracking-wider text-slate-400 uppercase font-semibold -mt-1">
                  Verified Portfolios
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
              <>
                {/* DEVELOPER NAV */}
                {isDeveloper && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                        isActive('/dashboard') ? 'bg-indigo-600/10 text-indigo-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Link>
                    <Link
                      to="/skills"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                        isActive('/skills') ? 'bg-indigo-600/10 text-indigo-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      Skills
                    </Link>
                    <Link
                      to="/projects"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                        isActive('/projects') ? 'bg-indigo-600/10 text-indigo-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <FolderGit2 size={16} />
                      Projects
                    </Link>
                    <Link
                      to="/assessments"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                        isActive('/assessments') ? 'bg-indigo-600/10 text-indigo-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <Award size={16} />
                      Assessments
                    </Link>
                    <Link
                      to="/verifications"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                        isActive('/verifications') ? 'bg-indigo-600/10 text-indigo-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <FileCheck size={16} />
                      Verifications
                    </Link>
                  </>
                )}

                {/* RECRUITER NAV */}
                {isRecruiter && (
                  <>
                    <Link
                      to="/recruiters/developers"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                        isActive('/recruiters/developers') ? 'bg-indigo-600/10 text-indigo-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <Search size={16} />
                      Find Developers
                    </Link>
                    <Link
                      to="/recruiters/bookmarks"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                        isActive('/recruiters/bookmarks') ? 'bg-indigo-600/10 text-indigo-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <Bookmark size={16} />
                      Saved Developers
                    </Link>
                  </>
                )}

                {/* ADMIN NAV */}
                {isAdmin && (
                  <>
                    <Link
                      to="/admin"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                        isActive('/admin') ? 'bg-purple-600/10 text-purple-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <ShieldAlert size={16} />
                      Admin Control Center
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/recruiters/developers"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-850 transition flex items-center gap-1.5"
                >
                  <Search size={16} />
                  Browse Talent
                </Link>
              </>
            )}
          </div>

          {/* Right Action Menu */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <NotificationBell />

                {/* Role Badge */}
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-700 bg-slate-900 text-slate-300 uppercase tracking-wider">
                  {user?.role}
                </span>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-850 border border-slate-800 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                      {user?.profile?.name ? user.profile.name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-200 max-w-[120px] truncate">
                      {user?.profile?.name || user?.email}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50 divide-y divide-slate-800">
                      <div className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-100 truncate">{user?.profile?.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      </div>

                      <div className="py-1">
                        {isDeveloper && user?.profile?.username && (
                          <Link
                            to={`/developer/${user.profile.username}`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="px-4 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-950/30 flex items-center gap-2"
                          >
                            <ExternalLink size={14} />
                            View Public Portfolio
                          </Link>
                        )}
                        <Link
                          to="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                        >
                          <UserIcon size={14} />
                          Manage Profile
                        </Link>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/30 flex items-center gap-2"
                        >
                          <LogOut size={14} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-850 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 p-4 space-y-3">
          {isAuthenticated ? (
            <>
              {isDeveloper && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/skills"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Skills
                  </Link>
                  <Link
                    to="/projects"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Projects
                  </Link>
                  <Link
                    to="/assessments"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Assessments
                  </Link>
                  {user?.profile?.username && (
                    <Link
                      to={`/developer/${user.profile.username}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-indigo-400 font-semibold"
                    >
                      Public Portfolio
                    </Link>
                  )}
                </>
              )}

              {isRecruiter && (
                <>
                  <Link
                    to="/recruiters/developers"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Find Developers
                  </Link>
                  <Link
                    to="/recruiters/bookmarks"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Saved Developers
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-purple-400 font-semibold"
                >
                  Admin Control Center
                </Link>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-400 font-semibold flex items-center gap-1"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-200"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

