import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SEED_TRACKS } from './data/seedCatalog.js';
import { javascriptQuestions } from './data/javascriptQuestions.js';
import { pythonQuestions } from './data/pythonQuestions.js';
import { javaQuestions } from './data/javaQuestions.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SkillProof v2 database seed with Role-Based Catalog...');

  // 0. Clean old records in reverse order
  console.log('🧹 Cleaning existing tables...');
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
      email: 'recruiter@techcorp.com',
      passwordHash: recruiterPasswordHash,
      role: 'RECRUITER',
      status: 'ACTIVE',
    },
  });

  // 5. Create Developer 1 (Arjun Balaji)
  const dev1 = await prisma.user.create({
    data: {
      name: 'Arjun Balaji',
      email: 'arjun@skillproof.dev',
      passwordHash: devPasswordHash,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Full-Stack Engineer with 5+ years experience building distributed backends, microservices, and React frontends. Passionate about real, tested code over certificates.',
          githubUrl: 'https://github.com/arjunbalaji',
          publicSlug: 'arjun',
          isPublic: true,
        },
      },
    },
    include: { profile: true },
  });

  // 6. Create Developer 2 (Priya Sharma)
  const dev2 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@skillproof.dev',
      passwordHash: devPasswordHash,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Backend systems engineer specializing in Java, concurrency, and high-throughput streaming pipelines.',
          githubUrl: 'https://github.com/priyasharma',
          publicSlug: 'priyasharma',
          isPublic: true,
        },
      },
    },
    include: { profile: true },
  });

  // 7. Create Skills for Developer 1 (Arjun) linked to SkillCatalog
  const jsCatalog = catalogMap['JavaScript'];
  const pyCatalog = catalogMap['Python'];
  const javaCatalog = catalogMap['Java'];

  await prisma.skill.create({
    data: {
      userId: dev1.id,
      skillCatalogId: jsCatalog?.id,
      language: 'JavaScript',
      claimedLevel: 'Advanced',
      status: 'VERIFIED',
      bestScore: 88,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.skill.create({
    data: {
      userId: dev1.id,
      skillCatalogId: pyCatalog?.id,
      language: 'Python',
      claimedLevel: 'Expert',
      status: 'VERIFIED',
      bestScore: 92,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.skill.create({
    data: {
      userId: dev1.id,
      skillCatalogId: catalogMap['React']?.id,
      language: 'React',
      claimedLevel: 'Intermediate',
      certificateUrl: 'https://coursera.org/verify/react-specialization',
      status: 'CLAIMED',
    },
  });

  // 8. Create Skills for Developer 2 (Priya)
  await prisma.skill.create({
    data: {
      userId: dev2.id,
      skillCatalogId: javaCatalog?.id,
      language: 'Java',
      claimedLevel: 'Expert',
      status: 'VERIFIED',
      bestScore: 95,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // 9. Create Projects
  await prisma.project.create({
    data: {
      userId: dev1.id,
      title: 'SkillProof Assessment Platform',
      description: 'Distributed test grading engine with server-side timing and randomized anti-cheat evaluation.',
      repoUrl: 'https://github.com/arjunbalaji/skillproof-engine',
      techStack: 'TypeScript, Node.js, Express, React, Prisma',
    },
  });

  await prisma.project.create({
    data: {
      userId: dev1.id,
      title: 'Real-time WebSocket Task Queue',
      description: 'Concurrency queue processing 40k events/sec with exponential backoff and Redis pub/sub.',
      repoUrl: 'https://github.com/arjunbalaji/distributed-queue',
      techStack: 'Node.js, Redis, Docker, TypeScript',
    },
  });

  // 10. Create Recruiter Bookmark
  await prisma.bookmark.create({
    data: {
      recruiterId: recruiter.id,
      developerId: dev1.id,
      note: 'Verified JavaScript (88%) & Python (92%). Strong portfolio candidate for Senior Full-Stack role.',
    },
  });

  // 11. Seed Question Pools
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

  // 12. Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SYSTEM_SEED',
      entity: 'DATABASE',
      metadata: JSON.stringify({
        tracksCount: SEED_TRACKS.length,
        questionsCount: allSeedQuestions.length,
      }),
    },
  });

  console.log('✅ SkillProof v2 database successfully seeded!');
  console.log('Credentials:');
  console.log('  Admin:     admin@skillproof.dev / Admin@123');
  console.log('  Recruiter: recruiter@techcorp.com / Recruiter@123');
  console.log('  Developer: arjun@skillproof.dev / Dev@123');
  console.log('  Developer: priya@skillproof.dev / Dev@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
