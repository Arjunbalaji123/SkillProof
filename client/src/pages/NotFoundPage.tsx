import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, ArrowRight, LayoutDashboard, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number>(3);

  // Determine role-based dashboard route
  const dashboardPath = user?.role === 'ADMIN'
    ? '/admin'
    : user?.role === 'RECRUITER'
    ? '/recruiters/developers'
    : '/dashboard';

  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(dashboardPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, dashboardPath, navigate]);

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white border border-[#E2E8F0] p-8 md:p-12 rounded-3xl max-w-lg w-full shadow-lg flex flex-col items-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">404 - Page Not Found</h1>
          <p className="text-xs text-[#64748B] leading-relaxed">
            The page you requested could not be found or has been moved in SkillProof v2.
          </p>
        </div>

        {isAuthenticated && (
          <div className="w-full p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center justify-center gap-2">
            <span>Redirecting to your role dashboard in <strong>{countdown}s</strong>...</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {isAuthenticated ? (
            <Link
              to={dashboardPath}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <LayoutDashboard size={14} /> Go to Dashboard
            </Link>
          ) : (
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Home size={14} /> Back to Home
            </Link>
          )}

          <Link
            to="/assessments"
            className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-xs flex items-center gap-1.5 transition"
          >
            Assessments <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

