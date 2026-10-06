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
  const isHomePage = location.pathname === '/';

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-[#0F172A]">
                  SKILL<span className="text-[#2563EB]">PROOF</span>
                </span>
                <span className="text-[10px] tracking-wider text-[#64748B] uppercase font-semibold -mt-1">
                  Verification Engine
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          {isHomePage ? (
            /* PUBLIC HOMEPAGE NAVIGATION (SINGLE NAVBAR RULE) */
            <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#475569]">
              <Link to="/recruiters/developers" className="hover:text-[#2563EB] transition">
                Developers
              </Link>
              <Link to="/assessments" className="hover:text-[#2563EB] transition">
                Assessments
              </Link>
              <Link to="/developer/arjun" className="hover:text-[#2563EB] transition">
                Trust Passport
              </Link>
              <Link to="/recruiters/developers" className="hover:text-[#2563EB] transition">
                For Recruiters
              </Link>
            </div>
          ) : (
            /* AUTHENTICATED APPLICATION NAVIGATION */
            <div className="hidden md:flex items-center gap-1">
              {isAuthenticated ? (
                <>
                  {/* DEVELOPER NAV */}
                  {isDeveloper && (
                    <>
                      <Link
                        to="/dashboard"
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive('/dashboard') ? 'bg-blue-50 text-[#2563EB]' : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                        }`}
                      >
                        <LayoutDashboard size={15} />
                        Dashboard
                      </Link>
                      <Link
                        to="/skills"
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive('/skills') ? 'bg-blue-50 text-[#2563EB]' : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle2 size={15} />
                        Skills
                      </Link>
                      <Link
                        to="/projects"
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive('/projects') ? 'bg-blue-50 text-[#2563EB]' : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                        }`}
                      >
                        <FolderGit2 size={15} />
                        Projects
                      </Link>
                      <Link
                        to="/assessments"
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive('/assessments') ? 'bg-blue-50 text-[#2563EB]' : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                        }`}
                      >
                        <Award size={15} />
                        Assessments
                      </Link>
                      <Link
                        to="/verifications"
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive('/verifications') ? 'bg-blue-50 text-[#2563EB]' : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                        }`}
                      >
                        <FileCheck size={15} />
                        Verifications
                      </Link>
                    </>
                  )}

                  {/* RECRUITER NAV */}
                  {isRecruiter && (
                    <>
                      <Link
                        to="/recruiters/developers"
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive('/recruiters/developers') ? 'bg-blue-50 text-[#2563EB]' : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                        }`}
                      >
                        <Search size={15} />
                        Find Developers
                      </Link>
                      <Link
                        to="/recruiters/bookmarks"
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive('/recruiters/bookmarks') ? 'bg-blue-50 text-[#2563EB]' : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                        }`}
                      >
                        <Bookmark size={15} />
                        Saved Developers
                      </Link>
                    </>
                  )}

                  {/* ADMIN NAV */}
                  {isAdmin && (
                    <>
                      <Link
                        to="/admin"
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive('/admin') ? 'bg-purple-50 text-purple-700' : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                        }`}
                      >
                        <ShieldAlert size={15} />
                        Admin Control Center
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <Link
                  to="/recruiters/developers"
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  <Search size={15} />
                  Browse Talent
                </Link>
              )}
            </div>
          )}

          {/* Right Action Menu */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <NotificationBell />

                {/* Role Badge */}
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#CBD5E1] bg-[#F1F5F9] text-[#475569] uppercase tracking-wider">
                  {user?.role}
                </span>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 border border-[#E2E8F0] transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-xs border border-blue-200">
                      {user?.profile?.name ? user.profile.name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-[#0F172A] max-w-[120px] truncate">
                      {user?.profile?.name || user?.email}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl py-1 z-50 divide-y divide-[#E2E8F0]">
                      <div className="px-4 py-3">
                        <p className="text-xs font-bold text-[#0F172A] truncate">{user?.profile?.name}</p>
                        <p className="text-[11px] text-[#64748B] truncate">{user?.email}</p>
                      </div>

                      <div className="py-1">
                        {isDeveloper && user?.profile?.username && (
                          <Link
                            to={`/developer/${user.profile.username}`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-[#2563EB] hover:bg-blue-50 flex items-center gap-2"
                          >
                            <ExternalLink size={14} />
                            View Public Portfolio
                          </Link>
                        )}
                        <Link
                          to="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-slate-100 flex items-center gap-2"
                        >
                          <UserIcon size={14} />
                          Manage Profile
                        </Link>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 flex items-center gap-2"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#0F172A] hover:bg-slate-100 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20 transition"
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
              className="p-2 text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 rounded-lg"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-[#E2E8F0] bg-white p-4 space-y-3 shadow-lg">
          {isAuthenticated ? (
            <>
              {isDeveloper && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-slate-100"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/skills"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-slate-100"
                  >
                    Skills
                  </Link>
                  <Link
                    to="/projects"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-slate-100"
                  >
                    Projects
                  </Link>
                  <Link
                    to="/assessments"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-slate-100"
                  >
                    Assessments
                  </Link>
                  {user?.profile?.username && (
                    <Link
                      to={`/developer/${user.profile.username}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-xs text-[#2563EB] font-semibold"
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
                    className="block px-3 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-slate-100"
                  >
                    Find Developers
                  </Link>
                  <Link
                    to="/recruiters/bookmarks"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-slate-100"
                  >
                    Saved Developers
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-xs text-purple-700 font-semibold"
                >
                  Admin Control Center
                </Link>
              )}

              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center">
                <span className="text-xs text-[#64748B]">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-[#DC2626] font-semibold flex items-center gap-1"
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
                className="block text-center w-full py-2.5 rounded-xl bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-[#0F172A]"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 rounded-xl bg-[#2563EB] text-xs font-bold text-white"
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
