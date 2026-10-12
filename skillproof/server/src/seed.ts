import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SEED_TRACKS } from './data/seedCatalog.js';
import { javascriptQuestions } from './data/javascriptQuestions.js';
import { pythonQuestions } from './data/pythonQuestions.js';
import { javaQuestions } from './data/javaQuestions.js';
import { LeaderboardService } from './services/leaderboardService.js';
import { ScoringService, DIFFICULTY_WEIGHTS, QuestionScoreInput } from './services/scoringService.js';
import { QuestionService } from './services/questionService.js';

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
      isDemo: false,
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
      isDemo: false,
    },
  });

  // 5. Seed Question Pools BEFORE creating demo developer assessments
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

  // 6. Seed 10 Demo Developers with real graded assessments
  console.log('👥 Seeding 10 diverse demo developers (User.isDemo = true) with real graded assessments...');

  const demoDevsData = [
    {
      name: 'Arjun Balaji (Demo)',
      username: 'arjun',
      email: 'arjun@skillproof.dev',
      bio: 'Full-Stack Engineer with 5+ years experience building distributed backends, microservices, and React frontends.',
      github: 'https://github.com/arjunbalaji',
      skills: [
        { lang: 'JavaScript', targetScore: 88, verifiedDaysAgo: 10 },
        { lang: 'Python', targetScore: 92, verifiedDaysAgo: 12 },
      ],
    },
    {
      name: 'Priya Sharma',
      username: 'priyasharma',
      email: 'priya@skillproof.dev',
      bio: 'Backend systems engineer specializing in Java, concurrency, and high-throughput streaming pipelines.',
      github: 'https://github.com/priyasharma',
      skills: [
        { lang: 'Java', targetScore: 95, verifiedDaysAgo: 15 },
        { lang: 'Python', targetScore: 85, verifiedDaysAgo: 8 },
      ],
    },
    {
      name: 'Marcus Vance',
      username: 'marcus_ml',
      email: 'marcus@skillproof.dev',
      bio: 'Machine learning practitioner specializing in PyTorch architectures, transformers, and numerical optimization.',
      github: 'https://github.com/marcusvance',
      skills: [
        { lang: 'Python', targetScore: 94, verifiedDaysAgo: 20 },
      ],
    },
    {
      name: 'Elena Rostova',
      username: 'elena_ai',
      email: 'elena@skillproof.dev',
      bio: 'AI researcher and systems architect building low-latency inference runtimes and distributed model training.',
      github: 'https://github.com/elenarostova',
      skills: [
        { lang: 'Python', targetScore: 98, verifiedDaysAgo: 25 },
        { lang: 'Java', targetScore: 82, verifiedDaysAgo: 14 },
      ],
    },
    {
      name: 'Alex Chen',
      username: 'dev_alex',
      email: 'alex@skillproof.dev',
      bio: 'Front-end specialist passionate about TypeScript, web performance, and state machines.',
      github: 'https://github.com/alexchen',
      skills: [
        { lang: 'JavaScript', targetScore: 92, verifiedDaysAgo: 18 },
      ],
    },
    {
      name: 'Sarah Lin',
      username: 'sarah_code',
      email: 'sarah.dev@skillproof.dev',
      bio: 'Software engineer building resilient microservices and full-stack web applications.',
      github: 'https://github.com/sarahlin',
      skills: [
        { lang: 'JavaScript', targetScore: 86, verifiedDaysAgo: 30 },
        { lang: 'Python', targetScore: 80, verifiedDaysAgo: 22 },
      ],
    },
    {
      name: 'Raj Patel',
      username: 'raj_systems',
      email: 'raj@skillproof.dev',
      bio: 'Distributed infrastructure and Java JVM tuning specialist.',
      github: 'https://github.com/rajpatel',
      skills: [
        { lang: 'Java', targetScore: 89, verifiedDaysAgo: 11 },
        { lang: 'Python', targetScore: 74, verifiedDaysAgo: 5 },
      ],
    },
    {
      name: 'Maya Torres',
      username: 'maya_fe',
      email: 'maya@skillproof.dev',
      bio: 'UI engineer obsessed with micro-interactions, CSS architecture, and browser internals.',
      github: 'https://github.com/mayatorres',
      skills: [
        { lang: 'JavaScript', targetScore: 96, verifiedDaysAgo: 3 },
      ],
    },
    {
      name: 'Kenji Sato',
      username: 'kenji_core',
      email: 'kenji@skillproof.dev',
      bio: 'Core systems programmer with deep expertise in JVM architecture and JavaScript concurrency.',
      github: 'https://github.com/kenjisato',
      skills: [
        { lang: 'Java', targetScore: 91, verifiedDaysAgo: 7 },
        { lang: 'JavaScript', targetScore: 84, verifiedDaysAgo: 16 },
      ],
    },
    {
      name: 'Chloe Bennett',
      username: 'chloe_dev',
      email: 'chloe@skillproof.dev',
      bio: 'Cloud backend engineer building high-availability RESTful APIs and pipeline automations.',
      github: 'https://github.com/chloebennett',
      skills: [
        { lang: 'Python', targetScore: 88, verifiedDaysAgo: 9 },
        { lang: 'Java', targetScore: 76, verifiedDaysAgo: 19 },
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
        isDemo: true,
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

    // Seed Verified Skills & Assessments using REAL questions and REAL ScoringService
    for (const s of d.skills) {
      const catalog = catalogMap[s.lang];
      const verifiedAt = new Date(Date.now() - s.verifiedDaysAgo * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(verifiedAt.getTime() + 365 * 24 * 60 * 60 * 1000);

      // Query real questions from Question pool for this language
      const selectedQuestions = await prisma.question.findMany({
        where: { language: s.lang, status: 'ACTIVE' },
        take: 20,
      });

      // Target weighted score calculation
      let totalMaxWeighted = 0;
      for (const q of selectedQuestions) {
        totalMaxWeighted += DIFFICULTY_WEIGHTS[q.difficulty] || 1;
      }
      const targetWeighted = (s.targetScore / 100) * totalMaxWeighted;
      let currentWeighted = 0;

      const questionEvaluations: QuestionScoreInput[] = [];
      const answersMap: { questionId: string; userAnswer: any; isCorrect: boolean }[] = [];

      for (let i = 0; i < selectedQuestions.length; i++) {
        const q = selectedQuestions[i];
        const weight = DIFFICULTY_WEIGHTS[q.difficulty] || 1;
        let isCorrect = false;

        // Give correct answers until target weighted score is achieved
        if (currentWeighted + weight <= targetWeighted + 1.5 || (i >= selectedQuestions.length - 2 && currentWeighted < targetWeighted * 0.9)) {
          isCorrect = true;
          currentWeighted += weight;
        }

        let parsedCorrect: string[] = [];
        try {
          parsedCorrect = JSON.parse(q.correctAnswer);
        } catch {
          parsedCorrect = [q.correctAnswer];
        }

        const userAnswer = isCorrect ? parsedCorrect : ['__incorrect_choice__'];

        questionEvaluations.push({
          questionId: q.id,
          difficulty: q.difficulty,
          topic: q.topic,
          userAnswer,
          correctAnswer: parsedCorrect,
          isCorrect,
        });

        answersMap.push({
          questionId: q.id,
          userAnswer,
          isCorrect,
        });
      }

      // Grade via real ScoringService
      const scoreResult = ScoringService.calculateScore(questionEvaluations, 3);

      const skill = await prisma.skill.create({
        data: {
          userId: dev.id,
          skillCatalogId: catalog?.id,
          language: s.lang,
          claimedLevel: scoreResult.level,
          status: 'VERIFIED',
          bestScore: scoreResult.weightedPercent,
          verifiedAt,
          expiresAt,
        },
      });

      // Create Assessment corresponding to this verification
      const assessment = await prisma.assessment.create({
        data: {
          userId: dev.id,
          skillId: skill.id,
          skillCatalogId: catalog?.id,
          language: s.lang,
          startedAt: new Date(verifiedAt.getTime() - 15 * 60 * 1000),
          submittedAt: verifiedAt,
          durationSec: 1800,
          status: 'SUBMITTED',
          scorePercent: scoreResult.scorePercent,
          weightedPercent: scoreResult.weightedPercent,
          level: scoreResult.level,
          tabSwitchCount: 0,
          confidence: scoreResult.confidence,
          coverage: JSON.stringify(scoreResult.coverage),
          topicBreakdown: JSON.stringify(scoreResult.topicBreakdown),
        },
      });

      // Create real AssessmentQuestion rows
      for (let i = 0; i < answersMap.length; i++) {
        const item = answersMap[i];
        await prisma.assessmentQuestion.create({
          data: {
            assessmentId: assessment.id,
            questionId: item.questionId,
            order: i + 1,
            userAnswer: JSON.stringify(item.userAnswer),
            isCorrect: item.isCorrect,
          },
        });
      }
    }
  }

  // 7. Create Projects and Claimed Skill for Demo Dev 1
  const demoDev1 = createdDevs[0];

  await prisma.skill.create({
    data: {
      userId: demoDev1.id,
      skillCatalogId: catalogMap['React']?.id,
      language: 'React',
      claimedLevel: 'Intermediate',
      certificateUrl: 'https://coursera.org/verify/react-specialization',
      status: 'CLAIMED',
    },
  });
  await prisma.project.create({
    data: {
      userId: demoDev1.id,
      title: 'SkillProof Assessment Platform',
      description: 'Distributed test grading engine with server-side timing and randomized anti-cheat evaluation.',
      repoUrl: 'https://github.com/arjunbalaji/skillproof-engine',
      techStack: 'TypeScript, Node.js, Express, React, Prisma',
    },
  });

  await prisma.project.create({
    data: {
      userId: demoDev1.id,
      title: 'Real-time WebSocket Task Queue',
      description: 'Concurrency queue processing 40k events/sec with exponential backoff and Redis pub/sub.',
      repoUrl: 'https://github.com/arjunbalaji/distributed-queue',
      techStack: 'Node.js, Redis, Docker, TypeScript',
    },
  });

  // 8. Create Recruiter Bookmark
  await prisma.bookmark.create({
    data: {
      recruiterId: recruiter.id,
      developerId: demoDev1.id,
      note: 'Verified JavaScript & Python. Strong portfolio candidate for Senior Full-Stack role.',
    },
  });

  // 9. Seed the REAL user "Arjun Balaji S" with 0 verified skills, 0 assessments, isDemo: false
  console.log('👤 Seeding real user account "Arjun Balaji S" (isDemo = false, 0 skills)...');
  await prisma.user.create({
    data: {
      name: 'Arjun Balaji S',
      username: 'arjun_balaji_s',
      email: 'sbalajiarjun@gmail.com',
      passwordHash: devPasswordHash,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      isDemo: false,
      profile: {
        create: {
          bio: 'Software Engineer',
          publicSlug: 'arjun_balaji_s',
          isPublic: true,
          showOnLeaderboard: true,
        },
      },
    },
  });

  // 10. Rebuild Leaderboard entries from real Skill & Assessment records
  console.log('🏆 Calculating and persisting initial Leaderboard rankings...');
  await LeaderboardService.rebuildAll();

  // Run safety net consistency check
  console.log('🛡️ Running safety net consistency check...');
  const consistency = await LeaderboardService.validateConsistency();
  if (!consistency.valid) {
    console.warn('⚠️ Safety net issues detected during seed:', consistency.issues);
  } else {
    console.log('✅ Safety net verified: 100% database consistency.');
  }

  // 11. Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SYSTEM_SEED',
      entity: 'DATABASE',
      metadata: JSON.stringify({
        tracksCount: SEED_TRACKS.length,
        questionsCount: allSeedQuestions.length,
        developersCount: demoDevsData.length + 1,
      }),
    },
  });

  console.log('✅ SkillProof database successfully seeded with real graded demo developers and real user!');
  console.log('\nDemo Credentials:');
  console.log('  Admin:     admin@skillproof.dev / Admin@123 (username: admin_director)');
  console.log('  Recruiter: recruiter@techcorp.com / Recruiter@123 (username: sarah_jenkins)');
  console.log('  Real User: sbalajiarjun@gmail.com / Dev@123 (username: arjun_balaji_s) [Unranked, 0 skills]');
  console.log('  Demo Dev:  arjun@skillproof.dev / Dev@123 (username: arjun) [Demo Account, isDemo = true]');
  console.log('  Demo Dev:  priya@skillproof.dev / Dev@123 (username: priyasharma) [Demo Account, isDemo = true]');
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
