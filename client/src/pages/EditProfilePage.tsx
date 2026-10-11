import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, Github, Save, CheckCircle2, ShieldAlert } from 'lucide-react';

export const EditProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setBio(user.profile.bio || '');
      setGithubUrl(user.profile.githubUrl || '');
      setIsPublic(user.profile.isPublic ?? true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const res = await api.patch('/profile', {
        bio,
        githubUrl: githubUrl.trim() || undefined,
        isPublic,
      });

      if (res.data.success) {
        setMessage('Profile updated successfully!');
        await refreshUser();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Developer Profile Settings</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Customize your bio and repository link for your public Trust Passport discoverable by recruiters.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-sm">
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
            <ShieldAlert size={16} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">Display Name</label>
            <input
              type="text"
              disabled
              value={user?.name || ''}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-slate-50 text-xs text-[#64748B] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">Public Passport Slug</label>
            <input
              type="text"
              disabled
              value={user?.profile?.publicSlug || ''}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-slate-50 text-xs text-[#64748B] cursor-not-allowed font-mono"
            />
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Public link: <code>/developer/{user?.profile?.publicSlug}</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">GitHub URL</label>
            <div className="relative">
              <input
                type="url"
                placeholder="https://github.com/..."
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Github size={16} className="absolute left-3 top-3 text-[#94A3B8]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">Bio & Engineering Focus</label>
            <textarea
              rows={4}
              placeholder="Backend engineer focused on distributed systems, event-driven microservices, and database tuning..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#CBD5E1] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-xs font-bold text-[#0F172A] cursor-pointer">
              Allow recruiters to discover and view my verified passport publicly
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              <Save size={14} />
              {isLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
