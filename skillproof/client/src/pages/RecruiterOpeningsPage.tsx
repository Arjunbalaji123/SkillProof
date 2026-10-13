import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Edit3,
  PauseCircle,
  PlayCircle,
  XCircle,
  Users,
  CheckCircle2,
  Bookmark,
  MessageSquare,
  AlertTriangle,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TrackItem {
  id: string;
  name: string;
  title?: string;
  skills: {
    id: string;
    name: string;
    slug: string;
  }[];
}

interface RecruiterOpening {
  id: string;
  title: string;
  trackId: string;
  track: { id: string; title: string; slug: string } | null;
  description: string;
  minLevel: string | null;
  minScore: number | null;
  positions: number;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'EXPIRED' | 'PENDING_REVIEW' | 'REJECTED';
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  notifiedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  skills: { id: string; skillCatalogId: string; name: string }[];
  applicantCounts: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    saved: number;
  };
}

interface ApplicantItem {
  id: string;
  openingId: string;
  developerId: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'SAVED';
  createdAt: string;
  decidedAt: string | null;
  matchingScore: number;
  conversationId: string | null;
  conversationStatus: string | null;
  developer: {
    id: string;
    name: string;
    username: string;
    isDemo: boolean;
    bio: string | null;
    githubUrl: string | null;
    verifiedSkills: {
      skillId: string;
      language: string;
      score: number;
      level: string;
      isOpeningSkill: boolean;
      topicStrengths: { topic: string; accuracy: number; strength: string }[];
    }[];
  };
}

