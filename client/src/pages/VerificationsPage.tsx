import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { FileCheck, Clock, FileDown, Play, Sparkles } from 'lucide-react';
import { VerificationRequest } from '../types';

export const VerificationsPage: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingSkillId, setStartingSkillId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        const res = await api.get('/verifications');
        if (res.data.success) {
          setRequests(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load verifications:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVerifications();
  }, []);

  const handleStartVerificationQuiz = async (skillId: string) => {
    setStartingSkillId(skillId);
    try {
      const res = await api.post(`/assessments/skill/${skillId}/start`);
      if (res.data.success) {
        const { assessment, attemptId } = res.data.data;
        navigate(`/assessments/${assessment.id}?attemptId=${attemptId}`);
      }
    } catch (err: any) {
      console.error('Failed to start verification quiz:', err);
      alert(err.response?.data?.message || 'Failed to start quiz');
    } finally {
      setStartingSkillId(null);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <FileCheck className="text-indigo-400" />
          My Skill Verification Requests
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Track submitted proof documents, admin approval statuses, or take an automated verification test to verify immediately.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 px-6 border-b border-slate-800 bg-slate-950/50">
          <h2 className="font-bold text-white text-base">Submission History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Skill Name</th>
                <th className="p-4">Method</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4">Attached Document</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No verification requests submitted yet.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const skillId = r.user_skill?.skill_id;
                  const isPending = r.status === 'PENDING';

                  return (
                    <tr key={r.id} className="hover:bg-slate-850 transition">
                      <td className="p-4 font-bold text-white">
                        {r.user_skill?.skill?.name || 'Skill'}
                      </td>
                      <td className="p-4 font-mono">{r.method}</td>
                      <td className="p-4 text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {r.documents && r.documents.length > 0 ? (
                          <a
                            href={r.documents[0].file_path}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-400 hover:underline font-mono"
                          >
                            <FileDown size={14} /> {r.documents[0].file_name}
                          </a>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </td>
                      <td className="p-4">
                        <VerifiedBadge status={r.status} size="sm" />
                      </td>
                      <td className="p-4">
                        {isPending && skillId ? (
                          <button
                            onClick={() => handleStartVerificationQuiz(skillId)}
                            disabled={startingSkillId === skillId}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition inline-flex items-center gap-1.5"
                          >
                            <Play size={12} /> Take Verification Test
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">
                            {r.rejection_reason || '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
