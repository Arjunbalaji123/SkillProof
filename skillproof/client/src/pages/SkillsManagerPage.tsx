import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { Modal } from '../components/Modal';
import { PageSkeleton } from '../components/LoadingSkeleton';
import {
  CheckCircle2,
  Plus,
  Trash2,
  Upload,
  FileCheck,
  Award,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { UserSkill, Skill, ProficiencyLevel, VerificationMethod } from '../types';

export const SkillsManagerPage: React.FC = () => {
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [masterSkills, setMasterSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Skill Form
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('INTERMEDIATE');

  // Verification Modal State
  const [isVerifModalOpen, setIsVerifModalOpen] = useState(false);
  const [targetUserSkill, setTargetUserSkill] = useState<UserSkill | null>(null);
  const [verifMethod, setVerifMethod] = useState<VerificationMethod>('DOCUMENT');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [verifSubmitting, setVerifSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [userSkillsRes, masterSkillsRes] = await Promise.all([
        api.get('/skills/user'),
        api.get('/skills'),
      ]);

      if (userSkillsRes.data.success) setUserSkills(userSkillsRes.data.data);
      if (masterSkillsRes.data.success) setMasterSkills(masterSkillsRes.data.data);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const payload: any = { proficiency_level: proficiency };
      if (selectedSkillId) {
        payload.skill_id = selectedSkillId;
      } else if (customSkillName.trim()) {
        payload.skill_name = customSkillName.trim();
      } else {
        return;
      }

      const res = await api.post('/skills/user', payload);
      if (res.data.success) {
        setMessage('Skill added successfully!');
        setSelectedSkillId('');
        setCustomSkillName('');
        fetchData();
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to add skill');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this skill from your profile?')) return;
    try {
      await api.delete(`/skills/user/${id}`);
      setUserSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserSkill) return;

    setVerifSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('user_skill_id', targetUserSkill.id);
      formData.append('method', verifMethod);
      if (proofFile) formData.append('proof', proofFile);

      const res = await api.post('/verifications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setMessage('Verification request submitted successfully!');
        setIsVerifModalOpen(false);
        setProofFile(null);
        fetchData();
      }
    } catch (err: any) {
      console.error('Verification submission failed:', err);
      alert(err.response?.data?.message || 'Submission failed');
    } finally {
      setVerifSubmitting(false);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <CheckCircle2 className="text-indigo-400" />
          Technical Skill Verification Manager
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Add skills to your portfolio, select proficiency levels, and request verification badges via assessment or proof documents.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* Add Skill Form Card */}
      <form onSubmit={handleAddSkill} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus size={16} className="text-indigo-400" /> Add Technical Skill
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Catalog Skill</label>
            <select
              value={selectedSkillId}
              onChange={(e) => {
                setSelectedSkillId(e.target.value);
                if (e.target.value) setCustomSkillName('');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Choose from Master Catalog --</option>
              {masterSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Or Enter Custom Skill</label>
            <input
              type="text"
              value={customSkillName}
              onChange={(e) => {
                setCustomSkillName(e.target.value);
                if (e.target.value) setSelectedSkillId('');
              }}
              placeholder="e.g. GraphQL, AWS, Rust..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Proficiency Level</label>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value as ProficiencyLevel)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
              <option value="EXPERT">EXPERT</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Skill to Portfolio
          </button>
        </div>
      </form>

      {/* User Skills List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 size={18} className="text-indigo-400" />
          Your Skills & Verification Badges ({userSkills.length})
        </h2>

        {userSkills.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No skills added yet.</p>
        ) : (
          <div className="space-y-3">
            {userSkills.map((us) => (
              <div
                key={us.id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white text-base">{us.skill.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      {us.proficiency_level}
                    </span>
                  </div>
                  {us.verification_method && (
                    <p className="text-[11px] text-slate-400">
                      Verified Method: <span className="font-semibold text-slate-300">{us.verification_method}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <VerifiedBadge status={us.verification_status} size="md" />

                  {us.verification_status !== 'VERIFIED' && us.verification_status !== 'PENDING' && (
                    <button
                      onClick={() => {
                        setTargetUserSkill(us);
                        setIsVerifModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <FileCheck size={14} /> Request Verification
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteSkill(us.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                    title="Remove Skill"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Request Modal */}
      <Modal
        isOpen={isVerifModalOpen}
        onClose={() => setIsVerifModalOpen(false)}
        title={`Request Verification for ${targetUserSkill?.skill.name}`}
      >
        <form onSubmit={handleRequestVerification} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Verification Method</label>
            <select
              value={verifMethod}
              onChange={(e) => setVerifMethod(e.target.value as VerificationMethod)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="DOCUMENT">Upload Official Document / Certificate Proof</option>
              <option value="CERTIFICATION">Linked Credential Verification</option>
              <option value="PROJECT">Project Implementation Evidence</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Upload Proof Document (PDF or Image)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300"
            />
            <p className="text-[11px] text-slate-500 mt-1">Maximum size 5MB. Submitted proof will be audited by Admin.</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={verifSubmitting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2"
            >
              <Upload size={14} /> Submit Request to Admin
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

