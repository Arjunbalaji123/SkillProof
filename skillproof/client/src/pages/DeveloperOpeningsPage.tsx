import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Send,
  Award,
  Users,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Loader2,
  X,
  Settings,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface OpeningSkillItem {
  id: string;
  skillCatalogId: string;
  name: string;
  slug: string;
}

interface OpeningItem {
  id: string;
  recruiterId: string;
  title: string;
  trackId: string;
  track: { id: string; slug: string; title: string } | null;
  description: string;
  minLevel: string | null;
  minScore: number | null;
  positions: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  skills: OpeningSkillItem[];
  recruiter: {
    id: string;
    name: string;
    username: string;
    isDemo: boolean;
    companyName: string;
    jobTitle: string;
    companyWebsite: string | null;
    linkedinUrl: string | null;
    bio: string | null;
    isVerified: boolean;
  } | null;
  myApproach: {
    id: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'SAVED';
    message: string;
    createdAt: string;
  } | null;
  conversationId: string | null;
  conversationStatus: string | null;
  isEligibleToApproach: boolean;
  remainingApproachesToday?: number;
}

export const DeveloperOpeningsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [openings, setOpenings] = useState<OpeningItem[]>([]);
  const [selectedOpening, setSelectedOpening] = useState<OpeningItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approach dialog state
  const [isApproachModalOpen, setIsApproachModalOpen] = useState(false);
  const [introMessage, setIntroMessage] = useState('');
  const [submittingApproach, setSubmittingApproach] = useState(false);
  const [approachError, setApproachError] = useState<string | null>(null);

  const selectedIdFromUrl = searchParams.get('openingId');

  const fetchMatchingOpenings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/openings/matches');
      if (res.data?.success) {
        const list: OpeningItem[] = res.data.data || [];
        setOpenings(list);
        if (!selectedIdFromUrl && list.length > 0 && !selectedOpening) {
          setSelectedOpening(list[0]);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load matching openings');
    } finally {
      setLoading(false);
    }
  }, [selectedIdFromUrl, selectedOpening]);

  const fetchOpeningDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/openings/${id}`);
      if (res.data?.success && res.data.data) {
        setSelectedOpening(res.data.data);
        setOpenings((prev) =>
          prev.some((o) => o.id === id)
            ? prev.map((o) => (o.id === id ? { ...o, ...res.data.data } : o))
            : [res.data.data, ...prev]
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Opening not found');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchingOpenings();
  }, [fetchMatchingOpenings]);

  useEffect(() => {
    if (selectedIdFromUrl) {
      fetchOpeningDetail(selectedIdFromUrl);
    }
  }, [selectedIdFromUrl, fetchOpeningDetail]);

  const handleSelectOpening = (opening: OpeningItem) => {
    setSelectedOpening(opening);
    setSearchParams({ openingId: opening.id });
    fetchOpeningDetail(opening.id);
  };

  const openApproachDialog = () => {
    if (!selectedOpening) return;
    setApproachError(null);
    const skillNames = selectedOpening.skills.map((s) => s.name).join(', ');
    setIntroMessage(
      `Hi ${selectedOpening.recruiter?.name || 'there'}, I matched your "${selectedOpening.title}" opening with my verified ${skillNames} skills and would love to discuss how I can contribute to ${selectedOpening.recruiter?.companyName || 'your team'}.`
    );
    setIsApproachModalOpen(true);
  };

  const handleSendApproach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpening) return;
    const trimmed = introMessage.trim();
    if (!trimmed) {
      setApproachError('Please write a brief introduction message.');
      return;
    }
    if (trimmed.length > 500) {
      setApproachError('Intro message cannot exceed 500 characters.');
      return;
    }

    try {
      setSubmittingApproach(true);
      setApproachError(null);
      const res = await api.post(`/openings/${selectedOpening.id}/approach`, {
        message: trimmed,
      });

      if (res.data?.success) {
        const { approach, conversationId, conversationStatus } = res.data.data;
        const updatedOpening: OpeningItem = {
          ...selectedOpening,
          myApproach: approach,
          conversationId,
          conversationStatus,
          isEligibleToApproach: false,
        };
        setSelectedOpening(updatedOpening);
        setOpenings((prev) =>
          prev.map((o) => (o.id === selectedOpening.id ? updatedOpening : o))
        );
        setIsApproachModalOpen(false);
      }
    } catch (err: any) {
      setApproachError(err.response?.data?.message || 'Failed to send approach');
    } finally {
      setSubmittingApproach(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-2.5">
            <Briefcase className="text-[#2563EB]" size={26} />
            Openings for you
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Active hiring openings from verified recruiters that match your verified skills and interests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] shadow-sm transition"
          >
            <Settings size={14} className="text-[#2563EB]" />
            Manage Interests & Preferences
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Loader2 size={18} className="animate-spin text-[#2563EB]" />
          Finding openings that match your verified skills...
        </div>
      ) : openings.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-[#E2E8F0] text-center shadow-sm">
          <Briefcase size={36} className="text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0F172A]">No matching active openings right now</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
            Verify more skills in Assessments or update your interested tracks and skills in Profile Settings to match more openings.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              to="/assessments"
              className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition"
            >
              Verify Skills
            </Link>
            <Link
              to="/profile"
              className="px-4 py-2 rounded-xl bg-slate-100 text-[#0F172A] text-xs font-semibold hover:bg-slate-200 transition"
            >
              Update Interests
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column: Matching Openings List */}
          <div className="lg:col-span-5 space-y-3">
            {openings.map((op) => {
              const isSelected = selectedOpening?.id === op.id;
              return (
                <div
                  key={op.id}
                  onClick={() => handleSelectOpening(op)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-[#2563EB] shadow-sm'
                      : 'bg-white border-[#E2E8F0] hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">{op.title}</h3>
                      <p className="text-xs text-[#475569] flex items-center gap-1.5 mt-0.5">
                        <Building2 size={13} className="text-[#2563EB]" />
                        <span className="font-semibold">
                          {op.recruiter?.companyName || op.recruiter?.name}
                        </span>
                        {op.recruiter?.isVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        )}
                      </p>
                    </div>
                    {op.myApproach && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          op.myApproach.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : op.myApproach.status === 'DECLINED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {op.myApproach.status === 'ACCEPTED'
                          ? 'Accepted'
                          : op.myApproach.status === 'DECLINED'
                          ? 'Declined'
                          : 'Waiting for the recruiter'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {op.track && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {op.track.title}
                      </span>
                    )}
                    {op.skills.map((s) => (
                      <span
                        key={s.skillCatalogId}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-3 pt-2.5 border-t border-slate-100">
                    <span>
                      {op.minScore ? `Min ${op.minScore}%` : 'Verified'}
                      {op.minLevel ? ` • ${op.minLevel}+` : ''}
                    </span>
                    <span>
                      {op.positions} {op.positions === 1 ? 'position' : 'positions'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right column: Selected Opening Detail & Recruiter Profile */}
          <div className="lg:col-span-7">
            {detailLoading && !selectedOpening ? (
              <div className="p-12 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Loader2 size={18} className="animate-spin text-[#2563EB]" />
                Loading opening details...
              </div>
            ) : selectedOpening ? (
              <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-extrabold text-[#0F172A]">
                        {selectedOpening.title}
                      </h2>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          selectedOpening.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {selectedOpening.status}
                      </span>
                    </div>
                    {selectedOpening.track && (
                      <p className="text-xs font-semibold text-[#2563EB] mt-1">
                        Track: {selectedOpening.track.title}
                      </p>
                    )}
                  </div>

                  {/* Approach Action / Status Area */}
                  <div className="shrink-0">
                    {selectedOpening.myApproach ? (
                      <div className="flex flex-col items-end gap-2">
                        {selectedOpening.myApproach.status === 'ACCEPTED' ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                              <CheckCircle2 size={14} />
                              Approach Accepted
                            </span>
                            {selectedOpening.conversationId && (
                              <button
                                onClick={() =>
                                  navigate(
                                    `/messages?conversationId=${encodeURIComponent(
                                      selectedOpening.conversationId!
                                    )}`
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-sm transition"
                              >
                                <MessageSquare size={14} />
                                Open Conversation
                              </button>
                            )}
                          </>
                        ) : selectedOpening.myApproach.status === 'DECLINED' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                            Approach declined
                          </span>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <span
                              data-testid="waiting-for-recruiter-badge"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold"
                            >
                              <Clock size={14} />
                              Waiting for the recruiter
                            </span>
                            {selectedOpening.conversationId && (
                              <button
                                onClick={() =>
                                  navigate(
                                    `/messages?conversationId=${encodeURIComponent(
                                      selectedOpening.conversationId!
                                    )}`
                                  )
                                }
                                className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                              >
                                View sent intro in Messages →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : selectedOpening.status !== 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                        This opening has closed
                      </span>
                    ) : user?.isDemo ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                        Demo accounts cannot approach openings
                      </span>
                    ) : selectedOpening.isEligibleToApproach ? (
                      <button
                        onClick={openApproachDialog}
                        data-testid="approach-recruiter-btn"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
                      >
                        <Send size={14} />
                        Approach recruiter
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                        Requirements not met or daily limit reached
                      </span>
                    )}
                  </div>
                </div>

                {/* Requirements */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">
                      Minimum Level
                    </p>
                    <p className="text-sm font-bold text-[#0F172A] mt-0.5 flex items-center gap-1.5">
                      <Award size={15} className="text-[#2563EB]" />
                      {selectedOpening.minLevel || 'Any Verified Level'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">
                      Minimum Score
                    </p>
                    <p className="text-sm font-bold text-[#0F172A] mt-0.5">
                      {selectedOpening.minScore ? `${selectedOpening.minScore}%` : '40% (Verified)'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0]">
                    <p className="text-[11px] font-semibold text-[#64748B] uppercase">
                      Open Positions
                    </p>
                    <p className="text-sm font-bold text-[#0F172A] mt-0.5 flex items-center gap-1.5">
                      <Users size={15} className="text-[#2563EB]" />
                      {selectedOpening.positions}
                    </p>
                  </div>
                </div>

                {/* Required Verified Skills */}
                <div>
                  <h4 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">
                    Required Verified Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedOpening.skills.map((s) => (
                      <span
                        key={s.skillCatalogId}
                        className="px-3 py-1 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-200 text-xs font-bold"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">
                    Role Description
                  </h4>
                  <p className="text-sm text-[#334155] whitespace-pre-line leading-relaxed">
                    {selectedOpening.description}
                  </p>
                </div>

                {/* Recruiter Profile Card */}
                {selectedOpening.recruiter && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                          Published by Recruiter
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Link
                            to={`/recruiters/${selectedOpening.recruiter.username}`}
                            className="text-sm font-bold text-[#0F172A] hover:text-[#2563EB] transition"
                          >
                            {selectedOpening.recruiter.name}
                          </Link>
                          <span className="text-xs font-mono text-[#64748B]">
                            @{selectedOpening.recruiter.username}
                          </span>
                          {selectedOpening.recruiter.isVerified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} /> Verified Recruiter
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[#475569] mt-0.5">
                          {selectedOpening.recruiter.jobTitle} at{' '}
                          <span className="text-[#0F172A]">
                            {selectedOpening.recruiter.companyName}
                          </span>
                        </p>
                        {selectedOpening.recruiter.bio && (
                          <p className="text-xs text-[#64748B] mt-2">
                            {selectedOpening.recruiter.bio}
                          </p>
                        )}
                      </div>
                      <Link
                        to={`/recruiters/${selectedOpening.recruiter.username}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline shrink-0"
                      >
                        View Profile <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Approach Recruiter Modal (500 character counter, one-time) */}
      {isApproachModalOpen && selectedOpening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Approach {selectedOpening.recruiter?.name}
                </h3>
                <p className="text-xs text-[#64748B]">
                  For opening: <span className="font-semibold">{selectedOpening.title}</span>
                </p>
              </div>
              <button
                onClick={() => setIsApproachModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendApproach} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
                You can send <strong>one introductory message</strong> (up to 500 characters) for this opening. Once the recruiter accepts your approach, full real-time chat will unlock.
              </div>

              {approachError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {approachError}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#0F172A]">
                    Introductory Message
                  </label>
                  <span
                    className={`text-xs font-mono ${
                      introMessage.length > 500 ? 'text-red-600 font-bold' : 'text-[#64748B]'
                    }`}
                  >
                    {introMessage.length}/500
                  </span>
                </div>
                <textarea
                  rows={5}
                  maxLength={500}
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  placeholder="Introduce yourself and highlight your verified skills..."
                  className="w-full rounded-xl border border-[#CBD5E1] p-3 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  required
                />
                {selectedOpening.remainingApproachesToday !== undefined && (
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Remaining approaches today: <strong>{selectedOpening.remainingApproachesToday}</strong> of 5
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApproachModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApproach || !introMessage.trim() || introMessage.length > 500}
                  data-testid="submit-approach-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-xs font-bold text-white shadow-sm transition"
                >
                  {submittingApproach ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send One-Time Approach
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

