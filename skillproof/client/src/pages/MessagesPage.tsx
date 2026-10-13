import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  ExternalLink,
  Archive,
  VolumeX,
  Volume2,
  Ban,
  Flag,
  Check,
  CheckCheck,
  Clock,
  ChevronLeft,
  Sparkles,
  ShieldAlert,
  UserPlus,
  Loader2,
  X,
  Inbox,
  MailQuestion,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface PeerUser {
  id: string;
  username: string | null;
  name: string;
  role: string;
  isDemo: boolean;
  bio: string | null;
  githubUrl: string | null;
  topSkill?: {
    language: string;
    level: string;
    score: number;
  } | null;
}

interface ConversationSummary {
  id: string;
  createdAt: string;
  lastMessageAt: string;
  myStatus: 'ACTIVE' | 'REQUEST' | 'DECLINED' | 'ARCHIVED';
   peerStatus: 'ACTIVE' | 'REQUEST' | 'DECLINED' | 'ARCHIVED';
  isPending: boolean;
  muted: boolean;
  lastReadAt: string | null;
  peerLastReadAt: string | null;
  unreadCount: number;
  isBlockedByMe: boolean;
  otherUser: PeerUser;
  lastMessage: {
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
  } | null;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: {
    id: string;
    username: string | null;
    name: string;
    role: string;
  };
  body: string;
  createdAt: string;
  readByRecipient: boolean;
}

