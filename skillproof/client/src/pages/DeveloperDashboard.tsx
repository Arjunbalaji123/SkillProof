import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ProgressBar } from '../components/ProgressBar';
import { PageSkeleton } from '../components/LoadingSkeleton';
import {
  CheckCircle2,
  FolderGit2,
  Award,
  ExternalLink,
  Plus,
  Play,
  FileText,
  User,
  Sparkles,
} from 'lucide-react';
import { Profile, AssessmentAttempt } from '../types';

export const DeveloperDashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [profileRes, attemptsRes] = await Promise.all([
        api.get('/profile'),
        api.get('/assessments/results'),
      ]);

      if (profileRes.data.success) {
        setProfile(profileRes.data.data);
      }
      if (attemptsRes.data.success) {
        setAttempts(attemptsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load developer dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) return <PageSkeleton />;

  const verifiedSkillsCount = profile?.user_skills?.filter((s) => s.verification_status === 'VERIFIED').length || 0;
  const projectsCount = profile?.projects?.length || 0;
  const certsCount = profile?.certifications?.length || 0;

  const passedAttempts = attempts.filter((a) => a.status === 'PASSED');
  const avgScore = passedAttempts.length > 0
    ? Math.round(passedAttempts.reduce((acc, a) => acc + a.percentage, 0) / passedAttempts.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#F8FAFC]">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-[#E2E8F0] p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] text-xs font-semibold">
              <Sparkles size={14} />
              <span>Verified Developer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Welcome back, {profile?.name || user?.email}! 👋
            </h1>
            <p className="text-[#64748B] text-sm max-w-xl">
              {profile?.headline || 'Manage your technical skills, take timed assessments, and showcase your verified proof to top recruiters.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {profile?.username && (
              <Link
                to={`/developer/${profile.username}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                <ExternalLink size={14} />
                View Public Portfolio
              </Link>
            )}
            <Link
              to="/profile"
              className="px-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] font-semibold text-xs transition flex items-center gap-2"
            >
              <User size={14} />
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Dynamic Profile Completion Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
        <ProgressBar percentage={profile?.profile_completion || 0} />
        {profile && profile.profile_completion < 100 && (
          <p className="text-xs text-[#64748B] mt-3">
            💡 <span className="font-semibold text-[#0F172A]">Tip to reach 100%:</span> Add at least one project, take an assessment, or upload a certification proof document.
          </p>
        )}
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-1 shadow-sm">
          <div className="flex justify-between items-center text-[#64748B] text-xs font-semibold">
            <span>Verified Skills</span>
            <CheckCircle2 size={18} className="text-[#16A34A]" />
          </div>
          <p className="text-2xl font-extrabold text-[#0F172A]">{verifiedSkillsCount}</p>
          <p className="text-[11px] text-[#64748B]">Out of {profile?.user_skills?.length || 0} total skills</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-1 shadow-sm">
          <div className="flex justify-between items-center text-[#64748B] text-xs font-semibold">
            <span>Projects Built</span>
            <FolderGit2 size={18} className="text-[#2563EB]" />
          </div>
          <p className="text-2xl font-extrabold text-[#0F172A]">{projectsCount}</p>
          <p className="text-[11px] text-[#64748B]">Active portfolio entries</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-1 shadow-sm">
          <div className="flex justify-between items-center text-[#64748B] text-xs font-semibold">
            <span>Certificates</span>
            <Award size={18} className="text-[#D97706]" />
          </div>
          <p className="text-2xl font-extrabold text-[#0F172A]">{certsCount}</p>
          <p className="text-[11px] text-[#64748B]">Verified credentials</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-1 shadow-sm">
          <div className="flex justify-between items-center text-[#64748B] text-xs font-semibold">
            <span>Assessment Avg Score</span>
            <Sparkles size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-[#0F172A]">{avgScore}%</p>
          <p className="text-[11px] text-[#64748B]">{passedAttempts.length} passed quizzes</p>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Skills & Verification Tracker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#2563EB]" />
                Technical Skills & Verification Status
              </h2>
              <Link
                to="/skills"
                className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
              >
                <Plus size={14} /> Add Skill
              </Link>
            </div>

            {profile?.user_skills && profile.user_skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.user_skills.map((us) => (
                  <div
                    key={us.id}
                    className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{us.skill.name}</p>
                      <span className="text-[11px] text-[#64748B] font-medium">
                        {us.proficiency_level}
                      </span>
                    </div>
                    <VerifiedBadge status={us.verification_status} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1]">
                <p className="text-sm text-[#64748B] mb-3">No skills added to your profile yet.</p>
                <Link
                  to="/skills"
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add Your First Skill
                </Link>
              </div>
            )}
          </div>

          {/* Featured Projects Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <FolderGit2 size={18} className="text-[#2563EB]" />
                Projects Showcase
              </h2>
              <Link
                to="/projects"
                className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
              >
                <Plus size={14} /> Add Project
              </Link>
            </div>

            {profile?.projects && profile.projects.length > 0 ? (
              <div className="space-y-3">
                {profile.projects.slice(0, 3).map((proj) => (
                  <div key={proj.id} className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-bold text-[#0F172A]">{proj.title}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#E2E8F0] text-[#475569]">
                        {proj.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] line-clamp-2">{proj.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {proj.technologies?.map((t) => (
                        <span key={t.id} className="text-[10px] bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded font-mono border border-blue-200">
                          {t.technology_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1]">
                <p className="text-sm text-[#64748B] mb-3">No projects added yet.</p>
                <Link
                  to="/projects"
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Create Your First Project
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Assessment Hub & Recent Quiz History */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Award size={18} className="text-[#2563EB]" />
              Earn Verified Badges
            </h2>
            <p className="text-xs text-[#475569] leading-relaxed">
              Take 15-minute timed technical assessments. Pass with &gt;= 70% score to automatically earn a Verified Skill badge on your portfolio!
            </p>
            <Link
              to="/assessments"
              className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              <Play size={14} /> Start Technical Assessment
            </Link>
          </div>

          {/* Assessment History */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <FileText size={16} className="text-[#64748B]" />
              Recent Assessment Results
            </h3>

            {attempts.length > 0 ? (
              <div className="space-y-2.5">
                {attempts.slice(0, 4).map((att) => (
                  <div key={att.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#0F172A]">{att.assessment?.title || 'Assessment'}</p>
                      <span className="text-[10px] text-[#64748B]">{new Date(att.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold ${att.status === 'PASSED' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                        {att.percentage}%
                      </span>
                      <span className={`block text-[10px] font-semibold uppercase ${att.status === 'PASSED' ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                        {att.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] text-center py-4">No assessments taken yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
