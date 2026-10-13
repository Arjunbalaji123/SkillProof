import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { SkillItem } from '../types';
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Play,
  Award,
  Link as LinkIcon,
  ShieldAlert,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const SkillsManagerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState('JavaScript');
  const [claimedLevel, setClaimedLevel] = useState('Intermediate');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSkills = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/skills');
      if (res.data.success) {
        setSkills(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load skills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      setSkills([]);
      loadSkills();
    } else {
      setSkills([]);
    }
  }, [user?.id]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await api.post('/skills/claim', {
        language,
        claimedLevel,
        certificateUrl: certificateUrl.trim() || undefined,
      });
      setCertificateUrl('');
      await loadSkills();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to claim skill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this skill?')) return;
    try {
      await api.delete(`/skills/${id}`);
      setSkills(skills.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove skill');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Skills & Verification Benchmark</h1>
        <p className="text-sm text-[#64748B] mt-1">
          A certificate or self-declared skill is only a <strong>CLAIM</strong>. Skills become <strong>VERIFIED</strong> exclusively by passing a randomized, server-graded 20-question technical assessment.
        </p>
      </div>

      {/* Claim New Skill Form */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          <Award size={18} className="text-blue-600" />
          Add / Claim Skill
        </h2>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <ShieldAlert size={16} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleClaim} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="JavaScript">JavaScript</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">Claimed Level</label>
            <select
              value={claimedLevel}
              onChange={(e) => setClaimedLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Beginner">Beginner</option>
              <option value="Basic">Basic</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">
              Certificate URL <span className="text-[10px] text-amber-600">(Unverified Claim)</span>
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={certificateUrl}
              onChange={(e) => setCertificateUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
            >
              <Plus size={16} />
              {submitting ? 'Claiming...' : 'Claim Skill'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Skills List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0F172A]">Claimed & Verified Skills</h2>

        {skills.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0]">
            <p className="text-sm font-semibold text-[#64748B]">No skills added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#0F172A]">{skill.language}</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Self-Declared: <strong>{skill.claimedLevel}</strong>
                    </p>
                  </div>

                  {skill.status === 'VERIFIED' ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      VERIFIED ({skill.bestScore}%)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <AlertCircle size={13} />
                      CLAIMED ONLY
                    </span>
                  )}
                </div>

                {skill.certificateUrl && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs flex items-center justify-between text-amber-800">
                    <span className="flex items-center gap-1.5 truncate">
                      <LinkIcon size={14} />
                      <a
                        href={
                          skill.certificateUrl.startsWith('/uploads/')
                            ? `${((import.meta as any).env?.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '')}${skill.certificateUrl}`
                            : skill.certificateUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="underline truncate max-w-[220px]"
                      >
                        {skill.certificateUrl}
                      </a>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                      Unverified claim
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Remove
                  </button>

                  <button
                    onClick={() => navigate(`/assessments?lang=${encodeURIComponent(skill.language)}`)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Play size={14} />
                    {skill.status === 'VERIFIED' ? 'Retake Benchmark' : 'Prove Skill (Take Assessment)'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
