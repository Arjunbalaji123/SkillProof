import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { AssessmentQuestionItem, AssessmentResult } from '../types';
import { MarkdownPrompt } from '../components/MarkdownPrompt';
import {
  Clock,
  AlertTriangle,
  Flag,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  BarChart2,
  RefreshCw,
  Home,
  ShieldAlert,
  Award,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

/**
 * Format answer into plain text: join arrays with ", ", remove brackets/quotes, or show "Not answered".
 */
function formatAnswer(ans: any): string {
  if (ans === undefined || ans === null || ans === '') return 'Not answered';

  let parsed = ans;
  if (typeof ans === 'string') {
    try {
      parsed = JSON.parse(ans);
    } catch {
      parsed = ans;
    }
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return 'Not answered';
    return parsed.map((item) => String(item).trim()).filter(Boolean).join(', ');
  }

  const str = String(parsed).trim();
  return str.length > 0 ? str : 'Not answered';
}

export const AssessmentPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<AssessmentQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState<number>(1800);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  // Flag Modal state
  const [isFlagOpen, setIsFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagSubmitted, setFlagSubmitted] = useState(false);

  // Load or restore active assessment
  useEffect(() => {
    let isMounted = true;

    const fetchAssessment = async () => {
      try {
        setLoading(true);
        // 1. First check if this assessment is already SUBMITTED
        try {
          const resResult = await api.get(`/assessments/${id}/result`);
          if (resResult.data.success && resResult.data.data.status === 'SUBMITTED') {
            if (isMounted) {
              setResult(resResult.data.data);
              setLoading(false);
            }
            return;
          }
        } catch (_) {
          // not found or not submitted yet, proceed
        }

        // 2. Fetch active assessment details
        const res = await api.get(`/assessments/${id}`);
        if (!isMounted) return;

        if (res.data.success) {
          const data = res.data.data;
          if (data.status === 'SUBMITTED') {
            // Already submitted, fetch result
            const resResult = await api.get(`/assessments/${id}/result`);
            if (isMounted) setResult(resResult.data.data);
          } else {
            setAssessment(data);
            setQuestions(data.questions || []);
            setTabSwitches(data.tabSwitchCount || 0);

            // Populate existing user answers
            const initialAnswers: Record<number, any> = {};
            (data.questions || []).forEach((q: AssessmentQuestionItem) => {
              if (q.userAnswer !== null && q.userAnswer !== undefined) {
                initialAnswers[q.order] = q.userAnswer;
              }
            });
            setUserAnswers(initialAnswers);

            // Compute remaining time safely in seconds
            const startedAtMs = new Date(data.startedAt).getTime();
            const nowMs = Date.now();
            const elapsedSec = Math.floor((nowMs - startedAtMs) / 1000);
            const remaining = Math.max(0, (data.durationSec || 1800) - elapsedSec);
            setTimeLeft(remaining);
          }
        }
      } catch (err) {
        console.error('Failed to load assessment:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAssessment();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Tab switch blur detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !result && assessment && assessment.status === 'IN_PROGRESS') {
        setTabSwitches((prev) => prev + 1);
        api.post(`/assessments/${id}/tab-switch`).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [id, result, assessment]);

  // Timer countdown: Auto-submit ONLY when assessment is loaded and real remaining time reaches 0
  useEffect(() => {
    if (result || !assessment || assessment.status !== 'IN_PROGRESS' || loading) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [result, assessment, loading]);

  const handleSelectOption = async (option: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    let newAnswer: any = option;
    if (currentQ.type === 'MULTI') {
      const existing: string[] = userAnswers[currentQ.order] || [];
      if (existing.includes(option)) {
        newAnswer = existing.filter((item) => item !== option);
      } else {
        newAnswer = [...existing, option];
      }
    }

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.order]: newAnswer,
    }));

    // Auto save answer to server immediately as selected
    try {
      await api.post(`/assessments/${id}/answer`, {
        order: currentQ.order,
        userAnswer: newAnswer,
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/assessments/${id}/submit`);
      if (res.data.success) {
        setResult(res.data.data);
        // Refresh session & skills state in background
        refreshUser().catch(() => {});
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const [navigatingBack, setNavigatingBack] = useState(false);
  const handleBackToDashboard = async () => {
    setNavigatingBack(true);
    try {
      // Invalidate and refresh user data before navigating back
      await refreshUser();
    } catch (_) {
      // ignore
    } finally {
      navigate('/dashboard');
    }
  };

  const handleFlagQuestion = async () => {
    const currentQ = questions[currentIndex];
    if (!currentQ || !flagReason.trim()) return;

    try {
      await api.post(`/assessments/questions/${currentQ.questionId}/flag`, {
        reason: flagReason.trim(),
      });
      setFlagSubmitted(true);
      setTimeout(() => {
        setIsFlagOpen(false);
        setFlagReason('');
        setFlagSubmitted(false);
      }, 1500);
    } catch (err) {
      alert('Failed to submit question flag');
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) return <PageSkeleton />;

  // RESULT VIEW
  if (result) {
    const isCompleted = result.scorePercent != null && result.weightedPercent != null;
    const isPassed = Boolean(result.passed && isCompleted);

    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className={`p-8 rounded-3xl border shadow-lg text-center space-y-4 ${
          !isCompleted
            ? 'bg-slate-50 border-slate-300 text-slate-800'
            : isPassed
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-950'
            : 'bg-red-950/20 border-red-500/40 text-red-950'
        }`}>
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-white shadow-md">
            {!isCompleted ? (
              <AlertTriangle size={36} className="text-amber-500" />
            ) : isPassed ? (
              <CheckCircle2 size={36} className="text-emerald-600" />
            ) : (
              <ShieldAlert size={36} className="text-red-600" />
            )}
          </div>

          <h1 className="text-3xl font-black text-[#0F172A]">
            {!isCompleted
              ? 'Attempt not completed'
              : isPassed
              ? 'Assessment Benchmark Passed! 🎉'
              : 'Assessment Not Passed'}
          </h1>

          <p className="text-sm text-[#475569] max-w-lg mx-auto">
            {!isCompleted
              ? 'This attempt was not completed or had no recorded score.'
              : isPassed
              ? `Congratulations! Your ${result.language} skill has been VERIFIED at the ${result.level} level for 12 months.`
              : `You scored ${result.weightedPercent ?? 0}%. Passing requires at least 40% (Basic level). Review your mistakes below.`}
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm min-w-[130px]">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Weighted Score</p>
              <p className="text-3xl font-black text-blue-600 mt-1">
                {result.weightedPercent != null ? `${result.weightedPercent}%` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm min-w-[130px]">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Level Earned</p>
              <p className="text-3xl font-black text-[#0F172A] mt-1">
                {result.level || (result.weightedPercent != null ? 'Beginner' : 'N/A')}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm min-w-[130px]">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Confidence</p>
              <div className="mt-2 flex justify-center">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  result.confidence === 'High'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : result.confidence === 'Medium'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {result.confidence || 'Low'}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm min-w-[130px]">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Tab Focus Blurs</p>
              <p className="text-3xl font-black text-amber-600 mt-1">{result.tabSwitchCount ?? 0}</p>
            </div>
          </div>

          {/* Prominent summary statement */}
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-700 bg-white/80 inline-block px-4 py-1.5 rounded-full border border-slate-200">
              Based on {result.questions?.length || 20} questions across {Object.keys(result.topicBreakdown || {}).length} topics
              {result.coverage?.attemptsCount ? ` • Attempt #${result.coverage.attemptsCount}` : ''}
            </p>
          </div>
        </div>

        {/* Per-Topic Breakdown & Weak Topic Study Suggestions */}
        {result.topicBreakdown && Object.keys(result.topicBreakdown).length > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <BarChart2 size={18} className="text-blue-600" />
                Topic Performance Heatmap
              </h3>
              <span className="text-xs text-[#64748B]">
                Threshold: <span className="text-emerald-700 font-bold">≥60% Pass</span> | <span className="text-amber-700 font-bold">&lt;60% Focus Area</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(result.topicBreakdown).map(([topic, stats]) => {
                const isWeak = stats.accuracy < 60;
                return (
                  <div
                    key={topic}
                    className={`p-4 rounded-2xl border transition space-y-2.5 ${
                      isWeak
                        ? 'bg-amber-50/70 border-amber-200 shadow-sm'
                        : 'bg-slate-50 border-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex justify-between items-start text-xs">
                      <span className="font-bold text-[#0F172A] pr-2 leading-tight">{topic}</span>
                      <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                        isWeak
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {stats.accuracy}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isWeak ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${stats.accuracy}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-[#64748B]">
                      <span>{stats.correct} / {stats.total} correct</span>
                      {isWeak && (
                        <span className="text-amber-800 font-bold text-[10px] uppercase">
                          Weak Area
                        </span>
                      )}
                    </div>

                    {isWeak && (
                      <div className="pt-2 border-t border-amber-200/80 text-[11px] text-amber-950 space-y-0.5">
                        <strong className="text-amber-800 flex items-center gap-1 font-bold">
                          💡 Study Suggestion:
                        </strong>
                        <p className="leading-tight text-amber-900">
                          Review core concepts, runtime semantics, and hands-on coding scenarios for {topic}.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cumulative Topic Profile from all Submitted Attempts */}
        {result.cumulativeProfile && result.cumulativeProfile.length > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Award size={18} className="text-emerald-600" />
              Cumulative Profile (Across All Attempts)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {result.cumulativeProfile.map((cp) => (
                <div key={cp.topic} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0F172A]">{cp.topic}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      cp.strength === 'Strong'
                        ? 'bg-emerald-100 text-emerald-800'
                        : cp.strength === 'Proficient'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {cp.strength} ({cp.accuracy}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    {cp.correct} of {cp.total} total answered correctly
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question Review & Explanations */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#0F172A]">Question Review & Official Explanations</h3>
          {result.questions?.map((q, idx) => (
            <div
              key={q.id || idx}
              className={`p-5 rounded-2xl border ${
                q.isCorrect ? 'bg-white border-emerald-200' : 'bg-white border-red-200'
              } space-y-3 shadow-sm`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#64748B]">Question {idx + 1} ({q.difficulty})</span>
                <span className={`px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1 ${
                  q.isCorrect
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {q.isCorrect ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-700" />
                      Correct
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={13} className="text-red-700" />
                      Incorrect
                    </>
                  )}
                </span>
              </div>

              <div className="text-sm font-bold text-[#0F172A]">
                <MarkdownPrompt content={q.prompt} />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <p>
                  <strong className="text-slate-700">Your Answer:</strong>{' '}
                  <span className={q.isCorrect ? 'text-emerald-800 font-semibold' : 'text-red-800 font-semibold'}>
                    {formatAnswer(q.userAnswer)}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-700">Correct Answer:</strong>{' '}
                  <span className="text-blue-800 font-semibold">
                    {formatAnswer(q.correctAnswer)}
                  </span>
                </p>
                {q.explanation && (
                  <div className="text-slate-700 pt-2 border-t border-slate-200 leading-relaxed">
                    <strong className="text-blue-700">Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={handleBackToDashboard}
            disabled={navigatingBack}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <Home size={14} /> {navigatingBack ? 'Updating Dashboard...' : 'Back to Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE PLAYER VIEW
  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertTriangle size={36} className="mx-auto text-amber-500" />
        <h2 className="text-lg font-bold text-[#0F172A]">Assessment In Progress</h2>
        <p className="text-xs text-[#64748B]">
          Submitting or finalizing test questions.
        </p>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          View Results
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header: Timer, Tab Counter, Flag button */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-2 font-mono text-sm font-bold text-[#0F172A]">
          <Clock size={16} className={timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-blue-600'} />
          <span className={timeLeft < 300 ? 'text-red-600 font-extrabold' : ''}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {tabSwitches > 0 && (
          <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
            <AlertTriangle size={14} /> Focus Loss: {tabSwitches}x
          </div>
        )}

        <button
          onClick={() => setIsFlagOpen(true)}
          className="text-xs text-[#64748B] hover:text-red-600 font-semibold flex items-center gap-1.5 transition"
        >
          <Flag size={14} /> Flag Question
        </button>
      </div>

      {/* Question Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs text-[#64748B]">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
              currentQ.type === 'SCENARIO'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : currentQ.type === 'CODE_OUTPUT'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : currentQ.type === 'MULTI'
                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              {currentQ.type === 'SCENARIO' ? 'Scenario' : currentQ.type === 'CODE_OUTPUT' ? 'Code Output' : currentQ.type === 'MULTI' ? 'Multi-Select' : 'MCQ'}
            </span>
            <span className="font-bold text-[#0F172A]">{currentQ.difficulty} ({currentQ.topic})</span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-6">
        <div className="text-lg sm:text-xl font-bold text-[#0F172A] leading-snug">
          <MarkdownPrompt content={currentQ.prompt} />
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options?.map((opt, idx) => {
            const isSelected = currentQ.type === 'MULTI'
              ? (userAnswers[currentQ.order] || []).includes(opt)
              : userAnswers[currentQ.order] === opt;

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(opt)}
                className={`w-full text-left p-4 rounded-2xl border text-sm font-medium transition flex items-center justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                    : 'border-[#E2E8F0] hover:border-slate-300 text-[#0F172A] bg-white'
                }`}
              >
                <span>{opt}</span>
                {isSelected && <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1.5"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Send size={14} />
            {submitting ? 'Grading Assessment...' : 'Submit Assessment'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Flag Modal */}
      {isFlagOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Flag size={18} className="text-red-500" />
              Flag Question for Admin Review
            </h3>
            <p className="text-xs text-[#64748B]">
              Found an ambiguity, typo, or outdated syntax? Report it directly to our question bank curators.
            </p>

            <textarea
              rows={3}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Explain the issue with this question..."
              className="w-full p-3 rounded-xl border border-[#CBD5E1] text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            {flagSubmitted ? (
              <p className="text-xs font-bold text-emerald-600">Flag reported successfully!</p>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsFlagOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlagQuestion}
                  disabled={!flagReason.trim()}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Submit Flag
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
