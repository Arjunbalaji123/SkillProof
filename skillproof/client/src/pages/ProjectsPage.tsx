import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { ProjectItem } from '../types';
import {
  FolderGit2,
  Plus,
  Trash2,
  ExternalLink,
  Code2,
  Github,
  Check,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [techStack, setTechStack] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects');
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await api.post('/projects', {
        title,
        description,
        repoUrl: repoUrl.trim() || undefined,
        techStack,
      });
      setTitle('');
      setDescription('');
      setRepoUrl('');
      setTechStack('');
      await loadProjects();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this project from your portfolio?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Portfolio Projects</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Showcase production code, repositories, and technical stack implementations directly on your public Trust Passport.
        </p>
      </div>

      {/* Add Project Form */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          <FolderGit2 size={18} className="text-blue-600" />
          Add New Project
        </h2>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Distributed Task Queue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">GitHub / Repository URL</label>
              <input
                type="url"
                placeholder="https://github.com/..."
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">Technologies Used</label>
            <input
              type="text"
              required
              placeholder="e.g. TypeScript, Redis, Node.js, Docker"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase">Description</label>
            <textarea
              required
              rows={3}
              placeholder="Brief overview of system architecture, concurrency handling, and technical constraints solved..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
            >
              <Plus size={16} />
              {submitting ? 'Adding...' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0F172A]">Current Projects ({projects.length})</h2>

        {projects.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0]">
            <p className="text-sm font-semibold text-[#64748B]">No projects added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-extrabold text-[#0F172A]">{proj.title}</h3>
                    {proj.repoUrl && (
                      <a
                        href={proj.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold"
                      >
                        <Github size={14} /> Repository
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">{proj.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
                  <div className="flex flex-wrap gap-1.5">
                    {proj.techStack.split(',').map((tech, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-[#475569] border border-[#CBD5E1]"
                      >
                        {tech.trim()}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(proj.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
