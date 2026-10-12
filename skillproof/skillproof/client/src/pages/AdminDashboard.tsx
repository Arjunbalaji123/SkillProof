import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { Modal } from '../components/Modal';
import { PageSkeleton } from '../components/LoadingSkeleton';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  Award,
  FileCheck,
  Ban,
  UserCheck,
  FileText,
  FileDown,
  AlertTriangle,
  History,
} from 'lucide-react';
import { AdminDashboardData, VerificationRequest, User, AuditLog } from '../types';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'verifications' | 'users' | 'audit'>('verifications');
  const [isLoading, setIsLoading] = useState(true);

  // Review Modal State
  const [selectedReq, setSelectedReq] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [statsRes, verifRes, usersRes, auditRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/verifications'),
        api.get('/admin/users'),
        api.get('/admin/audit-logs'),
      ]);

      if (statsRes.data.success) setData(statsRes.data.data);
      if (verifRes.data.success) setVerifications(verifRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (auditRes.data.success) setAuditLogs(auditRes.data.data);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleReview = async (requestId: string, status: 'VERIFIED' | 'REJECTED') => {
    setIsSubmitting(true);
    try {
      const res = await api.put(`/admin/verifications/${requestId}`, {
        status,
        rejection_reason: status === 'REJECTED' ? rejectionReason : undefined,
      });

      if (res.data.success) {
        setVerifications((prev) =>
          prev.map((v) => (v.id === requestId ? { ...v, status } : v))
        );
        setSelectedReq(null);
        setRejectionReason('');
        fetchAdminData(); // Refresh stats
      }
    } catch (err) {
      console.error('Failed to review verification:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      if (res.data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: newStatus as any } : u))
        );
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  if (isLoading) return <PageSkeleton />;

  const stats = data?.stats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-purple-400" />
            Platform Admin Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review skill verification proofs, manage user statuses, and audit platform security events.
          </p>
        </div>
      </div>

      {/* Aggregate Statistics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Total Users</span>
            <Users size={16} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{stats?.totalUsers || 0}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Developers</span>
            <UserCheck size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{stats?.totalDevelopers || 0}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Recruiters</span>
            <Users size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{stats?.totalRecruiters || 0}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Verified Skills</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{stats?.verifiedSkillsCount || 0}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Pending Proofs</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{stats?.pendingVerificationsCount || 0}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Quizzes Passed</span>
            <Award size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{stats?.assessmentsCompletedCount || 0}</p>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'verifications'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileCheck size={16} />
          Verification Requests ({verifications.filter((v) => v.status === 'PENDING').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users size={16} />
          User Management ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <History size={16} />
          Audit Log Stream
        </button>
      </div>

      {/* TAB 1: Verification Requests */}
      {activeTab === 'verifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 px-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
            <h2 className="font-bold text-white text-base">Skill Verification Approval Queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">Developer</th>
                  <th className="p-4">Skill</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Proof Document</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {verifications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No verification requests submitted.
                    </td>
                  </tr>
                ) : (
                  verifications.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-850 transition">
                      <td className="p-4 font-bold text-white">
                        {v.user?.profile?.name || v.user?.email}
                      </td>
                      <td className="p-4 font-semibold text-indigo-400">
                        {v.user_skill?.skill?.name}
                      </td>
                      <td className="p-4 font-mono font-medium">{v.method}</td>
                      <td className="p-4">
                        {v.documents && v.documents.length > 0 ? (
                          <a
                            href={v.documents[0].file_path}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:underline"
                          >
                            <FileDown size={14} />
                            {v.documents[0].file_name}
                          </a>
                        ) : (
                          <span className="text-slate-500 italic">No document attached</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <VerifiedBadge status={v.status} size="sm" />
                      </td>
                      <td className="p-4 text-right">
                        {v.status === 'PENDING' ? (
                          <button
                            onClick={() => setSelectedReq(v)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
                          >
                            Review Request
                          </button>
                        ) : (
                          <span className="text-slate-500 font-medium italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: User Management */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 px-6 border-b border-slate-800 bg-slate-950/50">
            <h2 className="font-bold text-white text-base">Registered Users & Status Control</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered On</th>
                  <th className="p-4 text-right">Account Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850 transition">
                    <td className="p-4 font-bold text-white">{u.profile?.name || 'User'}</td>
                    <td className="p-4 font-mono text-slate-300">{u.email}</td>
                    <td className="p-4">
                      <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleUserStatusToggle(u.id, u.status)}
                          className={`px-3 py-1 rounded-lg font-bold text-xs transition inline-flex items-center gap-1 ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? (
                            <>
                              <Ban size={12} /> Suspend
                            </>
                          ) : (
                            <>
                              <UserCheck size={12} /> Activate
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            <History size={18} className="text-purple-400" />
            Security & System Audit Log Stream
          </h2>

          <div className="space-y-2.5 font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between">
                <div>
                  <span className="text-purple-400 font-bold">[{log.action}]</span>{' '}
                  <span className="text-slate-300">Target: {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)})` : ''}</span>
                  {log.user?.email && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      By: {log.user.profile?.name || log.user.email} ({log.user.role})
                    </p>
                  )}
                  {log.metadata && (
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                      Metadata: {log.metadata}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Review Modal */}
      <Modal
        isOpen={Boolean(selectedReq)}
        onClose={() => setSelectedReq(null)}
        title="Review Skill Verification Request"
      >
        {selectedReq && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <p className="text-slate-300">
                <strong className="text-white">Developer:</strong> {selectedReq.user?.profile?.name || selectedReq.user?.email}
              </p>
              <p className="text-slate-300">
                <strong className="text-white">Target Skill:</strong> {selectedReq.user_skill?.skill?.name}
              </p>
              <p className="text-slate-300">
                <strong className="text-white">Method:</strong> {selectedReq.method}
              </p>
              {selectedReq.documents && selectedReq.documents.length > 0 && (
                <div>
                  <strong className="text-white block mb-1">Uploaded Proof File:</strong>
                  <a
                    href={selectedReq.documents[0].file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 p-2 bg-indigo-950/40 text-indigo-300 rounded-lg border border-indigo-500/30 hover:underline font-mono"
                  >
                    <FileDown size={14} /> {selectedReq.documents[0].file_name}
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Rejection Reason (Required if rejecting)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the proof was rejected..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                disabled={isSubmitting}
                onClick={() => handleReview(selectedReq.id, 'VERIFIED')}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
              >
                Approve & Mark Verified ✓
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleReview(selectedReq.id, 'REJECTED')}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
              >
                Reject Request ❌
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
