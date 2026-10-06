import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Profile, Education, Certification, Achievement } from '../types';
import { User, MapPin, Globe, Github, Linkedin, Upload, Save, CheckCircle2, Award, GraduationCap, Trophy, Plus, Trash2 } from 'lucide-react';

export const EditProfilePage: React.FC = () => {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [educationList, setEducationList] = useState<Education[]>([]);
  const [certificationsList, setCertificationsList] = useState<Certification[]>([]);
  const [achievementsList, setAchievementsList] = useState<Achievement[]>([]);

  // Education form state
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduStartDate, setEduStartDate] = useState('');
  const [eduEndDate, setEduEndDate] = useState('');

  // Certification form state
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certUrl, setCertUrl] = useState('');

  // Achievement form state
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achDate, setAchDate] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      if (res.data.success) {
        const p: Profile = res.data.data;
        setProfile(p);
        setName(p.name || '');
        setHeadline(p.headline || '');
        setBio(p.bio || '');
        setLocation(p.location || '');
        setGithubUrl(p.github_url || '');
        setLinkedinUrl(p.linkedin_url || '');
        setPortfolioUrl(p.portfolio_url || '');
        setYearsExperience(p.years_experience || 0);
        if (p.profile_image) setAvatarPreview(p.profile_image);
        if (p.education) setEducationList(p.education);
        if (p.certifications) setCertificationsList(p.certifications);
        if (p.achievements) setAchievementsList(p.achievements);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrorMsg(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await api.post('/profile/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const res = await api.put('/profile', {
        name,
        headline,
        bio,
        location,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
        years_experience: Number(yearsExperience),
      });

      if (res.data.success) {
        setMessage('Profile updated successfully!');
        await refreshUser();
      }
    } catch (err: any) {
      console.error('Profile update failed:', err);
      const errData = err.response?.data;
      setErrorMsg(errData?.message || 'Failed to update profile');
      if (errData?.errors && Array.isArray(errData.errors)) {
        const mapped: Record<string, string> = {};
        errData.errors.forEach((e: any) => {
          if (e.path && e.path[0]) mapped[e.path[0]] = e.message;
        });
        setFieldErrors(mapped);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/education', {
        institution: eduInstitution,
        degree: eduDegree,
        field_of_study: eduField,
        start_date: eduStartDate,
        end_date: eduEndDate || undefined,
      });
      if (res.data.success) {
        setEduInstitution('');
        setEduDegree('');
        setEduField('');
        setEduStartDate('');
        setEduEndDate('');
        fetchProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add education');
    }
  };

  const handleDeleteEducation = async (id: string) => {
    try {
      await api.delete(`/education/${id}`);
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete education');
    }
  };

  const handleAddCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/certifications', {
        title: certTitle,
        issuer: certIssuer,
        issue_date: certIssueDate,
        credential_url: certUrl || undefined,
      });
      if (res.data.success) {
        setCertTitle('');
        setCertIssuer('');
        setCertIssueDate('');
        setCertUrl('');
        fetchProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add certification');
    }
  };

  const handleDeleteCertification = async (id: string) => {
    try {
      await api.delete(`/certifications/${id}`);
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete certification');
    }
  };

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/achievements', {
        title: achTitle,
        description: achDesc,
        date: achDate || undefined,
      });
      if (res.data.success) {
        setAchTitle('');
        setAchDesc('');
        setAchDate('');
        fetchProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add achievement');
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    try {
      await api.delete(`/achievements/${id}`);
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete achievement');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <User className="text-indigo-400" />
          Edit Developer Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Keep your headline, bio, education, certifications, and achievements up to date.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        {/* Profile Picture Section */}
        <div className="flex items-center gap-6 pb-6 border-b border-slate-800">
          <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-slate-600" />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Profile Picture</label>
            <label className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-indigo-500 text-xs font-semibold text-indigo-400 cursor-pointer inline-flex items-center gap-2 transition">
              <Upload size={14} /> Upload New Photo
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
            <p className="text-[11px] text-slate-500 mt-1">Allowed formats: PNG, JPG, JPEG (Max 5MB)</p>
          </div>
        </div>

        {/* Basic Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {fieldErrors.name && <p className="text-red-400 text-[11px] mt-1">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Years of Experience</label>
            <input
              type="number"
              min={0}
              max={50}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {fieldErrors.years_experience && <p className="text-red-400 text-[11px] mt-1">{fieldErrors.years_experience}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Professional Headline</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Senior Full-Stack Engineer | React, Node.js & Cloud"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
          {fieldErrors.headline && <p className="text-red-400 text-[11px] mt-1">{fieldErrors.headline}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Bio / About You</label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your technical background, domain expertise, and engineering goals..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
          {fieldErrors.bio && <p className="text-red-400 text-[11px] mt-1">{fieldErrors.bio}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA or Remote"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {fieldErrors.location && <p className="text-red-400 text-[11px] mt-1">{fieldErrors.location}</p>}
        </div>

        {/* Social URLs */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Social & Code Links</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub URL</label>
              <div className="relative">
                <Github size={16} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {fieldErrors.github_url && <p className="text-red-400 text-[11px] mt-1">{fieldErrors.github_url}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">LinkedIn URL</label>
              <div className="relative">
                <Linkedin size={16} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {fieldErrors.linkedin_url && <p className="text-red-400 text-[11px] mt-1">{fieldErrors.linkedin_url}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Portfolio Website</label>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourwebsite.dev"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {fieldErrors.portfolio_url && <p className="text-red-400 text-[11px] mt-1">{fieldErrors.portfolio_url}</p>}
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center gap-2"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      </form>

      {/* Education Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <GraduationCap className="text-indigo-400" size={20} />
          Education Records
        </h2>

        {educationList.length > 0 && (
          <div className="space-y-3">
            {educationList.map((edu) => (
              <div key={edu.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{edu.degree} in {edu.field_of_study}</h4>
                  <p className="text-[11px] text-slate-400">{edu.institution} ({edu.start_date} - {edu.end_date || 'Present'})</p>
                </div>
                <button
                  onClick={() => handleDeleteEducation(edu.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Delete Education"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddEducation} className="space-y-3 pt-3 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-300">Add New Education</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Institution (e.g. Stanford University)"
              required
              value={eduInstitution}
              onChange={(e) => setEduInstitution(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Degree (e.g. B.S.)"
              required
              value={eduDegree}
              onChange={(e) => setEduDegree(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Field of Study (e.g. Computer Science)"
              required
              value={eduField}
              onChange={(e) => setEduField(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Start Date (e.g. 2020-09-01)"
              required
              value={eduStartDate}
              onChange={(e) => setEduStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="End Date (e.g. 2024-05-30 or leave empty)"
              value={eduEndDate}
              onChange={(e) => setEduEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold text-xs flex items-center gap-1 transition"
          >
            <Plus size={14} /> Add Education
          </button>
        </form>
      </div>

      {/* Certifications Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="text-emerald-400" size={20} />
          Certifications
        </h2>

        {certificationsList.length > 0 && (
          <div className="space-y-3">
            {certificationsList.map((cert) => (
              <div key={cert.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{cert.title}</h4>
                  <p className="text-[11px] text-slate-400">{cert.issuer} ({cert.issue_date})</p>
                </div>
                <button
                  onClick={() => handleDeleteCertification(cert.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Delete Certification"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddCertification} className="space-y-3 pt-3 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-300">Add New Certification</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Certification Title (e.g. AWS Certified Solutions Architect)"
              required
              value={certTitle}
              onChange={(e) => setCertTitle(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Issuer (e.g. Amazon Web Services)"
              required
              value={certIssuer}
              onChange={(e) => setCertIssuer(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Issue Date (e.g. 2023-09-15)"
              required
              value={certIssueDate}
              onChange={(e) => setCertIssueDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
            <input
              type="url"
              placeholder="Credential URL (http:// or https://)"
              value={certUrl}
              onChange={(e) => setCertUrl(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1 transition"
          >
            <Plus size={14} /> Add Certification
          </button>
        </form>
      </div>

      {/* Achievements Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Trophy className="text-amber-400" size={20} />
          Achievements & Awards
        </h2>

        {achievementsList.length > 0 && (
          <div className="space-y-3">
            {achievementsList.map((ach) => (
              <div key={ach.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{ach.title}</h4>
                  <p className="text-[11px] text-slate-400">{ach.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteAchievement(ach.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Delete Achievement"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddAchievement} className="space-y-3 pt-3 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-300">Add New Achievement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Achievement Title (e.g. 1st Place National Hackathon)"
              required
              value={achTitle}
              onChange={(e) => setAchTitle(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Date (e.g. 2024-03-20)"
              value={achDate}
              onChange={(e) => setAchDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>
          <textarea
            placeholder="Description of the award or achievement..."
            required
            rows={2}
            value={achDesc}
            onChange={(e) => setAchDesc(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1 transition"
          >
            <Plus size={14} /> Add Achievement
          </button>
        </form>
      </div>
    </div>
  );
};
