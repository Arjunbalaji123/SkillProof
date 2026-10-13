import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  User,
  Mail,
  Lock,
  Building,
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AtSign,
} from 'lucide-react';
import {
  validateName,
  validateUsername,
  validateEmail,
  validatePassword,
  validateRecruiterFields,
} from '../validators/authValidators';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [role, setRole] = useState<'DEVELOPER' | 'RECRUITER'>('DEVELOPER');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Username live availability state
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const debounceTimer = useRef<any>(null);

  // Form error and submission states
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Debounced username availability check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      setCheckingUsername(false);
      return;
    }

    const formatError = validateUsername(trimmed);
    if (formatError) {
      setUsernameStatus('invalid');
      setUsernameMessage(formatError);
      setCheckingUsername(false);
      return;
    }

    setUsernameStatus('checking');
    setCheckingUsername(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/check-username?u=${encodeURIComponent(trimmed)}`);
        if (res.data?.success && res.data?.data?.available) {
          setUsernameStatus('available');
          setUsernameMessage('Username is available');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage('Username already taken');
        }
      } catch {
        setUsernameStatus('idle');
        setUsernameMessage('');
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [username]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    const nameErr = validateName(name);
    if (nameErr) errors.name = nameErr;

    const userErr = validateUsername(username);
    if (userErr) errors.username = userErr;

    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;

    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;

    if (role === 'RECRUITER') {
      const recErrors = validateRecruiterFields(companyName, jobTitle);
      if (recErrors.companyName) errors.companyName = recErrors.companyName;
      if (recErrors.jobTitle) errors.jobTitle = recErrors.jobTitle;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      return;
    }

    if (usernameStatus === 'taken') {
      setFieldErrors((prev) => ({ ...prev, username: 'Username already taken' }));
      return;
    }

    setSubmitting(true);
    try {
      const registeredUser = await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        role,
        ...(role === 'RECRUITER'
          ? {
              companyName: companyName.trim(),
              jobTitle: jobTitle.trim(),
            }
          : {}),
      });

      if (registeredUser.role === 'RECRUITER') {
        navigate('/recruiter');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData?.errors && Array.isArray(respData.errors)) {
        const newFieldErrors: Record<string, string> = {};
        respData.errors.forEach((e: any) => {
          if (e.field) {
            newFieldErrors[e.field] = e.message;
          }
        });
        setFieldErrors(newFieldErrors);
      }

      const isUnreachable =
        !err?.response ||
        err?.code === 'ERR_NETWORK' ||
        err?.message === 'Network Error' ||
        err?.message?.includes('Cannot reach the server');

      const msg = isUnreachable
        ? 'Cannot reach the server. Please make sure the backend is running.'
        : respData?.error ||
          respData?.message ||
          err?.message ||
          'Registration failed. Please try again.';
      setGlobalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black text-slate-900 tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-blue-500/20">
              S
            </span>
            SkillProof
          </Link>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-200/80">
            {globalError && (
              <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200/80 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{globalError}</p>
              </div>
            )}

            {/* Role Selection Tabs */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                I want to join as a:
              </label>
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setRole('DEVELOPER');
                    setGlobalError(null);
                  }}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                    role === 'DEVELOPER'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Developer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('RECRUITER');
                    setGlobalError(null);
                  }}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                    role === 'RECRUITER'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Recruiter
                </button>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder={role === 'DEVELOPER' ? 'Alex Rivera' : 'Sarah Jenkins'}
                    className={`block w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 font-medium border rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      fieldErrors.name ? 'border-red-300 bg-red-50/20' : 'border-slate-300'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.name}</p>
                )}
              </div>

              {/* Username with Live Availability Check */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <AtSign className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }));
                    }}
                    placeholder="alex_rivera"
                    className={`block w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 font-mono font-medium border rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      usernameStatus === 'taken' || usernameStatus === 'invalid' || fieldErrors.username
                        ? 'border-red-300 bg-red-50/20'
                        : usernameStatus === 'available'
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-slate-300'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    {checkingUsername && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
                    {!checkingUsername && usernameStatus === 'available' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    {!checkingUsername && (usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {usernameMessage && (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      usernameStatus === 'available' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {usernameMessage}
                  </p>
                )}
                {fieldErrors.username && !usernameMessage && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="alex@example.com"
                    className={`block w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 font-medium border rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      fieldErrors.email ? 'border-red-300 bg-red-50/20' : 'border-slate-300'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder="••••••••"
                    className={`block w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 font-medium border rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      fieldErrors.password ? 'border-red-300 bg-red-50/20' : 'border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Minimum 8 characters shown BEFORE submit */}
                <p
                  className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${
                    password.length >= 8
                      ? 'text-emerald-600'
                      : password.length > 0
                      ? 'text-amber-600'
                      : 'text-slate-500'
                  }`}
                >
                  {password.length >= 8 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 inline" />
                  ) : (
                    <span>•</span>
                  )}
                  Must be between 8 and 72 characters
                </p>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>
                )}
              </div>

              {/* Recruiter-specific fields */}
              {role === 'RECRUITER' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Company Name
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          if (fieldErrors.companyName)
                            setFieldErrors((prev) => ({ ...prev, companyName: '' }));
                        }}
                        placeholder="Acme Technologies"
                        className={`block w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 font-medium border rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                          fieldErrors.companyName ? 'border-red-300 bg-red-50/20' : 'border-slate-300'
                        }`}
                      />
                    </div>
                    {fieldErrors.companyName && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.companyName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Job Title
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={jobTitle}
                        onChange={(e) => {
                          setJobTitle(e.target.value);
                          if (fieldErrors.jobTitle)
                            setFieldErrors((prev) => ({ ...prev, jobTitle: '' }));
                        }}
                        placeholder="Technical Talent Lead"
                        className={`block w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 font-medium border rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                          fieldErrors.jobTitle ? 'border-red-300 bg-red-50/20' : 'border-slate-300'
                        }`}
                      />
                    </div>
                    {fieldErrors.jobTitle && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.jobTitle}</p>
                    )}
                  </div>
                </>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    `Join as ${role === 'DEVELOPER' ? 'Developer' : 'Recruiter'}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

