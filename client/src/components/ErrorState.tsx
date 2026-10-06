import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Failed to load requested data. Please try again.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-red-950/20 border border-red-900/40 rounded-xl">
    <AlertTriangle className="w-12 h-12 text-red-500 mb-2" />
    <h3 className="text-lg font-semibold text-red-200 mt-2">{title}</h3>
    <p className="text-sm text-red-400 mt-1 max-w-md">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    )}
  </div>
);

