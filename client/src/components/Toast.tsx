import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type, message, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-indigo-400" />,
  };

  const borderColors = {
    success: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200',
    error: 'border-red-500/30 bg-red-950/40 text-red-200',
    info: 'border-indigo-500/30 bg-indigo-950/40 text-indigo-200',
  };

  return (
    <div className={`flex items-center gap-3 p-4 border rounded-xl shadow-lg backdrop-blur-md ${borderColors[type]}`}>
      {icons[type]}
      <p className="text-sm font-medium flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-slate-800/50 rounded-lg transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      )}
    </div>
  );
};

