import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Info,
  CheckCheck,
  Check,
  Loader2,
  Settings,
} from 'lucide-react';
import { api } from '../services/api';
import { NotificationItem } from '../components/NotificationBell';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const fetchNotifications = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const url = cursor
        ? `/notifications?limit=20&cursor=${encodeURIComponent(cursor)}`
        : '/notifications?limit=20';
      const res = await api.get(url);
      if (res.data?.success && res.data.data) {
        const items: NotificationItem[] = res.data.data.notifications || [];
        if (cursor) {
          setNotifications((prev) => [...prev, ...items]);
        } else {
          setNotifications(items);
        }
        setNextCursor(res.data.data.nextCursor || null);
        setUnreadCount(Number(res.data.data.unreadCount || 0));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const handleNew = () => fetchNotifications();
    window.addEventListener('skillproof:notification-new', handleNew);
    return () => window.removeEventListener('skillproof:notification-new', handleNew);
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt || nowIso } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('skillproof:notifications-refresh'));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || nowIso })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('skillproof:notifications-refresh'));
    } catch {
      // ignore
    }
  };

  const handleOpenNotification = async (n: NotificationItem) => {
    if (!n.readAt) {
      await markRead(n.id);
    }
    if (n.entityType === 'Opening' && n.entityId) {
      navigate(`/openings?openingId=${encodeURIComponent(n.entityId)}`);
    } else if (n.entityType === 'OpeningDigest') {
      navigate('/openings');
    } else if (n.entityType === 'Conversation' && n.entityId) {
      navigate(`/messages?conversationId=${encodeURIComponent(n.entityId)}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'OPENING_MATCH':
        return <Briefcase size={18} className="text-indigo-400" />;
      case 'APPROACH_ACCEPTED':
        return <CheckCircle2 size={18} className="text-emerald-400" />;
      case 'APPROACH_DECLINED':
        return <XCircle size={18} className="text-amber-400" />;
      case 'NEW_MESSAGE':
        return <MessageSquare size={18} className="text-cyan-400" />;
      default:
        return <Info size={18} className="text-slate-400" />;
    }
  };

  const displayed =
    filter === 'UNREAD' ? notifications.filter((n) => !n.readAt) : notifications;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bell className="text-indigo-400" size={24} />
            Notifications
            {unreadCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Opening matches, approach updates, and conversation alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === 'UNREAD'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-indigo-300 transition"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}

          <button
            onClick={() => navigate('/profile/edit')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition"
            title="Notification & Interest Settings"
          >
            <Settings size={14} />
            Settings
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 size={18} className="animate-spin text-indigo-400" />
          Loading notifications...
        </div>
      ) : displayed.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
          <Bell size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold text-sm">
            {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            When verified recruiters post openings matching your skills and interests, they will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
          {displayed.map((n) => {
            const isUnread = !n.readAt;
            return (
              <div
                key={n.id}
                onClick={() => handleOpenNotification(n)}
                className={`p-4 sm:p-5 flex items-start gap-4 transition cursor-pointer hover:bg-slate-800/50 ${
                  isUnread ? 'bg-indigo-950/20' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold ${
                        isUnread ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {n.title}
                    </h3>
                    <span className="text-xs text-slate-500 shrink-0">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                    {n.body}
                  </p>
                </div>
                {isUnread && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead(n.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition shrink-0"
                    title="Mark as read"
                  >
                    <Check size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {nextCursor && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchNotifications(nextCursor)}
            disabled={loadingMore}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-indigo-300 transition inline-flex items-center gap-2"
          >
            {loadingMore && <Loader2 size={14} className="animate-spin" />}
            Load older notifications
          </button>
        </div>
      )}
    </div>
  );
};

