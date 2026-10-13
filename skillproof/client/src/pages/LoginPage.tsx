import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Zap } from 'lucide-react';
import { validateEmailOrUsername } from '../validators/authValidators';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const performLogin = async (idToUse: string, passToUse: string) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await login({
        email: idToUse.trim().toLowerCase(),
        password: passToUse,
      });

      if (user.role === 'RECRUITER') {
        navigate('/recruiter');
      } else if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const isUnreachable =
        !err?.response ||
        err?.code === 'ERR_NETWORK' ||
        err?.message === 'Network Error' ||
        err?.message?.includes('Cannot reach the server');

      const serverMsg = isUnreachable
        ? 'Cannot reach the server. Please make sure the backend is running.'
        : err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Login failed. Please check your credentials.';
      setErrorMessage(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const idError = validateEmailOrUsername(identifier);
    if (idError) {
      setErrorMessage(idError);
      return;
    }

    if (!password) {
      setErrorMessage('Password is required');
      return;
    }

    await performLogin(identifier, password);
  };

  const handleQuickFill = (quickId: string, quickPass: string) => {
    setIdentifier(quickId);
    setPassword(quickPass);
    setErrorMessage(null);
    performLogin(quickId, quickPass);
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
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Or{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-200/80">
            {/* Quick Demo Login Bar */}
            <div className="mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>1-Click Quick Demo Login</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleQuickFill('2403717672621008@cit.edu.in', '12345678')}
                  className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition text-center disabled:opacity-50"
                  title="arjun_balaji / 12345678"
                >
                  Developer
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleQuickFill('recruiter01@seed.skillproof.test', 'Password123!')}
                  className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition text-center disabled:opacity-50"
                  title="recruiter01 / Password123!"
                >
                  Recruiter
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleQuickFill('admin@skillproof.dev', 'Admin@123')}
                  className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition text-center disabled:opacity-50"
                  title="admin_director / Admin@123"
                >
                  Admin
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200/80 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Email or Username
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="you@example.com or username"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 font-medium border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 font-medium border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
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

export default LoginPage;

