import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { TrackCatalogItem, PoolHealthItem } from '../types';
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
  Layers,
  Activity,
  Edit2,
  BookOpen,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'stats' | 'catalog' | 'pool' | 'questions' | 'flags' | 'claims' | 'users' | 'audit'
  >('stats');
  const [stats, setStats] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<TrackCatalogItem[]>([]);
  const [poolHealth, setPoolHealth] = useState<PoolHealthItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Pool Health filter state
  const [poolSearch, setPoolSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);

  // Question Bank search & filter
  const [questionSearch, setQuestionSearch] = useState('');
  const [filterLang, setFilterLang] = useState('ALL');

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

  // Batch Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFormat, setImportFormat] = useState<'JSON' | 'CSV'>('JSON');
  const [importSkill, setImportSkill] = useState('');
  const [importTopic, setImportTopic] = useState('');
  const [importContent, setImportContent] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Catalog CRUD Form states
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrack, setNewTrack] = useState({ name: '', description: '' });

  const [showAddSkill, setShowAddSkill] = useState<string | null>(null); // trackId
  const [newSkill, setNewSkill] = useState({
    name: '',
    slug: '',
    description: '',
    durationSec: 1800,
    questionCount: 20,
  });

  const [showAddTopic, setShowAddTopic] = useState<string | null>(null); // skillCatalogId
  const [newTopic, setNewTopic] = useState({ name: '', weightPercent: 20 });

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        questionsRes,
        flagsRes,
        usersRes,
        claimsRes,
        auditRes,
        catalogRes,
        poolRes,
      ] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/questions'),
        api.get('/admin/flags'),
        api.get('/admin/users'),
        api.get('/skills/claims/unverified'),
        api.get('/admin/audit'),
        api.get('/admin/catalog'),
        api.get('/admin/pool-health'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (questionsRes.data.success) setQuestions(questionsRes.data.data);
      if (flagsRes.data.success) setFlags(flagsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (claimsRes.data.success) setClaims(claimsRes.data.data);
      if (auditRes.data.success) setAuditLogs(auditRes.data.data);
      if (catalogRes.data.success) setCatalog(catalogRes.data.data);
      if (poolRes.data.success) setPoolHealth(poolRes.data.data);
    } catch (err) {
      console.error('Failed to load admin console data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Sync available skills and topics for new question form
  const availableSkills = catalog.flatMap((t) => t.skills);
  const selectedSkillObj = availableSkills.find(
    (s) => s.name.toLowerCase() === newQ.language.toLowerCase()
  );
  const availableTopics = selectedSkillObj?.topics || [];

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
        language: availableSkills[0]?.name || 'JavaScript',
        topic: availableTopics[0]?.name || 'ES6',
        difficulty: 'MEDIUM',
        type: 'MCQ',
        prompt: '',
        options: '["Option 1", "Option 2", "Option 3", "Option 4"]',
        correctAnswer: 'Option 1',
        explanation: '',
      });
      const [qRes, poolRes] = await Promise.all([
        api.get('/admin/questions'),
        api.get('/admin/pool-health'),
      ]);
      if (qRes.data.success) setQuestions(qRes.data.data);
      if (poolRes.data.success) setPoolHealth(poolRes.data.data);
    } catch (err: any) {
      setCreateMsg(err.response?.data?.message || 'Failed to create question');
    }
  };

  const handleImportQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportMsg('');
    setImportLoading(true);

    try {
      let parsedList: any[] = [];

      if (importFormat === 'JSON') {
        const parsed = JSON.parse(importContent);
        if (!Array.isArray(parsed)) {
          throw new Error('Import JSON must be an array of question objects.');
        }
        parsedList = parsed;
      } else {
        // CSV Parsing
        const lines = importContent
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 2) {
          throw new Error('CSV must have a header row and at least 1 question row.');
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const promptIdx = headers.indexOf('prompt');
        const optIdx = headers.indexOf('options');
        const ansIdx = headers.indexOf('correctanswer');
        const expIdx = headers.indexOf('explanation');
        const diffIdx = headers.indexOf('difficulty');
        const typeIdx = headers.indexOf('type');
        const langIdx = headers.indexOf('language');
        const topIdx = headers.indexOf('topic');

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim());
          if (parts.length < 2) continue;

          let opts: any[] = [];
          if (optIdx >= 0 && parts[optIdx]) {
            try {
              opts = JSON.parse(parts[optIdx]);
            } catch {
              opts = parts[optIdx].split('|').map((o) => o.trim());
            }
          }

          parsedList.push({
            prompt: promptIdx >= 0 ? parts[promptIdx] : parts[0],
            options: opts,
            correctAnswer: ansIdx >= 0 ? parts[ansIdx] : parts[1],
            explanation: expIdx >= 0 ? parts[expIdx] : '',
            difficulty: diffIdx >= 0 ? parts[diffIdx] : 'MEDIUM',
            type: typeIdx >= 0 ? parts[typeIdx] : 'MCQ',
            language: langIdx >= 0 ? parts[langIdx] : undefined,
            topic: topIdx >= 0 ? parts[topIdx] : undefined,
          });
        }
      }

      // Requirement 5: Enforce that every question has a skill and topic
      for (let i = 0; i < parsedList.length; i++) {
        const q = parsedList[i];
        if (!q.language && importSkill) q.language = importSkill;
        if (!q.topic && importTopic) q.topic = importTopic;

        if (!q.language || !q.topic) {
          throw new Error(
            `Question #${i + 1} (${q.prompt ? q.prompt.slice(0, 30) : 'Row'}...) is missing a skill ("language") or topic. Question import requires a skill and topic for all questions.`
          );
        }
      }

      const res = await api.post('/admin/questions/import', { questions: parsedList });
      setImportMsg(`Success: ${res.data.message || 'Questions imported'}`);
      setImportContent('');

      // Refresh data
      const [qRes, poolRes, catRes] = await Promise.all([
        api.get('/admin/questions'),
        api.get('/admin/pool-health'),
        api.get('/admin/catalog'),
      ]);
      if (qRes.data.success) setQuestions(qRes.data.data);
      if (poolRes.data.success) setPoolHealth(poolRes.data.data);
      if (catRes.data.success) setCatalog(catRes.data.data);
    } catch (err: any) {
      setImportMsg(err.response?.data?.message || err.message || 'Failed to import questions');
    } finally {
      setImportLoading(false);
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

  // Track CRUD handlers
  const handleCreateTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/tracks', newTrack);
      setNewTrack({ name: '', description: '' });
      setShowAddTrack(false);
      const catRes = await api.get('/admin/catalog');
      if (catRes.data.success) setCatalog(catRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create track');
    }
  };

  const handleDeleteTrack = async (id: string, name: string) => {
    if (!window.confirm(`Delete track "${name}" and all associated skills?`)) return;
    try {
      await api.delete(`/admin/tracks/${id}`);
      const catRes = await api.get('/admin/catalog');
      if (catRes.data.success) setCatalog(catRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete track');
    }
  };

  // Skill CRUD handlers
  const handleCreateSkill = async (trackId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/skills', { ...newSkill, trackId });
      setNewSkill({ name: '', slug: '', description: '', durationSec: 1800, questionCount: 20 });
      setShowAddSkill(null);
      const [catRes, poolRes] = await Promise.all([
        api.get('/admin/catalog'),
        api.get('/admin/pool-health'),
      ]);
      if (catRes.data.success) setCatalog(catRes.data.data);
      if (poolRes.data.success) setPoolHealth(poolRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create skill');
    }
  };

  const handleDeleteSkill = async (id: string, name: string) => {
    if (!window.confirm(`Delete skill "${name}"?`)) return;
    try {
      await api.delete(`/admin/skills/${id}`);
      const [catRes, poolRes] = await Promise.all([
        api.get('/admin/catalog'),
        api.get('/admin/pool-health'),
      ]);
      if (catRes.data.success) setCatalog(catRes.data.data);
      if (poolRes.data.success) setPoolHealth(poolRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete skill');
    }
  };

  // Topic CRUD handlers
  const handleCreateTopic = async (skillCatalogId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/topics', {
        skillCatalogId,
        name: newTopic.name,
        weightPercent: Number(newTopic.weightPercent),
      });
      setNewTopic({ name: '', weightPercent: 20 });
      setShowAddTopic(null);
      const [catRes, poolRes] = await Promise.all([
        api.get('/admin/catalog'),
        api.get('/admin/pool-health'),
      ]);
      if (catRes.data.success) setCatalog(catRes.data.data);
      if (poolRes.data.success) setPoolHealth(poolRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create topic');
    }
  };

  const handleDeleteTopic = async (id: string, name: string) => {
    if (!window.confirm(`Delete topic "${name}"?`)) return;
    try {
      await api.delete(`/admin/topics/${id}`);
      const [catRes, poolRes] = await Promise.all([
        api.get('/admin/catalog'),
        api.get('/admin/pool-health'),
      ]);
      if (catRes.data.success) setCatalog(catRes.data.data);
      if (poolRes.data.success) setPoolHealth(poolRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete topic');
    }
  };

  if (loading) return <PageSkeleton />;

  const lowPoolCount = poolHealth.filter((p) => p.isLow).length;

  const filteredPoolHealth = poolHealth.filter((p) => {
    if (showLowOnly && !p.isLow) return false;
    if (poolSearch) {
      const q = poolSearch.toLowerCase();
      return (
        p.topicName.toLowerCase().includes(q) ||
        p.skillName.toLowerCase().includes(q) ||
        p.trackName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredQuestions = questions.filter((q) => {
    if (filterLang !== 'ALL' && q.language.toLowerCase() !== filterLang.toLowerCase()) {
      return false;
    }
    if (questionSearch) {
      const query = questionSearch.toLowerCase();
      return (
        q.prompt.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.language.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Admin Console</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Role-based skill catalog, blueprint question health, balanced pool curation, and verification operations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] pb-3">
        {[
          { id: 'stats', label: 'Overview Stats' },
          { id: 'catalog', label: `Skill Catalog (${catalog.length} Tracks)` },
          {
            id: 'pool',
            label: `Question Pool Health ${
              lowPoolCount > 0 ? `(${lowPoolCount} Low)` : `(${poolHealth.length})`
            }`,
            badge: lowPoolCount > 0 ? 'bg-amber-500 text-white' : undefined,
          },
          { id: 'questions', label: `Question Bank (${questions.length})` },
          { id: 'flags', label: `Flagged Queue (${flags.length})` },
          { id: 'claims', label: `Certificate Claims (${claims.length})` },
          { id: 'users', label: `Users (${users.length})` },
          { id: 'audit', label: 'Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
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
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {stats.assessments.verifiedSkills}
              </p>
              <p className="text-[11px] text-[#64748B] mt-1">
                vs {stats.assessments.claimedSkills} Unverified Claims
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Assessments Run</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{stats.assessments.total}</p>
              <p className="text-[11px] text-[#64748B] mt-1">Stratified Blueprint Benchmarks</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SKILL CATALOG & TOPICS (CRUD) */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Track & Skill Catalog</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Manage industry tracks, modular skills, and weighted topics (summing strictly to 100%).
              </p>
            </div>
            <button
              onClick={() => setShowAddTrack(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={16} /> Add Track
            </button>
          </div>

          {/* Add Track Form Modal */}
          {showAddTrack && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-blue-200 space-y-4">
              <h4 className="text-sm font-bold text-[#0F172A]">Create New Track</h4>
              <form onSubmit={handleCreateTrack} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1">Track Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cloud & DevOps"
                    value={newTrack.name}
                    onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Infrastructure, CI/CD, Containerization"
                    value={newTrack.description}
                    onChange={(e) => setNewTrack({ ...newTrack, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    Save Track
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddTrack(false)}
                    className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Catalog Tree View */}
          <div className="space-y-6">
            {catalog.map((track) => (
              <div
                key={track.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden"
              >
                {/* Track Header */}
                <div className="p-4 bg-slate-50 border-b border-[#E2E8F0] flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      Track
                    </span>
                    <h4 className="text-base font-bold text-[#0F172A] mt-1">{track.name}</h4>
                    {track.description && (
                      <p className="text-xs text-[#64748B] mt-0.5">{track.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddSkill(track.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Skill
                    </button>
                    <button
                      onClick={() => handleDeleteTrack(track.id, track.name)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                      title="Delete Track"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Add Skill to Track Modal */}
                {showAddSkill === track.id && (
                  <div className="p-4 bg-blue-50/50 border-b border-blue-100 space-y-3">
                    <h5 className="text-xs font-bold text-[#0F172A]">Add Skill to {track.name}</h5>
                    <form
                      onSubmit={(e) => handleCreateSkill(track.id, e)}
                      className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs"
                    >
                      <div>
                        <label className="block font-bold text-[#475569] mb-1">Skill Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. React.js"
                          value={newSkill.name}
                          onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#475569] mb-1">Slug</label>
                        <input
                          type="text"
                          placeholder="e.g. react"
                          value={newSkill.slug}
                          onChange={(e) => setNewSkill({ ...newSkill, slug: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#475569] mb-1">Description</label>
                        <input
                          type="text"
                          placeholder="Brief summary"
                          value={newSkill.description}
                          onChange={(e) =>
                            setNewSkill({ ...newSkill, description: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
                        >
                          Save Skill
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddSkill(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-[#475569]"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Skills List */}
                <div className="p-4 space-y-4">
                  {track.skills.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] italic">No skills under this track yet.</p>
                  ) : (
                    track.skills.map((skill) => {
                      const totalWeight = skill.topics.reduce(
                        (sum, t) => sum + (t.weightPercent || 0),
                        0
                      );
                      const isWeightBalanced = totalWeight === 100;

                      return (
                        <div
                          key={skill.id}
                          className="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/40 space-y-3"
                        >
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold text-[#0F172A]">{skill.name}</h5>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-[#475569]">
                                  slug: {skill.slug}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    isWeightBalanced
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isWeightBalanced
                                    ? '100% Weight Balanced'
                                    : `⚠️ Topic Weights: ${totalWeight}% (Must sum to 100%)`}
                                </span>
                              </div>
                              <p className="text-xs text-[#64748B] mt-0.5">
                                {skill.description || 'No description provided.'} •{' '}
                                {skill.topics.length} topics • {skill.questionCount} questions /{' '}
                                {Math.round(skill.durationSec / 60)} min
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setShowAddTopic(skill.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1"
                              >
                                <Plus size={13} /> Add Topic
                              </button>
                              <button
                                onClick={() => handleDeleteSkill(skill.id, skill.name)}
                                className="p-1 rounded text-red-500 hover:bg-red-50"
                                title="Delete Skill"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Add Topic Inline Form */}
                          {showAddTopic === skill.id && (
                            <form
                              onSubmit={(e) => handleCreateTopic(skill.id, e)}
                              className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 flex flex-wrap items-center gap-3 text-xs"
                            >
                              <div>
                                <label className="block font-bold text-[#475569] mb-1">
                                  Topic Name
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Concurrency & Goroutines"
                                  value={newTopic.name}
                                  onChange={(e) =>
                                    setNewTopic({ ...newTopic, name: e.target.value })
                                  }
                                  className="px-2.5 py-1 rounded border border-[#CBD5E1]"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-[#475569] mb-1">
                                  Weight (%)
                                </label>
                                <input
                                  type="number"
                                  required
                                  min={1}
                                  max={100}
                                  value={newTopic.weightPercent}
                                  onChange={(e) =>
                                    setNewTopic({
                                      ...newTopic,
                                      weightPercent: Number(e.target.value),
                                    })
                                  }
                                  className="w-20 px-2.5 py-1 rounded border border-[#CBD5E1]"
                                />
                              </div>
                              <div className="flex items-end gap-2 mt-4">
                                <button
                                  type="submit"
                                  className="px-3 py-1 rounded bg-emerald-600 text-white font-bold"
                                >
                                  Save Topic
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowAddTopic(null)}
                                  className="px-3 py-1 rounded border border-slate-300 text-[#475569] font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Topics Chips */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {skill.topics.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs shadow-xs"
                              >
                                <span className="font-bold text-[#0F172A]">{t.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-black text-[10px]">
                                  {t.weightPercent}%
                                </span>
                                <button
                                  onClick={() => handleDeleteTopic(t.id, t.name)}
                                  className="text-slate-400 hover:text-red-500"
                                  title="Delete Topic"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: QUESTION POOL HEALTH */}
      {activeTab === 'pool' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Question Pool Health</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Monitoring topic depth. Every skill requires balanced distribution and &ge;60 active
                questions to start assessments. Topics warn if &lt;15 active questions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLowOnly(!showLowOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  showLowOnly
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50'
                }`}
              >
                {showLowOnly ? 'Showing Low Pool Only (< 15)' : 'Show Low Pool Only (< 15)'}
              </button>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Filter topic or skill..."
                  value={poolSearch}
                  onChange={(e) => setPoolSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Alert banner if low topics exist */}
          {lowPoolCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Pool Alert: {lowPoolCount} topic(s) have fewer than 15 active questions
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Blueprint sampling stratifies questions by topic weights. If a topic has fewer than
                  15 active questions, fallback topic substitution will be triggered or assessments
                  will be blocked if the skill pool has fewer than 60 active questions total.
                </p>
              </div>
            </div>
          )}

          {/* Pool Health Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold">
                <tr>
                  <th className="p-3">Track</th>
                  <th className="p-3">Skill</th>
                  <th className="p-3">Topic</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Active Questions</th>
                  <th className="p-3">Flagged</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredPoolHealth.map((item) => (
                  <tr
                    key={item.topicId}
                    className={`hover:bg-slate-50/50 ${item.isLow ? 'bg-amber-50/30' : ''}`}
                  >
                    <td className="p-3 text-[#64748B] font-medium">{item.trackName}</td>
                    <td className="p-3 font-bold text-[#0F172A]">{item.skillName}</td>
                    <td className="p-3 font-semibold text-[#0F172A]">{item.topicName}</td>
                    <td className="p-3 font-bold text-blue-600">{item.weightPercent}%</td>
                    <td className="p-3">
                      <span className="font-bold text-[#0F172A]">{item.activeCount}</span>
                      <span className="text-[11px] text-[#64748B]"> / 15 target</span>
                    </td>
                    <td className="p-3">
                      {item.flaggedCount > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                          {item.flaggedCount} flagged
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">0</span>
                      )}
                    </td>
                    <td className="p-3">
                      {item.isLow ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                          <AlertTriangle size={12} /> Low Pool (&lt; 15 active)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 size={12} /> Healthy ({item.activeCount} active)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: QUESTION BANK & IMPORT */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Question Bank Management</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Curate individual questions or batch import via CSV/JSON (requiring skill and topic).
              </p>
            </div>
            <button
              onClick={() => setShowImportModal(!showImportModal)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Upload size={16} /> Batch Import (CSV/JSON)
            </button>
          </div>

          {/* Batch Import Tool Card */}
          {showImportModal && (
            <div className="p-6 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <Upload size={18} className="text-blue-600" /> Batch Import Questions (CSV / JSON)
                </h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImportFormat('JSON')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      importFormat === 'JSON' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-[#475569]'
                    }`}
                  >
                    JSON Array
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportFormat('CSV')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      importFormat === 'CSV' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-[#475569]'
                    }`}
                  >
                    CSV Format
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#64748B]">
                Requirement: Every imported question must have a target Skill and Topic. You can
                select defaults below (which apply to rows missing them) or include `language` and
                `topic` in each item.
              </p>

              {importMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    importMsg.includes('Success')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {importMsg}
                </div>
              )}

              <form onSubmit={handleImportQuestions} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                      Default Target Skill (Language)
                    </label>
                    <select
                      value={importSkill}
                      onChange={(e) => setImportSkill(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold"
                    >
                      <option value="">-- Choose Skill (Optional if in payload) --</option>
                      {availableSkills.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                      Default Target Topic
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Asynchronous JS or choose from catalog"
                      value={importTopic}
                      onChange={(e) => setImportTopic(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-[#475569] uppercase">
                      {importFormat} Content
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (importFormat === 'JSON') {
                          setImportContent(
                            JSON.stringify(
                              [
                                {
                                  language: importSkill || 'JavaScript',
                                  topic: importTopic || 'ES6',
                                  difficulty: 'EASY',
                                  type: 'MCQ',
                                  prompt: 'What keyword declares a block-scoped variable?',
                                  options: ['let', 'var', 'global', 'define'],
                                  correctAnswer: 'let',
                                  explanation: 'let and const declare block-scoped variables in modern JavaScript.',
                                },
                              ],
                              null,
                              2
                            )
                          );
                        } else {
                          setImportContent(
                            `prompt,options,correctAnswer,explanation,difficulty,type,language,topic\nWhat keyword declares a block-scoped variable?,let|var|global|define,let,let is block-scoped,EASY,MCQ,${
                              importSkill || 'JavaScript'
                            },${importTopic || 'ES6'}`
                          );
                        }
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Fill Template Example
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    required
                    placeholder={
                      importFormat === 'JSON'
                        ? '[{ "language": "...", "topic": "...", "prompt": "...", "options": [...], "correctAnswer": "..." }]'
                        : 'prompt,options,correctAnswer,explanation,difficulty,type,language,topic'
                    }
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#CBD5E1] font-mono text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importLoading}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    {importLoading ? 'Importing...' : 'Submit Import'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Create Question Form */}
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Plus size={18} className="text-blue-600" /> Add Single Question to Bank
            </h3>

            {createMsg && (
              <p
                className={`text-xs font-bold ${
                  createMsg.includes('success') ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {createMsg}
              </p>
            )}

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                    Skill (Language)
                  </label>
                  <select
                    value={newQ.language}
                    onChange={(e) => {
                      const lang = e.target.value;
                      const sObj = availableSkills.find(
                        (s) => s.name.toLowerCase() === lang.toLowerCase()
                      );
                      setNewQ({
                        ...newQ,
                        language: lang,
                        topic: sObj?.topics[0]?.name || newQ.topic,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold"
                  >
                    {availableSkills.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                    {availableSkills.length === 0 && (
                      <>
                        <option value="JavaScript">JavaScript</option>
                        <option value="Python">Python</option>
                        <option value="Java">Java</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                    Topic
                  </label>
                  {availableTopics.length > 0 ? (
                    <select
                      value={newQ.topic}
                      onChange={(e) => setNewQ({ ...newQ, topic: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold"
                    >
                      {availableTopics.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.weightPercent}%)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Topic name"
                      value={newQ.topic}
                      onChange={(e) => setNewQ({ ...newQ, topic: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                    Difficulty
                  </label>
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
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                    Type
                  </label>
                  <select
                    value={newQ.type}
                    onChange={(e) => setNewQ({ ...newQ, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold"
                  >
                    <option value="MCQ">MCQ (Single Choice)</option>
                    <option value="MULTI">MULTI (Multi-Select)</option>
                    <option value="CODE_OUTPUT">CODE_OUTPUT (Snippet Output)</option>
                    <option value="SCENARIO">SCENARIO (Real-World Architecture)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                  Prompt (Supports Markdown Code Blocks)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Question text or markdown code snippet (e.g. ```javascript ... ```)"
                  value={newQ.prompt}
                  onChange={(e) => setNewQ({ ...newQ, prompt: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#CBD5E1] text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                    Options (JSON array of strings)
                  </label>
                  <input
                    type="text"
                    required
                    value={newQ.options}
                    onChange={(e) => setNewQ({ ...newQ, options: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                    Correct Answer (String or JSON Array)
                  </label>
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
                <label className="block text-xs font-bold text-[#475569] mb-1 uppercase">
                  Explanation
                </label>
                <input
                  type="text"
                  placeholder="Why is this answer correct?"
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

          {/* Filter Bar & Questions Table */}
          <div className="space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#475569]">Skill:</span>
                <select
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold bg-white"
                >
                  <option value="ALL">All Skills ({questions.length})</option>
                  {Array.from(new Set(questions.map((q) => q.language))).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search prompts or topics..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs bg-white w-64"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold">
                  <tr>
                    <th className="p-3">Skill</th>
                    <th className="p-3">Topic</th>
                    <th className="p-3">Diff</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Prompt</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredQuestions.slice(0, 100).map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-[#0F172A]">{q.language}</td>
                      <td className="p-3 text-[#475569]">{q.topic}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#0F172A]">
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                          {q.type}
                        </span>
                      </td>
                      <td className="p-3 max-w-sm truncate text-[#0F172A]">{q.prompt}</td>
                      <td className="p-3 font-semibold text-[#64748B]">{q.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FLAGGED QUESTION QUEUE */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-[#0F172A]">Flagged Questions Queue</h3>
          {flags.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] text-xs text-[#64748B]">
              No flagged questions waiting for curator review.
            </div>
          ) : (
            flags.map((flag) => (
              <div
                key={flag.id}
                className="p-5 rounded-2xl bg-white border border-red-200 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                      FLAGGED: {flag.question.language}
                    </span>
                    <h4 className="text-sm font-bold text-[#0F172A] mt-2">
                      {flag.question.prompt}
                    </h4>
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
                  <p>
                    <strong>Reporter Reason:</strong> {flag.reason}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Reported by: {flag.reporter?.name || flag.reporter?.email}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 6: CERTIFICATE CLAIMS */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Certificate Claims (Marked Unverified)
            </h3>
            <p className="text-xs text-[#64748B]">
              In accordance with core principles, certificates are self-declared claims and do not
              grant verified status without passing randomized assessments.
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

      {/* TAB 7: USERS */}
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
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
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

      {/* TAB 8: AUDIT TRAIL */}
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
                  <td className="p-3 text-[#64748B]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
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
