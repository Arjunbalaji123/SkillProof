import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SEED_TRACKS } from './data/seedCatalog.js';
import { javascriptQuestions } from './data/javascriptQuestions.js';
import { pythonQuestions } from './data/pythonQuestions.js';
import { javaQuestions } from './data/javaQuestions.js';
import { LeaderboardService } from './services/leaderboardService.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SkillProof database seed with 10 Demo Developers & Leaderboard...');

  // 0. Clean old records in reverse order
  console.log('🧹 Cleaning existing tables...');
  await prisma.leaderboardEntry.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.project.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.questionFlag.deleteMany();
  await prisma.question.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.developerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.skillCatalog.deleteMany();
  await prisma.track.deleteMany();

  // 1. Seed Tracks, SkillCatalogs, and Topics
  console.log(`🗺️ Seeding ${SEED_TRACKS.length} Tracks with 9 Skills and 45 Topics...`);
  const catalogMap: Record<string, any> = {};
  const topicMap: Record<string, Record<string, any>> = {};

  for (const trackDef of SEED_TRACKS) {
    const track = await prisma.track.create({
      data: {
        name: trackDef.name,
        description: trackDef.description,
      },
    });

    for (const skillDef of trackDef.skills) {
      const skillCatalog = await prisma.skillCatalog.create({
        data: {
          trackId: track.id,
          name: skillDef.name,
          slug: skillDef.slug,
          description: skillDef.description,
          durationSec: skillDef.durationSec,
          questionCount: skillDef.questionCount,
        },
      });
      catalogMap[skillDef.name] = skillCatalog;
      topicMap[skillDef.name] = {};

      for (const topicDef of skillDef.topics) {
        const topic = await prisma.topic.create({
          data: {
            skillCatalogId: skillCatalog.id,
            name: topicDef.name,
            weightPercent: topicDef.weightPercent,
          },
        });
        topicMap[skillDef.name][topicDef.name] = topic;
      }
    }
  }

  // 2. Hash passwords
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const recruiterPasswordHash = await bcrypt.hash('Recruiter@123', 10);
  const devPasswordHash = await bcrypt.hash('Dev@123', 10);

  // 3. Create Admin User
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Director',
      username: 'admin_director',
      email: 'admin@skillproof.dev',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // 4. Create Recruiter User
  const recruiter = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins',
      username: 'sarah_jenkins',
      email: 'recruiter@techcorp.com',
      passwordHash: recruiterPasswordHash,
      role: 'RECRUITER',
      status: 'ACTIVE',
    },
  });

  // 5. Seed 10 Demo Developers
  console.log('👥 Seeding 10 diverse demo developers for multi-user leaderboard...');

  const demoDevsData = [
    {
      name: 'Arjun Balaji',
      username: 'arjun',
      email: 'arjun@skillproof.dev',
      bio: 'Full-Stack Engineer with 5+ years experience building distributed backends, microservices, and React frontends.',
      github: 'https://github.com/arjunbalaji',
      skills: [
        { lang: 'JavaScript', score: 88, level: 'Advanced', verifiedDaysAgo: 10 },
        { lang: 'Python', score: 92, level: 'Expert', verifiedDaysAgo: 12 },
      ],
    },
    {
      name: 'Priya Sharma',
      username: 'priyasharma',
      email: 'priya@skillproof.dev',
      bio: 'Backend systems engineer specializing in Java, concurrency, and high-throughput streaming pipelines.',
      github: 'https://github.com/priyasharma',
      skills: [
        { lang: 'Java', score: 95, level: 'Expert', verifiedDaysAgo: 15 },
        { lang: 'Python', score: 85, level: 'Advanced', verifiedDaysAgo: 8 },
      ],
    },
    {
      name: 'Marcus Vance',
      username: 'marcus_ml',
      email: 'marcus@skillproof.dev',
      bio: 'Machine learning practitioner specializing in PyTorch architectures, transformers, and numerical optimization.',
      github: 'https://github.com/marcusvance',
      skills: [
        { lang: 'Python', score: 94, level: 'Expert', verifiedDaysAgo: 20 },
      ],
    },
    {
      name: 'Elena Rostova',
      username: 'elena_ai',
      email: 'elena@skillproof.dev',
      bio: 'AI researcher and systems architect building low-latency inference runtimes and distributed model training.',
      github: 'https://github.com/elenarostova',
      skills: [
        { lang: 'Python', score: 98, level: 'Expert', verifiedDaysAgo: 25 },
        { lang: 'Java', score: 82, level: 'Advanced', verifiedDaysAgo: 14 },
      ],
    },
    {
      name: 'Alex Chen',
      username: 'dev_alex',
      email: 'alex@skillproof.dev',
      bio: 'Front-end specialist passionate about TypeScript, web performance, and state machines.',
      github: 'https://github.com/alexchen',
      skills: [
        { lang: 'JavaScript', score: 92, level: 'Advanced', verifiedDaysAgo: 18 },
      ],
    },
    {
      name: 'Sarah Lin',
      username: 'sarah_code',
      email: 'sarah.dev@skillproof.dev',
      bio: 'Software engineer building resilient microservices and full-stack web applications.',
      github: 'https://github.com/sarahlin',
      skills: [
        { lang: 'JavaScript', score: 86, level: 'Intermediate', verifiedDaysAgo: 30 },
        { lang: 'Python', score: 80, level: 'Intermediate', verifiedDaysAgo: 22 },
      ],
    },
    {
      name: 'Raj Patel',
      username: 'raj_systems',
      email: 'raj@skillproof.dev',
      bio: 'Distributed infrastructure and Java JVM tuning specialist.',
      github: 'https://github.com/rajpatel',
      skills: [
        { lang: 'Java', score: 89, level: 'Advanced', verifiedDaysAgo: 11 },
        { lang: 'Python', score: 74, level: 'Intermediate', verifiedDaysAgo: 5 },
      ],
    },
    {
      name: 'Maya Torres',
      username: 'maya_fe',
      email: 'maya@skillproof.dev',
      bio: 'UI engineer obsessed with micro-interactions, CSS architecture, and browser internals.',
      github: 'https://github.com/mayatorres',
      skills: [
        { lang: 'JavaScript', score: 96, level: 'Expert', verifiedDaysAgo: 3 },
      ],
    },
    {
      name: 'Kenji Sato',
      username: 'kenji_core',
      email: 'kenji@skillproof.dev',
      bio: 'Core systems programmer with deep expertise in JVM architecture and JavaScript concurrency.',
      github: 'https://github.com/kenjisato',
      skills: [
        { lang: 'Java', score: 91, level: 'Advanced', verifiedDaysAgo: 7 },
        { lang: 'JavaScript', score: 84, level: 'Intermediate', verifiedDaysAgo: 16 },
      ],
    },
    {
      name: 'Chloe Bennett',
      username: 'chloe_dev',
      email: 'chloe@skillproof.dev',
      bio: 'Cloud backend engineer building high-availability RESTful APIs and pipeline automations.',
      github: 'https://github.com/chloebennett',
      skills: [
        { lang: 'Python', score: 88, level: 'Advanced', verifiedDaysAgo: 9 },
        { lang: 'Java', score: 76, level: 'Intermediate', verifiedDaysAgo: 19 },
      ],
    },
  ];

  const createdDevs: any[] = [];

  for (const d of demoDevsData) {
    const dev = await prisma.user.create({
      data: {
        name: d.name,
        username: d.username,
        email: d.email,
        passwordHash: devPasswordHash,
        role: 'DEVELOPER',
        status: 'ACTIVE',
        profile: {
          create: {
            bio: d.bio,
            githubUrl: d.github,
            publicSlug: d.username,
            isPublic: true,
            showOnLeaderboard: true,
          },
        },
      },
      include: { profile: true },
    });
    createdDevs.push(dev);

    // Seed Verified Skills & Assessments
    for (const s of d.skills) {
      const catalog = catalogMap[s.lang];
      const verifiedAt = new Date(Date.now() - s.verifiedDaysAgo * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(verifiedAt.getTime() + 365 * 24 * 60 * 60 * 1000);

      const skill = await prisma.skill.create({
        data: {
          userId: dev.id,
          skillCatalogId: catalog?.id,
          language: s.lang,
          claimedLevel: s.level,
          status: 'VERIFIED',
          bestScore: s.score,
          verifiedAt,
          expiresAt,
        },
      });

      // Create Assessment corresponding to this verification
      await prisma.assessment.create({
        data: {
          userId: dev.id,
          skillId: skill.id,
          skillCatalogId: catalog?.id,
          language: s.lang,
          startedAt: new Date(verifiedAt.getTime() - 15 * 60 * 1000),
          submittedAt: verifiedAt,
          durationSec: 1800,
          status: 'SUBMITTED',
          scorePercent: s.score,
          weightedPercent: s.score,
          level: s.level,
          tabSwitchCount: 0,
          confidence: 'High',
          coverage: JSON.stringify({ topicsCovered: 5, questionsAnswered: 20, attemptsCount: 3 }),
        },
      });
    }
  }

  // 6. Create Projects and Claimed Skill for Arjun
  const arjunUser = createdDevs[0];

  await prisma.skill.create({
    data: {
      userId: arjunUser.id,
      skillCatalogId: catalogMap['React']?.id,
      language: 'React',
      claimedLevel: 'Intermediate',
      certificateUrl: 'https://coursera.org/verify/react-specialization',
      status: 'CLAIMED',
    },
  });
  await prisma.project.create({
    data: {
      userId: arjunUser.id,
      title: 'SkillProof Assessment Platform',
      description: 'Distributed test grading engine with server-side timing and randomized anti-cheat evaluation.',
      repoUrl: 'https://github.com/arjunbalaji/skillproof-engine',
      techStack: 'TypeScript, Node.js, Express, React, Prisma',
    },
  });

  await prisma.project.create({
    data: {
      userId: arjunUser.id,
      title: 'Real-time WebSocket Task Queue',
      description: 'Concurrency queue processing 40k events/sec with exponential backoff and Redis pub/sub.',
      repoUrl: 'https://github.com/arjunbalaji/distributed-queue',
      techStack: 'Node.js, Redis, Docker, TypeScript',
    },
  });

  // 7. Create Recruiter Bookmark
  await prisma.bookmark.create({
    data: {
      recruiterId: recruiter.id,
      developerId: arjunUser.id,
      note: 'Verified JavaScript (88%) & Python (92%). Strong portfolio candidate for Senior Full-Stack role.',
    },
  });

  // 8. Seed Question Pools
  const allSeedQuestions = [
    ...javascriptQuestions,
    ...pythonQuestions,
    ...javaQuestions,
  ];

  console.log(`📚 Inserting ${allSeedQuestions.length} randomized test questions into Question Bank...`);
  for (const q of allSeedQuestions) {
    const catalog = catalogMap[q.language];
    const topic = topicMap[q.language]?.[q.topic];

    const normalizedCorrect = Array.isArray(q.correctAnswer)
      ? q.correctAnswer.map(String)
      : [String(q.correctAnswer)];

    await prisma.question.create({
      data: {
        skillCatalogId: catalog?.id,
        topicId: topic?.id,
        language: q.language,
        topic: q.topic,
        difficulty: q.difficulty,
        type: q.type,
        prompt: q.prompt,
        options: JSON.stringify(q.options),
        correctAnswer: JSON.stringify(normalizedCorrect),
        explanation: q.explanation,
        status: 'ACTIVE',
        createdBy: admin.id,
      },
    });
  }

  // 9. Pre-calculate Leaderboard entries for all scopes
  console.log('🏆 Calculating and caching initial Leaderboard rankings...');
  await LeaderboardService.recalculateLeaderboard({ scope: 'global', period: 'all' });
  await LeaderboardService.recalculateLeaderboard({ scope: 'global', period: 'month' });

  // 10. Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SYSTEM_SEED',
      entity: 'DATABASE',
      metadata: JSON.stringify({
        tracksCount: SEED_TRACKS.length,
        questionsCount: allSeedQuestions.length,
        developersCount: demoDevsData.length,
      }),
    },
  });

  console.log('✅ SkillProof database successfully seeded with 10 developers and live leaderboard!');
  console.log('\nDemo Credentials:');
  console.log('  Admin:     admin@skillproof.dev / Admin@123 (username: admin_director)');
  console.log('  Recruiter: recruiter@techcorp.com / Recruiter@123 (username: sarah_jenkins)');
  console.log('  Developer: arjun@skillproof.dev / Dev@123 (username: arjun)');
  console.log('  Developer: priya@skillproof.dev / Dev@123 (username: priyasharma)');
  console.log('  All other developers password: Dev@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
