import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { DirectMessageModal } from '../components/DirectMessageModal';
import { RecruiterBookmarkItem } from '../types';
import {
  Bookmark,
  Trash2,
  ExternalLink,
  CheckCircle2,
  FolderGit2,
  Edit2,
  Save,
  MessageSquare,
} from 'lucide-react';

export const BookmarksPage: React.FC = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<RecruiterBookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [dmTarget, setDmTarget] = useState<{
    name: string;
    username: string;
    topSkill?: { language: string; score: number } | null;
  } | null>(null);

  const isVerifiedRecruiter =
    user?.role === 'RECRUITER' && Boolean(user?.recruiterProfile?.isVerified);

  const loadBookmarks = async () => {
    try {
      const res = await api.get('/recruiter/bookmarks');
      if (res.data.success) {
        setBookmarks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load recruiter bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemove = async (developerId: string) => {
    if (!confirm('Remove this developer from your saved shortlist?')) return;
    try {
      await api.delete(`/recruiter/bookmarks/${developerId}`);
      setBookmarks((prev) => prev.filter((b) => b.developerId !== developerId));
    } catch (err) {
      alert('Failed to remove bookmark');
    }
  };

  const handleSaveNote = async (developerId: string) => {
    try {
      await api.post('/recruiter/bookmarks', {
        developerId,
        note: noteText,
      });
      setBookmarks((prev) =>
        prev.map((b) => (b.developerId === developerId ? { ...b, note: noteText } : b))
      );
      setEditingId(null);
    } catch (err) {
      alert('Failed to save note');
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Saved Developers Shortlist</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Review candidates bookmarked during talent discovery, organize internal hiring notes, and review verified passports.
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0]">
          <Bookmark size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-base font-bold text-[#0F172A]">No developers bookmarked yet</p>
          <p className="text-xs text-[#64748B] mt-1 mb-4">Discover verified developers and bookmark candidates to track them here.</p>
          <Link
            to="/recruiter"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            Find Developers
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookmarks.map((b) => {
            const devUsername = b.username || b.publicSlug;
            const isSelf =
              Boolean(user) &&
              (user?.id === b.developerId ||
                (user?.username &&
                  devUsername &&
                  user.username.toLowerCase() === devUsername.toLowerCase()));
            const canMessage =
              isVerifiedRecruiter &&
              !isSelf &&
              !b.isDemo &&
              b.canDirectMessage !== false &&
              b.verifiedSkills.length > 0;

            return (
              <div
                key={b.bookmarkId}
                className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-[#0F172A]">{b.name}</h3>
                        {b.isDemo && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            Demo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] font-mono">@{devUsername}</p>
                    </div>

                    <button
                      onClick={() => handleRemove(b.developerId)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {b.verifiedSkills.map((vs, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} />
                        {vs.language}: {vs.score}% ({vs.level})
                      </span>
                    ))}
                  </div>

                  {/* Recruiter Note */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#475569] uppercase text-[10px]">Recruiter Note:</span>
                      {editingId === b.developerId ? (
                        <button
                          onClick={() => handleSaveNote(b.developerId)}
                          className="text-blue-600 font-bold flex items-center gap-1"
                        >
                          <Save size={12} /> Save
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(b.developerId);
                            setNoteText(b.note || '');
                          }}
                          className="text-blue-600 font-bold flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                    </div>

                    {editingId === b.developerId ? (
                      <textarea
                        rows={2}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full p-2 rounded-lg border border-[#CBD5E1] bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-[#334155] italic">
                        {b.note ? `"${b.note}"` : 'No private notes attached yet.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <span className="text-xs text-[#64748B] flex items-center gap-1">
                    <FolderGit2 size={14} /> {b.projectCount} Projects
                  </span>

                  <div className="flex items-center gap-2">
                    {canMessage && devUsername && (
                      <button
                        type="button"
                        onClick={() =>
                          setDmTarget({
                            name: b.name,
                            username: devUsername,
                            topSkill: b.verifiedSkills[0]
                              ? {
                                  language: b.verifiedSkills[0].language,
                                  score: b.verifiedSkills[0].score || 0,
                                }
                              : null,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 font-bold text-xs flex items-center gap-1 transition"
                      >
                        <MessageSquare size={12} /> Message
                      </button>
                    )}
                    <Link
                      to={`/u/${devUsername}`}
                      target="_blank"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                    >
                      <ExternalLink size={12} /> View Passport
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DirectMessageModal
        isOpen={Boolean(dmTarget)}
        onClose={() => setDmTarget(null)}
        developer={dmTarget}
      />
    </div>
  );
};
