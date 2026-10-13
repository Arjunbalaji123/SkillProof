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
  ShieldAlert,
  Loader2,
  X,
  CheckCircle2,
  Briefcase,
  Lock,
  XCircle,
} from 'lucide-react';

interface OtherParticipantUser {
  id: string;
  name: string;
  username: string | null;
  role: string;
  isDemo: boolean;
  companyName?: string;
  jobTitle?: string;
  isVerified?: boolean;
  bio: string | null;
  verifiedSkills: Array<{
    language: string;
    score: number | null;
    level: string | null;
  }>;
}

interface ComposerState {
  canSend: boolean;
  reason: string | null;
}

interface ConversationSummary {
  id: string;
  origin: 'OPENING' | 'DIRECT';
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'CLOSED' | 'BLOCKED';
  unlockedAt: string | null;
  directReason: string | null;
  lastMessageAt: string;
  createdAt: string;
  label: string;
  opening: {
    id: string;
    title: string;
    status: string;
  } | null;
  approach: {
    id: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'SAVED';
    openingId: string;
  } | null;
  muted: boolean;
  archived: boolean;
  lastReadAt: string | null;
  otherLastReadAt: string | null;
  unreadCount: number;
  isBlockedByMe: boolean;
  isBlocked: boolean;
  composerState: ComposerState;
  otherUser: OtherParticipantUser;
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
  senderName?: string;
  senderUsername?: string | null;
  body: string;
  createdAt: string;
}

interface ConversationDetailResponse {
  conversation: Omit<ConversationSummary, 'unreadCount' | 'lastMessage'>;
  messages: ChatMessage[];
  nextCursor: string | null;
}

