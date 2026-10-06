import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, ShieldAlert, ServerCrash, Home } from 'lucide-react';

interface ErrorPageProps {
  code: '404' | '401' | '403' | '500';
}

const errorConfig = {
  '404': {
    title: '404 - Page Not Found',
    description: 'The requested page could not be found or has been moved.',
    icon: <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />,
  },
  '401': {
    title: '401 - Authentication Required',
    description: 'Please sign in to access this page or resource.',
    icon: <Lock className="w-16 h-16 text-indigo-500 mb-4" />,
  },
  '403': {
    title: '403 - Access Forbidden',
    description: 'You do not have permission to view or modify this resource.',
    icon: <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />,
  },
  '500': {
    title: '500 - Internal Server Error',
    description: 'An unexpected error occurred on the server. Please try again later.',
    icon: <ServerCrash className="w-16 h-16 text-purple-500 mb-4" />,
  },
};

export const ErrorPage: React.FC<ErrorPageProps> = ({ code }) => {
  const config = errorConfig[code];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col items-center">
        {config.icon}
        <h1 className="text-2xl font-bold text-slate-100">{config.title}</h1>
        <p className="text-slate-400 mt-2 text-sm">{config.description}</p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export const NotFoundPage = () => <ErrorPage code="404" />;
export const UnauthorizedPage = () => <ErrorPage code="401" />;
export const ForbiddenPage = () => <ErrorPage code="403" />;
export const InternalServerErrorPage = () => <ErrorPage code="500" />;

