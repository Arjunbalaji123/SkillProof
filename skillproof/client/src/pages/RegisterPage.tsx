import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ShieldCheck,
  User as UserIcon,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Briefcase,
  Code,
  AtSign,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'DEVELOPER' | 'RECRUITER'>('DEVELOPER');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Auto-suggest username from name if username untouched
  const handleNameChange = (val: string) => {
    setName(val);
    if (!username || username === name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20)) {
      const suggested = val.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
      setUsername(suggested);
    }
  };

  // 300ms debounced live availability check (GET /api/users/check-username?u=)
  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Must be 3-20 lowercase alphanumeric characters or underscores',
      });
      return;
    }

    setUsernameStatus((prev) => ({ ...prev, checking: true }));

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/users/check-username?u=${clean}`);
        if (res.data.success) {
          setUsernameStatus({
            checking: false,
            available: res.data.data.available,
            message: res.data.data.message,
          });
        }
      } catch (err: any) {
        if (err.response && err.response.status === 400 && err.response.data?.data?.available === false) {
          setUsernameStatus({
            checking: false,
            available: false,
            message: err.response.data?.data?.message || err.response.data?.message || 'Invalid username',
          });
        } else {
          setUsernameStatus({
            checking: false,
            available: null,
            message: '',
          });
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3-20 lowercase alphanumeric characters or underscores.');
      return;
    }

    if (usernameStatus.available === false) {
      setError(usernameStatus.message || 'Please choose an available username.');
      return;
    }

    if (role === 'RECRUITER') {
      if (!companyName.trim() || companyName.trim().length < 2 || !jobTitle.trim() || jobTitle.trim().length < 2) {
        setError('Company name and job title are required for Recruiter accounts.');
        return;
      }
    }

    setIsLoading(true);
    try {
      await register(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        role,
        cleanUsername,
        role === 'RECRUITER'
          ? {
              companyName: companyName.trim(),
              jobTitle: jobTitle.trim(),
              companyWebsite: companyWebsite.trim() || undefined,
              linkedinUrl: linkedinUrl.trim() || undefined,
              bio: bio.trim() || undefined,
            }
          : undefined
      );
      navigate(role === 'RECRUITER' ? '/recruiter' : '/dashboard');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError(err.response.data?.message || 'Email already in use');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailAlreadyInUse = Boolean(error && error.toLowerCase().includes('email already in use'));

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Create your SKILLPROOF Account
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose your role and claim your unique public username
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            {isEmailAlreadyInUse && (
              <Link
                to="/login"
                state={{ email: email.trim().toLowerCase() }}
                className="shrink-0 font-bold text-indigo-400 hover:text-indigo-300 underline ml-2"
              >
                Sign in →
              </Link>
            )}
          </div>
        )}

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setRole('DEVELOPER')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              role === 'DEVELOPER'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code size={14} />
            Developer
          </button>
          <button
            type="button"
            onClick={() => setRole('RECRUITER')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              role === 'RECRUITER'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase size={14} />
            Recruiter
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <div className="relative">
              <UserIcon size={18} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-300">Username</label>
              {usernameStatus.checking ? (
                <span className="text-[11px] text-indigo-400 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Checking...
                </span>
              ) : usernameStatus.available === true ? (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={12} /> Available
                </span>
              ) : usernameStatus.available === false ? (
                <span className="text-[11px] text-rose-400 font-semibold">
                  {usernameStatus.message}
                </span>
              ) : null}
            </div>
            <div className="relative">
              <AtSign size={18} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="johndoe_dev"
                className={`w-full bg-slate-950 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                  usernameStatus.available === true
                    ? 'border-emerald-500/60 focus:border-emerald-500'
                    : usernameStatus.available === false
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Your public profile URL will be{' '}
              <span className="font-mono text-slate-300">
                {role === 'RECRUITER' ? `/recruiters/${username || 'username'}` : `/u/${username || 'username'}`}
              </span>
            </p>
          </div>

          {role === 'RECRUITER' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                Recruiter Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Technical Recruiter"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company Website (optional)
                </label>
                <input
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://acme.example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  LinkedIn URL (optional)
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bio / Hiring Focus (optional)
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Hiring distributed systems & AI engineers..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || usernameStatus.available === false}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 mt-2"
          >
            {isLoading
              ? 'Creating Account...'
              : `Register as ${role === 'DEVELOPER' ? 'Developer' : 'Recruiter'}`}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
