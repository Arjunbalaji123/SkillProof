import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { Play, Award, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AssessmentsListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultLang = searchParams.get('lang') || 'JavaScript';

  const [selectedLang, setSelectedLang] = useState(defaultLang);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/assessments/history');
        if (res.data.success) {
          setHistory(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch assessment history:', err);
      }
    };
    fetchHistory();
  }, []);

  const handleStart = async (lang: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/assessments/start', { language: lang });
      if (res.data.success) {
        const { assessmentId } = res.data.data;
        navigate(`/assessments/${assessmentId}/play`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to start assessment');
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    {
      name: 'JavaScript',
      desc: 'Closures, Event Loop, Promises, Prototypal Inheritance, Async/Await & Strict ES6+.',
      questions: 20,
      duration: '30 mins',
      easy: 8,
      med: 8,
      hard: 4,
    },
    {
      name: 'Python',
      desc: 'List Comprehensions, GIL & Multiprocessing, Decorators, Generators, Memory & Dunder methods.',
      questions: 20,
      duration: '30 mins',
      easy: 8,
      med: 8,
      hard: 4,
    },
    {
      name: 'Java',
      desc: 'JVM Memory Model, Garbage Collection, CompletableFuture, OOP Polymorphism & Generics.',
      questions: 20,
      duration: '30 mins',
      easy: 8,
      med: 8,
      hard: 4,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Technical Assessment Benchmarks</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Server-graded, randomized 20-question assessments. Prove your real capability and earn verified status.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Cooldown or Restriction In Effect</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Available Language Assessments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {languages.map((lang) => {
          const recentForLang = history.find((h) => h.language === lang.name);
          return (
            <div
              key={lang.name}
              className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-200">
                  {lang.name.charAt(0)}
                </div>
                <h3 className="text-xl font-black text-[#0F172A]">{lang.name}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{lang.desc}</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#E2E8F0] text-xs">
                <div className="flex items-center justify-between text-[#475569]">
                  <span className="flex items-center gap-1.5"><Clock size={14} /> Duration:</span>
                  <span className="font-bold text-[#0F172A]">{lang.duration}</span>
                </div>
                <div className="flex items-center justify-between text-[#475569]">
                  <span className="flex items-center gap-1.5"><Award size={14} /> Question Spread:</span>
                  <span className="font-bold text-[#0F172A]">{lang.easy}E / {lang.med}M / {lang.hard}H</span>
                </div>
                {recentForLang && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-[#64748B] flex justify-between items-center">
                    <span>Best Score:</span>
                    <span className="font-bold text-blue-600">{recentForLang.weightedPercent}% ({recentForLang.level})</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleStart(lang.name)}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Play size={14} />
                {loading ? 'Generating Assessment...' : 'Start Assessment'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Rules Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3">
        <h4 className="text-sm font-bold flex items-center gap-2 text-blue-400">
          <ShieldCheck size={18} />
          Assessment Protocol & Retake Rules
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <li className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <strong>7-Day Cooldown:</strong> Retakes for the same language require 7 days of cooldown to ensure continuous improvement.
          </li>
          <li className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <strong>3 Attempts / 30 Days:</strong> Strict retake limit protects against brute-forcing random question permutations.
          </li>
          <li className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <strong>Weighted Scoring:</strong> Easy=1pt, Med=2pts, Hard=3pts. Expert requires 90%+ total score AND ≥60% on hard questions.
          </li>
        </ul>
      </div>
    </div>
  );
};
