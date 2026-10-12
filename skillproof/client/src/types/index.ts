export type UserRole = 'DEVELOPER' | 'RECRUITER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type SkillStatus = 'CLAIMED' | 'VERIFIED';
export type AssessmentStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'MCQ' | 'MULTI' | 'CODE_OUTPUT' | 'SCENARIO';
export type SkillLevel = 'Beginner' | 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';
export type ConfidenceLabel = 'Low' | 'Medium' | 'High';

export interface User {
  id: string;
  username?: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  createdAt?: string;
  profile?: DeveloperProfile;
}

export interface DeveloperProfile {
  id?: string;
  userId?: string;
  bio?: string | null;
  githubUrl?: string | null;
  publicSlug: string;
  isPublic: boolean;
  showOnLeaderboard?: boolean;
}

export interface LeaderboardEntryItem {
  rank: number;
  userId: string;
  username: string;
  name: string;
  avatar?: string;
  points: number;
  level: string;
  verifiedSkills: string[];
  isCurrentUser?: boolean;
}

export interface UserRankInfo {
  rank: number;
  points: number;
  nextRankPointsDiff: number;
  totalParticipants: number;
  level: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  currentUserRank?: UserRankInfo | null;
}

export interface UserSearchResult {
  username: string;
  name: string;
  avatar?: string | null;
  topSkill?: {
    language: string;
    level: string;
    score: number;
  } | null;
  points: number;
}

export interface TopicCatalogItem {
  id: string;
  name: string;
  weightPercent: number;
}

export interface SkillCatalogItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  durationSec: number;
  questionCount: number;
  activeQuestionsCount?: number;
  topics: TopicCatalogItem[];
}

export interface TrackCatalogItem {
  id: string;
  name: string;
  description?: string;
  skills: SkillCatalogItem[];
}

export interface SkillItem {
  id: string;
  userId?: string;
  skillCatalogId?: string;
  language: string;
  claimedLevel: string;
  certificateUrl?: string | null;
  status: SkillStatus; // CLAIMED | VERIFIED
  bestScore?: number | null;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  latestAssessment?: {
    id: string;
    status: string;
    weightedPercent?: number | null;
    level?: string | null;
    submittedAt?: string | null;
  } | null;
}

export interface AssessmentQuestionItem {
  id: string;
  questionId: string;
  order: number;
  prompt: string;
  options: string[];
  type: QuestionType;
  difficulty: QuestionDifficulty;
  topic: string;
  userAnswer?: any;
  correctAnswer?: any;
  isCorrect?: boolean;
  explanation?: string;
}

export interface ActiveAssessment {
  assessmentId: string;
  language: string;
  startedAt: string;
  durationSec: number;
  questions: AssessmentQuestionItem[];
}

export interface CoverageData {
  topicsCovered: number;
  questionsAnswered: number;
  attemptsCount: number;
}

export interface TopicCumulativeItem {
  topic: string;
  total: number;
  correct: number;
  accuracy: number;
  strength: 'Strong' | 'Proficient' | 'Needs Focus';
  studySuggestion?: string;
}

export interface AssessmentResult {
  id: string;
  language: string;
  startedAt: string;
  submittedAt: string;
  status: AssessmentStatus;
  scorePercent: number;
  weightedPercent: number;
  level: SkillLevel;
  tabSwitchCount: number;
  topicBreakdown: Record<string, { total: number; correct: number; accuracy: number }>;
  coverage?: CoverageData;
  confidence?: ConfidenceLabel;
  cumulativeProfile?: TopicCumulativeItem[];
  passed: boolean;
  questions: AssessmentQuestionItem[];
}

export interface ProjectItem {
  id: string;
  userId?: string;
  title: string;
  description: string;
  repoUrl?: string | null;
  techStack: string;
  createdAt?: string;
}

export interface TopicStrengthItem {
  topic: string;
  accuracy: number;
  strength: 'Strong' | 'Proficient' | 'Needs Focus';
}

export interface VerifiedDeveloperCard {
  id: string;
  name: string;
  publicSlug: string;
  bio?: string | null;
  githubUrl?: string | null;
  verifiedSkills: {
    language: string;
    score: number;
    verifiedAt?: string;
    expiresAt?: string;
    latestLevel: string;
    topicBreakdown?: Record<string, { total: number; correct: number; accuracy: number }>;
    topicStrengths?: TopicStrengthItem[];
  }[];
  claimedSkills: {
    language: string;
    claimedLevel: string;
    certificateUrl?: string;
    verified: boolean;
  }[];
  projectCount: number;
  isBookmarked?: boolean;
  bookmarkNote?: string | null;
  bookmarkId?: string | null;
}

export interface RecruiterBookmarkItem {
  bookmarkId: string;
  developerId: string;
  name: string;
  publicSlug: string;
  bio?: string | null;
  githubUrl?: string | null;
  note?: string;
  updatedAt: string;
  verifiedSkills: {
    language: string;
    score: number;
    level: string;
  }[];
  projectCount: number;
}

export interface AdminPlatformStats {
  users: {
    total: number;
    developers: number;
    recruiters: number;
  };
  questions: {
    total: number;
    active: number;
    flagged: number;
  };
  assessments: {
    total: number;
    verifiedSkills: number;
    claimedSkills: number;
    recent: any[];
  };
}

export interface PoolHealthItem {
  topicId: string;
  topicName: string;
  weightPercent: number;
  skillId: string;
  skillName: string;
  trackName: string;
  activeCount: number;
  flaggedCount: number;
  totalCount: number;
  isLow: boolean;
  warning?: string | null;
}

export interface AdminQuestionItem {
  id: string;
  language: string;
  topic: string;
  skillCatalogId?: string;
  topicId?: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  prompt: string;
  options: string;
  correctAnswer: string;
  explanation: string;
  status: 'ACTIVE' | 'FLAGGED' | 'RETIRED';
  flags?: any[];
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId?: string;
  actor?: { name: string; email: string; role: string };
  action: string;
  entity: string;
  entityId?: string;
  metadata?: string;
  createdAt: string;
}
