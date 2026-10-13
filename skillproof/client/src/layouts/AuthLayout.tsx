import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Auth Layout Header: Logo Only */}
      <header className="p-6 flex justify-center sm:justify-start max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight text-white">
              SKILL<span className="text-[#38BDF8]">PROOF</span>
            </span>
            <span className="text-[10px] tracking-wider text-slate-400 uppercase font-semibold -mt-1">
              Verification Engine
            </span>
          </div>
        </Link>
      </header>

      {/* Auth Body */}
      <main className="flex-1 flex flex-col justify-center px-4 pb-12">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;

