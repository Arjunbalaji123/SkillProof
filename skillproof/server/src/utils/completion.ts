import { prisma } from '../config/db.js';

export async function calculateProfileCompletion(profileId: string): Promise<number> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      user_skills: true,
      projects: true,
      education: true,
      certifications: true,
    },
  });

  if (!profile) return 0;

  let score = 0;

  // 1. Basic details (30%)
  if (profile.name && profile.name.trim().length > 0) score += 10;
  if (profile.headline && profile.headline.trim().length > 0) score += 10;
  if (profile.bio && profile.bio.trim().length > 0) score += 5;
  if (profile.location && profile.location.trim().length > 0) score += 5;

  // 2. Profile picture (10%)
  if (profile.profile_image && profile.profile_image.trim().length > 0) score += 10;

  // 3. Social / Web Links (10%)
  if (profile.github_url || profile.linkedin_url || profile.portfolio_url) score += 10;

  // 4. Added Skills (15%)
  if (profile.user_skills && profile.user_skills.length > 0) score += 15;

  // 5. Verified Skills (15%)
  const hasVerified = profile.user_skills?.some((s) => s.verification_status === 'VERIFIED');
  if (hasVerified) score += 15;

  // 6. Projects (10%)
  if (profile.projects && profile.projects.length > 0) score += 10;

  // 7. Education or Certifications (10%)
  if ((profile.education && profile.education.length > 0) || (profile.certifications && profile.certifications.length > 0)) {
    score += 10;
  }

  const finalScore = Math.min(100, Math.max(0, score));

  // Update in DB
  await prisma.profile.update({
    where: { id: profileId },
    data: { profile_completion: finalScore },
  });

  return finalScore;
}

