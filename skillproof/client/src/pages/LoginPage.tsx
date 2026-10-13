import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Zap } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState<string>(() => (location.state as any)?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to determine destination path for a role
  const getDestination = (role?: string) => {
    if (role === 'RECRUITER') return '/recruiters/developers';
    if (role === 'ADMIN') return '/admin';
    return '/dashboard';
  };

  // 2. Logged-in users who open /login are redirected to their role dashboard
  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as any)?.from?.pathname;
      const destination = from || getDestination(user.role);
      navigate(destination, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // AuthProvider updates user, navigation happens via useEffect or here
    } catch (err: any) {
      console.error('Backend Login Error:', err?.response?.data || err?.message || err);
      if (!err.response) {
        setError('Network error: Unable to connect to backend server. Please verify your connection.');
      } else if (err.response.status === 401) {
        setError(err.response.data?.message || 'Invalid email or password credentials');
      } else {
        setError(err.response.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
    setIsSubmitting(true);
    try {
      await login(quickEmail, quickPass);
    } catch (err: any) {
      console.error('Backend Quick Login Error:', err?.response?.data || err?.message || err);
      if (!err.response) {
        setError('Network error: Unable to connect to backend server. Please verify your connection.');
      } else {
        setError(err.response.data?.message || 'Quick login failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome Back to SKILLPROOF</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to manage your portfolio or review verified talent</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Demo Login Bar */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
            <Zap size={14} />
            <span>1-Click Quick Demo Login</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('arjun@skillproof.dev', 'Dev@123')}
              className="py-1.5 px-2 text-[11px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-center"
            >
              Developer
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('recruiter1@techcorp.com', 'Recruiter@123')}
              className="py-1.5 px-2 text-[11px] font-bold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition text-center"
            >
              Recruiter
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@skillproof.dev', 'Admin@123')}
              className="py-1.5 px-2 text-[11px] font-bold rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition text-center"
            >
              Admin
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
            Register for free
          </Link>
        </p>
      </div>
    </div>
  );
};

