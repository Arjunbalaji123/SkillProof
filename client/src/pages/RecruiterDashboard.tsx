import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ProgressBar } from '../components/ProgressBar';
import { PageSkeleton } from '../components/LoadingSkeleton';
import {
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  MapPin,
  Briefcase,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FolderGit2,
} from 'lucide-react';
import { Profile } from '../types';

export const RecruiterDashboard: React.FC = () => {
  const [developers, setDevelopers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [location, setLocation] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [proficiency, setProficiency] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  const fetchDevelopers = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit: 9,
      };
      if (search) params.search = search;
      if (skill) params.skill = skill;
      if (location) params.location = location;
      if (verifiedOnly) params.verified = 'true';
      if (proficiency) params.proficiency = proficiency;

      const res = await api.get('/recruiters/developers', { params });
      if (res.data.success) {
        setDevelopers(res.data.data);
        if (res.data.meta?.pagination) {
          setPagination(res.data.meta.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to search developers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, [page, verifiedOnly, proficiency]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDevelopers();
  };

  const toggleBookmark = async (devUserId: string, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await api.delete(`/recruiters/bookmarks/${devUserId}`);
      } else {
        await api.post('/recruiters/bookmarks', { developer_id: devUserId });
      }
      setDevelopers((prev) =>
        prev.map((d) => (d.user_id === devUserId ? { ...d, isBookmarked: !currentStatus } : d))
      );
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Search className="text-indigo-400" />
          Verified Developer Search
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Search software engineers with verified skill badges, assessment scores, and project evidence.
        </p>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Keyword Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, title, or username..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Filter by Skill</label>
            <input
              type="text"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. React, Node.js, SQL..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or Country..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Proficiency Level</label>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Levels</option>
              <option value="EXPERT">EXPERT</option>
              <option value="ADVANCED">ADVANCED</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="BEGINNER">BEGINNER</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Only show developers with VERIFIED skills
            </span>
          </label>

          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center gap-1.5"
          >
            <Filter size={14} /> Apply Filters
          </button>
        </div>
      </form>

      {/* Developer Grid */}
      {isLoading ? (
        <PageSkeleton />
      ) : developers.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-slate-400 text-sm">No developers matched your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {developers.map((dev: any) => (
            <div
              key={dev.id}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 space-y-4 flex flex-col justify-between transition shadow-xl group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {dev.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-indigo-400 transition">
                        {dev.name}
                      </h3>
                      <p className="text-xs text-indigo-400 font-mono">@{dev.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleBookmark(dev.user_id, dev.isBookmarked)}
                    className={`p-2 rounded-xl transition ${
                      dev.isBookmarked
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-950 text-slate-500 hover:text-slate-200 border border-slate-800'
                    }`}
                    title={dev.isBookmarked ? 'Saved in Bookmarks' : 'Bookmark Developer'}
                  >
                    {dev.isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                  </button>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">{dev.headline || 'Software Engineer'}</p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  {dev.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-500" />
                      {dev.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Briefcase size={13} className="text-slate-500" />
                    {dev.years_experience} yrs exp
                  </span>
                </div>

                <ProgressBar percentage={dev.profile_completion} label="Profile Strength" />

                {/* Skills Preview */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                    Top Verified Skills ({dev.verifiedSkillCount}/{dev.totalSkillCount})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {dev.user_skills?.slice(0, 4).map((us: any) => (
                      <div key={us.id} className="flex items-center gap-1 text-[11px]">
                        <VerifiedBadge status={us.verification_status} size="sm" showText={false} />
                        <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-medium">
                          {us.skill.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80">
                <Link
                  to={`/developer/${dev.username}`}
                  target="_blank"
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-indigo-950/40 text-indigo-400 border border-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink size={14} />
                  View Full Proof Portfolio
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Showing Page <span className="font-bold text-white">{pagination.page}</span> of {pagination.totalPages} ({pagination.total} developers)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-850"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-850"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

