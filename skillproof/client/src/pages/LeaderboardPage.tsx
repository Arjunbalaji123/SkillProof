import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageSkeleton } from '../components/LoadingSkeleton';
import {
  LeaderboardResponse,
  LeaderboardEntryItem,
  TrackCatalogItem,
  SkillCatalogItem,
} from '../types';
import {
  Trophy,
  Medal,
  Award,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Flame,
  Layers,
  Sparkles,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'global' | 'month' | 'track' | 'skill'>('global');
  const [tracks, setTracks] = useState<TrackCatalogItem[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string>('');

  // Load catalog tracks and skills for dropdowns
  useEffect(() => {
    api.get('/skills/catalog')
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.data)) {
          setTracks(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedTrackId(res.data.data[0].id);
            const firstSkill = res.data.data[0].skills?.[0]?.name;
            if (firstSkill) setSelectedSkillId(firstSkill);
          }
        }
      })
      .catch((err) => console.error('Failed to load catalog for leaderboard filters:', err));
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let scope = 'global';
      let period = 'all';
      let targetId = '';

      if (activeTab === 'month') {
        scope = 'global';
        period = 'month';
      } else if (activeTab === 'track') {
        scope = 'track';
        period = 'all';
        targetId = selectedTrackId;
      } else if (activeTab === 'skill') {
        scope = 'skill';
        period = 'all';
        targetId = selectedSkillId;
      }

      const params = new URLSearchParams({
        scope,
        period,
        page: String(page),
        limit: '50',
      });
      if (targetId) params.append('id', targetId);

      const res = await api.get(`/leaderboard?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setErrorMsg(res.data.message || 'Failed to load leaderboard');
      }
    } catch (err: any) {
      console.error('Failed to load leaderboard data:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab, selectedTrackId, selectedSkillId, page]);

  // Reset page when tab changes
  const handleTabChange = (tab: 'global' | 'month' | 'track' | 'skill') => {
    setActiveTab(tab);
    setPage(1);
  };

  const allSkills = tracks.flatMap((t) => t.skills || []);

  const entries = data?.entries || [];
  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black text-sm flex items-center justify-center border-2 border-amber-300 shadow-xs">
          🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center border-2 border-slate-300 shadow-xs">
          🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-8 h-8 rounded-full bg-amber-700/10 text-amber-900 font-black text-sm flex items-center justify-center border-2 border-amber-600/30 shadow-xs">
          🥉
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200">
        #{rank}
      </span>
    );
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'Expert':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Advanced':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Intermediate':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Trophy size={16} /> Verified Developer Standings
          </div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">SkillProof Leaderboard</h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Real skills, honest rankings. Earn points from randomized assessments, level multipliers,
            hard-question bonuses, and weekly consistency streaks.
          </p>
        </div>

        {/* User rank quick pill if available */}
        {data?.currentUserRank && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-sm">
              #{data.currentUserRank.rank}
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-900 uppercase">Your Standing</p>
              <p className="text-xs font-extrabold text-[#0F172A]">
                {data.currentUserRank.points} pts • {data.currentUserRank.level}
              </p>
              {data.currentUserRank.nextRankPointsDiff > 0 && (
                <p className="text-[10px] text-blue-700 mt-0.5">
                  +{data.currentUserRank.nextRankPointsDiff} pts to advance rank
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-[#E2E8F0] pb-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'global', label: 'Global (All-Time)', icon: Trophy },
            { id: 'month', label: 'This Month', icon: Flame },
            { id: 'track', label: 'By Track', icon: Layers },
            { id: 'skill', label: 'By Skill', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#475569] hover:bg-slate-100 hover:text-[#0F172A]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sub-selectors */}
        {activeTab === 'track' && tracks.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#475569]">Track:</label>
            <select
              value={selectedTrackId}
              onChange={(e) => {
                setSelectedTrackId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold bg-white"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'skill' && allSkills.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#475569]">Skill:</label>
            <select
              value={selectedSkillId}
              onChange={(e) => {
                setSelectedSkillId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold bg-white"
            >
              {allSkills.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <PageSkeleton />
      ) : errorMsg ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-red-200 shadow-xs space-y-3">
          <Trophy size={40} className="mx-auto text-red-300" />
          <h3 className="text-base font-bold text-red-800">Error Loading Leaderboard</h3>
          <p className="text-xs text-red-600 max-w-md mx-auto">{errorMsg}</p>
          <div className="pt-2">
            <button
              onClick={() => fetchLeaderboard()}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E2E8F0] shadow-xs space-y-3">
          <Trophy size={40} className="mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-[#0F172A]">No ranked developers yet</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Take a randomized verified assessment to claim points and earn your place on the leaderboard!
          </p>
          <div className="pt-2">
            <Link
              to="/assessments"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
            >
              Take Assessment
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top-3 Podium (Visible on Page 1) */}
          {page === 1 && top1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
              {/* Podium Rank 2 (Silver) */}
              {top2 ? (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center space-y-2 order-2 md:order-1 transform hover:-translate-y-1 transition">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-xl">
                    🥈
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    Rank #2
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A] flex items-center justify-center gap-1.5">
                    <Link to={`/u/${top2.username}`} className="hover:text-blue-600 hover:underline">
                      {top2.name}
                    </Link>
                    {top2.isDemo && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                        Demo
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[#64748B] font-mono">@{top2.username}</p>
                  <p className="text-xl font-black text-slate-700">{top2.points} pts</p>
                  <div className="flex flex-wrap justify-center gap-1 pt-1">
                    {top2.verifiedSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="hidden md:block order-2 md:order-1" />
              )}

              {/* Podium Rank 1 (Gold - Elevated) */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-50/50 to-white border-2 border-amber-300/80 shadow-md text-center space-y-2.5 order-1 md:order-2 transform md:-translate-y-2 hover:-translate-y-3 transition">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border-4 border-amber-200 flex items-center justify-center font-black text-2xl shadow-sm">
                  👑
                </div>
                <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
                  Champion #1
                </span>
                <h4 className="text-base font-black text-[#0F172A] flex items-center justify-center gap-1.5">
                  <Link to={`/u/${top1.username}`} className="hover:text-blue-600 hover:underline">
                    {top1.name}
                  </Link>
                  {top1.isDemo && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                      Demo
                    </span>
                  )}
                </h4>
                <p className="text-xs text-[#64748B] font-mono">@{top1.username}</p>
                <p className="text-3xl font-black text-amber-600">{top1.points} pts</p>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border border-purple-200 bg-purple-50 text-purple-700">
                  {top1.level} Level
                </div>
                <div className="flex flex-wrap justify-center gap-1 pt-1">
                  {top1.verifiedSkills.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-900">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Podium Rank 3 (Bronze) */}
              {top3 ? (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center space-y-2 order-3 transform hover:-translate-y-1 transition">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-900/10 border-2 border-amber-600/30 flex items-center justify-center font-black text-xl">
                    🥉
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    Rank #3
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A] flex items-center justify-center gap-1.5">
                    <Link to={`/u/${top3.username}`} className="hover:text-blue-600 hover:underline">
                      {top3.name}
                    </Link>
                    {top3.isDemo && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                        Demo
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[#64748B] font-mono">@{top3.username}</p>
                  <p className="text-xl font-black text-amber-800">{top3.points} pts</p>
                  <div className="flex flex-wrap justify-center gap-1 pt-1">
                    {top3.verifiedSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="hidden md:block order-3" />
              )}
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold">
                <tr>
                  <th className="p-3.5 w-16 text-center">Rank</th>
                  <th className="p-3.5">Developer</th>
                  <th className="p-3.5">Top Level</th>
                  <th className="p-3.5">Verified Skills</th>
                  <th className="p-3.5 text-right">Points</th>
                  <th className="p-3.5 text-right">Connect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {entries.map((item) => {
                  const isSelf =
                    Boolean(item.isCurrentUser) ||
                    (user &&
                      (user.id === item.userId ||
                        (user.username &&
                          item.username &&
                          user.username.toLowerCase() === item.username.toLowerCase())));
                  const canMessage = !isSelf && !item.isDemo;

                  return (
                    <tr
                      key={item.userId}
                      className={`transition hover:bg-slate-50/60 ${
                        item.isCurrentUser ? 'bg-blue-50/50 font-semibold ring-1 ring-blue-300' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <div className="flex justify-center">{getRankBadge(item.rank)}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs uppercase border border-slate-200">
                            {item.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={`/u/${item.username}`}
                                className="font-bold text-[#0F172A] hover:text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {item.name}
                              </Link>
                              {item.isDemo && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                  Demo
                                </span>
                              )}
                              {item.isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#64748B] font-mono">@{item.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getLevelBadgeClass(
                            item.level
                          )}`}
                        >
                          {item.level}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {item.verifiedSkills.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-[#334155]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-black text-sm text-blue-600">
                        {item.points}{' '}
                        <span className="text-[10px] text-[#64748B] font-semibold">pts</span>
                      </td>
                      <td className="p-3.5 text-right">
                        {canMessage && item.username ? (
                          isAuthenticated ? (
                            <Link
                              to={`/messages?to=${encodeURIComponent(item.username)}${
                                item.verifiedSkills[0]
                                  ? `&skill=${encodeURIComponent(item.verifiedSkills[0])}`
                                  : ''
                              }`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-[11px] font-bold transition"
                            >
                              <MessageSquare size={12} />
                              <span>Message</span>
                            </Link>
                          ) : (
                            <Link
                              to="/login"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#475569] text-[11px] font-semibold transition"
                            >
                              <MessageSquare size={12} />
                              <span>Sign in to message</span>
                            </Link>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sticky/Pinned "Your Rank" Row if available */}
          {data?.currentUserRank && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-lg flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center">
                  #{data.currentUserRank.rank}
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    Your Standing: #{data.currentUserRank.rank} of {data.currentUserRank.totalParticipants} developers
                  </h4>
                  <p className="text-xs text-slate-400">
                    {data.currentUserRank.points} Points • Level: {data.currentUserRank.level}
                  </p>
                </div>
              </div>

              {data.currentUserRank.nextRankPointsDiff > 0 && (
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400">
                    +{data.currentUserRank.nextRankPointsDiff} pts needed
                  </span>
                  <p className="text-[11px] text-slate-400">to surpass rank #{data.currentUserRank.rank - 1}</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-[#64748B]">
                Showing page {data.page} of {data.totalPages} ({data.total} total ranked developers)
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] disabled:opacity-40 flex items-center gap-1 hover:bg-slate-50"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] disabled:opacity-40 flex items-center gap-1 hover:bg-slate-50"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

