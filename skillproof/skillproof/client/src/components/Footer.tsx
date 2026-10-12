import React from 'react';
import { ShieldCheck, Github, Linkedin, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 mt-20 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
              <span className="font-bold text-base text-white tracking-tight">SKILLPROOF</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Production-grade skill verification and developer portfolio platform. Answering the fundamental question: <span className="text-slate-200 font-semibold italic">"Can this developer actually prove their claimed skills?"</span>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-3 text-sm">For Developers</h4>
            <ul className="space-y-2">
              <li><Link to="/skills" className="hover:text-indigo-400 transition">Technical Skill Verification</Link></li>
              <li><Link to="/assessments" className="hover:text-indigo-400 transition">Timed Assessments</Link></li>
              <li><Link to="/projects" className="hover:text-indigo-400 transition">Project Evidence Portfolio</Link></li>
              <li><Link to="/developer/arjun" className="hover:text-indigo-400 transition">Sample Verified Portfolio</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-3 text-sm">For Recruiters</h4>
            <ul className="space-y-2">
              <li><Link to="/recruiters/developers" className="hover:text-indigo-400 transition">Search Verified Talent</Link></li>
              <li><Link to="/recruiters/bookmarks" className="hover:text-indigo-400 transition">Saved Developer Bookmarks</Link></li>
              <li><Link to="/login" className="hover:text-indigo-400 transition">Recruiter Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-3 text-sm">Platform & Security</h4>
            <p className="text-slate-400 mb-3">Built with React, Node.js, Express, Prisma ORM, JWT Authentication, and RBAC security rules.</p>
            <div className="flex gap-3 text-slate-400">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-900 hover:text-white hover:bg-slate-800 transition"><Github size={16} /></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-900 hover:text-white hover:bg-slate-800 transition"><Linkedin size={16} /></a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-900 hover:text-white hover:bg-slate-800 transition"><Twitter size={16} /></a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} SKILLPROOF Platform. All rights reserved.</p>
          <div className="flex gap-6 text-slate-500">
            <span>Production Build v1.0.0</span>
            <span>JWT + RBAC Secured</span>
            <span>MariaDB / SQLite Backend</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

