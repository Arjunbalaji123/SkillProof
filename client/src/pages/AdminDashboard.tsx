import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import {
  Users,
  Award,
  HelpCircle,
  Flag,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Search,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'questions' | 'flags' | 'users' | 'claims' | 'audit'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Question Form state
  const [newQ, setNewQ] = useState({
    language: 'JavaScript',
    topic: 'ES6',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: '',
    options: '["Option 1", "Option 2", "Option 3", "Option 4"]',
    correctAnswer: 'Option 1',
    explanation: '',
  });
  const [createMsg, setCreateMsg] = useState('');

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, questionsRes, flagsRes, usersRes, claimsRes, auditRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/questions'),
        api.get('/admin/flags'),
        api.get('/admin/users'),
        api.get('/skills/claims/unverified'),
        api.get('/admin/audit'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (questionsRes.data.success) setQuestions(questionsRes.data.data);
      if (flagsRes.data.success) setFlags(flagsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (claimsRes.data.success) setClaims(claimsRes.data.data);
      if (auditRes.data.success) setAuditLogs(auditRes.data.data);
    } catch (err) {
      console.error('Failed to load admin console data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg('');
    try {
      let parsedOptions;
      try {
        parsedOptions = JSON.parse(newQ.options);
      } catch {
        parsedOptions = newQ.options.split('\n').filter(Boolean);
      }

      await api.post('/admin/questions', {
        ...newQ,
        options: parsedOptions,
      });
      setCreateMsg('Question added successfully!');
      setNewQ({
        language: 'JavaScript',
        topic: 'ES6',
        difficulty: 'MEDIUM',
        type: 'MCQ',
        prompt: '',
        options: '["Option 1", "Option 2", "Option 3", "Option 4"]',
        correctAnswer: 'Option 1',
        explanation: '',
      });
      const qRes = await api.get('/admin/questions');
      if (qRes.data.success) setQuestions(qRes.data.data);
    } catch (err: any) {
      setCreateMsg(err.response?.data?.message || 'Failed to create question');
    }
  };

  const handleResolveFlag = async (flagId: string, action: 'RESOLVE' | 'RETIRE_QUESTION') => {
    try {
      await api.post(`/admin/flags/${flagId}/resolve`, { action });
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
      alert(`Flag processed: ${action}`);
    } catch (err) {
      alert('Failed to resolve flag');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      alert('Failed to change user status');
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Admin Console</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Manage question bank, curate flagged questions, inspect unverified certificate claims, and review audit logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] pb-3">
        {[
          { id: 'stats', label: 'Overview Stats' },
          { id: 'questions', label: `Question Bank (${questions.length})` },
          { id: 'flags', label: `Flagged Queue (${flags.length})` },
          { id: 'claims', label: `Certificate Claims (${claims.length})` },
          { id: 'users', label: `Users (${users.length})` },
          { id: 'audit', label: 'Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[#475569] hover:bg-slate-100 hover:text-[#0F172A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW STATS */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Total Users</p>
              <p className="text-2xl font-black text-[#0F172A] mt-1">{stats.users.total}</p>
              <p className="text-[11px] text-[#64748B] mt-1">
                {stats.users.developers} Devs • {stats.users.recruiters} Recruiters
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Question Bank</p>
              <p className="text-2xl font-black text-[#0F172A] mt-1">{stats.questions.total}</p>
              <p className="text-[11px] text-[#64748B] mt-1">
                {stats.questions.active} Active • {stats.questions.flagged} Flagged
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Skills Verified</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.assessments.verifiedSkills}</p>
              <p className="text-[11px] text-[#64748B] mt-1">
                vs {stats.assessments.claimedSkills} Unverified Claims
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Assessments Run</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{stats.assessments.total}</p>
              <p className="text-[11px] text-[#64748B] mt-1">Automated Server Benchmarks</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUESTION BANK */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Create Question Form */}
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Plus size={18} className="text-blue-600" /> Add Question to Bank
            </h3>

            {createMsg && (
              <p className={`text-xs font-bold ${createMsg.includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>
                {createMsg}
              </p>
            )}

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">Language</label>
                  <select
                    value={newQ.language}
                    onChange={(e) => setNewQ({ ...newQ, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold"
                  >
                    <option value="JavaScript">JavaScript</option>
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">Topic</label>
                  <input
                    type="text"
                    required
                    value={newQ.topic}
                    onChange={(e) => setNewQ({ ...newQ, topic: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">Difficulty</label>
                  <select
                    value={newQ.difficulty}
                    onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold"
                  >
                    <option value="EASY">EASY (1 pt)</option>
                    <option value="MEDIUM">MEDIUM (2 pts)</option>
                    <option value="HARD">HARD (3 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">Type</label>
                  <select
                    value={newQ.type}
                    onChange={(e) => setNewQ({ ...newQ, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="MULTI">MULTI</option>
                    <option value="CODE_OUTPUT">CODE_OUTPUT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">Prompt</label>
                <textarea
                  rows={2}
                  required
                  value={newQ.prompt}
                  onChange={(e) => setNewQ({ ...newQ, prompt: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#CBD5E1] text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">Options (JSON array)</label>
                  <input
                    type="text"
                    required
                    value={newQ.options}
                    onChange={(e) => setNewQ({ ...newQ, options: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">Correct Answer</label>
                  <input
                    type="text"
                    required
                    value={newQ.correctAnswer}
                    onChange={(e) => setNewQ({ ...newQ, correctAnswer: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">Explanation</label>
                <input
                  type="text"
                  value={newQ.explanation}
                  onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>

          {/* Questions Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold">
                <tr>
                  <th className="p-3">Language</th>
                  <th className="p-3">Topic</th>
                  <th className="p-3">Diff</th>
                  <th className="p-3">Prompt</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {questions.slice(0, 50).map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-[#0F172A]">{q.language}</td>
                    <td className="p-3 text-[#475569]">{q.topic}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#0F172A]">
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate text-[#0F172A]">{q.prompt}</td>
                    <td className="p-3 font-semibold text-[#64748B]">{q.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FLAGGED QUESTION QUEUE */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-[#0F172A]">Flagged Questions Queue</h3>
          {flags.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] text-xs text-[#64748B]">
              No flagged questions waiting for curator review.
            </div>
          ) : (
            flags.map((flag) => (
              <div key={flag.id} className="p-5 rounded-2xl bg-white border border-red-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                      FLAGGED: {flag.question.language}
                    </span>
                    <h4 className="text-sm font-bold text-[#0F172A] mt-2">{flag.question.prompt}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolveFlag(flag.id, 'RESOLVE')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                    >
                      Resolve & Keep Active
                    </button>
                    <button
                      onClick={() => handleResolveFlag(flag.id, 'RETIRE_QUESTION')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs"
                    >
                      Retire Question
                    </button>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#475569]">
                  <p><strong>Reporter Reason:</strong> {flag.reason}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">Reported by: {flag.reporter?.name || flag.reporter?.email}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: CERTIFICATE CLAIMS */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Certificate Claims (Marked Unverified)</h3>
            <p className="text-xs text-[#64748B]">
              In accordance with core principles, certificates are self-declared claims and do not grant verified status without passing randomized assessments.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold">
                <tr>
                  <th className="p-3">Developer</th>
                  <th className="p-3">Skill / Language</th>
                  <th className="p-3">Claimed Level</th>
                  <th className="p-3">Certificate Link</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-[#0F172A]">{claim.user?.name}</td>
                    <td className="p-3 font-semibold text-[#0F172A]">{claim.language}</td>
                    <td className="p-3 text-[#475569]">{claim.claimedLevel}</td>
                    <td className="p-3">
                      <a
                        href={claim.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline truncate max-w-xs block"
                      >
                        {claim.certificateUrl}
                      </a>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {claim.status} (Unverified)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-[#0F172A]">{u.name}</td>
                  <td className="p-3 text-[#64748B]">{u.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#475569]">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleToggleUserStatus(u.id, u.status)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="p-3 text-[#64748B]">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-3 font-bold text-[#0F172A]">{log.actor?.email || 'System'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-[#475569]">{log.entity}</td>
                  <td className="p-3 max-w-xs truncate text-[11px] font-mono text-[#64748B]">
                    {log.metadata || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
