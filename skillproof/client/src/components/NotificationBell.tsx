import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Notification } from '../types';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.meta?.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

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
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="text-amber-400 shrink-0" />;
      case 'DANGER':
        return <AlertCircle size={16} className="text-rose-400 shrink-0" />;
      default:
        return <Info size={16} className="text-indigo-400 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white ring-2 ring-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-indigo-400" />
              <span className="font-semibold text-sm text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-slate-850 ${
                    !n.is_read ? 'bg-indigo-950/20' : 'bg-transparent'
                  }`}
                >
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${!n.is_read ? 'text-slate-100' : 'text-slate-300'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      className="text-slate-500 hover:text-indigo-400 p-1"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

