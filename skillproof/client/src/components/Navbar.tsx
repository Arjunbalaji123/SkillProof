import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { NotificationBell } from './NotificationBell';
import { UserSearchResult } from '../types';
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
  Trophy,
  Loader2,
  RefreshCw,
  AtSign,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isDeveloper, isRecruiter, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 300ms debounced search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSelectedIndex(-1);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
        if (res.data.success && Array.isArray(res.data.data)) {
          setSearchResults(res.data.data);
          setIsSearchOpen(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle outside click to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for search dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || searchResults.length === 0) {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        const chosen = searchResults[selectedIndex];
        handleSelectUser(chosen.username);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const handleSelectUser = (username: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
    navigate(`/u/${username}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSwitchAccount = async () => {
    setIsUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  const isHomePage = location.pathname === '/';

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
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

          {/* Search Box with 300ms debounce & keyboard navigation */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xs sm:max-w-sm hidden sm:block">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search developers by @username or name..."
                value={searchQuery}
                onFocus={() => {
                  if (searchResults.length > 0) setIsSearchOpen(true);
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-[#CBD5E1] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition placeholder-slate-400"
              />
              {isSearching && (
                <Loader2 size={14} className="absolute right-3 top-2.5 text-blue-600 animate-spin" />
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {isSearchOpen && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden z-50 divide-y divide-[#E2E8F0]">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#64748B]">
                    No users found matching "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((u, idx) => (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => handleSelectUser(u.username)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full p-3 text-left flex items-center justify-between gap-3 transition ${
                        selectedIndex === idx ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0F172A] truncate">{u.name}</p>
                          <p className="text-[11px] font-mono text-slate-500 truncate">@{u.username}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-blue-600">{u.points} pts</span>
                        {u.topSkill && (
                          <p className="text-[10px] text-slate-500">
                            {u.topSkill.language} ({u.topSkill.level})
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Navigation Items */}
          {isHomePage ? (
            <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#475569]">
              <Link to="/leaderboard" className="hover:text-[#2563EB] transition flex items-center gap-1 font-bold text-amber-600">
                <Trophy size={14} /> Leaderboard
              </Link>
              <Link to="/recruiters/developers" className="hover:text-[#2563EB] transition">
                Developers
              </Link>
              <Link to="/assessments" className="hover:text-[#2563EB] transition">
                Assessments
              </Link>
              <Link to="/recruiters/developers" className="hover:text-[#2563EB] transition">
                For Recruiters
              </Link>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1">
              {/* Leaderboard Link always available in app */}
              <Link
                to="/leaderboard"
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  isActive('/leaderboard')
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                }`}
              >
                <Trophy size={15} className="text-amber-500" />
                Leaderboard
              </Link>

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
                    <Link
                      to="/admin"
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                        isActive('/admin') ? 'bg-purple-50 text-purple-700' : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                      }`}
                    >
                      <ShieldAlert size={15} />
                      Admin Control Center
                    </Link>
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
          <div className="hidden md:flex items-center gap-3 shrink-0">
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
                      {user?.name ? user.name.charAt(0).toUpperCase() : user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-semibold text-[#0F172A] max-w-[120px] truncate">
                      {user?.name || (user?.username ? `@${user.username}` : 'User')}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl py-1 z-50 divide-y divide-[#E2E8F0]">
                      <div className="px-4 py-3">
                        <p className="text-xs font-bold text-[#0F172A] truncate">{user?.name}</p>
                        {user?.username && (
                          <p className="text-[11px] font-mono text-[#2563EB] truncate">@{user.username}</p>
                        )}
                        <p className="text-[11px] text-[#64748B] uppercase font-bold tracking-wider">{user?.role}</p>
                      </div>

                      <div className="py-1">
                        {isDeveloper && (
                          <Link
                            to={`/u/${user?.username || user?.profile?.publicSlug || 'arjun'}`}
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
                        {/* Requirement 4: Switch Account Option */}
                        <button
                          onClick={handleSwitchAccount}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-slate-100 flex items-center gap-2"
                        >
                          <RefreshCw size={14} />
                          Switch Account
                        </button>
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
          {/* Mobile Search Input */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search @username or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#CBD5E1] bg-slate-50 focus:bg-white focus:outline-none"
            />
          </div>

          <Link
            to="/leaderboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-bold text-amber-600 hover:bg-amber-50"
          >
            🏆 Leaderboard
          </Link>

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
                  <Link
                    to={`/u/${user?.username || user?.profile?.publicSlug || 'arjun'}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs text-[#2563EB] font-semibold"
                  >
                    Public Portfolio
                  </Link>
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

              <div className="pt-2 border-t border-[#E2E8F0] flex flex-col gap-2">
                <button
                  onClick={handleSwitchAccount}
                  className="text-xs text-[#475569] font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Switch Account
                </button>
                <button
                  onClick={handleLogout}
                  className="text-xs text-[#DC2626] font-semibold flex items-center gap-1.5"
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
