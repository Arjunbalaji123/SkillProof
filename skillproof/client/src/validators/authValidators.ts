export const validateName = (name: string): string | null => {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  if (trimmed.length > 60) return 'Name cannot exceed 60 characters';
  return null;
};

export const validateUsername = (username: string): string | null => {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return 'Username is required';
  if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
    return 'Username must be 3-20 characters, lowercase alphanumeric or underscore';
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Invalid email address format';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 72) return 'Password cannot exceed 72 characters';
  return null;
};

export const validateRecruiterFields = (companyName: string, jobTitle: string): { companyName?: string; jobTitle?: string } => {
  const errors: { companyName?: string; jobTitle?: string } = {};
  if (!companyName.trim()) errors.companyName = 'Company name is required for recruiter registration';
  if (!jobTitle.trim()) errors.jobTitle = 'Job title is required for recruiter registration';
  return errors;
};

