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
        <span className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-[#F0FDF4] text-[#15803D] border border-emerald-200 ${textSize}`}>
          <CheckCircle2 size={iconSize} className="text-[#16A34A] shrink-0" />
          {showText && <span>VERIFIED</span>}
        </span>
      );
    case 'PENDING':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-[#FFFBEB] text-[#B45309] border border-amber-200 ${textSize}`}>
          <Clock size={iconSize} className="text-[#D97706] shrink-0 animate-pulse" />
          {showText && <span>PENDING</span>}
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-[#FEF2F2] text-[#B91C1C] border border-red-200 ${textSize}`}>
          <XCircle size={iconSize} className="text-[#DC2626] shrink-0" />
          {showText && <span>REJECTED</span>}
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] ${textSize}`}>
          <Circle size={iconSize} className="text-[#64748B] shrink-0" />
          {showText && <span>UNVERIFIED</span>}
        </span>
      );
  }
};
