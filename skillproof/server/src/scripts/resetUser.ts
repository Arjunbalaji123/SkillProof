import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ REFUSED: user:reset is a development-only script and cannot be run when NODE_ENV=production.');
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const [rawEmail, newPassword, requestedUsername] = args;

  if (!rawEmail || !newPassword) {
    console.error('Usage: npm run user:reset -- <email> <newPassword> [username]');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('❌ Error: newPassword must be at least 6 characters long.');
    process.exit(1);
  }

  const emailNormalized = rawEmail.trim().toLowerCase();
  const usernameRegex = /^[a-z0-9_]{3,20}$/;

  // Find all rows matching case-insensitively and trimmed
  const allUsers = await prisma.user.findMany({
    include: { profile: true },
  });

  const matchingUsers = allUsers.filter(
    (u) => u.email.trim().toLowerCase() === emailNormalized
  );

  console.log(`🔍 Inspecting database for "${emailNormalized}"...`);
  console.log(`Found ${matchingUsers.length} matching user row(s).`);

  const SALT_ROUNDS = 10;
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const verifyMatch = await bcrypt.compare(newPassword, passwordHash);

  if (!verifyMatch) {
    throw new Error('Failed internal bcrypt verification check after hashing.');
  }

  let finalUser: any = null;
  let finalProfile: any = null;

  if (matchingUsers.length === 0) {
    console.log(`ℹ️ User with email ${emailNormalized} does not exist. Creating new user and profile in transaction...`);
    let fallbackUsername = requestedUsername?.trim().toLowerCase() || emailNormalized.split('@')[0].replace(/[^a-z0-9_]/g, '_');
    if (!usernameRegex.test(fallbackUsername) || fallbackUsername.length < 3) {
      fallbackUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Ensure unique username
    let uniqueUser = await prisma.user.findUnique({ where: { username: fallbackUsername } });
    if (uniqueUser) {
      fallbackUsername = `user_${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: emailNormalized,
          username: fallbackUsername,
          passwordHash,
          role: 'DEVELOPER',
          status: 'ACTIVE',
        },
      });

      const newDevProfile = await tx.developerProfile.create({
        data: {
          userId: newUser.id,
          bio: 'Software Engineer',
          isPublic: true,
          showOnLeaderboard: true,
        },
      });

      return { user: newUser, profile: newDevProfile };
    });

    finalUser = created.user;
    finalProfile = created.profile;
    console.log('✅ Created User and DeveloperProfile atomically.');
  } else {
    if (matchingUsers.length > 1) {
      console.warn(`⚠️ Warning: Found ${matchingUsers.length} duplicate rows for ${emailNormalized}. Repairing primary row (${matchingUsers[0].id}).`);
    }

    const targetUser = matchingUsers[0];

    // Determine target username
    let finalUsername = targetUser.username ? targetUser.username.trim().toLowerCase() : '';
    const isCurrentUsernameValid = usernameRegex.test(finalUsername);

    if (requestedUsername) {
      const req = requestedUsername.trim().toLowerCase();
      if (!usernameRegex.test(req)) {
        console.error(`❌ Provided username "${req}" does not match ^[a-z0-9_]{3,20}$`);
        process.exit(1);
      }
      finalUsername = req;
    } else if (!isCurrentUsernameValid) {
      const emailPrefix = emailNormalized.split('@')[0].replace(/[^a-z0-9_]/g, '_');
      finalUsername = usernameRegex.test(emailPrefix) ? emailPrefix : `user_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check for username collision if changed
    if (finalUsername !== targetUser.username) {
      const conflict = await prisma.user.findFirst({
        where: {
          username: finalUsername,
          id: { not: targetUser.id },
        },
      });
      if (conflict) {
        finalUsername = `user_${Math.floor(10000 + Math.random() * 90000)}`;
        console.log(`ℹ️ Username conflict encountered. Using fallback username: ${finalUsername}`);
      }
    }

    // Update User row
    finalUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        email: emailNormalized,
        username: finalUsername,
        status: 'ACTIVE',
        passwordHash,
      },
      include: { profile: true, recruiterProfile: true },
    });

    if (finalUser.role === 'RECRUITER') {
      if (!finalUser.recruiterProfile) {
        finalProfile = await prisma.recruiterProfile.create({
          data: {
            userId: finalUser.id,
            companyName: 'SkillProof Partner',
            jobTitle: 'Technical Recruiter',
            isVerified: true,
            verifiedAt: new Date(),
          },
        });
        console.log('✅ Created missing RecruiterProfile.');
      } else {
        finalProfile = finalUser.recruiterProfile;
      }
    } else {
      if (!finalUser.profile) {
        finalProfile = await prisma.developerProfile.create({
          data: {
            userId: finalUser.id,
            bio: 'Software Engineer',
            isPublic: true,
            showOnLeaderboard: true,
          },
        });
        console.log('✅ Created missing DeveloperProfile.');
      } else {
        finalProfile = finalUser.profile;
      }
    }
  }

  console.log('✅ Account repaired successfully:');
  console.log(
    JSON.stringify(
      {
        id: finalUser.id,
        email: finalUser.email,
        username: finalUser.username,
        role: finalUser.role,
        status: finalUser.status,
        isSuspended: finalUser.status === 'SUSPENDED',
        createdAt: finalUser.createdAt,
        passwordHashNonEmpty: Boolean(finalUser.passwordHash && finalUser.passwordHash.length > 0),
        passwordHashStartsWith$2: finalUser.passwordHash.startsWith('$2'),
        bcryptCost10Verified: verifyMatch,
        profile: finalProfile,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error('❌ Error in user:reset:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

