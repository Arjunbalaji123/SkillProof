import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { PageSkeleton } from '../components/LoadingSkeleton';
import {
  ShieldCheck,
  Github,
  Linkedin,
  Globe,
  MapPin,
  Briefcase,
  ExternalLink,
  CheckCircle2,
  FolderGit2,
  Award,
  BookOpen,
  Trophy,
  Mail,
  Sparkles,
} from 'lucide-react';
import { Profile } from '../types';

export const PublicPortfolioPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await api.get(`/profile/developer/${username}`);
        if (res.data.success) {
          setProfile(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Developer portfolio not found');
      } finally {
        setIsLoading(false);
      }
    };
    if (username) fetchPortfolio();
  }, [username]);

  if (isLoading) return <PageSkeleton />;

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto my-20 p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <ShieldCheck size={48} className="mx-auto text-rose-500" />
        <h2 className="text-2xl font-bold text-white">Portfolio Not Found</h2>
        <p className="text-slate-400 text-sm">{error || `Developer @${username} does not exist.`}</p>
      </div>
    );
  }

  const verifiedSkills = profile.user_skills?.filter((s) => s.verification_status === 'VERIFIED') || [];
  const otherSkills = profile.user_skills?.filter((s) => s.verification_status !== 'VERIFIED') || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Portfolio Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-10 shadow-2xl space-y-8">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 p-1 shadow-2xl">
                {profile.profile_image ? (
                  <img
                    src={profile.profile_image}
                    alt={profile.name}
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white font-extrabold text-3xl">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-1.5 rounded-full ring-4 ring-slate-900 shadow-lg" title="Verified SkillProof Profile">
                <CheckCircle2 size={16} className="stroke-[3]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{profile.name}</h1>
                <span className="text-xs text-indigo-400 font-mono bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                  @{profile.username}
                </span>
              </div>
              <p className="text-slate-300 font-medium text-sm sm:text-base">{profile.headline}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                {profile.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-indigo-400" />
                    {profile.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Briefcase size={14} className="text-purple-400" />
                  {profile.years_experience} Years Engineering Experience
                </span>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-3">
            {profile.github_url && (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500 transition"
                title="GitHub Profile"
              >
                <Github size={18} />
              </a>
            )}
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500 transition"
                title="LinkedIn Profile"
              >
                <Linkedin size={18} />
              </a>
            )}
            {profile.portfolio_url && (
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500 transition"
                title="Personal Website"
              >
                <Globe size={18} />
              </a>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="pt-6 border-t border-slate-800/80">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">About</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}
      </div>

      {/* SECTION 1: VERIFIED TECHNICAL SKILLS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={22} />
            Verified Technical Skills ({verifiedSkills.length})
          </h2>
          <span className="text-xs text-slate-400">Backed by Assessment & Document Evidence</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {verifiedSkills.map((us) => (
            <div
              key={us.id}
              className="p-4 bg-slate-900 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl flex items-center justify-between transition shadow-xl"
            >
              <div>
                <p className="font-bold text-white text-base">{us.skill.name}</p>
                <span className="text-xs text-slate-400 font-medium">
                  {us.proficiency_level} • Verified via {us.verification_method || 'Assessment'}
                </span>
              </div>
              <VerifiedBadge status="VERIFIED" size="md" />
            </div>
          ))}

          {otherSkills.map((us) => (
            <div
              key={us.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between opacity-80"
            >
              <div>
                <p className="font-bold text-slate-300 text-base">{us.skill.name}</p>
                <span className="text-xs text-slate-500 font-medium">{us.proficiency_level}</span>
              </div>
              <VerifiedBadge status={us.verification_status} size="sm" />
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: PROJECTS */}
      {profile.projects && profile.projects.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <FolderGit2 className="text-indigo-400" size={22} />
            Featured Projects & Implementations ({profile.projects.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-bold text-white">{proj.title}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {proj.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{proj.description}</p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {proj.technologies?.map((t) => (
                      <span
                        key={t.id}
                        className="text-[11px] bg-indigo-950/60 text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-500/20 font-mono"
                      >
                        {t.technology_name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  {proj.github_url && (
                    <a
                      href={proj.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
                    >
                      <Github size={14} /> Repository
                    </a>
                  )}
                  {proj.live_url && (
                    <a
                      href={proj.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} /> Live Demo
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 3: CERTIFICATIONS & EDUCATION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Certifications */}
        {profile.certifications && profile.certifications.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="text-amber-400" size={20} />
              Certifications & Credentials
            </h2>

            <div className="space-y-3">
              {profile.certifications.map((c) => (
                <div key={c.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-white">{c.title}</h4>
                    <span className="text-[10px] text-amber-400 font-mono">Issued {c.issue_date}</span>
                  </div>
                  <p className="text-xs text-slate-400">{c.issuer}</p>
                  {c.credential_id && (
                    <p className="text-[11px] text-slate-500 font-mono">ID: {c.credential_id}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="text-indigo-400" size={20} />
              Education & Academic Background
            </h2>

            <div className="space-y-3">
              {profile.education.map((e) => (
                <div key={e.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <h4 className="font-bold text-sm text-white">{e.institution}</h4>
                  <p className="text-xs text-indigo-300 font-medium">
                    {e.degree} - {e.field_of_study}
                  </p>
                  <p className="text-[11px] text-slate-400">{e.start_date} – {e.end_date || 'Present'}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