interface ConversationDetail {
  id: string;
  createdAt: string;
  lastMessageAt: string;
  myParticipant: {
    userId: string;
    status: 'ACTIVE' | 'REQUEST' | 'DECLINED' | 'ARCHIVED';
    muted: boolean;
    lastReadAt: string | null;
  };
  otherParticipant: {
    userId: string;
    status: 'ACTIVE' | 'REQUEST' | 'DECLINED' | 'ARCHIVED';
    lastReadAt: string | null;
    user: PeerUser;
  };
  isPending: boolean;
  pendingMessagesSent: number;
  pendingMessageLimit: number;
  isBlockedByMe: boolean;
  isBlockedByPeer: boolean;
  canSend: boolean;
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

type TabType = 'inbox' | 'requests' | 'archived';

export const MessagesPage: React.FC = () => {
  const { conversationId: routeConvId } = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUsernameParam = searchParams.get('to');
  const targetSkillParam = searchParams.get('skill');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Left panel state
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({ inboxUnread: 0, requestsCount: 0, total: 0 });

  // Right panel state
  const [selectedConvId, setSelectedConvId] = useState<string | null>(routeConvId || null);
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // New conversation draft state (when ?to=<username> or user picks someone not yet messaged)
  const [draftRecipient, setDraftRecipient] = useState<{
    username: string;
    name: string;
    role: string;
    topSkill?: string | null;
  } | null>(null);

  // Composer state
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Header menu & Report modal state
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Mobile responsive toggle: if true, show chat panel on mobile
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(Boolean(routeConvId || targetUsernameParam));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 60);
  };

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await api.get('/messages/unread-count');
      if (res.data?.success) {
        setUnreadCounts(res.data.data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch conversation list for current tab & search
  const fetchConversations = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingList(true);
      try {
        const params = new URLSearchParams({ tab: activeTab });
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }
        const res = await api.get(`/messages/conversations?${params.toString()}`);
        if (res.data?.success) {
          setConversations(res.data.data || []);
        }
      } catch (err: any) {
        console.error('Failed to load conversations:', err);
      } finally {
        if (!silent) setLoadingList(false);
      }
    },
    [activeTab, searchQuery]
  );

  // Fetch single conversation detail
  const fetchConversationDetail = useCallback(
    async (convId: string, silent = false) => {
      if (!silent) setLoadingConv(true);
      setErrorBanner(null);
      try {
        const res = await api.get(`/messages/conversations/${convId}`);
        if (res.data?.success) {
          const detail: ConversationDetail = res.data.data;
          setActiveConv(detail);
          setDraftRecipient(null);
          if (!silent) {
            scrollToBottom('auto');
          }
          // Mark read if we have unread messages and status is ACTIVE
          if (detail.myParticipant.status === 'ACTIVE') {
            await api.post(`/messages/conversations/${convId}/read`).catch(() => {});
            fetchUnreadCounts();
            setConversations((prev) =>
              prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
            );
          }
        }
      } catch (err: any) {
        setErrorBanner(err.response?.data?.message || 'Unable to load conversation.');
      } finally {
        if (!silent) setLoadingConv(false);
      }
    },
    [fetchUnreadCounts]
  );

  // Sync route param with selectedConvId
  useEffect(() => {
    if (routeConvId && routeConvId !== selectedConvId) {
      setSelectedConvId(routeConvId);
      setMobileShowChat(true);
    }
  }, [routeConvId, selectedConvId]);

  // Load conversations when tab or search changes
  useEffect(() => {
    fetchConversations();
    fetchUnreadCounts();
  }, [fetchConversations, fetchUnreadCounts]);

  // Load selected conversation details
  useEffect(() => {
    if (selectedConvId) {
      fetchConversationDetail(selectedConvId);
    } else {
      setActiveConv(null);
    }
  }, [selectedConvId, fetchConversationDetail]);

  // Handle ?to=<username> query parameter to open existing or draft conversation
  useEffect(() => {
    if (!targetUsernameParam) return;
    const cleanTarget = targetUsernameParam.trim().toLowerCase().replace(/^@/, '');
    if (!cleanTarget) return;

    const resolveRecipient = async () => {
      try {
        // First check if we already have a conversation with this username across inbox/requests
        const [inboxRes, reqRes] = await Promise.all([
          api.get('/messages/conversations?tab=inbox'),
          api.get('/messages/conversations?tab=requests'),
        ]);
        const allConvs: ConversationSummary[] = [
          ...(inboxRes.data?.data || []),
          ...(reqRes.data?.data || []),
        ];
        const existing = allConvs.find(
          (c) => c.otherUser.username?.toLowerCase() === cleanTarget
        );

        if (existing) {
          setSelectedConvId(existing.id);
          setDraftRecipient(null);
          setMobileShowChat(true);
          navigate(`/messages/${existing.id}`, { replace: true });
          return;
        }

        // Otherwise fetch public profile or search user info to show new message composer
        try {
          const profRes = await api.get(`/profile/public/${encodeURIComponent(cleanTarget)}`);
          if (profRes.data?.success && profRes.data.data) {
            const p = profRes.data.data;
            const topSkill = p.verifiedSkills?.[0]?.language || targetSkillParam || null;
            setSelectedConvId(null);
            setActiveConv(null);
            setDraftRecipient({
              username: p.username || cleanTarget,
              name: p.name || cleanTarget,
              role: p.role || 'DEVELOPER',
              topSkill,
            });
            setMobileShowChat(true);
            return;
          }
        } catch {
          // fallback if recruiter without public developer profile
          setSelectedConvId(null);
          setActiveConv(null);
          setDraftRecipient({
            username: cleanTarget,
            name: `@${cleanTarget}`,
            role: 'USER',
            topSkill: targetSkillParam || null,
          });
          setMobileShowChat(true);
        }
      } catch (err) {
        console.error('Error resolving recipient:', err);
      }
    };

    resolveRecipient();
  }, [targetUsernameParam, targetSkillParam, navigate]);

  // Socket.IO real-time listener + 30s fallback polling when socket disconnected
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (payload: { conversationId: string; message: ChatMessage }) => {
      fetchConversations(true);
      fetchUnreadCounts();

      if (selectedConvId && payload.conversationId === selectedConvId) {
        setActiveConv((prev) => {
          if (!prev) return prev;
          const exists = prev.messages.some((m) => m.id === payload.message.id);
          if (exists) return prev;
          return {
            ...prev,
            messages: [...prev.messages, payload.message],
          };
        });
        scrollToBottom('smooth');
        api.post(`/messages/conversations/${selectedConvId}/read`).catch(() => {});
      }
    };

    const handleConversationUpdated = (payload: { conversationId: string; event: string }) => {
      fetchConversations(true);
      fetchUnreadCounts();
      if (selectedConvId && payload.conversationId === selectedConvId) {
        fetchConversationDetail(selectedConvId, true);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversation:updated', handleConversationUpdated);

    // 30-second fallback polling if socket is not connected
    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        fetchUnreadCounts();
        fetchConversations(true);
        if (selectedConvId) {
          fetchConversationDetail(selectedConvId, true);
        }
      }
    }, 30000);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('conversation:updated', handleConversationUpdated);
      clearInterval(pollInterval);
    };
  }, [selectedConvId, fetchConversations, fetchUnreadCounts, fetchConversationDetail]);

  // Close header menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load older messages (cursor pagination)
  const handleLoadOlder = async () => {
    if (!activeConv || !activeConv.hasMore || !activeConv.nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await api.get(
        `/messages/conversations/${activeConv.id}?cursor=${encodeURIComponent(activeConv.nextCursor)}`
      );
      if (res.data?.success) {
        const olderData: ConversationDetail = res.data.data;
        setActiveConv((prev) => {
          if (!prev) return prev;
          const existingIds = new Set(prev.messages.map((m) => m.id));
          const uniqueOlder = olderData.messages.filter((m) => !existingIds.has(m.id));
          return {
            ...prev,
            messages: [...uniqueOlder, ...prev.messages],
            nextCursor: olderData.nextCursor,
            hasMore: olderData.hasMore,
          };
        });
      }
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  };

  // Send message or start conversation
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = messageBody.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setErrorBanner(null);

    try {
      if (draftRecipient && !selectedConvId) {
        const res = await api.post('/messages/conversations', {
          recipientUsername: draftRecipient.username,
          body: trimmed,
        });
        if (res.data?.success) {
          const newConvId = res.data.data.conversation.id;
          setMessageBody('');
          setDraftRecipient(null);
          setSearchParams({});
          setSelectedConvId(newConvId);
          navigate(`/messages/${newConvId}`, { replace: true });
          await fetchConversations(true);
          await fetchConversationDetail(newConvId);
        }
      } else if (selectedConvId) {
        const res = await api.post(`/messages/conversations/${selectedConvId}/messages`, {
          body: trimmed,
        });
        if (res.data?.success) {
          const newMsg: ChatMessage = res.data.data;
          setMessageBody('');
          setActiveConv((prev) => {
            if (!prev) return prev;
            const exists = prev.messages.some((m) => m.id === newMsg.id);
            const updatedMessages = exists ? prev.messages : [...prev.messages, newMsg];
            const nextPendingCount = prev.isPending
              ? prev.pendingMessagesSent + 1
              : prev.pendingMessagesSent;
            return {
              ...prev,
              messages: updatedMessages,
              pendingMessagesSent: nextPendingCount,
              canSend: prev.isPending
                ? nextPendingCount < prev.pendingMessageLimit
                : prev.canSend,
            };
          });
          scrollToBottom('smooth');
          fetchConversations(true);
        }
      }
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // Composer Enter vs Shift+Enter
  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Accept request
  const handleAcceptRequest = async () => {
    if (!activeConv) return;
    try {
      await api.post(`/messages/conversations/${activeConv.id}/accept`);
      showToast('Message request accepted');
      setActiveTab('inbox');
      await fetchConversationDetail(activeConv.id);
      await fetchConversations(true);
      await fetchUnreadCounts();
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to accept request.');
    }
  };

  // Decline request
  const handleDeclineRequest = async () => {
    if (!activeConv) return;
    try {
      await api.post(`/messages/conversations/${activeConv.id}/decline`);
      showToast('Message request declined');
      setSelectedConvId(null);
      setActiveConv(null);
      setMobileShowChat(false);
      navigate('/messages');
      await fetchConversations(true);
      await fetchUnreadCounts();
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to decline request.');
    }
  };

  // Archive / Unarchive conversation
  const handleToggleArchive = async () => {
    if (!activeConv) return;
    setIsHeaderMenuOpen(false);
    try {
      const res = await api.post(`/messages/conversations/${activeConv.id}/archive`);
      const newStatus = res.data?.data?.status;
      showToast(newStatus === 'ARCHIVED' ? 'Conversation archived' : 'Moved back to Inbox');
      await fetchConversationDetail(activeConv.id, true);
      await fetchConversations(true);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to update archive state.');
    }
  };

  // Mute / Unmute conversation
  const handleToggleMute = async () => {
    if (!activeConv) return;
    setIsHeaderMenuOpen(false);
    try {
      const res = await api.post(`/messages/conversations/${activeConv.id}/mute`);
      const muted = res.data?.data?.muted;
      showToast(muted ? 'Notifications muted for this chat' : 'Notifications unmuted');
      await fetchConversationDetail(activeConv.id, true);
      await fetchConversations(true);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to toggle mute.');
    }
  };

  // Block / Unblock user
  const handleToggleBlock = async () => {
    if (!activeConv) return;
    setIsHeaderMenuOpen(false);
    const peer = activeConv.otherParticipant.user;
    try {
      if (activeConv.isBlockedByMe) {
        await api.delete(`/messages/blocks/${peer.id}`);
        showToast(`Unblocked @${peer.username || peer.name}`);
      } else {
        await api.post(`/messages/blocks/${peer.id}`);
        showToast(`Blocked @${peer.username || peer.name}`);
      }
      await fetchConversationDetail(activeConv.id, true);
      await fetchConversations(true);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to update block status.');
    }
  };

  // Submit message report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMessage || reportReason.trim().length < 3 || submittingReport) return;
    setSubmittingReport(true);
    try {
      await api.post(`/messages/${reportingMessage.id}/report`, {
        reason: reportReason.trim(),
      });
      showToast('Report submitted to moderators with 5-message context.');
      setReportingMessage(null);
      setReportReason('');
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Format date separator
  const formatDateSeparator = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Starter suggestions for peers and recruiters
  const getStarterSuggestions = () => {
    const peerUsername =
      activeConv?.otherParticipant.user.username || draftRecipient?.username || 'there';
    const topSkill =
      activeConv?.otherParticipant.user.topSkill?.language ||
      draftRecipient?.topSkill ||
      'TypeScript';

    if (user?.role === 'RECRUITER') {
      return [
        `Hi @${peerUsername}, I saw your verified ${topSkill} credential on SkillProof and would love to discuss an open role!`,
        `Ask for guidance on ${topSkill} architecture & availability`,
        `Hi @${peerUsername}, are you currently open to new engineering opportunities?`,
      ];
    }
    return [
      `Ask for guidance on ${topSkill}`,
      `Hi @${peerUsername}! Congrats on your verified ${topSkill} badge — how did you prepare for the assessment?`,
      `Hey @${peerUsername}, would you be open to collaborating or sharing tips on ${topSkill}?`,
    ];
  };

  const currentPeer = activeConv?.otherParticipant.user || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-slate-700">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex h-[calc(100vh-8.5rem)] min-h-[560px]">
        {/* LEFT COLUMN: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-[#E2E8F0] flex flex-col bg-slate-50/50 ${
            mobileShowChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Left Header */}
          <div className="p-4 bg-white border-b border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <MessageSquare size={17} />
                </div>
                <div>
                  <h1 className="text-base font-extrabold text-[#0F172A]">Messages</h1>
                  <p className="text-[11px] text-[#64748B]">Direct developer & recruiter chat</p>
                </div>
              </div>
              {unreadCounts.total > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-[#2563EB] text-white">
                  {unreadCounts.total} unread
                </span>
              )}
            </div>

            {/* Search by username */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by @username or name..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-[#CBD5E1] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Tabs: Inbox | Requests | Archived */}
            <div className="grid grid-cols-3 gap-1 mt-3 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'inbox'
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Inbox size={13} />
                <span>Inbox</span>
                {unreadCounts.inboxUnread > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white text-[10px] flex items-center justify-center">
                    {unreadCounts.inboxUnread}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'requests'
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <MailQuestion size={13} />
                <span>Requests</span>
                {unreadCounts.requestsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
                    {unreadCounts.requestsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('archived')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'archived'
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Archive size={13} />
                <span>Archived</span>
              </button>
            </div>
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
            {loadingList ? (
              <div className="p-8 flex flex-col items-center justify-center text-[#64748B] gap-2">
                <Loader2 size={20} className="animate-spin text-[#2563EB]" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-[#0F172A]">
                  {activeTab === 'requests'
                    ? 'No pending message requests'
                    : activeTab === 'archived'
                    ? 'No archived conversations'
                    : 'No conversations yet'}
                </p>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Visit the{' '}
                  <Link to="/leaderboard" className="text-[#2563EB] font-semibold hover:underline">
                    Leaderboard
                  </Link>{' '}
                  or search a developer's @username to start chatting.
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;
                const hasUnread = conv.unreadCount > 0;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setDraftRecipient(null);
                      setMobileShowChat(true);
                      navigate(`/messages/${conv.id}`);
                    }}
                    className={`w-full p-3.5 text-left transition flex items-start gap-3 ${
                      isSelected
                        ? 'bg-blue-50/90 border-l-4 border-l-[#2563EB]'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-[#2563EB] font-extrabold text-sm flex items-center justify-center border border-blue-200">
                        {conv.otherUser.name.charAt(0).toUpperCase()}
                      </div>
                      {hasUnread && (
                        <span
                          title={`${conv.unreadCount} unread`}
                          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#2563EB] ring-2 ring-white"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs truncate ${
                            hasUnread ? 'font-extrabold text-[#0F172A]' : 'font-bold text-[#0F172A]'
                          }`}
                        >
                          {conv.otherUser.name}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-[#64748B] shrink-0">
                            {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-mono text-[#2563EB] truncate">
                          @{conv.otherUser.username}
                        </span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {conv.otherUser.role}
                        </span>
                        {conv.isPending && conv.myStatus === 'ACTIVE' && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            Pending
                          </span>
                        )}
                        {conv.muted && (
                          <VolumeX size={11} className="text-slate-400 shrink-0" />
                        )}
                      </div>

                      {conv.lastMessage && (
                        <p
                          className={`text-xs mt-1 truncate ${
                            hasUnread ? 'font-bold text-[#0F172A]' : 'text-[#64748B]'
                          }`}
                        >
                          {conv.lastMessage.senderId === user?.id ? 'You: ' : ''}
                          {conv.lastMessage.body}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Chat Panel */}
        <div
          className={`flex-1 flex flex-col bg-white ${
            !mobileShowChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {loadingConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#64748B] gap-2">
              <Loader2 size={24} className="animate-spin text-[#2563EB]" />
              <span className="text-xs font-semibold">Loading chat history...</span>
            </div>
          ) : activeConv || draftRecipient ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileShowChat(false);
                      navigate('/messages');
                    }}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-[#475569]"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-blue-100 text-[#2563EB] font-bold text-sm flex items-center justify-center shrink-0">
                    {(currentPeer?.name || draftRecipient?.name || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-[#0F172A] truncate">
                        {currentPeer?.name || draftRecipient?.name}
                      </h2>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-[#475569]">
                        {currentPeer?.role || draftRecipient?.role}
                      </span>
                      {activeConv?.myParticipant.muted && (
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5">
                          <VolumeX size={12} /> Muted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#64748B]">
                      <Link
                        to={`/u/${currentPeer?.username || draftRecipient?.username}`}
                        className="font-mono text-[#2563EB] hover:underline"
                      >
                        @{currentPeer?.username || draftRecipient?.username}
                      </Link>
                      {currentPeer?.topSkill && (
                        <span>
                          • Top Verified: <strong>{currentPeer.topSkill.language}</strong> (
                          {currentPeer.topSkill.level})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chat Header Action Menu */}
                {activeConv && currentPeer && (
                  <div ref={headerMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-[#475569] border border-[#E2E8F0] transition"
                      aria-label="Conversation options"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isHeaderMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl py-1.5 z-40 divide-y divide-[#E2E8F0]">
                        <div className="py-1">
                          <Link
                            to={`/u/${currentPeer.username}`}
                            onClick={() => setIsHeaderMenuOpen(false)}
                            className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-2"
                          >
                            <ExternalLink size={14} className="text-[#2563EB]" />
                            View profile
                          </Link>
                          <button
                            type="button"
                            onClick={handleToggleArchive}
                            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Archive size={14} className="text-slate-500" />
                            {activeConv.myParticipant.status === 'ARCHIVED'
                              ? 'Unarchive chat'
                              : 'Archive'}
                          </button>
                          <button
                            type="button"
                            onClick={handleToggleMute}
                            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-2"
                          >
                            {activeConv.myParticipant.muted ? (
                              <>
                                <Volume2 size={14} className="text-slate-500" />
                                Unmute
                              </>
                            ) : (
                              <>
                                <VolumeX size={14} className="text-slate-500" />
                                Mute
                              </>
                            )}
                          </button>
                        </div>
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={handleToggleBlock}
                            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                          >
                            <Ban size={14} />
                            {activeConv.isBlockedByMe ? 'Unblock user' : 'Block'}
                          </button>
                          {activeConv.messages.some((m) => m.senderId === currentPeer.id) && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsHeaderMenuOpen(false);
                                const lastPeerMsg = [...activeConv.messages]
                                  .reverse()
                                  .find((m) => m.senderId === currentPeer.id);
                                if (lastPeerMsg) setReportingMessage(lastPeerMsg);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 flex items-center gap-2"
                            >
                              <Flag size={14} />
                              Report
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error Banner */}
              {errorBanner && (
                <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-center justify-between text-xs text-red-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} />
                    <span>{errorBanner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorBanner(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Message Request Banner for Recipient (Requests Tab) */}
              {activeConv && activeConv.myParticipant.status === 'REQUEST' && (
                <div className="px-4 py-3.5 bg-amber-50/90 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-amber-900">
                      Message Request from {currentPeer?.name} (@{currentPeer?.username})
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Accepting lets them message you freely. Declining hides the request without notifying the sender.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAcceptRequest}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                    >
                      <CheckCircle2 size={13} /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineRequest}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <XCircle size={13} /> Decline
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleBlock}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Ban size={13} /> Block
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Status Notice for Sender */}
              {activeConv &&
                activeConv.isPending &&
                activeConv.myParticipant.status === 'ACTIVE' && (
                  <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-800">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Clock size={13} className="text-blue-600" />
                      Message request pending acceptance ({activeConv.pendingMessagesSent}/
                      {activeConv.pendingMessageLimit} introductory messages used)
                    </span>
                  </div>
                )}

              {/* Message List Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
                {/* Load Older Button */}
                {activeConv?.hasMore && (
                  <div className="text-center pb-2">
                    <button
                      type="button"
                      onClick={handleLoadOlder}
                      disabled={loadingOlder}
                      className="px-3.5 py-1.5 rounded-full bg-white border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 shadow-sm transition inline-flex items-center gap-1.5"
                    >
                      {loadingOlder && <Loader2 size={12} className="animate-spin" />}
                      Load older messages
                    </button>
                  </div>
                )}

                {/* Starter Suggestions when conversation is empty or draft */}
                {(!activeConv || activeConv.messages.length <= 1) && (
                  <div className="bg-white border border-blue-100 rounded-2xl p-3.5 shadow-sm">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] mb-2">
                      <Sparkles size={14} />
                      <span>Conversation Starters</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {getStarterSuggestions().map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMessageBody(suggestion)}
                          className="text-left text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-[#1E40AF] border border-blue-200/80 transition"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages with Date Separators */}
                {activeConv?.messages.map((msg, idx) => {
                  const isMine = msg.senderId === user?.id;
                  const prevMsg = idx > 0 ? activeConv.messages[idx - 1] : null;
                  const showDateSeparator =
                    !prevMsg ||
                    new Date(prevMsg.createdAt).toDateString() !==
                      new Date(msg.createdAt).toDateString();

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-3">
                          <span className="px-3 py-0.5 rounded-full bg-slate-200/70 text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                            {formatDateSeparator(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`flex items-end gap-2 group ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isMine && (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0">
                            {(currentPeer?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div
                          className={`max-w-[75%] sm:max-w-[68%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                            isMine
                              ? 'bg-[#2563EB] text-white rounded-br-sm'
                              : 'bg-white text-[#0F172A] border border-[#E2E8F0] rounded-bl-sm'
                          }`}
                        >
                          {/* Plain text rendering only - React escapes text automatically */}
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {msg.body}
                          </p>

                          <div
                            className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                              isMine ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMine && (
                              <span className="inline-flex items-center gap-0.5 font-semibold">
                                {msg.readByRecipient ? (
                                  <>
                                    <CheckCheck size={12} className="text-emerald-300" />
                                    <span>Read</span>
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} />
                                    <span>Sent</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Report button on incoming messages */}
                        {!isMine && (
                          <button
                            type="button"
                            onClick={() => setReportingMessage(msg)}
                            title="Report this message"
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Flag size={12} />
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="p-3.5 bg-white border-t border-[#E2E8F0]">
                {activeConv?.isBlockedByMe ? (
                  <div className="text-center py-2 text-xs text-[#64748B] flex items-center justify-center gap-2">
                    <span>You have blocked this user.</span>
                    <button
                      type="button"
                      onClick={handleToggleBlock}
                      className="text-[#2563EB] font-bold hover:underline"
                    >
                      Unblock to send messages
                    </button>
                  </div>
                ) : activeConv && !activeConv.canSend ? (
                  <div className="text-center py-2 text-xs text-amber-800 bg-amber-50 rounded-xl border border-amber-200 font-semibold">
                    {activeConv.myParticipant.status === 'REQUEST'
                      ? 'Please accept the message request above to reply.'
                      : 'You have reached the 3-message limit for a pending request. You can send more once they accept.'}
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-1.5">
                    <div className="flex items-end gap-2">
                      <textarea
                        rows={2}
                        maxLength={2000}
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        placeholder="Write a plain-text message... (Enter to send, Shift+Enter for newline)"
                        className="flex-1 resize-none rounded-xl border border-[#CBD5E1] bg-slate-50 focus:bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition"
                      />
                      <button
                        type="submit"
                        disabled={!messageBody.trim() || messageBody.length > 2000 || sending}
                        className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition shrink-0"
                      >
                        {sending ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                        <span>Send</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#64748B] px-1">
                      <span>Enter to send • Shift+Enter for new line • Plain text only</span>
                      <span
                        className={
                          messageBody.length > 1900 ? 'font-bold text-amber-600' : 'font-mono'
                        }
                      >
                        {messageBody.length}/2000
                      </span>
                    </div>
                  </form>
                )}
              </div>
            </>
          ) : (
            /* Empty state when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3 border border-blue-100">
                <MessageSquare size={26} />
              </div>
              <h2 className="text-base font-extrabold text-[#0F172A]">
                Select a conversation to start messaging
              </h2>
              <p className="text-xs text-[#64748B] max-w-md mt-1">
                Connect with verified developers, ask peers for guidance on specific skills, or reach out to candidates directly from the Leaderboard or Developer Discovery.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Link
                  to="/leaderboard"
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <UserPlus size={14} /> Browse Leaderboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Message Modal */}
      {reportingMessage && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-red-600">
                <Flag size={18} />
                <h3 className="text-sm font-extrabold text-[#0F172A]">Report Message</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportingMessage(null);
                  setReportReason('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-[#475569] mb-3">
              <span className="font-bold text-[#0F172A] block mb-1">Reported Message:</span>
              <p className="italic line-clamp-3">"{reportingMessage.body}"</p>
            </div>

            <p className="text-[11px] text-[#64748B] mb-3">
              Moderators will receive this message along with up to 5 surrounding messages of context for review.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Reason for report
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={3}
                  maxLength={500}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe why this message violates community standards (spam, harassment, etc.)..."
                  className="w-full rounded-xl border border-[#CBD5E1] p-2.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportingMessage(null);
                    setReportReason('');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportReason.trim().length < 3 || submittingReport}
                  className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

