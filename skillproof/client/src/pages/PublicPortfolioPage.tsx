import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Github,
  Award,
  FolderGit2,
  ExternalLink,
  Code2,
  Calendar,
  Lock,
} from 'lucide-react';

export const PublicPortfolioPage: React.FC = () => {
  const { username } = useParams<{ username: string }>(); // acts as slug
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await api.get(`/profile/public/${username}`);
        if (res.data.success) {
          setPortfolio(res.data.data);
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Portfolio not found or private');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [username]);

  if (loading) return <PageSkeleton />;

  if (errorMsg || !portfolio) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <Lock size={40} className="mx-auto text-slate-400" />
        <h2 className="text-xl font-bold text-[#0F172A]">Developer Passport Unavailable</h2>
        <p className="text-xs text-[#64748B]">{errorMsg || 'This developer profile does not exist or has been made private.'}</p>
      </div>
    );
  }

  const verifiedSkills = portfolio.verifiedSkills || [];
  const claimedSkills = portfolio.claimedSkills || [];
  const projects = portfolio.projects || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header Profile Card */}
      <div className="p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <ShieldCheck size={14} />
            <span>Verified Trust Passport</span>
          </div>

          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">{portfolio.name}</h1>
          <p className="text-sm text-[#475569] max-w-xl leading-relaxed">
            {portfolio.bio || 'Verified developer benchmarked on SkillProof server-graded assessments.'}
          </p>

          {portfolio.githubUrl && (
            <a
              href={portfolio.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              <Github size={14} />
              GitHub Profile
            </a>
          )}
        </div>

        <div className="text-right sm:border-l sm:border-[#E2E8F0] sm:pl-8 space-y-2">
          <p className="text-xs font-semibold text-[#64748B] uppercase">Verification Status</p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={14} /> {verifiedSkills.length} Skills Verified
          </span>
        </div>
      </div>

      {/* VERIFIED SKILLS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-600" />
              Verified Skills (Server-Graded)
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Achieved through 20-question randomized evaluations. Fully tamper-proof.
            </p>
          </div>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            No skills verified through timed assessments yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifiedSkills.map((s: any) => (
              <div
                key={s.id || s.language}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold text-[#0F172A]">{s.language}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {s.score}% • {s.level}
                  </span>
                </div>

                {s.topicBreakdown && Object.keys(s.topicBreakdown).length > 0 && (
                  <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase">Per-Topic Strengths</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(s.topicBreakdown).map(([t, stat]: any) => {
                        const acc = stat.accuracy;
                        const isStrong = acc >= 75;
                        const isProficient = acc >= 60;
                        return (
                          <span
                            key={t}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 ${
                              isStrong
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isProficient
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <span>{t}:</span>
                            <strong className="font-extrabold">{acc}%</strong>
                            <span className="text-[10px] opacity-75">
                              ({isStrong ? 'Strong' : isProficient ? 'Proficient' : 'Focus'})
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLAIMED SKILLS (Clearly marked unverified) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" />
            Claimed Skills & Certificates (Unverified)
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Self-declared or certificate links not yet tested under randomized server examination.
          </p>
        </div>

        {claimedSkills.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            No unverified claims on record.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {claimedSkills.map((c: any) => (
              <div
                key={c.id || c.language}
                className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-2 opacity-85"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0F172A]">{c.language}</span>
                  <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Claimed Only
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">Level: {c.claimedLevel}</p>
                {c.certificateUrl && (
                  <a
                    href={c.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 underline truncate block"
                  >
                    View Claimed Certificate Link
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PORTFOLIO PROJECTS */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
            <FolderGit2 size={20} className="text-blue-600" />
            Verified Developer Projects
          </h2>
        </div>

        {projects.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            No public projects attached yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj: any) => (
              <div
                key={proj.id}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-extrabold text-[#0F172A]">{proj.title}</h3>
                  {proj.repoUrl && (
                    <a
                      href={proj.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Github size={14} /> Repo
                    </a>
                  )}
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">{proj.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#E2E8F0]">
                  {proj.techStack?.split(',').map((t: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-[#475569] border border-slate-200"
                    >
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
