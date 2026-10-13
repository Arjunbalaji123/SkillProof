import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { MessageSquare, Send, X, AlertCircle, Sparkles } from 'lucide-react';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  developer: {
    name: string;
    username: string;
    topSkill?: {
      language: string;
      score: number;
    } | null;
  } | null;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  developer,
}) => {
  const navigate = useNavigate();
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('');
  const [quota, setQuota] = useState<{ limit: number; used: number; remaining: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !developer) return;
    setError(null);
    setReason('');

    const defaultTemplate = developer.topSkill
      ? `Hi ${developer.name}, I saw your verified ${developer.topSkill.language} score of ${Math.round(
          developer.topSkill.score
        )}% on SkillProof and would love to discuss an engineering opportunity on our team.`
      : `Hi ${developer.name}, I saw your verified skill benchmarks on SkillProof and would love to discuss an engineering opportunity on our team.`;
    setBody(defaultTemplate);

    api
      .get('/messages/direct-quota')
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setQuota(res.data.data);
        }
      })
      .catch(() => {
        // ignore
      });
  }, [isOpen, developer]);

  if (!isOpen || !developer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || body.trim().length > 2000) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/messages/conversations', {
        developerUsername: developer.username,
        body: body.trim(),
        reason: reason.trim() || undefined,
      });
      if (res.data?.success && res.data.data) {
        const convId = res.data.data.conversation?.id || res.data.data.id;
        onClose();
        navigate(convId ? `/messages?conversationId=${convId}` : '/messages');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start direct conversation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Direct Message {developer.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono">@{developer.username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {quota && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
            <span className="text-indigo-800 font-semibold flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600" />
              Remaining daily direct conversations
            </span>
            <span className="font-black text-indigo-700">
              {quota.remaining} / {quota.limit} left today
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason / Context (optional)
            </label>
            <input
              type="text"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Senior Backend Engineer role — Remote"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">Message *</label>
              <span
                className={`text-[11px] font-bold ${
                  body.length > 2000 ? 'text-rose-600' : 'text-slate-400'
                }`}
              >
                {body.length} / 2000
              </span>
            </div>
            <textarea
              rows={5}
              required
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message to this developer..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                !body.trim() ||
                body.trim().length > 2000 ||
                (quota !== null && quota.remaining <= 0)
              }
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Send size={13} />
              {submitting ? 'Sending...' : 'Send Direct Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

