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
    isNetworkError?: boolean;
  }>({ checking: false, available: null, message: '' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'DEVELOPER' | 'RECRUITER'>('DEVELOPER');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [bio, setBio] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Auto-suggest username from name if username untouched
  const handleNameChange = (val: string) => {
    setName(val);
    if (fieldErrors.name) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
    if (!username || username === name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20)) {
      const suggested = val.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
      setUsername(suggested);
    }
  };

  // 400ms debounced live availability check (GET /api/users/check-username?u=)
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

    setUsernameStatus((prev) => ({ ...prev, checking: true, isNetworkError: false }));

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/users/check-username?u=${clean}`);
        if (res.data.success) {
          setUsernameStatus({
            checking: false,
            available: res.data.data.available,
            message: res.data.data.message,
            isNetworkError: false,
          });
        }
      } catch (err: any) {
        if (err.response && err.response.status === 400 && err.response.data?.data?.available === false) {
          setUsernameStatus({
            checking: false,
            available: false,
            message: err.response.data?.data?.message || err.response.data?.message || 'Username already taken',
            isNetworkError: false,
          });
        } else {
          // Network or server error: show notice but do NOT block register button
          setUsernameStatus({
            checking: false,
            available: null,
            isNetworkError: true,
            message: 'Could not check username',
          });
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.field;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    } else if (cleanName.length > 60) {
      errors.name = 'Full name cannot exceed 60 characters';
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      errors.username = 'Username is required';
    } else if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      errors.username = 'Username must be 3-20 characters: lowercase letters, numbers, or underscores';
    } else if (usernameStatus.available === false) {
      errors.username = usernameStatus.message || 'Username already taken';
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Invalid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (role === 'RECRUITER') {
      if (!companyName.trim() || companyName.trim().length < 2) {
        errors.companyName = 'Company name is required';
      }
      if (!jobTitle.trim() || jobTitle.trim().length < 2) {
        errors.jobTitle = 'Job title is required';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError('Please resolve the highlighted field errors.');
      return;
    }

    setIsLoading(true);
    try {
      await register(
        cleanName,
        cleanEmail,
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
      const response = err.response;
      if (response) {
        const data = response.data;

        // Field-level validation errors from server (Zod)
        if (Array.isArray(data?.errors) && data.errors.length > 0) {
          const srvFields: Record<string, string> = {};
          for (const item of data.errors) {
            const key = item.field === 'fullName' ? 'name' : item.field;
            srvFields[key] = item.message;
          }
          setFieldErrors(srvFields);
          setFormError(data.message || 'Please fix the field errors below.');
          return;
        }

        // Specific 409 conflict messages
        if (response.status === 409) {
          const msg = data?.message || '';
          if (msg.toLowerCase().includes('email')) {
            setFieldErrors({ email: 'Email already in use. Please sign in.' });
            setFormError('Email already in use. Please sign in.');
          } else if (msg.toLowerCase().includes('username')) {
            setFieldErrors({ username: 'Username already taken' });
            setFormError('Username already taken');
          } else {
            setFormError(msg || 'An account with these details already exists.');
          }
          return;
        }

        // 429 Rate limit
        if (response.status === 429) {
          setFormError(data?.message || 'Too many attempts, try again in a few minutes');
          return;
        }

        setFormError(data?.message || 'Registration failed. Please try again.');
      } else {
        setFormError('Network error. Unable to reach the server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailAlreadyInUse = Boolean(
    formError && formError.toLowerCase().includes('email already in use')
  );

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
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

        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
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
            onClick={() => {
              setRole('DEVELOPER');
              setFieldErrors({});
            }}
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
            onClick={() => {
              setRole('RECRUITER');
              setFieldErrors({});
            }}
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

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <UserIcon size={18} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Jane Doe"
                className={`w-full bg-slate-950 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                  fieldErrors.name
                    ? 'border-rose-500/70 focus:border-rose-500'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
            {fieldErrors.name && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} className="shrink-0" /> {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Username */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Username <span className="text-rose-400">*</span>
              </label>
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
              ) : usernameStatus.isNetworkError ? (
                <span className="text-[11px] text-amber-400 font-medium">
                  {usernameStatus.message}
                </span>
              ) : null}
            </div>
            <div className="relative">
              <AtSign size={18} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  clearFieldError('username');
                }}
                placeholder="janedoe_dev"
                className={`w-full bg-slate-950 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                  fieldErrors.username
                    ? 'border-rose-500/70 focus:border-rose-500'
                    : usernameStatus.available === true
                    ? 'border-emerald-500/60 focus:border-emerald-500'
                    : usernameStatus.available === false
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
            {fieldErrors.username && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} className="shrink-0" /> {fieldErrors.username}
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Public profile:{' '}
              <span className="font-mono text-slate-300">
                {role === 'RECRUITER' ? `/recruiters/${username || 'username'}` : `/u/${username || 'username'}`}
              </span>
            </p>
          </div>

          {/* Recruiter-only Fields */}
          {role === 'RECRUITER' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                Recruiter Organization Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      clearFieldError('companyName');
                    }}
                    placeholder="Acme Corp"
                    className={`w-full bg-slate-950 border rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                      fieldErrors.companyName
                        ? 'border-rose-500/70 focus:border-rose-500'
                        : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  {fieldErrors.companyName && (
                    <p className="text-[10px] text-rose-400 mt-1 font-medium">
                      {fieldErrors.companyName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Job Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => {
                      setJobTitle(e.target.value);
                      clearFieldError('jobTitle');
                    }}
                    placeholder="Senior Technical Recruiter"
                    className={`w-full bg-slate-950 border rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                      fieldErrors.jobTitle
                        ? 'border-rose-500/70 focus:border-rose-500'
                        : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  {fieldErrors.jobTitle && (
                    <p className="text-[10px] text-rose-400 mt-1 font-medium">
                      {fieldErrors.jobTitle}
                    </p>
                  )}
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
                  Hiring Focus / Bio (optional)
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Hiring full-stack, distributed systems & ML engineers..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                placeholder="name@example.com"
                className={`w-full bg-slate-950 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                  fieldErrors.email
                    ? 'border-rose-500/70 focus:border-rose-500'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} className="shrink-0" /> {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
                placeholder="At least 8 characters"
                className={`w-full bg-slate-950 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition ${
                  fieldErrors.password
                    ? 'border-rose-500/70 focus:border-rose-500'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
            {fieldErrors.password ? (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} className="shrink-0" /> {fieldErrors.password}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Lock size={12} className="text-slate-500" /> Minimum 8 characters
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || usernameStatus.available === false}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register as {role === 'DEVELOPER' ? 'Developer' : 'Recruiter'}</span>
                <ArrowRight size={16} />
              </>
            )}
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
