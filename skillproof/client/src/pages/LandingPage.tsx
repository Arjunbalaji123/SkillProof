import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Award,
  Search,
  CheckCircle2,
  FileCode,
  ArrowRight,
  UserCheck,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-6">
          <Sparkles size={14} />
          <span>The Gold Standard for Developer Skill Verification</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Can You Actually Prove The Technical Skills You Claim?
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          SKILLPROOF allows developers to validate technical capabilities through timed coding assessments, project evidence, and verified certification badges that recruiters trust.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {isAuthenticated ? (
            <Link
              to={user?.role === 'RECRUITER' ? '/recruiters/developers' : user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition flex items-center gap-2"
            >
              Go to Your Dashboard
              <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition flex items-center gap-2"
              >
                Create Verified Developer Profile
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-base transition"
              >
                Demo Quick Login
              </Link>
            </>
          )}

          <Link
            to="/developer/arjun"
            className="px-6 py-3.5 rounded-xl bg-slate-900/60 border border-indigo-500/30 text-indigo-300 font-semibold text-base hover:bg-indigo-950/30 transition flex items-center gap-2"
          >
            <UserCheck size={18} />
            View Sample Public Portfolio
          </Link>
        </div>

        {/* Credentials Box */}
        <div className="mt-14 max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-left shadow-2xl">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-3">
            <Lock size={16} />
            <span>Development Quick-Login Seed Credentials</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-emerald-400 font-bold block">Developer</span>
              <p className="text-slate-300 font-mono">arjun@skillproof.dev</p>
              <p className="text-slate-400 font-mono">Dev@123</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-amber-400 font-bold block">Recruiter</span>
              <p className="text-slate-300 font-mono">recruiter1@techcorp.com</p>
              <p className="text-slate-400 font-mono">Recruiter@123</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-purple-400 font-bold block">Admin</span>
              <p className="text-slate-300 font-mono">admin@skillproof.dev</p>
              <p className="text-slate-400 font-mono">Admin@123</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            How SKILLPROOF Works
          </h2>
          <p className="text-slate-400 mt-2 text-base">
            Eliminate resume inflation with transparent, tamper-proof skill evidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <Award size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Timed Assessments</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Take multiple-choice coding quizzes on React, Node.js, SQL, and algorithms with automatic backend evaluation. Passing scores auto-verify your skills!
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Verified Skill Badges</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Earn Verified Badges backed by actual proof: assessment results, verified credentials, or uploaded project code documentation reviewed by platform admins.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <Search size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Recruiter Talent Search</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Recruiters can filter developers by verified skills, proficiency, location, and assessment percentage, bookmarking candidate profiles for outreach.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

