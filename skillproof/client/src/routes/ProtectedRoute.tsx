import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageSkeleton } from '../components/LoadingSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSkeleton />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Redirect to proper role dashboard
    const fallbackPath = user.role === 'RECRUITER' ? '/recruiters/developers' : user.role === 'ADMIN' ? '/admin' : '/dashboard';
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

