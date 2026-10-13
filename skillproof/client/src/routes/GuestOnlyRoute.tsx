import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageSkeleton } from '../components/LoadingSkeleton';

interface GuestOnlyRouteProps {
  children?: React.ReactNode;
}

export const GuestOnlyRoute: React.FC<GuestOnlyRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageSkeleton />;

  if (user) {
    const destination =
      user.role === 'RECRUITER'
        ? '/recruiters/developers'
        : user.role === 'ADMIN'
        ? '/admin'
        : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return children ? <>{children}</> : null;
};

export default GuestOnlyRoute;

