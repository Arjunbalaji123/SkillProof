import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { FolderGit2, Plus, Trash2, ExternalLink, Github, Upload, CheckCircle2 } from 'lucide-react';
import { Project, ProjectStatus } from '../types';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('COMPLETED');
  const [techInput, setTechInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
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
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const technologies = techInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const res = await api.post('/projects', {
        title,
        description,
        github_url: githubUrl,
        live_url: liveUrl,
        start_date: startDate,
        end_date: endDate,
        status,
        technologies,
      });

      if (res.data.success) {
        const createdProj: Project = res.data.data;

        // If cover image attached
        if (imageFile) {
          const formData = new FormData();
          formData.append('image', imageFile);
          await api.post(`/projects/${createdProj.id}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }

        setMessage('Project created successfully!');
        setIsModalOpen(false);
        resetForm();
        fetchProjects();
      }
    } catch (err: any) {
      console.error('Create project failed:', err);
      setMessage(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGithubUrl('');
    setLiveUrl('');
    setStartDate('');
    setEndDate('');
    setStatus('COMPLETED');
    setTechInput('');
    setImageFile(null);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="text-indigo-400" />
            Project Evidence Showcase
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Display technical projects, GitHub repositories, live demo links, and technology stack tags.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center gap-1.5"
        >
          <Plus size={16} /> Add New Project
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <p className="text-slate-400 text-sm">No projects added yet.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 space-y-4 flex flex-col justify-between transition shadow-xl group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">
                    {proj.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {proj.status}
                    </span>
                    <button
                      onClick={() => handleDeleteProject(proj.id)}
                      className="text-slate-500 hover:text-rose-400 transition p-1"
                      title="Delete Project"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{proj.description}</p>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {proj.technologies?.map((t) => (
                    <span
                      key={t.id}
                      className="text-[11px] bg-indigo-950/60 text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-500/20 font-mono"
                    >
                      {t.technology_name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-4">
                  {proj.github_url && (
                    <a
                      href={proj.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      <Github size={14} /> Repository
                    </a>
                  )}
                  {proj.live_url && (
                    <a
                      href={proj.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <ExternalLink size={14} /> Live Demo
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Project Entry">
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Project Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SKILLPROOF Platform"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe problem statement, architectural decisions, and key technical achievements..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Technologies Used (Comma-separated)
            </label>
            <input
              type="text"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              placeholder="React, Node.js, Express, MariaDB, Docker"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">GitHub URL</label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Live Demo URL</label>
              <input
                type="url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Project Cover Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition"
            >
              Save Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

