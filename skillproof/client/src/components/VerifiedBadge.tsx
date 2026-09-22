import React from 'react';
import { VerificationStatus } from '../types';
import { CheckCircle2, Clock, XCircle, Circle } from 'lucide-react';

interface VerifiedBadgeProps {
  status: VerificationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  status,
  size = 'md',
  showText = true,
}) => {
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const textSize = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-1';

  switch (status) {
    case 'VERIFIED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${textSize}`}>
          <CheckCircle2 size={iconSize} className="text-emerald-400 shrink-0" />
          {showText && <span>VERIFIED</span>}
        </span>
      );
    case 'PENDING':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 ${textSize}`}>
          <Clock size={iconSize} className="text-amber-400 shrink-0 animate-pulse" />
          {showText && <span>PENDING</span>}
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 ${textSize}`}>
          <XCircle size={iconSize} className="text-rose-400 shrink-0" />
          {showText && <span>REJECTED</span>}
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${textSize}`}>
          <Circle size={iconSize} className="text-slate-500 shrink-0" />
          {showText && <span>UNVERIFIED</span>}
        </span>
      );
  }
};
