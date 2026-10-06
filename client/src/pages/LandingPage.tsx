import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DigitalRun3DScene } from '../components/DigitalRun3DScene';
import {
  ShieldCheck,
  Award,
  Search,
  CheckCircle2,
  FileCode,
  ArrowRight,
  Sparkles,
  Lock,
  Code2,
  CheckCircle,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorScreenPos, setCursorScreenPos] = useState({ x: -100, y: -100 });
  const [isCursorHovered, setIsCursorHovered] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Scroll Timeline Progress Handler
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const current = Math.min(1, Math.max(0, window.scrollY / totalScroll));
        setScrollProgress(current);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Mouse Position Handler for Custom Magnetic Cursor & 3D Tilt
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorScreenPos({ x: e.clientX, y: e.clientY });
      setCursorPos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });

      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, [data-magnetic]')) {
        setIsCursorHovered(true);
      } else {
        setIsCursorHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="relative bg-[#F8FAFC] text-[#0F172A] min-h-screen font-sans overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* CUSTOM MAGNETIC CURSOR RING */}
      <div
        className={`fixed top-0 left-0 w-8 h-8 rounded-full border border-blue-500/60 pointer-events-none z-50 transition-transform duration-100 ease-out -translate-x-1/2 -translate-y-1/2 hidden md:block ${
          isCursorHovered ? 'scale-150 bg-blue-500/10 border-blue-600' : 'scale-100'
        }`}
        style={{
          left: `${cursorScreenPos.x}px`,
          top: `${cursorScreenPos.y}px`,
        }}
      />

      {/* 3D SKILL VERIFICATION CORE WEBGL CANVAS */}
      <DigitalRun3DScene scrollProgress={scrollProgress} cursorPos={cursorPos} />

      {/* CONTINUOUS CHOREOGRAPHED SCROLL TIMELINE OVERLAYS */}
      <div className="relative z-10 space-y-48 pb-32">
        {/* HERO SECTION — 2-COLUMN BALANCED LAYOUT */}
        <section className="min-h-[85vh] flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
            {/* LEFT COLUMN (48% WIDTH) */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] text-xs font-mono font-semibold">
                <Sparkles size={14} />
                <span>SKILLPROOF VERIFICATION ENGINE</span>
              </div>

              <h1 className="text-5xl sm:text-7xl font-black text-[#0F172A] tracking-tight leading-[1.05]">
                Prove what you <br />
                <span className="text-[#2563EB]">can build.</span>
              </h1>

              <p className="text-lg text-[#475569] max-w-lg leading-relaxed font-normal">
                Turn skills, projects and assessments into trusted, verifiable evidence.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/register"
                  className="px-8 py-4 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition flex items-center gap-2"
                  data-magnetic
                >
                  BUILD YOUR SKILL PROFILE
                  <ArrowRight size={16} />
                </Link>

                <Link
                  to="/verifications"
                  className="px-8 py-4 rounded-2xl bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] font-bold text-sm shadow-sm transition"
                  data-magnetic
                >
                  EXPLORE VERIFICATION
                </Link>
              </div>

              {/* Quick-Login Seed Credentials Box */}
              <div className="mt-8 max-w-md bg-white/90 backdrop-blur-md border border-[#E2E8F0] rounded-2xl p-4 text-xs shadow-sm">
                <div className="flex items-center gap-1.5 text-[#2563EB] font-mono font-bold mb-2">
                  <Lock size={13} />
                  <span>Development Quick-Login Seed Credentials</span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[#16A34A] font-bold block">Developer</span>
                    <span className="text-[#64748B]">arjun@skillproof.dev</span>
                  </div>
                  <div>
                    <span className="text-[#D97706] font-bold block">Recruiter</span>
                    <span className="text-[#64748B]">recruiter1@techcorp.com</span>
                  </div>
                  <div>
                    <span className="text-purple-600 font-bold block">Admin</span>
                    <span className="text-[#64748B]">admin@skillproof.dev</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (52% WIDTH) — FLOATING VERIFICATION DATA CARD OVER 3D CORE */}
            <div className="lg:col-span-6 relative flex justify-center items-center h-80 lg:h-[480px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs p-5 rounded-2xl bg-white/90 border border-[#E2E8F0] shadow-xl backdrop-blur-md space-y-3 pointer-events-auto transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#64748B]">SKILL VERIFIED</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#15803D] text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Verified
                  </span>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-base font-extrabold text-[#0F172A]">React Advanced</h3>
                  <p className="text-xs text-[#2563EB] font-mono">Proficiency: Master</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                  <div className="p-2 bg-[#F1F5F9] rounded-lg">
                    <span className="text-[#64748B] block text-[9px]">ASSESSMENT</span>
                    <span className="font-bold text-[#2563EB]">92% Score</span>
                  </div>
                  <div className="p-2 bg-[#F1F5F9] rounded-lg">
                    <span className="text-[#64748B] block text-[9px]">EVIDENCE</span>
                    <span className="font-bold text-[#16A34A]">3 Projects</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PHASE 1 — DISCOVER */}
        <section className="min-h-[75vh] flex flex-col items-center justify-center px-4 max-w-4xl mx-auto text-center">
          <div className="space-y-6">
            <span className="text-xs uppercase font-mono tracking-widest text-[#2563EB] font-bold">
              PHASE 01 // DISCOVER
            </span>
            <h2 className="text-4xl sm:text-6xl font-extrabold text-[#0F172A] tracking-tight">
              Skills are easy to claim. <br />
              <span className="text-[#2563EB]">Proof is different.</span>
            </h2>
            <p className="text-[#475569] text-lg max-w-xl mx-auto font-normal">
              Self-reported resume bullet points create uncertainty. SKILLPROOF connects every claim to verifiable evidence.
            </p>
          </div>
        </section>

        {/* PHASE 2 — BUILD */}
        <section className="min-h-[75vh] flex flex-col items-center justify-center px-4 max-w-4xl mx-auto text-center">
          <div className="space-y-6">
            <span className="text-xs uppercase font-mono tracking-widest text-[#0F766E] font-bold">
              PHASE 02 // BUILD
            </span>
            <h2 className="text-4xl sm:text-6xl font-extrabold text-[#0F172A] tracking-tight">
              Every skill needs evidence.
            </h2>
            <p className="text-[#475569] text-lg max-w-xl mx-auto font-normal">
              Your profile decomposes into orbiting evidence artifacts: Skills, Projects, Assessments, Certifications, and Achievements.
            </p>
          </div>
        </section>

        {/* PHASE 3 — ASSESS */}
        <section className="min-h-[85vh] flex flex-col items-center justify-center px-4 max-w-3xl mx-auto text-center">
          <div className="w-full space-y-8">
            <span className="text-xs uppercase font-mono tracking-widest text-[#2563EB] font-bold">
              PHASE 03 // ASSESS
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">
              Test your knowledge.
            </h2>

            {/* Clean HTML Assessment Interface Mockup Layer */}
            <div className="p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-xl text-left space-y-6">
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-4">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#2563EB]">
                  <Code2 size={16} />
                  <span>ASSESSMENT // Python Advanced</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-mono font-bold border border-blue-200">
                  Question 04 / 10
                </span>
              </div>

              <div className="space-y-3">
                <p className="font-semibold text-sm text-[#0F172A]">
                  What is the primary benefit of Python generators over standard lists in memory optimization?
                </p>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-300 text-[#2563EB] font-bold flex items-center justify-between">
                    <span>A. Lazy evaluation using yield iterates elements on demand</span>
                    <CheckCircle size={16} />
                  </div>
                  <div className="p-3 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B]">
                    B. Generators bypass GIL locks during multi-threaded execution
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PHASE 4 — VERIFY SIGNATURE CLIMAX */}
        <section className="min-h-[90vh] flex flex-col items-center justify-center px-4 max-w-4xl mx-auto text-center">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-emerald-50/90 via-white to-blue-50/90 border border-emerald-300 shadow-xl space-y-8">
            <span className="text-xs uppercase font-mono tracking-widest text-[#16A34A] font-bold flex items-center justify-center gap-2">
              <Sparkles size={16} /> PHASE 04 // VERIFICATION SCAN CLIMAX
            </span>

            <h2 className="text-4xl sm:text-6xl font-black text-[#0F172A] tracking-tight">
              VERIFICATION COMPLETE
            </h2>

            <p className="text-[#475569] text-base leading-relaxed max-w-xl mx-auto font-normal">
              The verification engine scans your code submissions, repository commits, and assessment scores to issue cryptographically signed badges.
            </p>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#16A34A] text-white font-mono text-xs font-extrabold shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={16} />
              <span>✓ VERIFIED DEVELOPER CREDENTIAL ISSUED</span>
            </div>
          </div>
        </section>

        {/* PHASE 5 — TRUST */}
        <section className="min-h-[85vh] flex flex-col items-center justify-center px-4 max-w-4xl mx-auto text-center">
          <div className="space-y-8 w-full">
            <span className="text-xs uppercase font-mono tracking-widest text-[#2563EB] font-bold">
              PHASE 05 // TRUST
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">
              Trust, backed by proof.
            </h2>

            {/* 2D/3D Hybrid Evidence Panels */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs text-left">
              <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-md space-y-1">
                <span className="text-[10px] text-[#64748B] block">ASSESSMENT</span>
                <span className="font-extrabold text-base text-[#2563EB]">92% Score</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-md space-y-1">
                <span className="text-[10px] text-[#64748B] block">PROJECT</span>
                <span className="font-extrabold text-base text-[#16A34A]">Verified Repo</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-md space-y-1">
                <span className="text-[10px] text-[#64748B] block">CERTIFICATION</span>
                <span className="font-extrabold text-base text-purple-600">Validated</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-md space-y-1">
                <span className="text-[10px] text-[#64748B] block">SKILL</span>
                <span className="font-extrabold text-base text-[#0F766E]">React — Expert</span>
              </div>
            </div>
          </div>
        </section>

        {/* PHASE 6 — RECRUITER VIEW */}
        <section className="min-h-[85vh] flex flex-col items-center justify-center px-4 max-w-4xl mx-auto text-center">
          <div className="p-10 sm:p-14 rounded-3xl bg-white border border-[#E2E8F0] shadow-xl space-y-8 w-full">
            <span className="text-xs uppercase font-mono tracking-widest text-[#2563EB] font-bold">
              PHASE 06 // RECRUITER DISCOVERY
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">
              Verified developers. <br />
              <span className="text-[#2563EB]">Real evidence. Less uncertainty.</span>
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold font-mono text-[#2563EB]">
              <span className="p-2.5 px-3.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A]">Search</span>
              <span>→</span>
              <span className="p-2.5 px-3.5 rounded-xl bg-blue-50 border border-blue-200 text-[#2563EB]">Skill Filter</span>
              <span>→</span>
              <span className="p-2.5 px-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A]">Verified Evidence</span>
              <span>→</span>
              <span className="p-2.5 px-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-600">Profile</span>
            </div>

            <div>
              <Link
                to="/recruiters/developers"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base shadow-xl shadow-blue-500/25 transition"
                data-magnetic
              >
                <Search size={18} /> Explore Verified Developers
              </Link>
            </div>
          </div>
        </section>

        {/* PHASE 7 — FINAL TRANSFORMATION & CTA */}
        <section className="min-h-[70vh] flex flex-col items-center justify-center px-4 max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-5xl sm:text-7xl font-black text-[#0F172A] tracking-tight">
            Proof changes <span className="text-[#2563EB]">everything.</span>
          </h2>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="px-9 py-4 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-lg shadow-xl shadow-blue-500/25 transition flex items-center gap-2"
              data-magnetic
            >
              Build Your SkillProof
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/recruiters/developers"
              className="px-8 py-4 rounded-2xl bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] font-bold text-base shadow-sm transition"
              data-magnetic
            >
              Explore Profiles
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
