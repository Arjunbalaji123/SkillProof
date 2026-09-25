import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  description = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  icon = <FolderOpen className="w-12 h-12 text-slate-500 mb-2" />,
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/50 border border-slate-800 rounded-xl">
    {icon}
    <h3 className="text-lg font-semibold text-slate-200 mt-2">{title}</h3>
    <p className="text-sm text-slate-400 mt-1 max-w-md">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

