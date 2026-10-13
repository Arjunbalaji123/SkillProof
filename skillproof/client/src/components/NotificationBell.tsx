import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Briefcase,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'OPENING_MATCH' | 'APPROACH_ACCEPTED' | 'APPROACH_DECLINED' | 'NEW_MESSAGE' | 'SYSTEM' | string;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  readAt: string | null;
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchLatestNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=10');
      if (res.data?.success && res.data.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(Number(res.data.data.unreadCount || 0));
      }
    } catch {
      // ignore background error
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data?.success) {
        setUnreadCount(Number(res.data.data?.count || 0));
      }
    } catch {
      // ignore background error
    }
  }, []);

  useEffect(() => {
    fetchLatestNotifications();
    const interval = setInterval(fetchUnreadCount, 30000);

    const handleRealtimeNotif = () => {
      fetchLatestNotifications();
    };
    window.addEventListener('skillproof:notification-new', handleRealtimeNotif);
    window.addEventListener('skillproof:notifications-refresh', handleRealtimeNotif);

    return () => {
      clearInterval(interval);
      window.removeEventListener('skillproof:notification-new', handleRealtimeNotif);
      window.removeEventListener('skillproof:notifications-refresh', handleRealtimeNotif);
    };
  }, [fetchLatestNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchLatestNotifications();
    }
  }, [isOpen, fetchLatestNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt || nowIso } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || nowIso })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.readAt) {
      await markAsRead(n.id);
    }
    setIsOpen(false);

    if (
      (n.entityType?.toLowerCase() === 'opening' || n.type === 'OPENING_MATCH') &&
      n.entityId &&
      !n.entityId.startsWith('digest:')
    ) {
      navigate(`/openings?openingId=${encodeURIComponent(n.entityId)}`);
    } else if (n.entityType?.toLowerCase() === 'openingdigest' || n.entityId?.startsWith('digest:')) {
      navigate('/openings');
    } else if (n.entityType === 'Conversation' && n.entityId) {
      navigate(`/messages?conversationId=${encodeURIComponent(n.entityId)}`);
    } else {
      navigate('/notifications');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'OPENING_MATCH':
        return <Briefcase size={15} className="text-indigo-400 shrink-0" />;
      case 'APPROACH_ACCEPTED':
        return <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />;
      case 'APPROACH_DECLINED':
        return <XCircle size={15} className="text-amber-400 shrink-0" />;
      case 'NEW_MESSAGE':
        return <MessageSquare size={15} className="text-cyan-400 shrink-0" />;
      default:
        return <Info size={15} className="text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="notification-bell-btn"
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white ring-2 ring-slate-950"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-indigo-400" />
              <span className="font-semibold text-sm text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No notifications yet. You will be alerted when matching openings or messages arrive.
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 flex items-start gap-3 transition cursor-pointer hover:bg-slate-800/60 ${
                      isUnread ? 'bg-indigo-950/25' : 'bg-transparent'
                    }`}
                  >
                    <div className="mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isUnread ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                        {n.body}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="text-slate-500 hover:text-indigo-400 p-1 shrink-0"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition py-0.5"
            >
              View all notifications
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
