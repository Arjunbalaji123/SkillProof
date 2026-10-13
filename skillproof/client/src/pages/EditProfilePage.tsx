import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Github,
  Save,
  CheckCircle2,
  ShieldAlert,
  BellOff,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface CatalogSkill {
  id: string;
  name: string;
  slug: string;
}

interface CatalogTrack {
  id: string;
  name: string;
  slug: string;
  skills: CatalogSkill[];
}

export const EditProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [allowRecruiterMessages, setAllowRecruiterMessages] = useState(true);
  const [notificationsPaused, setNotificationsPaused] = useState(false);

  const [catalogTracks, setCatalogTracks] = useState<CatalogTrack[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setBio(user.profile.bio || '');
      setGithubUrl(user.profile.githubUrl || '');
      setIsPublic(user.profile.isPublic ?? true);
      setAllowRecruiterMessages(user.profile.allowRecruiterMessages ?? true);
      setNotificationsPaused(user.profile.notificationsPaused ?? false);
    }
  }, [user]);

  useEffect(() => {
    const loadCatalogAndInterests = async () => {
      try {
        const [catRes, intRes] = await Promise.all([
          api.get('/catalog'),
          api.get('/me/interests'),
        ]);
        if (catRes.data?.success && Array.isArray(catRes.data.data)) {
          setCatalogTracks(catRes.data.data);
        }
        if (intRes.data?.success && intRes.data.data) {
          setSelectedTrackIds(intRes.data.data.trackIds || []);
          setSelectedSkillIds(intRes.data.data.skillIds || []);
        }
      } catch {
        // ignore
      }
    };
    loadCatalogAndInterests();
  }, []);

  const toggleTrack = (trackId: string) => {
    setSelectedTrackIds((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  const handleToggleRecruiterMessages = async (checked: boolean) => {
    setAllowRecruiterMessages(checked);
    try {
      await api.patch('/me/messaging-settings', { allowRecruiterMessages: checked });
      await refreshUser();
    } catch {
      // revert on error
      setAllowRecruiterMessages(!checked);
    }
  };

  const handleToggleNotificationsPaused = async (checked: boolean) => {
    setNotificationsPaused(checked);
    try {
      await api.patch('/me/notification-settings', { notificationsPaused: checked });
      await refreshUser();
    } catch {
      setNotificationsPaused(!checked);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const [profileRes] = await Promise.all([
        api.patch('/profile', {
          bio,
          githubUrl: githubUrl.trim() || undefined,
          isPublic,
          allowRecruiterMessages,
          notificationsPaused,
        }),
        api.patch('/me/interests', {
          trackIds: selectedTrackIds,
          skillIds: selectedSkillIds,
        }),
      ]);

      if (profileRes.data.success) {
        setMessage('Profile and hiring preferences updated successfully!');
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
          Customize your bio, hiring interests, and privacy settings for your public Trust Passport.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">Public Username</label>
              <input
                type="text"
                disabled
                value={user?.username || user?.profile?.publicSlug || ''}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-slate-50 text-xs text-[#64748B] cursor-not-allowed font-mono"
              />
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Public link: <code>/u/{user?.username || user?.profile?.publicSlug}</code>
              </p>
            </div>
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

          {/* Hiring & Notification Preferences */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Privacy, Messaging & Notifications
            </h3>

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

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="allowRecruiterMessages"
                checked={allowRecruiterMessages}
                onChange={(e) => handleToggleRecruiterMessages(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="allowRecruiterMessages"
                className="text-xs font-bold text-[#0F172A] cursor-pointer flex items-center gap-1.5"
              >
                <MessageSquare size={14} className="text-indigo-600" />
                Allow recruiters to message me
              </label>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="notificationsPaused"
                checked={notificationsPaused}
                onChange={(e) => handleToggleNotificationsPaused(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="notificationsPaused"
                className="text-xs font-bold text-[#0F172A] cursor-pointer flex items-center gap-1.5"
              >
                <BellOff size={14} className="text-amber-600" />
                Pause notifications
              </label>
            </div>
          </div>

          {/* Developer Interests */}
          {catalogTracks.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600" />
                  Hiring Opening Interests (Tracks & Skills)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  You are automatically matched with openings for your verified skills. Select tracks or skills below to fine-tune which openings notify you.
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-2">Interested Tracks</p>
                <div className="flex flex-wrap gap-2">
                  {catalogTracks.map((t) => {
                    const active = selectedTrackIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTrack(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-2">Interested Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {catalogTracks.flatMap((t) => t.skills || []).map((s) => {
                    const active = selectedSkillIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSkill(s.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
