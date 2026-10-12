import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import {
  CheckCircle2,
  Clock,
  Award,
  ExternalLink,
  Plus,
  Play,
  FolderGit2,
  AlertCircle,
  FileText,
  BarChart2,
  Flame,
  ArrowRight,
  Trophy,
} from 'lucide-react';
import { SkillItem, UserRankInfo } from '../types';

export const DeveloperDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<UserRankInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [sumRes, lbRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/leaderboard?limit=1').catch(() => ({ data: { success: false } })),
      ]);
      if (sumRes.data.success) {
        setSummary(sumRes.data.data);
      }
      if (lbRes.data.success && lbRes.data.data?.currentUserRank) {
        setLeaderboardRank(lbRes.data.data.currentUserRank);
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

  if (isLoading || !summary) return <PageSkeleton />;

  const skills: any[] = summary.skills || [];
  const history: any[] = summary.recentAttempts || [];
  const verifiedCount = summary.verifiedCount ?? 0;
  const claimedCount = summary.claimedCount ?? 0;
  const avgScore = summary.averageVerifiedScore ?? 0;
  const projectsCount = summary.projectCount ?? 0;

  const publicSlug = user?.profile?.publicSlug;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <Flame size={14} className="text-amber-400" />
              <span>SkillProof v2 Real-Skill Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || (user?.username ? `@${user.username}` : 'Developer')}! 👋
            </h1>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              Certificates are only claims until verified. Take randomized, server-graded assessments to earn verifiable score passports discoverable by top recruiters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {publicSlug && (
              <Link
                to={`/developer/${publicSlug}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                <ExternalLink size={14} />
                View Trust Passport
              </Link>
            )}
            <Link
              to="/skills"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center gap-2 border border-slate-700"
            >
              <Plus size={14} />
              Manage Skills
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Verified Skills</p>
            <p className="text-2xl font-black text-[#0F172A]">{verifiedCount}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Claimed Only</p>
            <p className="text-2xl font-black text-[#0F172A]">{claimedCount}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <BarChart2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Average Verified Score</p>
            <p className="text-2xl font-black text-[#0F172A]">{avgScore}%</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <FolderGit2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Portfolio Projects</p>
            <p className="text-2xl font-black text-[#0F172A]">{projectsCount}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Skills Status & Assessment History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Skills & Verification Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Technical Skills & Verification Status</h2>
                <p className="text-xs text-[#64748B]">
                  Unverified certificates appear as claims. Take a 20-question randomized test to certify.
                </p>
              </div>
              <Link
                to="/skills"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Add Skill</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-[#CBD5E1] rounded-xl bg-slate-50">
                <Award size={36} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-[#0F172A]">No skills claimed yet</p>
                <p className="text-xs text-[#64748B] mt-1 mb-4">Add your programming languages to start testing</p>
                <Link
                  to="/skills"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
                >
                  Claim First Skill
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-4 rounded-xl border border-[#E2E8F0] hover:border-blue-300 transition-colors bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-[#0F172A]">{skill.language}</span>
                        {skill.status === 'VERIFIED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            VERIFIED ({skill.bestScore}%)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <AlertCircle size={12} />
                            CLAIMED ONLY
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                        <span>
                          Level: <strong>{skill.status === 'VERIFIED' && skill.level ? skill.level : skill.claimedLevel}</strong>
                        </span>
                        {skill.certificateUrl && (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Cert: Unverified Claim
                          </span>
                        )}
                        {skill.expiresAt && (
                          <span>Expires: {new Date(skill.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/assessments?lang=${encodeURIComponent(skill.language)}`)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Play size={14} />
                      {skill.status === 'VERIFIED' ? 'Retake Benchmark' : 'Take Assessment'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Assessment Attempt History */}
        <div className="space-y-6">
          {/* Leaderboard Standing Widget */}
          <div className="bg-gradient-to-br from-amber-500/10 via-white to-blue-500/5 rounded-2xl border border-amber-200/80 p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-black">
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider">Leaderboard Rank</h3>
                  <p className="text-[11px] text-[#64748B]">Global verification standing</p>
                </div>
              </div>
              <Link
                to="/leaderboard"
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 group"
              >
                <span>View Full</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {leaderboardRank && leaderboardRank.rank !== null ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between bg-white/80 rounded-xl p-3 border border-amber-100">
                  <div>
                    <span className="text-xs text-[#64748B] font-semibold">Your Rank: </span>
                    <span className="text-2xl font-black text-[#0F172A] ml-1">#{leaderboardRank.rank}</span>
                    <span className="text-xs text-[#64748B]"> of {leaderboardRank.totalParticipants}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-amber-600">{leaderboardRank.points}</span>
                    <span className="text-[11px] text-[#64748B] ml-1">pts</span>
                  </div>
                </div>

                {leaderboardRank.rank === 1 ? (
                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    👑 You are currently holding the #1 position! Keep it up!
                  </p>
                ) : leaderboardRank.nextRankPointsDiff !== null && leaderboardRank.nextRankPointsDiff !== undefined ? (
                  <div className="text-xs text-[#64748B] flex items-center justify-between pt-1">
                    <span>Points to reach #{leaderboardRank.rank - 1}:</span>
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      +{leaderboardRank.nextRankPointsDiff} pts
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between bg-white/80 rounded-xl p-3 border border-slate-200">
                  <div>
                    <span className="text-xs text-[#64748B] font-semibold">Your Rank: </span>
                    <span className="text-xl font-bold text-slate-500 ml-1">Unranked</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-400">0</span>
                    <span className="text-[11px] text-[#64748B] ml-1">pts</span>
                  </div>
                </div>
                <div className="text-center py-2.5 bg-white/60 rounded-xl border border-dashed border-amber-200">
                  <p className="text-xs text-[#64748B]">Complete an assessment to get ranked on the leaderboard.</p>
                  <Link
                    to="/assessments"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
                  >
                    Start assessment <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                Recent Attempts
              </h2>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-[#64748B] py-6 text-center">No assessments completed yet.</p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 5).map((att) => (
                  <div key={att.id} className="p-3 rounded-xl border border-[#E2E8F0] bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#0F172A]">{att.language}</span>
                      <span className="text-xs font-black text-blue-600">
                        {att.weightedPercent != null ? `${att.weightedPercent}%` : 'Incomplete'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>Level: {att.level || (att.weightedPercent != null ? 'Beginner' : 'N/A')}</span>
                      <span>{new Date(att.submittedAt || att.startedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
