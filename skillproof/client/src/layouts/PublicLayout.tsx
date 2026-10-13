import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { ShieldCheck, Trophy, LayoutDashboard } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const dashboardPath =
    user?.role === 'RECRUITER'
      ? '/recruiters/developers'
      : user?.role === 'ADMIN'
      ? '/admin'
      : '/dashboard';

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* Public Header: Logo, Sign in, Get Started */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
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

            {/* Public Center Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#475569]">
              <Link to="/leaderboard" className="hover:text-[#2563EB] transition flex items-center gap-1 font-bold text-amber-600">
                <Trophy size={14} /> Leaderboard
              </Link>
              <Link to="/recruiters/developers" className="hover:text-[#2563EB] transition">
                Browse Talent
              </Link>
            </nav>

            {/* Public Right Actions: Sign in, Get Started */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
                >
                  <LayoutDashboard size={14} />
                  <span>Go to App</span>
                </Link>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;

