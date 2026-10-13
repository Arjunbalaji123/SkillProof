import React from 'react';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  showText?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label = 'Profile Completion',
  showText = true,
}) => {
  const safePercent = Math.min(100, Math.max(0, percentage));

  return (
    <div className="w-full">
      {showText && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
          <span className="text-slate-300">{label}</span>
          <span className="text-indigo-400 font-mono font-bold">{safePercent}%</span>
        </div>
      )}
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50 p-0.5">
        <div
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out shadow-sm shadow-indigo-500/50"
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
};

