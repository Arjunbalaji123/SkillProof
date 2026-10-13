import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { DirectMessageModal } from '../components/DirectMessageModal';
import { VerifiedDeveloperCard } from '../types';
import {
  Search,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  FolderGit2,
  MessageSquare,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

export const RecruiterDashboard: React.FC = () => {
  const { user } = useAuth();
  const [developers, setDevelopers] = useState<VerifiedDeveloperCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('ALL');
  const [minScore, setMinScore] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const [dmTarget, setDmTarget] = useState<{
    name: string;
    username: string;
    topSkill?: { language: string; score: number } | null;
  } | null>(null);

  const isVerifiedRecruiter =
    user?.role === 'RECRUITER' && Boolean(user?.recruiterProfile?.isVerified);

  const fetchDevelopers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (language !== 'ALL') params.language = language;
      if (minScore > 0) params.minScore = minScore;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/recruiter/developers', { params });
      if (res.data.success) {
        setDevelopers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to search developers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, [language, minScore]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDevelopers();
  };

  const toggleBookmark = async (dev: VerifiedDeveloperCard) => {
    setBookmarkingId(dev.id);
    try {
      if (dev.isBookmarked) {
        await api.delete(`/recruiter/bookmarks/${dev.id}`);
        setDevelopers((prev) =>
          prev.map((d) => (d.id === dev.id ? { ...d, isBookmarked: false, bookmarkNote: null } : d))
        );
      } else {
        const note = prompt('Add an optional recruiter note for this candidate:', '');
        if (note === null) {
          setBookmarkingId(null);
          return;
        }
        await api.post('/recruiter/bookmarks', {
          developerId: dev.id,
          note: note || '',
        });
        setDevelopers((prev) =>
          prev.map((d) => (d.id === dev.id ? { ...d, isBookmarked: true, bookmarkNote: note } : d))
        );
      }
    } catch (err) {
      alert('Failed to update bookmark');
    } finally {
      setBookmarkingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Verified Developer Discovery</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Hire candidates based on server-verified test scores, not unverified certificate claims or resumes.
          </p>
        </div>

        <Link
          to="/openings/manage"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
        >
          <Briefcase size={15} />
          Manage Hiring Openings
        </Link>
      </div>

      {user?.role === 'RECRUITER' && !user?.recruiterProfile?.isVerified && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>
            Your recruiter account is pending approval. Once verified by an admin, you can publish openings and message eligible developers directly.
          </span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="Search by developer name, slug or bio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search size={16} className="absolute left-3 top-3 text-[#94A3B8]" />
          </div>

          <div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Languages</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
            </select>
          </div>

          <div>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Any Verified Score</option>
              <option value={40}>Basic (≥40%)</option>
              <option value={60}>Intermediate (≥60%)</option>
              <option value={75}>Advanced (≥75%)</option>
              <option value={90}>Expert (≥90%)</option>
            </select>
          </div>
        </form>
      </div>

      {/* Developer Candidates Grid */}
      {loading ? (
        <PageSkeleton />
      ) : developers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0]">
          <p className="text-base font-bold text-[#0F172A]">No verified developers found matching your criteria</p>
          <p className="text-xs text-[#64748B] mt-1">Try relaxing minimum score or searching across all languages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {developers.map((dev) => {
            const devUsername = dev.username;
            const isSelf =
              Boolean(user) &&
              (user?.id === dev.id ||
                (user?.username &&
                  devUsername &&
                  user.username.toLowerCase() === devUsername.toLowerCase()));
            const canMessage =
              isVerifiedRecruiter &&
              !isSelf &&
              !dev.isDemo &&
              dev.canDirectMessage !== false &&
              dev.verifiedSkills.length > 0;

            return (
              <div
                key={dev.id}
                className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between space-y-5 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-[#0F172A]">{dev.name}</h3>
                        {dev.isDemo && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            Demo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] font-mono">@{devUsername}</p>
                    </div>

                    <button
                      onClick={() => toggleBookmark(dev)}
                      disabled={bookmarkingId === dev.id}
                      className={`p-2 rounded-xl border transition ${
                        dev.isBookmarked
                          ? 'bg-blue-50 border-blue-200 text-blue-600'
                          : 'border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
                      }`}
                      title={dev.isBookmarked ? 'Candidate Saved' : 'Save Candidate'}
                    >
                      {dev.isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                    </button>
                  </div>

                  <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                    {dev.bio || 'Verified developer benchmarked on technical assessments.'}
                  </p>

                  {/* Verified Skills Pill Badges with Topic Strengths */}
                  <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase">Verified Benchmarks & Topic Strengths</p>
                    <div className="space-y-2">
                      {dev.verifiedSkills.map((vs, idx) => (
                        <div key={idx} className="space-y-1">
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            {vs.language}: {vs.score}% ({vs.latestLevel})
                          </span>
                          {vs.topicStrengths && vs.topicStrengths.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {vs.topicStrengths.map((ts: any) => (
                                <span
                                  key={ts.topic}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                    ts.strength === 'Strong'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                                      : ts.strength === 'Proficient'
                                      ? 'bg-blue-50 text-blue-800 border-blue-200 font-medium'
                                      : 'bg-amber-50 text-amber-800 border-amber-200 font-medium'
                                  }`}
                                >
                                  {ts.topic}: <strong>{ts.accuracy}%</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Unverified Claims */}
                  {dev.claimedSkills.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Unverified Claims</p>
                      <div className="flex flex-wrap gap-1">
                        {dev.claimedSkills.map((cs, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            {cs.language} (Claimed)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <span className="text-xs text-[#64748B] flex items-center gap-1">
                    <FolderGit2 size={14} /> {dev.projectCount} Projects
                  </span>

                  <div className="flex items-center gap-2">
                    {canMessage && devUsername && (
                      <button
                        type="button"
                        onClick={() =>
                          setDmTarget({
                            name: dev.name,
                            username: devUsername,
                            topSkill: dev.verifiedSkills[0]
                              ? {
                                  language: dev.verifiedSkills[0].language,
                                  score: dev.verifiedSkills[0].score || 0,
                                }
                              : null,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 font-bold text-xs flex items-center gap-1 transition"
                      >
                        <MessageSquare size={12} /> Message
                      </button>
                    )}
                    <Link
                      to={`/u/${devUsername}`}
                      target="_blank"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                    >
                      <ExternalLink size={12} /> View Passport
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DirectMessageModal
        isOpen={Boolean(dmTarget)}
        onClose={() => setDmTarget(null)}
        developer={dmTarget}
      />
    </div>
  );
};
