import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { TrackCatalogItem, SkillCatalogItem } from '../types';
import {
  Play,
  Award,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Search,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const AssessmentsListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tracks, setTracks] = useState<TrackCatalogItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingSkill, setStartingSkill] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [selectedTrack, setSelectedTrack] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const loadCatalogAndHistory = async () => {
      setLoading(true);
      try {
        const [catalogRes, historyRes] = await Promise.all([
          api.get('/skills/catalog'),
          api.get('/assessments/history'),
        ]);

        if (catalogRes.data.success) {
          setTracks(catalogRes.data.data);
        }
        if (historyRes.data.success) {
          setHistory(historyRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load assessment catalog:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCatalogAndHistory();
  }, []);

  const handleStart = async (skillName: string) => {
    setStartingSkill(skillName);
    setErrorMsg('');
    try {
      const res = await api.post('/assessments/start', { language: skillName });
      if (res.data.success) {
        const { assessmentId } = res.data.data;
        navigate(`/assessments/${assessmentId}/take`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || `Failed to start ${skillName} assessment`);
    } finally {
      setStartingSkill(null);
    }
  };

  // Filter tracks and skills
  const filteredTracks = tracks
    .filter((track) => selectedTrack === 'ALL' || track.name === selectedTrack)
    .map((track) => {
      const matchedSkills = track.skills.filter((skill) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const matchesName = skill.name.toLowerCase().includes(query);
        const matchesDesc = (skill.description || '').toLowerCase().includes(query);
        const matchesTopic = skill.topics.some((t) => t.name.toLowerCase().includes(query));
        return matchesName || matchesDesc || matchesTopic;
      });
      return { ...track, skills: matchedSkills };
    })
    .filter((track) => track.skills.length > 0);

  const allTrackNames = Array.from(new Set(tracks.map((t) => t.name)));

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
          <Sparkles size={14} />
          <span>Role-Based Skill Catalog & Stratified Benchmarks</span>
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Technical Assessment Benchmarks</h1>
        <p className="text-sm text-[#64748B] mt-1 max-w-2xl leading-relaxed">
          Server-graded, stratified 20-question assessments sampled by topic weight (8 Easy, 8 Medium, 4 Hard). Prove your real capability with tamper-proof scoring.
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3 shadow-sm animate-fade-in">
          <AlertTriangle size={22} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Action Restricted</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Search and Track Filter Bar */}
      <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search skill, track, or topic (e.g. Async, Vectors, RAG, Spring)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search size={16} className="absolute left-3.5 top-3 text-[#94A3B8]" />
          </div>

          {/* Track Filter Pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => setSelectedTrack('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedTrack === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-[#475569]'
              }`}
            >
              All Tracks
            </button>
            {allTrackNames.map((trackName) => (
              <button
                key={trackName}
                onClick={() => setSelectedTrack(trackName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedTrack === trackName
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-[#475569]'
                }`}
              >
                {trackName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Track Groups & Skill Cards */}
      {filteredTracks.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E2E8F0] space-y-3">
          <BookOpen size={36} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-[#0F172A]">No Skills Match Your Query</h3>
          <p className="text-xs text-[#64748B]">Try searching for different keywords or select "All Tracks".</p>
        </div>
      ) : (
        <div className="space-y-10">
          {filteredTracks.map((track) => (
            <div key={track.id} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
                <Layers size={18} className="text-blue-600" />
                <h2 className="text-xl font-black text-[#0F172A]">{track.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-[#64748B] font-bold">
                  {track.skills.length} skills
                </span>
                {track.description && (
                  <span className="hidden md:inline text-xs text-[#64748B] ml-2">
                    — {track.description}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {track.skills.map((skill: SkillCatalogItem) => {
                  const recentForSkill = history.find((h) => h.language === skill.name);
                  const isBlocked = (skill.activeQuestionsCount ?? 0) < 60;

                  return (
                    <div
                      key={skill.id}
                      className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between space-y-5 hover:shadow-md transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-black border border-blue-200">
                            {track.name}
                          </span>
                          <span className="text-[11px] font-bold text-[#64748B] flex items-center gap-1">
                            <Clock size={12} /> {Math.round(skill.durationSec / 60)} mins
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-black text-[#0F172A]">{skill.name}</h3>
                          <p className="text-xs text-[#64748B] mt-1 leading-relaxed line-clamp-2">
                            {skill.description}
                          </p>
                        </div>

                        {/* Topics Pill List */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-[#94A3B8]">
                            Tested Topics ({skill.topics.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {skill.topics.map((t) => (
                              <span
                                key={t.id || t.name}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-[#475569] border border-slate-200"
                                title={`Weight: ${t.weightPercent}%`}
                              >
                                {t.name} ({t.weightPercent}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Metadata and Start Button */}
                      <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
                        <div className="flex items-center justify-between text-xs text-[#64748B]">
                          <span className="flex items-center gap-1">
                            <Award size={14} className="text-blue-600" />
                            {skill.questionCount} Questions (8E / 8M / 4H)
                          </span>
                          {isBlocked ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Pool: {skill.activeQuestionsCount}/60
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Pool: Ready
                            </span>
                          )}
                        </div>

                        {recentForSkill && recentForSkill.weightedPercent != null && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                            <span className="text-[#64748B] font-medium">Best Score:</span>
                            <span className="font-extrabold text-blue-600">
                              {recentForSkill.weightedPercent}% ({recentForSkill.level || 'Beginner'})
                            </span>
                          </div>
                        )}

                        <button
                          onClick={() => handleStart(skill.name)}
                          disabled={startingSkill === skill.name || isBlocked}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition ${
                            isBlocked
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <Play size={14} />
                          {startingSkill === skill.name
                            ? 'Preparing Blueprint...'
                            : isBlocked
                            ? 'Pool Expanding (<60)'
                            : 'Start Assessment'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Protocol Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-3">
        <h4 className="text-sm font-bold flex items-center gap-2 text-blue-400">
          <ShieldCheck size={18} />
          Blueprint Sampling & Anti-Cheat Protocol
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
            <strong className="text-white">Stratified Sampling:</strong>
            <p>Questions are proportionally sampled per topic based on curriculum weights, maintaining the 8 Easy / 8 Medium / 4 Hard distribution.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
            <strong className="text-white">Attempt Memory Exclusion:</strong>
            <p>Questions answered in your last 2 attempts are automatically excluded from your current test session to eliminate rote memorization.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
            <strong className="text-white">Confidence Scaling:</strong>
            <p>Single attempts yield Low confidence. Retaking builds Medium and High confidence indicators displayed on verified passports.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