export const RecruiterOpeningsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isVerifiedRecruiter =
    user?.role === 'ADMIN' || Boolean(user?.recruiterProfile?.isVerified);

  const [openings, setOpenings] = useState<RecruiterOpening[]>([]);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpening, setEditingOpening] = useState<RecruiterOpening | null>(null);
  const [title, setTitle] = useState('');
  const [trackId, setTrackId] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [minLevel, setMinLevel] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<string>('70');
  const [positions, setPositions] = useState<string>('1');
  const [savingOpening, setSavingOpening] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchOpeningsAndCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [openingsRes, catalogRes] = await Promise.all([
        api.get('/openings/mine'),
        api.get('/skills/catalog'),
      ]);

      if (openingsRes.data?.success) {
        const list: RecruiterOpening[] = openingsRes.data.data || [];
        setOpenings(list);
        if (!selectedOpeningId && list.length > 0) {
          setSelectedOpeningId(list[0].id);
        }
      }

      if (catalogRes.data?.success) {
        const catalogTracks: TrackItem[] = catalogRes.data.data || [];
        setTracks(catalogTracks);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load recruiter openings');
    } finally {
      setLoading(false);
    }
  }, [selectedOpeningId]);

  const fetchApplicants = useCallback(async (openingId: string) => {
    try {
      setApplicantsLoading(true);
      const res = await api.get(`/openings/${openingId}/applicants`);
      if (res.data?.success) {
        setApplicants(res.data.data || []);
      }
    } catch {
      setApplicants([]);
    } finally {
      setApplicantsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpeningsAndCatalog();
  }, [fetchOpeningsAndCatalog]);

  useEffect(() => {
    if (selectedOpeningId) {
      fetchApplicants(selectedOpeningId);
    } else {
      setApplicants([]);
    }
  }, [selectedOpeningId, fetchApplicants]);

  const activeCount = openings.filter((o) => o.status === 'ACTIVE').length;
  const selectedOpening = openings.find((o) => o.id === selectedOpeningId) || null;

  const allSkillsInCatalog = tracks.flatMap((t) =>
    (t.skills || []).map((s) => ({
      ...s,
      trackId: t.id,
      trackName: t.title || t.name,
    }))
  );

  const openCreateModal = () => {
    setEditingOpening(null);
    setTitle('');
    const defaultTrack = tracks[0]?.id || '';
    setTrackId(defaultTrack);
    setSelectedSkillIds([]);
    setDescription('');
    setMinLevel('Intermediate');
    setMinScore('70');
    setPositions('1');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (op: RecruiterOpening) => {
    setEditingOpening(op);
    setTitle(op.title);
    setTrackId(op.trackId);
    setSelectedSkillIds(op.skills.map((s) => s.skillCatalogId));
    setDescription(op.description);
    setMinLevel(op.minLevel || 'ALL');
    setMinScore(op.minScore !== null ? String(op.minScore) : '');
    setPositions(String(op.positions || 1));
    setModalError(null);
    setIsModalOpen(true);
  };

  const toggleSkillId = (id: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSaveOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSkillIds.length === 0) {
      setModalError('Select at least one required skill from the catalog.');
      return;
    }

    try {
      setSavingOpening(true);
      setModalError(null);

      const payload = {
        title: title.trim(),
        trackId,
        skillCatalogIds: selectedSkillIds,
        description: description.trim(),
        minLevel: minLevel === 'ALL' ? null : minLevel,
        minScore: minScore !== '' ? Number(minScore) : null,
        positions: Number(positions || 1),
      };

      if (editingOpening) {
        const res = await api.patch(`/openings/${editingOpening.id}`, payload);
        if (res.data?.success) {
          setOpenings((prev) =>
            prev.map((o) => (o.id === editingOpening.id ? res.data.data : o))
          );
          setIsModalOpen(false);
        }
      } else {
        const res = await api.post('/openings', payload);
        if (res.data?.success) {
          const created: RecruiterOpening = res.data.data;
          setOpenings((prev) => [created, ...prev]);
          setSelectedOpeningId(created.id);
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save opening');
    } finally {
      setSavingOpening(false);
    }
  };

  const handleStatusChange = async (
    openingId: string,
    nextStatus: 'ACTIVE' | 'PAUSED' | 'CLOSED'
  ) => {
    try {
      setError(null);
      const res = await api.patch(`/openings/${openingId}`, { status: nextStatus });
      if (res.data?.success) {
        setOpenings((prev) =>
          prev.map((o) => (o.id === openingId ? res.data.data : o))
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update opening status');
    }
  };

  const handleDecideApproach = async (
    approachId: string,
    decision: 'ACCEPTED' | 'DECLINED' | 'SAVED'
  ) => {
    try {
      const res = await api.post(`/approaches/${approachId}/decide`, { decision });
      if (res.data?.success && selectedOpeningId) {
        await fetchApplicants(selectedOpeningId);
        await fetchOpeningsAndCatalog();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update applicant decision');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">
            Active
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 bg-amber-50 text-amber-800 border-amber-300">
            Waiting for admin approval
          </span>
        );
      case 'REJECTED':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 bg-rose-50 text-rose-700 border-rose-200">
            Rejected
          </span>
        );
      case 'PAUSED':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 bg-amber-50 text-amber-700 border-amber-200">
            Paused
          </span>
        );
      case 'CLOSED':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 bg-slate-100 text-slate-600 border-slate-200">
            Closed
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 bg-slate-100 text-slate-500 border-slate-200">
            Expired
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 bg-slate-100 text-slate-600 border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Unverified Recruiter Banner */}
      {!isVerifiedRecruiter && (
        <div
          data-testid="unverified-recruiter-banner"
          className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-3 shadow-sm"
        >
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold">Your recruiter account is pending approval</p>
            <p className="text-amber-800 mt-0.5">
              Once an administrator verifies your company details, you will be able to publish openings and message eligible developers.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-2.5">
            <Briefcase className="text-[#2563EB]" size={26} />
            Manage Hiring Openings
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Publish openings to automatically notify matching verified developers ({activeCount}/5 active).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          disabled={!isVerifiedRecruiter || activeCount >= 5}
          data-testid="create-opening-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
        >
          <Plus size={15} />
          New Opening ({activeCount}/5 Active)
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Loader2 size={18} className="animate-spin text-[#2563EB]" />
          Loading your openings...
        </div>
      ) : openings.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-[#E2E8F0] text-center shadow-sm">
          <Briefcase size={36} className="text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0F172A]">No openings published yet</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
            Create an opening with required verified skills and minimum scores. Matching developers will be notified once reviewed by an admin.
          </p>
          {isVerifiedRecruiter && (
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition"
            >
              <Plus size={14} /> Create First Opening
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Openings List */}
          <div className="lg:col-span-4 space-y-3">
            {openings.map((op) => {
              const isSelected = op.id === selectedOpeningId;
              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOpeningId(op.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-[#2563EB] shadow-sm'
                      : 'bg-white border-[#E2E8F0] hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#0F172A]">{op.title}</h3>
                    {renderStatusBadge(op.status)}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {op.skills.map((s) => (
                      <span
                        key={s.skillCatalogId}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>

                  {op.status === 'REJECTED' && op.rejectionReason && (
                    <p className="text-[11px] text-rose-600 mt-2 italic truncate">
                      Reason: {op.rejectionReason}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-[#64748B] mt-3 pt-2.5 border-t border-slate-100">
                    <span className="flex items-center gap-1 font-semibold text-[#0F172A]">
                      <Users size={13} className="text-[#2563EB]" />
                      {op.applicantCounts.total} Applicants
                      {op.applicantCounts.pending > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
                          {op.applicantCounts.pending} new
                        </span>
                      )}
                    </span>
                    <span>{op.minScore ? `>=${op.minScore}%` : 'Verified'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Opening Controls & Ranked Applicants Table */}
          <div className="lg:col-span-8 space-y-6">
            {selectedOpening && (
              <>
                <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold text-[#0F172A]">
                          {selectedOpening.title}
                        </h2>
                        {renderStatusBadge(selectedOpening.status)}
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        {selectedOpening.track?.title} • Min Score:{' '}
                        {selectedOpening.minScore ? `${selectedOpening.minScore}%` : '40%'} • Min
                        Level: {selectedOpening.minLevel || 'Any'} • Positions:{' '}
                        {selectedOpening.positions}
                      </p>
                      {selectedOpening.status === 'REJECTED' && selectedOpening.rejectionReason && (
                        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                          <span className="font-bold">Rejection Reason:</span>{' '}
                          {selectedOpening.rejectionReason}
                        </div>
                      )}
                      {selectedOpening.status === 'PENDING_REVIEW' && (
                        <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                          <span>
                            This opening is currently awaiting administrator review. Matching developers will be notified once approved.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {selectedOpening.status === 'REJECTED' ? (
                        <button
                          onClick={() => openEditModal(selectedOpening)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-xs"
                        >
                          <Edit3 size={13} />
                          Edit and resubmit
                        </button>
                      ) : (
                        <button
                          onClick={() => openEditModal(selectedOpening)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#0F172A] transition"
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>
                      )}
                      {selectedOpening.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleStatusChange(selectedOpening.id, 'PAUSED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-800 transition"
                        >
                          <PauseCircle size={13} />
                          Pause
                        </button>
                      )}
                      {selectedOpening.status === 'PAUSED' && (
                        <button
                          onClick={() => handleStatusChange(selectedOpening.id, 'ACTIVE')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-emerald-800 transition"
                        >
                          <PlayCircle size={13} />
                          Resume
                        </button>
                      )}
                      {selectedOpening.status !== 'CLOSED' && selectedOpening.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleStatusChange(selectedOpening.id, 'CLOSED')}
                          data-testid="close-opening-btn"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-700 transition"
                        >
                          <XCircle size={13} />
                          Close Opening
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#334155] mt-4 whitespace-pre-line">
                    {selectedOpening.description}
                  </p>
                </div>

                {/* Ranked Applicants Section */}
                <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">
                        Applicants Ranked by Verified Score ({applicants.length})
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        Accepting an approach unlocks two-way real-time messaging with that developer.
                      </p>
                    </div>
                  </div>

                  {applicantsLoading ? (
                    <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-[#2563EB]" />
                      Loading applicants...
                    </div>
                  ) : applicants.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#64748B]">
                      No developers have approached this opening yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0]">
                      {applicants.map((app, idx) => (
                        <div key={app.id} className="p-5 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">
                                  #{idx + 1} • {app.matchingScore}% Match Score
                                </span>
                                <Link
                                  to={`/u/${app.developer.username}`}
                                  className="text-sm font-bold text-[#0F172A] hover:text-[#2563EB] flex items-center gap-1"
                                >
                                  {app.developer.name}
                                  <ExternalLink size={12} />
                                </Link>
                                <span className="text-xs font-mono text-[#64748B]">
                                  @{app.developer.username}
                                </span>
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                    app.status === 'ACCEPTED'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : app.status === 'DECLINED'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : app.status === 'SAVED'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>

                              {/* Verified Skills & Topic Strengths */}
                              <div className="flex flex-wrap gap-2 mt-2.5">
                                {app.developer.verifiedSkills.map((sk) => (
                                  <div
                                    key={sk.skillId}
                                    className={`p-2 rounded-xl border text-xs ${
                                      sk.isOpeningSkill
                                        ? 'bg-blue-50/50 border-blue-200'
                                        : 'bg-slate-50 border-slate-200'
                                    }`}
                                  >
                                    <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                                      <span>{sk.language}</span>
                                      <span className="text-[#2563EB]">{sk.score}%</span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600">
                                        {sk.level}
                                      </span>
                                    </div>
                                    {sk.topicStrengths.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {sk.topicStrengths.slice(0, 3).map((t) => (
                                          <span
                                            key={t.topic}
                                            className="text-[10px] text-[#475569] bg-white px-1.5 py-0.2 rounded border border-slate-200"
                                          >
                                            {t.topic}: {t.accuracy}% ({t.strength})
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Decision Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              {app.status === 'ACCEPTED' && app.conversationId ? (
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/messages?conversationId=${encodeURIComponent(
                                        app.conversationId!
                                      )}`
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition"
                                >
                                  <MessageSquare size={13} />
                                  Open Chat
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleDecideApproach(app.id, 'ACCEPTED')}
                                    data-testid={`accept-approach-${app.developer.username}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                                  >
                                    <CheckCircle2 size={13} />
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleDecideApproach(app.id, 'SAVED')}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-semibold transition"
                                  >
                                    <Bookmark size={13} />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => handleDecideApproach(app.id, 'DECLINED')}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition"
                                  >
                                    <XCircle size={13} />
                                    Decline
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Developer's Intro Message */}
                          <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-[#334155]">
                            <span className="font-bold text-[#0F172A]">Intro message: </span>
                            "{app.message}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Opening Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-slate-50">
              <h3 className="text-base font-bold text-[#0F172A]">
                {editingOpening ? 'Edit Opening' : 'Publish New Hiring Opening'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOpening} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Opening Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Senior Machine Learning & Python Engineer"
                  className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2 text-sm text-[#0F172A]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Engineering Track *
                  </label>
                  <select
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-sm text-[#0F172A] bg-white"
                    required
                  >
                    {tracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title || t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Positions *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={positions}
                    onChange={(e) => setPositions(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2 text-sm text-[#0F172A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Minimum Verified Level
                  </label>
                  <select
                    value={minLevel}
                    onChange={(e) => setMinLevel(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-sm text-[#0F172A] bg-white"
                  >
                    <option value="ALL">Any Verified Level</option>
                    <option value="Basic">Basic+</option>
                    <option value="Intermediate">Intermediate+</option>
                    <option value="Advanced">Advanced+</option>
                    <option value="Expert">Expert only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Minimum Verified Score (%)
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    placeholder="70"
                    className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2 text-sm text-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Required Verified Skills (select one or more) *
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[#CBD5E1] bg-slate-50 max-h-40 overflow-y-auto">
                  {allSkillsInCatalog.map((sk) => {
                    const checked = selectedSkillIds.includes(sk.id);
                    return (
                      <button
                        type="button"
                        key={sk.id}
                        onClick={() => toggleSkillId(sk.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                          checked
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-blue-400'
                        }`}
                      >
                        {sk.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Role Description & Expectations *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the team, technical challenges, and what you are looking for..."
                  className="w-full rounded-xl border border-[#CBD5E1] p-3 text-sm text-[#0F172A]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOpening}
                  data-testid="submit-opening-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-xs font-bold text-white shadow-sm transition"
                >
                  {savingOpening && <Loader2 size={14} className="animate-spin" />}
                  {editingOpening ? 'Save Changes' : 'Publish & Notify Matches'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

