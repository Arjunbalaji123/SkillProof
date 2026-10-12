import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { Bookmark, ExternalLink, Trash2, MapPin } from 'lucide-react';

export const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookmarks = async () => {
    try {
      const res = await api.get('/recruiters/bookmarks');
      if (res.data.success) {
        setBookmarks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const handleRemove = async (devUserId: string) => {
    try {
      await api.delete(`/recruiters/bookmarks/${devUserId}`);
      setBookmarks((prev) => prev.filter((b) => b.developer_id !== devUserId));
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Bookmark className="text-amber-400" />
          Saved Developer Candidates
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Your bookmarked developer profiles for active recruitment pipeline.
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <p className="text-slate-400 text-sm">No developers saved in your bookmarks.</p>
          <Link
            to="/recruiters/developers"
            className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl inline-block"
          >
            Search Talent Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map((bm) => {
            const dev = bm.developer?.profile;
            if (!dev) return null;

            return (
              <div
                key={bm.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base">{dev.name}</h3>
                      <span className="text-xs text-indigo-400 font-mono">@{dev.username}</span>
                    </div>
                    <button
                      onClick={() => handleRemove(bm.developer_id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Remove Bookmark"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{dev.headline}</p>

                  {dev.location && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin size={12} /> {dev.location}
                    </span>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <Link
                    to={`/developer/${dev.username}`}
                    target="_blank"
                    className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-indigo-950/40 text-indigo-400 border border-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <ExternalLink size={14} /> View Portfolio Evidence
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