export const MessagesPage: React.FC = () => {
  const { conversationId: routeConvId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const queryConvId = searchParams.get('conversationId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialConvId = routeConvId || queryConvId || null;

  // Left panel state
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  // Right panel state
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConvId);
  const [activeConv, setActiveConv] = useState<ConversationDetailResponse | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

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

  // Mobile responsive toggle
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(Boolean(initialConvId));

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

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/messages/unread-count');
      if (res.data?.success && res.data.data) {
        const count =
          typeof res.data.data.unreadCount === 'number'
            ? res.data.data.unreadCount
            : typeof res.data.data.total === 'number'
            ? res.data.data.total
            : 0;
        setTotalUnread(count);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const res = await api.get('/messages/conversations');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, []);

  const fetchConversationDetail = useCallback(
    async (convId: string, silent = false) => {
      if (!silent) setLoadingConv(true);
      setErrorBanner(null);
      try {
        const res = await api.get(`/messages/conversations/${convId}/messages`);
        if (res.data?.success && res.data.data) {
          const detail: ConversationDetailResponse = res.data.data;
          setActiveConv(detail);
          if (!silent) {
            scrollToBottom('auto');
          }
          await api.post(`/messages/conversations/${convId}/read`).catch(() => {});
          fetchUnreadCount();
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err: any) {
        setErrorBanner(err.response?.data?.message || 'Unable to load conversation.');
      } finally {
        if (!silent) setLoadingConv(false);
      }
    },
    [fetchUnreadCount]
  );

  // Sync route / query param with selectedConvId
  useEffect(() => {
    const nextId = routeConvId || queryConvId || null;
    if (nextId && nextId !== selectedConvId) {
      setSelectedConvId(nextId);
      setMobileShowChat(true);
    }
  }, [routeConvId, queryConvId, selectedConvId]);

  useEffect(() => {
    fetchConversations();
    fetchUnreadCount();
  }, [fetchConversations, fetchUnreadCount]);

  useEffect(() => {
    if (selectedConvId) {
      fetchConversationDetail(selectedConvId);
    } else {
      setActiveConv(null);
    }
  }, [selectedConvId, fetchConversationDetail]);

  // Socket.IO real-time listener + 30s fallback polling when socket disconnected
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (payload: { conversationId: string; message: ChatMessage }) => {
      fetchConversations(true);
      fetchUnreadCount();

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

    const handleConversationUpdated = (payload: { conversationId: string }) => {
      fetchConversations(true);
      fetchUnreadCount();
      if (selectedConvId && payload.conversationId === selectedConvId) {
        fetchConversationDetail(selectedConvId, true);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversation:updated', handleConversationUpdated);

    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        fetchUnreadCount();
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
  }, [selectedConvId, fetchConversations, fetchUnreadCount, fetchConversationDetail]);

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

  const handleLoadOlder = async () => {
    if (!activeConv || !activeConv.nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await api.get(
        `/messages/conversations/${activeConv.conversation.id}/messages?cursor=${encodeURIComponent(
          activeConv.nextCursor
        )}`
      );
      if (res.data?.success && res.data.data) {
        const olderData: ConversationDetailResponse = res.data.data;
        setActiveConv((prev) => {
          if (!prev) return prev;
          const existingIds = new Set(prev.messages.map((m) => m.id));
          const uniqueOlder = olderData.messages.filter((m) => !existingIds.has(m.id));
          return {
            ...prev,
            messages: [...uniqueOlder, ...prev.messages],
            nextCursor: olderData.nextCursor,
          };
        });
      }
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = messageBody.trim();
    if (!trimmed || sending || !selectedConvId) return;

    setSending(true);
    setErrorBanner(null);

    try {
      const res = await api.post(`/messages/conversations/${selectedConvId}/messages`, {
        body: trimmed,
      });
      if (res.data?.success && res.data.data) {
        const newMsg: ChatMessage = res.data.data;
        setMessageBody('');
        setActiveConv((prev) => {
          if (!prev) return prev;
          const exists = prev.messages.some((m) => m.id === newMsg.id);
          return {
            ...prev,
            messages: exists ? prev.messages : [...prev.messages, newMsg],
          };
        });
        scrollToBottom('smooth');
        fetchConversations(true);
        fetchConversationDetail(selectedConvId, true);
      }
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleArchiveConversation = async () => {
    if (!activeConv) return;
    setIsHeaderMenuOpen(false);
    try {
      await api.post(`/messages/conversations/${activeConv.conversation.id}/archive`);
      showToast('Conversation archived');
      setSelectedConvId(null);
      setActiveConv(null);
      setMobileShowChat(false);
      navigate('/messages');
      await fetchConversations(true);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to archive conversation.');
    }
  };

  const handleToggleMute = async () => {
    if (!activeConv) return;
    setIsHeaderMenuOpen(false);
    try {
      const res = await api.post(`/messages/conversations/${activeConv.conversation.id}/mute`);
      const muted = res.data?.data?.muted;
      showToast(muted ? 'Notifications muted for this chat' : 'Notifications unmuted');
      await fetchConversationDetail(activeConv.conversation.id, true);
      await fetchConversations(true);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to toggle mute.');
    }
  };

  const handleCloseConversation = async () => {
    if (!activeConv) return;
    setIsHeaderMenuOpen(false);
    try {
      await api.post(`/messages/conversations/${activeConv.conversation.id}/close`);
      showToast('Conversation closed');
      await fetchConversationDetail(activeConv.conversation.id, true);
      await fetchConversations(true);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to close conversation.');
    }
  };

  const handleToggleBlock = async () => {
    if (!activeConv) return;
    setIsHeaderMenuOpen(false);
    const peer = activeConv.conversation.otherUser;
    try {
      if (activeConv.conversation.isBlockedByMe) {
        await api.delete(`/messages/blocks/${peer.id}`);
        showToast(`Unblocked @${peer.username || peer.name}`);
      } else {
        await api.post(`/messages/blocks/${peer.id}`);
        showToast(`Blocked @${peer.username || peer.name}`);
      }
      await fetchConversationDetail(activeConv.conversation.id, true);
      await fetchConversations(true);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to update block status.');
    }
  };

  const handleDecideApproachInChat = async (
    approachId: string,
    decision: 'ACCEPTED' | 'DECLINED'
  ) => {
    try {
      await api.patch(`/openings/approaches/${approachId}`, { status: decision });
      showToast(
        decision === 'ACCEPTED'
          ? 'Approach accepted — chat unlocked!'
          : 'Approach declined'
      );
      if (selectedConvId) {
        await fetchConversationDetail(selectedConvId, true);
      }
      await fetchConversations(true);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Failed to update approach decision.');
    }
  };

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

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      conv.otherUser.name.toLowerCase().includes(q) ||
      (conv.otherUser.username && conv.otherUser.username.toLowerCase().includes(q)) ||
      (conv.otherUser.companyName && conv.otherUser.companyName.toLowerCase().includes(q)) ||
      conv.label.toLowerCase().includes(q)
    );
  });

  const convMeta = activeConv?.conversation || null;
  const currentPeer = convMeta?.otherUser || null;
  const peerProfileUrl = currentPeer
    ? currentPeer.role === 'RECRUITER'
      ? `/recruiters/${currentPeer.username}`
      : `/u/${currentPeer.username}`
    : '#';

  const isRecruiterViewer = user?.role === 'RECRUITER';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-slate-700">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex h-[calc(100vh-8.5rem)] min-h-[560px]">
        {/* LEFT COLUMN: Conversation List (320px on desktop) */}
        <div
          className={`w-full md:w-80 border-r border-[#E2E8F0] flex flex-col bg-slate-50/50 shrink-0 ${
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
                  <p className="text-[11px] text-[#64748B]">
                    Opening approaches & recruiter outreach
                  </p>
                </div>
              </div>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-[#2563EB] text-white">
                  {totalUnread} unread
                </span>
              )}
            </div>

            {/* Filter by name, @username, or opening */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by @username, company, or opening..."
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
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
            {loadingList ? (
              <div className="p-8 flex flex-col items-center justify-center text-[#64748B] gap-2">
                <Loader2 size={20} className="animate-spin text-[#2563EB]" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-[#0F172A]">No conversations yet</p>
                <p className="text-[11px] text-[#64748B]">
                  {isRecruiterViewer ? (
                    <>
                      Publish a{' '}
                      <Link
                        to="/openings/manage"
                        className="text-[#2563EB] font-semibold hover:underline"
                      >
                        Hiring Opening
                      </Link>{' '}
                      or discover verified candidates on{' '}
                      <Link
                        to="/recruiter"
                        className="text-[#2563EB] font-semibold hover:underline"
                      >
                        Developer Discovery
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      Explore matching{' '}
                      <Link
                        to="/openings"
                        className="text-[#2563EB] font-semibold hover:underline"
                      >
                        Hiring Openings
                      </Link>{' '}
                      to approach verified recruiters.
                    </>
                  )}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;
                const hasUnread = conv.unreadCount > 0;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setSelectedConvId(conv.id);
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

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] font-mono text-[#2563EB] truncate">
                          @{conv.otherUser.username}
                        </span>
                        {conv.otherUser.companyName && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                            {conv.otherUser.companyName}
                          </span>
                        )}
                        {conv.status === 'PENDING_APPROVAL' && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            Pending
                          </span>
                        )}
                        {conv.status === 'CLOSED' && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            Closed
                          </span>
                        )}
                        {conv.muted && (
                          <VolumeX size={11} className="text-slate-400 shrink-0" />
                        )}
                      </div>

                      <p className="text-[10px] font-semibold text-indigo-600 truncate mt-1">
                        {conv.label}
                      </p>

                      {conv.lastMessage && (
                        <p
                          className={`text-xs mt-0.5 truncate ${
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
          ) : activeConv && convMeta && currentPeer ? (
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
                    {currentPeer.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-extrabold text-[#0F172A] truncate">
                        {currentPeer.name}
                      </h2>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-[#475569]">
                        {currentPeer.role}
                      </span>
                      {currentPeer.companyName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {currentPeer.companyName}
                        </span>
                      )}
                      {convMeta.muted && (
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5">
                          <VolumeX size={12} /> Muted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#64748B] flex-wrap">
                      <Link
                        to={peerProfileUrl}
                        className="font-mono text-[#2563EB] hover:underline"
                      >
                        @{currentPeer.username}
                      </Link>
                      {currentPeer.verifiedSkills && currentPeer.verifiedSkills.length > 0 && (
                        <span>
                          • Top Verified:{' '}
                          <strong>{currentPeer.verifiedSkills[0].language}</strong> (
                          {currentPeer.verifiedSkills[0].score}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chat Header Action Menu */}
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
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl py-1.5 z-40 divide-y divide-[#E2E8F0]">
                      <div className="py-1">
                        <Link
                          to={peerProfileUrl}
                          onClick={() => setIsHeaderMenuOpen(false)}
                          className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-2"
                        >
                          <ExternalLink size={14} className="text-[#2563EB]" />
                          View profile
                        </Link>
                        <button
                          type="button"
                          onClick={handleArchiveConversation}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Archive size={14} className="text-slate-500" />
                          Archive
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-2"
                        >
                          {convMeta.muted ? (
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
                        {isRecruiterViewer && convMeta.status !== 'CLOSED' && (
                          <button
                            type="button"
                            onClick={handleCloseConversation}
                            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Lock size={14} className="text-slate-500" />
                            Close conversation
                          </button>
                        )}
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={handleToggleBlock}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                        >
                          <Ban size={14} />
                          {convMeta.isBlockedByMe ? 'Unblock user' : 'Block'}
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
              </div>

              {/* Conversation Origin Banner ("From opening: <title>" or "Direct message from <recruiter>") */}
              <div className="px-4 py-2 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Briefcase size={13} className="text-indigo-600 shrink-0" />
                  {convMeta.origin === 'OPENING' && convMeta.opening ? (
                    <Link
                      to={isRecruiterViewer ? '/openings/manage' : '/openings'}
                      className="hover:underline"
                    >
                      From opening: {convMeta.opening.title}
                    </Link>
                  ) : (
                    <span>{convMeta.label}</span>
                  )}
                  {convMeta.directReason && (
                    <span className="text-[11px] font-medium text-indigo-700">
                      • {convMeta.directReason}
                    </span>
                  )}
                </div>

                {/* If Recruiter viewing a PENDING approach inside chat, allow quick Accept / Decline */}
                {isRecruiterViewer &&
                  convMeta.approach &&
                  (convMeta.approach.status === 'PENDING' ||
                    convMeta.approach.status === 'SAVED') && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleDecideApproachInChat(convMeta.approach!.id, 'ACCEPTED')
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Accept Approach
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDecideApproachInChat(convMeta.approach!.id, 'DECLINED')
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1"
                      >
                        <XCircle size={12} /> Decline
                      </button>
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

              {/* Message List Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
                {/* Load Older Button */}
                {activeConv.nextCursor && (
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

                {activeConv.messages.map((msg, idx) => {
                  const isMine = msg.senderId === user?.id;
                  const prevMsg = idx > 0 ? activeConv.messages[idx - 1] : null;
                  const showDateSeparator =
                    !prevMsg ||
                    new Date(prevMsg.createdAt).toDateString() !==
                      new Date(msg.createdAt).toDateString();

                  const readByRecipient = Boolean(
                    convMeta.otherLastReadAt &&
                      new Date(convMeta.otherLastReadAt).getTime() >=
                        new Date(msg.createdAt).getTime()
                  );

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
                            {currentPeer.name.charAt(0).toUpperCase()}
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
                                {readByRecipient ? (
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
                {convMeta.isBlockedByMe ? (
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
                ) : !convMeta.composerState.canSend ? (
                  <div className="text-center py-2.5 px-4 text-xs text-amber-800 bg-amber-50 rounded-xl border border-amber-200 font-bold flex items-center justify-center gap-2">
                    <Clock size={14} className="text-amber-600 shrink-0" />
                    <span>
                      {convMeta.composerState.reason ||
                        'Waiting for the recruiter to respond to your approach'}
                    </span>
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
                Select a conversation to view messages
              </h2>
              <p className="text-xs text-[#64748B] max-w-md mt-1">
                {isRecruiterViewer
                  ? 'Review developer approaches on your hiring openings or start a direct conversation with eligible verified developers.'
                  : 'Approach verified recruiters through matching hiring openings or reply to direct recruiter outreach.'}
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Link
                  to={isRecruiterViewer ? '/openings/manage' : '/openings'}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <Briefcase size={14} />
                  {isRecruiterViewer ? 'Manage Openings' : 'View Matching Openings'}
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
