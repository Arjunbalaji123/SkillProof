import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { Award, Clock, CheckCircle2, Play, AlertCircle } from 'lucide-react';
import { Assessment, AssessmentAttempt } from '../types';

export const AssessmentsListPage: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssessmentsData = async () => {
      try {
        const [assRes, attRes] = await Promise.all([
          api.get('/assessments'),
          api.get('/assessments/results'),
        ]);

        if (assRes.data.success) setAssessments(assRes.data.data);
        if (attRes.data.success) setAttempts(attRes.data.data);
      } catch (err) {
        console.error('Failed to load assessments:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssessmentsData();
  }, []);

  const handleStart = async (assessmentId: string) => {
    try {
      const res = await api.post(`/assessments/${assessmentId}/start`);
      if (res.data.success) {
        const attempt = res.data.data;
        navigate(`/assessments/${assessmentId}/play?attemptId=${attempt.id}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start assessment');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Award className="text-purple-400" />
          Technical Skill Assessment Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Take timed multiple-choice assessments. Achieve &gt;= 70% to automatically earn a Verified Skill Badge on your portfolio.
        </p>
      </div>

      {/* Assessment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assessments.map((ass) => {
          const pastAttempts = attempts.filter((a) => a.assessment_id === ass.id);
          const passed = pastAttempts.some((a) => a.status === 'PASSED');
          const latestAttempt = pastAttempts[0];

          return (
            <div
              key={ass.id}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 space-y-4 flex flex-col justify-between transition shadow-xl group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase">
                    {ass.skill?.category || 'General'}
                  </span>
                  {passed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 size={13} /> VERIFIED
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">
                  {ass.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">{ass.description}</p>

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-slate-500" />
                    {ass.time_limit_minutes} Minutes
                  </span>
                  <span>{ass.questions?.length || ass._count?.questions || ass.total_questions} Questions</span>
                  <span className="text-emerald-400 font-semibold">{ass.passing_percentage}% Passing Score</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                {latestAttempt && (
                  <span className="text-xs text-slate-400">
                    Latest Attempt: <span className={`font-mono font-bold ${latestAttempt.status === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'}`}>{latestAttempt.percentage}%</span>
                  </span>
                )}

                <button
                  onClick={() => handleStart(ass.id)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition inline-flex items-center gap-1.5 ml-auto"
                >
                  <Play size={14} /> Start Quiz
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
