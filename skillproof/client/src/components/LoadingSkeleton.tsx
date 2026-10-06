import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-slate-800 rounded-full"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-800 rounded w-1/3"></div>
        <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-slate-800 rounded w-full"></div>
      <div className="h-3 bg-slate-800 rounded w-4/5"></div>
    </div>
    <div className="flex gap-2">
      <div className="h-6 w-16 bg-slate-800 rounded-full"></div>
      <div className="h-6 w-20 bg-slate-800 rounded-full"></div>
    </div>
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto p-6 space-y-6">
    <div className="h-8 bg-slate-800 rounded w-1/4 animate-pulse"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
);

