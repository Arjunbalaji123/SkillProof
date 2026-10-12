import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { SkillItem } from '../types';
import {
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Award,
  Link as LinkIcon,
  ShieldAlert,
} from 'lucide-react';

export const VerificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await api.get('/skills');
        if (res.data.success) {
          setSkills(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load skills:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSkills();
  }, []);

  if (isLoading) return <PageSkeleton />;

  const verifiedList = skills.filter((s) => s.status === 'VERIFIED');
  const claimedList = skills.filter((s) => s.status === 'CLAIMED');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
          <FileCheck className="text-blue-600" />
          Skill Verifications & Certificate Claims
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          SkillProof core principle: Certificates and self-declared skills are <strong>Claims</strong>. Skills only achieve <strong>Verified</strong> status by passing a server-graded, randomized 20-question benchmark.
        </p>
      </div>

      {/* Verified Benchmarks */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          Active Verified Benchmarks ({verifiedList.length})
        </h2>

        {verifiedList.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            You have no verified skills yet. Take an assessment to prove your skills!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifiedList.map((s) => (
              <div key={s.id} className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold text-[#0F172A]">{s.language}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    {s.bestScore}% • VERIFIED
                  </span>
                </div>
                <div className="text-xs text-[#64748B] flex justify-between">
                  <span>Verified: {s.verifiedAt ? new Date(s.verifiedAt).toLocaleDateString() : 'Active'}</span>
                  <span>Expires: {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : 'In 1 Year'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unverified Certificate Claims */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-500" />
          Unverified Certificate Claims ({claimedList.length})
        </h2>

        {claimedList.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            No unverified claims on record.
          </div>
        ) : (
          <div className="space-y-3">
            {claimedList.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#0F172A]">{c.language}</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Unverified Claim
                    </span>
                  </div>
                  {c.certificateUrl && (
                    <a href={c.certificateUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline block mt-0.5">
                      {c.certificateUrl}
                    </a>
                  )}
                </div>

                <button
                  onClick={() => navigate(`/assessments?lang=${encodeURIComponent(c.language)}`)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Play size={14} /> Verify (Take Test)
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
