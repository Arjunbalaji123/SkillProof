import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Globe,
  Briefcase,
  MessageSquare,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface RecruiterPublicProfile {
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
  verifiedAt: string | null;
  createdAt: string;
  counts: {
    activeOpenings: number;
    totalOpenings: number;
  };
  activeOpenings: {
    id: string;
    title: string;
    track: { id: string; title: string; slug: string } | null;
    minLevel: string | null;
    minScore: number | null;
    positions: number;
    expiresAt: string;
    createdAt: string;
    skills: { id: string; name: string }[];
  }[];
  existingConversation: {
    id: string;
    status: string;
    origin: string;
  } | null;
}

export const RecruiterProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user, isDeveloper } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<RecruiterPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/recruiters/${encodeURIComponent(username)}`);
        if (res.data?.success && res.data.data) {
          setProfile(res.data.data);
        } else {
          setError('Recruiter profile not found');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Recruiter profile not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center gap-2 text-slate-500 text-sm">
        <Loader2 size={18} className="animate-spin text-[#2563EB]" />
        Loading recruiter profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] text-center">
          <ShieldAlert size={36} className="text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[#0F172A]">Recruiter Not Found</h2>
          <p className="text-xs text-[#64748B] mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center font-extrabold text-2xl shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-[#0F172A]">{profile.name}</h1>
                <span className="text-xs font-mono text-[#64748B]">@{profile.username}</span>
                {profile.isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <CheckCircle2 size={12} />
                    Verified Recruiter
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                    Pending Verification
                  </span>
                )}
                {profile.isDemo && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Demo
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-[#334155] flex items-center gap-1.5 mt-1">
                <Building2 size={15} className="text-[#2563EB]" />
                {profile.jobTitle} at <span className="text-[#0F172A]">{profile.companyName}</span>
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[#64748B]">
                {profile.companyWebsite && (
                  <a
                    href={profile.companyWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#2563EB] hover:underline font-medium"
                  >
                    <Globe size={13} />
                    Company Website
                    <ExternalLink size={11} />
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#2563EB] hover:underline font-medium"
                  >
                    LinkedIn Profile
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-center">
              <p className="text-lg font-extrabold text-[#2563EB]">{profile.counts.activeOpenings}</p>
              <p className="text-[10px] font-semibold uppercase text-[#64748B]">Active Openings</p>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-center">
              <p className="text-lg font-extrabold text-[#0F172A]">{profile.counts.totalOpenings}</p>
              <p className="text-[10px] font-semibold uppercase text-[#64748B]">Total Openings</p>
            </div>
          </div>
        </div>

        {profile.bio && (
          <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              About
            </h3>
            <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Developer viewing recruiter profile: NO message box if no conversation exists */}
        {!isOwnProfile && isDeveloper && (
          <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
            {profile.existingConversation ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="text-xs text-blue-900">
                  <span className="font-bold">Existing conversation found</span> (status:{' '}
                  <span className="font-mono">{profile.existingConversation.status}</span>)
                </div>
                <button
                  onClick={() =>
                    navigate(
                      `/messages?conversationId=${encodeURIComponent(
                        profile.existingConversation!.id
                      )}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition"
                >
                  <MessageSquare size={14} />
                  View Conversation
                </button>
              </div>
            ) : (
              <div
                data-testid="recruiter-no-conversation-banner"
                className="flex items-center gap-2.5 p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-[#475569]"
              >
                <Info size={16} className="text-[#2563EB] shrink-0" />
                <span>
                  This recruiter has not messaged you. You can approach them through an opening.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Openings by this Recruiter */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-6">
        <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2 mb-4">
          <Briefcase size={18} className="text-[#2563EB]" />
          Active Openings ({profile.activeOpenings.length})
        </h2>

        {profile.activeOpenings.length === 0 ? (
          <p className="text-xs text-[#64748B] py-4">
            This recruiter has no active openings at the moment.
          </p>
        ) : (
          <div className="space-y-3">
            {profile.activeOpenings.map((op) => (
              <div
                key={op.id}
                className="p-4 rounded-xl border border-[#E2E8F0] hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{op.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {op.track && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {op.track.title}
                      </span>
                    )}
                    {op.skills.map((s) => (
                      <span
                        key={s.id}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  to={`/openings?openingId=${encodeURIComponent(op.id)}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-xs font-bold shrink-0 transition"
                >
                  View Opening →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

