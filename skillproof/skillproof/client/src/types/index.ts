export type UserRole = 'DEVELOPER' | 'RECRUITER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type VerificationMethod = 'ASSESSMENT' | 'CERTIFICATION' | 'PROJECT' | 'DOCUMENT';
export type ProjectStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  profile?: Profile;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  username: string;
  headline?: string;
  bio?: string;
  location?: string;
  profile_image?: string;
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  years_experience: number;
  profile_completion: number;
  user_skills?: UserSkill[];
  projects?: Project[];
  education?: Education[];
  certifications?: Certification[];
  achievements?: Achievement[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface UserSkill {
  id: string;
  profile_id: string;
  skill_id: string;
  skill: Skill;
  proficiency_level: ProficiencyLevel;
  verification_status: VerificationStatus;
  verified_at?: string;
  verified_by?: string;
  verification_method?: VerificationMethod;
}

export interface ProjectTechnology {
  id: string;
  project_id: string;
  technology_name: string;
}

export interface Project {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  image?: string;
  github_url?: string;
  live_url?: string;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  technologies?: ProjectTechnology[];
  profile?: Profile;
}

export interface Education {
  id: string;
  profile_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date?: string;
  grade?: string;
  description?: string;
}

export interface Certification {
  id: string;
  profile_id: string;
  title: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
  document_url?: string;
}

export interface Achievement {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  date?: string;
  issuer?: string;
  url?: string;
}

export interface AssessmentOption {
  id: string;
  option_text: string;
}

export interface AssessmentQuestion {
  id: string;
  question_text: string;
  code_snippet?: string;
  points: number;
  options: AssessmentOption[];
}

export interface Assessment {
  id: string;
  skill_id: string;
  skill: Skill;
  title: string;
  description: string;
  time_limit_minutes: number;
  passing_percentage: number;
  total_questions: number;
  questions?: AssessmentQuestion[];
  _count?: { questions: number };
}

export interface AssessmentAttempt {
  id: string;
  user_id: string;
  assessment_id: string;
  assessment: Assessment;
  start_time: string;
  end_time?: string;
  total_questions: number;
  correct_answers: number;
  score: number;
  percentage: number;
  status: 'IN_PROGRESS' | 'PASSED' | 'FAILED';
  created_at: string;
}

export interface VerificationDocument {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  user: User;
  user_skill_id: string;
  user_skill: UserSkill;
  method: VerificationMethod;
  status: VerificationStatus;
  reviewer_id?: string;
  rejection_reason?: string;
  created_at: string;
  documents?: VerificationDocument[];
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user?: { email: string; role: string; profile?: { name: string } };
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: string;
  timestamp: string;
}

export interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalDevelopers: number;
    totalRecruiters: number;
    verifiedSkillsCount: number;
    pendingVerificationsCount: number;
    assessmentsCompletedCount: number;
    totalProjectsCount: number;
  };
  charts: {
    usersByRole: { role: string; count: number }[];
    verificationBreakdown: { status: string; count: number }[];
    topSkills: { name: string; category: string; count: number }[];
  };
}

