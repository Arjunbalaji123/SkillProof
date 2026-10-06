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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
              <Sparkles size={14} />
              <span>Verified Developer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {profile?.name || user?.email}! 👋
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              {profile?.headline || 'Manage your technical skills, take timed assessments, and showcase your verified proof to top recruiters.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {profile?.username && (
              <Link
                to={`/developer/${profile.username}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center gap-2"
              >
                <ExternalLink size={14} />
                View Public Portfolio
              </Link>
            )}
            <Link
              to="/profile"
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold text-xs transition flex items-center gap-2"
            >
              <User size={14} />
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Dynamic Profile Completion Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <ProgressBar percentage={profile?.profile_completion || 0} />
        {profile && profile.profile_completion < 100 && (
          <p className="text-xs text-slate-400 mt-3">
            💡 <span className="font-semibold text-slate-200">Tip to reach 100%:</span> Add at least one project, take an assessment, or upload a certification proof document.
          </p>
        )}
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Verified Skills</span>
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{verifiedSkillsCount}</p>
          <p className="text-[11px] text-slate-400">Out of {profile?.user_skills?.length || 0} total skills</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Projects Built</span>
            <FolderGit2 size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{projectsCount}</p>
          <p className="text-[11px] text-slate-400">Active portfolio entries</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Certificates</span>
            <Award size={18} className="text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{certsCount}</p>
          <p className="text-[11px] text-slate-400">Verified credentials</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Assessment Avg Score</span>
            <Sparkles size={18} className="text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{avgScore}%</p>
          <p className="text-[11px] text-slate-400">{passedAttempts.length} passed quizzes</p>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Skills & Verification Tracker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-indigo-400" />
                Technical Skills & Verification Status
              </h2>
              <Link
                to="/skills"
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus size={14} /> Add Skill
              </Link>
            </div>

            {profile?.user_skills && profile.user_skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.user_skills.map((us) => (
                  <div
                    key={us.id}
                    className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{us.skill.name}</p>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {us.proficiency_level}
                      </span>
                    </div>
                    <VerifiedBadge status={us.verification_status} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                <p className="text-sm text-slate-400 mb-3">No skills added to your profile yet.</p>
                <Link
                  to="/skills"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add Your First Skill
                </Link>
              </div>
            )}
          </div>

          {/* Featured Projects Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderGit2 size={18} className="text-indigo-400" />
                Projects Showcase
              </h2>
              <Link
                to="/projects"
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus size={14} /> Add Project
              </Link>
            </div>

            {profile?.projects && profile.projects.length > 0 ? (
              <div className="space-y-3">
                {profile.projects.slice(0, 3).map((proj) => (
                  <div key={proj.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-bold text-white">{proj.title}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {proj.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {proj.technologies?.map((t) => (
                        <span key={t.id} className="text-[10px] bg-indigo-950/50 text-indigo-300 px-2 py-0.5 rounded font-mono">
                          {t.technology_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                <p className="text-sm text-slate-400 mb-3">No projects added yet.</p>
                <Link
                  to="/projects"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Create Your First Project
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Assessment Hub & Recent Quiz History */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award size={18} className="text-indigo-400" />
              Earn Verified Badges
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Take 15-minute timed technical assessments. Pass with &gt;= 70% score to automatically earn a Verified Skill badge on your portfolio!
            </p>
            <Link
              to="/assessments"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2"
            >
              <Play size={14} /> Start Technical Assessment
            </Link>
          </div>

          {/* Assessment History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              Recent Assessment Results
            </h3>

            {attempts.length > 0 ? (
              <div className="space-y-2.5">
                {attempts.slice(0, 4).map((att) => (
                  <div key={att.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-200">{att.assessment?.title || 'Assessment'}</p>
                      <span className="text-[10px] text-slate-500">{new Date(att.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold ${att.status === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {att.percentage}%
                      </span>
                      <span className={`block text-[10px] font-semibold uppercase ${att.status === 'PASSED' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {att.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">No assessments taken yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

