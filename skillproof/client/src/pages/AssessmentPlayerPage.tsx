import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { Award, Clock, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { Assessment, AssessmentQuestion } from '../types';

export const AssessmentPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // seconds
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result state
  const [resultData, setResultData] = useState<any | null>(null);

  const selectedAnswersRef = React.useRef(selectedAnswers);
  selectedAnswersRef.current = selectedAnswers;

  const isSubmittingRef = React.useRef(isSubmitting);
  isSubmittingRef.current = isSubmitting;

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const res = await api.get(`/assessments/${id}`);
        if (res.data.success) {
          const ass: Assessment = res.data.data;
          setAssessment(ass);
          setTimeLeft(ass.time_limit_minutes * 60);
        }
      } catch (err) {
        console.error('Failed to load quiz details:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchAssessment();
  }, [id]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmitQuiz = async () => {
    if (isSubmittingRef.current || !attemptId || !assessment) return;
    setIsSubmitting(true);

    try {
      const answersArray = Object.entries(selectedAnswersRef.current).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      }));

      const res = await api.post(`/assessments/${assessment.id}/submit`, {
        attemptId,
        answers: answersArray,
      });

      if (res.data.success) {
        setResultData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to submit quiz:', err);
      alert(err.response?.data?.message || 'Quiz submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (!assessment || resultData) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [assessment, resultData]);

  if (isLoading || !assessment) return <PageSkeleton />;

  // Display Result Celebration View if completed
  if (resultData) {
    const passed = resultData.passed;

    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          <div
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
              passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {passed ? <CheckCircle2 size={44} /> : <AlertTriangle size={44} />}
          </div>

          <div className="space-y-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {passed ? 'Assessment Passed 🎉' : 'Assessment Failed'}
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{assessment.title}</h1>
            <p className="text-sm text-slate-400">
              Passing threshold: {resultData.passingPercentage}%
            </p>
          </div>

          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-400 block mb-1">Your Score</span>
              <p className={`text-4xl font-extrabold font-mono ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {resultData.percentage}%
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Correct Answers</span>
              <p className="text-4xl font-extrabold text-white font-mono">
                {resultData.correctAnswers} / {resultData.totalQuestions}
              </p>
            </div>
          </div>

          {passed && resultData.skillVerified && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
              <Sparkles size={16} />
              <span>Skill Badge Verified! Check out your public portfolio to view your badge.</span>
            </div>
          )}

          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => navigate('/assessments')}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Back to Assessments
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const questions: AssessmentQuestion[] = assessment.questions || [];
  const currentQ = questions[currentIdx];

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Quiz Top Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 px-6 flex items-center justify-between shadow-xl">
        <div>
          <h1 className="text-base font-bold text-white">{assessment.title}</h1>
          <span className="text-xs text-slate-400">
            Question {currentIdx + 1} of {questions.length}
          </span>
        </div>

        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-mono font-bold text-sm ${
          timeLeft < 180
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
            : 'bg-slate-950 text-indigo-400 border-slate-800'
        }`}>
          <Clock size={16} />
          <span>{formatTimer(timeLeft)}</span>
        </div>
      </div>

      {/* Progress Dots Bar */}
      <div className="flex gap-2">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setCurrentIdx(idx)}
            className={`h-2 flex-1 rounded-full transition ${
              idx === currentIdx
                ? 'bg-indigo-500'
                : selectedAnswers[q.id]
                ? 'bg-emerald-500/60'
                : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <h2 className="text-lg font-bold text-white leading-snug">{currentQ.question_text}</h2>

          {currentQ.code_snippet && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
              <pre className="font-mono text-xs text-indigo-300 leading-relaxed">
                <code>{currentQ.code_snippet}</code>
              </pre>
            </div>
          )}

          {/* Options list */}
          <div className="space-y-3">
            {currentQ.options.map((opt) => {
              const isSelected = selectedAnswers[currentQ.id] === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQ.id, opt.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-700'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs leading-relaxed">{opt.option_text}</span>
                </div>
              );
            })}
          </div>

          {/* Navigation Control Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <ArrowLeft size={16} /> Previous
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition"
              >
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition"
              >
                Submit Assessment
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

