import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SEED_TRACKS } from './data/seedCatalog.js';
import { javascriptQuestions } from './data/javascriptQuestions.js';
import { pythonQuestions } from './data/pythonQuestions.js';
import { javaQuestions } from './data/javaQuestions.js';
import { generateAllCatalogQuestions } from './data/catalogQuestions.js';
import { LeaderboardService } from './services/leaderboardService.js';
import { ScoringService, QuestionScoreInput } from './services/scoringService.js';
import { QuestionService } from './services/questionService.js';
import { OpeningService } from './services/openingService.js';
import { NotificationService } from './services/notificationService.js';

export const EXPERTS = 10;
export const INTERMEDIATE = 20;
export const BEGINNERS = 30; // total 60
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Dev@123';

const prisma = new PrismaClient();

interface DemoDevSeedSpec {
  index: number; // 1..60
  tier: 'EXPERT' | 'INTERMEDIATE' | 'BEGINNER_VERIFIED' | 'BEGINNER_CLAIMED';
  name: string;
  username: string;
  email: string;
  bio: string;
  primaryTrack: string;
  assessedSkills: string[];
  extraClaimedSkill?: string;
  certificateCount: number; // 1..3
  projectCount: number; // 2..4
  hasTwoAttempts: boolean;
}

const DEMO_NAMES_AND_USERNAMES: Array<{ name: string; username: string }> = [
  // 1..10: EXPERTS
  { name: 'Arjun Mehta', username: 'arjun' },
  { name: 'Priya Sharma', username: 'priya_sharma' },
  { name: 'Marcus Vance', username: 'marcus_vance' },
  { name: 'Elena Rostova', username: 'elena_rostova' },
  { name: 'Kenji Sato', username: 'kenji_sato' },
  { name: 'Nadia Al-Mansoor', username: 'nadia_almansoor' },
  { name: 'Lucas Meyer', username: 'lucas_meyer' },
  { name: 'Ananya Krishnan', username: 'ananya_k' },
  { name: 'Rafael Oliveira', username: 'rafael_oliveira' },
  { name: 'Hannah Lindqvist', username: 'hannah_lind' },

  // 11..30: INTERMEDIATE (20)
  { name: 'Vikram Nair', username: 'vikram_nair' },
  { name: 'Chloe Bennett', username: 'chloe_bennett' },
  { name: 'Daniel Okafor', username: 'daniel_okafor' },
  { name: 'Meera Iyer', username: 'meera_iyer' },
  { name: 'Liam OConnor', username: 'liam_oconnor' },
  { name: 'Sofia Rossi', username: 'sofia_rossi' },
  { name: 'Rohan Deshmukh', username: 'rohan_deshmukh' },
  { name: 'Zara Khan', username: 'zara_khan' },
  { name: 'Ethan Brooks', username: 'ethan_brooks' },
  { name: 'Kavya Menon', username: 'kavya_menon' },
  { name: 'Noah Takahashi', username: 'noah_takahashi' },
  { name: 'Maya Torres', username: 'maya_torres' },
  { name: 'Siddharth Rao', username: 'siddharth_rao' },
  { name: 'Grace Kim', username: 'grace_kim' },
  { name: 'Mateo Silva', username: 'mateo_silva' },
  { name: 'Divya Chatterjee', username: 'divya_c' },
  { name: 'Jonas Bergstrom', username: 'jonas_berg' },
  { name: 'Aisha Rahman', username: 'aisha_rahman' },
  { name: 'Caleb Foster', username: 'caleb_foster' },
  { name: 'Neha Verma', username: 'neha_verma' },

  // 31..52: BEGINNERS VERIFIED (22 developers scoring 40-59% -> Basic -> VERIFIED)
  { name: 'Aditya Kulkarni', username: 'aditya_k' },
  { name: 'Emma Collins', username: 'emma_collins' },
  { name: 'Karthik Subramanian', username: 'karthik_sub' },
  { name: 'Olivia Park', username: 'olivia_park' },
  { name: 'Pranav Joshi', username: 'pranav_joshi' },
  { name: 'Lucas Morales', username: 'lucas_morales' },
  { name: 'Sneha Reddy', username: 'sneha_reddy' },
  { name: 'Ryan Murphy', username: 'ryan_murphy' },
  { name: 'Tanvi Gupta', username: 'tanvi_gupta' },
  { name: 'jaiden_wright', username: 'jaiden_wright' },
  { name: 'Harshvardhan Singh', username: 'harsh_singh' },
  { name: 'Clara Dubois', username: 'clara_dubois' },
  { name: 'Nikhil Bhatia', username: 'nikhil_bhatia' },
  { name: 'Mila Novak', username: 'mila_novak' },
  { name: 'Varun Choudhary', username: 'varun_c' },
  { name: 'stabil_petrov', username: 'pavel_petrov' },
  { name: 'Pooja Nambiar', username: 'pooja_nambiar' },
  { name: 'Owen Hughes', username: 'owen_hughes' },
  { name: 'Riya Sengupta', username: 'riya_sengupta' },
  { name: 'Leo Lindholm', username: 'leo_lindholm' },
  { name: 'Abhishek Tiwari', username: 'abhishek_t' },
  { name: 'Freja Andersen', username: 'freja_andersen' },

  // 53..60: BEGINNERS UNVERIFIED (8 developers scoring 20-39% -> Beginner -> stays CLAIMED)
  { name: 'Gaurav मिश्रा', username: 'gaurav_mishra' },
  { name: 'Toby Watkins', username: 'toby_watkins' },
  { name: 'Shruti Agarwal', username: 'shruti_agarwal' },
  { name: 'Dylan Reed', username: 'dylan_reed' },
  { name: 'Kunal Saxena', username: 'kunal_saxena' },
  { name: 'hailey_turner', username: 'hailey_turner' },
  { name: 'Yash Pandey', username: 'yash_pandey' },
  { name: 'Nina Kowalski', username: 'nina_kowalski' },
].map((entry) => ({
  name:
    entry.name === 'jaiden_wright'
      ? 'Jaiden Wright'
      : entry.name === 'stabil_petrov'
      ? 'Pavel Petrov'
      : entry.name === 'Gaurav मिश्रा'
      ? 'Gaurav Mishra'
      : entry.name === 'hailey_turner'
      ? 'Hailey Turner'
      : entry.name,
  username: entry.username.toLowerCase(),
}));

const TRACK_SKILLS: Array<{ track: string; skills: string[] }> = [
  { track: 'UI/Frontend', skills: ['JavaScript', 'React', 'CSS Architecture'] },
  { track: 'ML Engineer', skills: ['Python', 'Data Engineering'] },
  { track: 'AI Engineer', skills: ['LLM Prompting & RAG', 'GenAI Engineering'] },
  { track: 'Core', skills: ['Java', 'Algorithms & Data Structures'] },
];

const ALL_SKILL_NAMES = TRACK_SKILLS.flatMap((t) => t.skills);

const CERT_ISSUERS = [
  'Sample Academy',
  'OpenTech Institute',
  'CloudNative Guild',
  'AI Foundations Lab',
];

function buildSampleCertificatePdf(params: {
  developerName: string;
  username: string;
  courseName: string;
  issuer: string;
  issueDate: string;
  certCode: string;
}): Buffer {
  const esc = (s: string) =>
    s
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const streamContent = [
    'BT',
    '/F1 20 Tf',
    '54 720 Td',
    '(SAMPLE - UNVERIFIED CERTIFICATE CLAIM) Tj',
    '/F1 13 Tf',
    '0 -36 Td',
    `(Issuer: ${esc(params.issuer)}) Tj`,
    '0 -26 Td',
    `(Developer: ${esc(params.developerName)} (@${esc(params.username)})) Tj`,
    '0 -26 Td',
    `(Course: ${esc(params.courseName)} Professional Track) Tj`,
    '0 -26 Td',
    `(Issue Date: ${esc(params.issueDate)}   |   Ref: ${esc(params.certCode)}) Tj`,
    '0 -38 Td',
    '/F1 15 Tf',
    '(WATERMARK: SAMPLE - UNVERIFIED) Tj',
    '/F1 10 Tf',
    '0 -24 Td',
    '(This PDF is a self-declared certificate claim seeded for demonstration.) Tj',
    '0 -16 Td',
    '(SkillProof only verifies skills through randomized, server-graded 20-question assessments.) Tj',
    'ET',
  ].join('\n');

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream\nendobj\n`
  );
  objects.push(
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

function generateCertificateFile(
  certDirs: string[],
  params: {
    developerName: string;
    username: string;
    skillName: string;
    issuer: string;
    issueDate: string;
  }
): string {
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const filename = `cert_${randomSuffix}.pdf`;
  const pdfBuffer = buildSampleCertificatePdf({
    developerName: params.developerName,
    username: params.username,
    courseName: `${params.skillName} Mastery`,
    issuer: params.issuer,
    issueDate: params.issueDate,
    certCode: `SP-${randomSuffix.toUpperCase()}`,
  });

  for (const dir of certDirs) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), pdfBuffer);
  }

  return `/uploads/certificates/${filename}`;
}

function getWrongAnswerJson(optionsJson: string, correctAnswerJson: string): string {
  try {
    const options: string[] = JSON.parse(optionsJson);
    const correctArr: string[] = Array.isArray(JSON.parse(correctAnswerJson))
      ? JSON.parse(correctAnswerJson).map(String)
      : [String(JSON.parse(correctAnswerJson))];
    const wrongOption = options.find((opt) => !correctArr.includes(String(opt)));
    if (wrongOption !== undefined) {
      return JSON.stringify([wrongOption]);
    }
  } catch {
    // fallback
  }
  return JSON.stringify(['__INCORRECT_OPTION__']);
}

function getTargetCorrectCounts(
  tier: 'EXPERT' | 'INTERMEDIATE' | 'BEGINNER_VERIFIED' | 'BEGINNER_CLAIMED',
  seedIdx: number
): { easy: number; medium: number; hard: number } {
  // Total weights: 8 EASY (1pt) + 8 MEDIUM (2pt) + 4 HARD (3pt) = 36 pts
  if (tier === 'EXPERT') {
    // 90-100% weighted (33..36 / 36) AND >= 60% HARD (3 or 4 / 4)
    const combos = [
      { easy: 8, medium: 8, hard: 4 }, // 36/36 = 100.0%, hard 100%
      { easy: 7, medium: 8, hard: 4 }, // 35/36 = 97.2%, hard 100%
      { easy: 8, medium: 7, hard: 4 }, // 34/36 = 94.4%, hard 100%
      { easy: 8, medium: 8, hard: 3 }, // 33/36 = 91.7%, hard 75%
    ];
    return combos[seedIdx % combos.length];
  }

  if (tier === 'INTERMEDIATE') {
    // 60-74% weighted (22..26 / 36)
    const combos = [
      { easy: 6, medium: 5, hard: 2 }, // 22/36 = 61.1%
      { easy: 7, medium: 5, hard: 2 }, // 23/36 = 63.9%
      { easy: 6, medium: 6, hard: 2 }, // 24/36 = 66.7%
      { easy: 7, medium: 6, hard: 2 }, // 25/36 = 69.4%
      { easy: 8, medium: 6, hard: 2 }, // 26/36 = 72.2%
    ];
    return combos[seedIdx % combos.length];
  }

  if (tier === 'BEGINNER_VERIFIED') {
    // 40-59% weighted (15..21 / 36) -> Basic level -> VERIFIED
    const combos = [
      { easy: 5, medium: 5, hard: 0 }, // 15/36 = 41.7%
      { easy: 6, medium: 5, hard: 0 }, // 16/36 = 44.4%
      { easy: 5, medium: 6, hard: 0 }, // 17/36 = 47.2%
      { easy: 6, medium: 6, hard: 0 }, // 18/36 = 50.0%
      { easy: 6, medium: 5, hard: 1 }, // 19/36 = 52.8%
      { easy: 6, medium: 7, hard: 0 }, // 20/36 = 55.6%
      { easy: 7, medium: 7, hard: 0 }, // 21/36 = 58.3%
    ];
    return combos[seedIdx % combos.length];
  }

  // BEGINNER_CLAIMED: 20-39% weighted (8..14 / 36) -> Beginner level -> passed = false -> stays CLAIMED
  const combos = [
    { easy: 4, medium: 2, hard: 0 }, // 8/36 = 22.2%
    { easy: 5, medium: 2, hard: 0 }, // 9/36 = 25.0%
    { easy: 4, medium: 3, hard: 0 }, // 10/36 = 27.8%
    { easy: 5, medium: 3, hard: 0 }, // 11/36 = 30.6%
    { easy: 6, medium: 3, hard: 0 }, // 12/36 = 33.3%
    { easy: 5, medium: 4, hard: 0 }, // 13/36 = 36.1%
    { easy: 6, medium: 4, hard: 0 }, // 14/36 = 38.9%
  ];
  return combos[seedIdx % combos.length];
}

function buildDemoSpecs(): DemoDevSeedSpec[] {
  const total = EXPERTS + INTERMEDIATE + BEGINNERS;
  const specs: DemoDevSeedSpec[] = [];

  for (let i = 0; i < total; i++) {
    const idx = i + 1;
    const identity = DEMO_NAMES_AND_USERNAMES[i];
    const email = `dev${String(idx).padStart(3, '0')}@demo.skillproof.test`;

    let tier: DemoDevSeedSpec['tier'];
    if (i < EXPERTS) {
      tier = 'EXPERT';
    } else if (i < EXPERTS + INTERMEDIATE) {
      tier = 'INTERMEDIATE';
    } else if (i < EXPERTS + INTERMEDIATE + 22) {
      tier = 'BEGINNER_VERIFIED';
    } else {
      tier = 'BEGINNER_CLAIMED';
    }

    // Spread evenly across the 4 tracks and 9 skills
    const trackInfo = TRACK_SKILLS[i % TRACK_SKILLS.length];
    const primaryTrack = trackInfo.track;

    // Pick assessed skills depending on tier:
    // Experts: 3-4 verified skills
    // Intermediates: 2-3 verified skills
    // Beginners: 1-2 assessed skills
    let assessedCount: number;
    if (tier === 'EXPERT') {
      assessedCount = i % 2 === 0 ? 4 : 3;
    } else if (tier === 'INTERMEDIATE') {
      assessedCount = i % 2 === 0 ? 3 : 2;
    } else {
      assessedCount = i % 2 === 0 ? 2 : 1;
    }

    const rotatedSkills = [
      ...trackInfo.skills,
      ...ALL_SKILL_NAMES.filter((s) => !trackInfo.skills.includes(s)),
    ];
    // Offset rotation by developer index for variety within the same track
    const shift = i % trackInfo.skills.length;
    const orderedTrackFirst = [
      ...trackInfo.skills.slice(shift),
      ...trackInfo.skills.slice(0, shift),
      ...rotatedSkills.slice(trackInfo.skills.length),
    ];

    // Ensure dev001 (@arjun) has JavaScript & Python among his assessed skills and an extra CLAIMED skill for tests
    let assessedSkills = orderedTrackFirst.slice(0, assessedCount);
    if (idx === 1) {
      assessedSkills = ['JavaScript', 'Python', 'React', 'Java'];
    }

    // ~30% of developers get 1 extra CLAIMED-only unassessed skill (and dev001 always gets one)
    const hasExtraClaimed = idx === 1 || i % 3 === 0;
    const remainingSkills = orderedTrackFirst.filter((s) => !assessedSkills.includes(s));
    const extraClaimedSkill = hasExtraClaimed ? remainingSkills[0] : undefined;

    const totalSkillsForDev = assessedSkills.length + (extraClaimedSkill ? 1 : 0);
    const desiredCertCount = (i % 3) + 1; // 1, 2, or 3
    const certificateCount = Math.max(1, Math.min(3, desiredCertCount, totalSkillsForDev));

    const projectCount = tier === 'EXPERT' ? (i % 2 === 0 ? 4 : 3) : (i % 3 === 0 ? 3 : 2);
    const hasTwoAttempts = i % 3 === 0; // ~20 developers have 2 attempts with improving scores

    const bioByTier: Record<DemoDevSeedSpec['tier'], string> = {
      EXPERT: `Principal ${primaryTrack} architect specializing in ${assessedSkills.slice(0, 3).join(', ')}, distributed systems reliability, and high-throughput production engineering.`,
      INTERMEDIATE: `Full-lifecycle ${primaryTrack} developer building production applications with ${assessedSkills.join(' and ')}.`,
      BEGINNER_VERIFIED: `Junior ${primaryTrack} developer focused on ${assessedSkills.join(', ')} fundamentals and building hands-on web & data projects.`,
      BEGINNER_CLAIMED: `Aspiring ${primaryTrack} practitioner exploring ${assessedSkills.join(', ')} through online bootcamps and self-paced coursework.`,
    };

    specs.push({
      index: idx,
      tier,
      name: identity.name,
      username: identity.username,
      email,
      bio: bioByTier[tier],
      primaryTrack,
      assessedSkills,
      extraClaimedSkill,
      certificateCount,
      projectCount,
      hasTwoAttempts,
    });
  }

  return specs;
}

function buildProjectsForDev(spec: DemoDevSeedSpec): Array<{
  title: string;
  description: string;
  repoUrl: string;
  techStack: string;
}> {
  const skills = [...spec.assessedSkills, ...(spec.extraClaimedSkill ? [spec.extraClaimedSkill] : [])];
  const templates = [
    {
      slug: 'distributed-telemetry-engine',
      title: `${skills[0]} Telemetry & Observability Pipeline`,
      shortDesc: `Real-time metrics aggregator and dashboard built using ${skills.slice(0, 2).join(', ')}.`,
      expertDesc: `High-throughput distributed telemetry ingestion engine and latency profiler architected with ${skills.join(', ')}. Features lock-free ring buffers, adaptive backpressure, sub-millisecond percentile aggregation, and automated anomaly alerting.`,
    },
    {
      slug: 'cloud-workflow-orchestrator',
      title: `Autonomous ${spec.primaryTrack} Workflow Orchestrator`,
      shortDesc: `Task scheduler and state management service powered by ${skills.join(', ')}.`,
      expertDesc: `Production-grade DAG execution engine and fault-tolerant state machine built for ${spec.primaryTrack} workloads using ${skills.join(', ')}. Implements idempotent retry policies, dead-letter replay queues, and zero-downtime rolling workers.`,
    },
    {
      slug: 'realtime-analytics-workbench',
      title: `Interactive ${skills[0]} Analytics Workbench`,
      shortDesc: `Modular web workbench and query inspector built with ${skills.join(', ')}.`,
      expertDesc: `End-to-end streaming analytics studio and schema validation workbench engineered with ${skills.join(', ')}. Supports incremental query caching, deterministic state snapshots, and fine-grained RBAC auditing.`,
    },
    {
      slug: 'edge-inference-gateway',
      title: `Low-Latency ${skills[skills.length - 1]} Gateway`,
      shortDesc: `API gateway and caching proxy written in ${skills.join(', ')}.`,
      expertDesc: `Multi-region API gateway and adaptive request router built with ${skills.join(', ')}. Incorporates token-bucket rate limiting, circuit breaking, and automated canary traffic splitting.`,
    },
  ];

  const results = [];
  for (let p = 0; p < spec.projectCount; p++) {
    const tpl = templates[p % templates.length];
    results.push({
      title: tpl.title,
      description: spec.tier === 'EXPERT' ? tpl.expertDesc : tpl.shortDesc,
      repoUrl: `https://github.com/${spec.username}/${tpl.slug}`,
      techStack: skills.join(', '),
    });
  }
  return results;
}

async function createAndGradeAssessment(params: {
  userId: string;
  skillId: string;
  skillCatalogId: string;
  language: string;
  tier: DemoDevSeedSpec['tier'];
  seedIdx: number;
  submittedAt: Date;
  tabSwitchCount: number;
}) {
  // 1. Select 20 questions using the REAL QuestionService
  const selectedQuestions = await QuestionService.selectQuestionsForAssessment({
    userId: params.userId,
    language: params.language,
  });

  // 2. Fetch full Question rows (including correctAnswer & options) to construct userAnswers
  const qIds = selectedQuestions.map((q) => q.id);
  const dbQuestions = await prisma.question.findMany({
    where: { id: { in: qIds } },
  });
  const qMap = new Map(dbQuestions.map((q) => [q.id, q]));

  const targetCounts = getTargetCorrectCounts(params.tier, params.seedIdx);
  let easyRemaining = targetCounts.easy;
  let mediumRemaining = targetCounts.medium;
  let hardRemaining = targetCounts.hard;

  const startedAt = new Date(params.submittedAt.getTime() - 22 * 60 * 1000);

  // Create Assessment in IN_PROGRESS first
  const assessment = await prisma.assessment.create({
    data: {
      userId: params.userId,
      skillId: params.skillId,
      skillCatalogId: params.skillCatalogId,
      language: params.language,
      startedAt,
      durationSec: 1800,
      status: 'IN_PROGRESS',
      tabSwitchCount: params.tabSwitchCount,
    },
  });

  const scoreInputs: QuestionScoreInput[] = [];

  for (let idx = 0; idx < selectedQuestions.length; idx++) {
    const sq = selectedQuestions[idx];
    const fullQ = qMap.get(sq.id)!;

    let shouldBeCorrect = false;
    if (fullQ.difficulty === 'EASY' && easyRemaining > 0) {
      shouldBeCorrect = true;
      easyRemaining--;
    } else if (fullQ.difficulty === 'MEDIUM' && mediumRemaining > 0) {
      shouldBeCorrect = true;
      mediumRemaining--;
    } else if (fullQ.difficulty === 'HARD' && hardRemaining > 0) {
      shouldBeCorrect = true;
      hardRemaining--;
    }

    const userAnswer = shouldBeCorrect
      ? fullQ.correctAnswer
      : getWrongAnswerJson(fullQ.options, fullQ.correctAnswer);

    // Grade answer with the REAL ScoringService.isAnswerCorrect
    const isCorrect = ScoringService.isAnswerCorrect(userAnswer, fullQ.correctAnswer);

    await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        questionId: fullQ.id,
        order: idx + 1,
        userAnswer,
        isCorrect,
        timeTakenSec: 35 + ((idx * 7) % 45),
      },
    });

    scoreInputs.push({
      questionId: fullQ.id,
      difficulty: fullQ.difficulty,
      topic: fullQ.topic,
      userAnswer,
      correctAnswer: fullQ.correctAnswer,
      isCorrect,
    });
  }

  // Count prior submitted attempts for this skill
  const priorSubmittedCount = await prisma.assessment.count({
    where: {
      userId: params.userId,
      skillId: params.skillId,
      status: 'SUBMITTED',
    },
  });

  // 3. Grade assessment using the REAL ScoringService.calculateScore
  const scoreResult = ScoringService.calculateScore(scoreInputs, priorSubmittedCount + 1);

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      status: 'SUBMITTED',
      submittedAt: params.submittedAt,
      scorePercent: scoreResult.scorePercent,
      weightedPercent: scoreResult.weightedPercent,
      level: scoreResult.level,
      topicBreakdown: JSON.stringify(scoreResult.topicBreakdown),
      coverage: JSON.stringify(scoreResult.coverage),
      confidence: scoreResult.confidence,
    },
  });

  // 4. Update Skill record through normal grading logic if passed (weightedPercent >= 40)
  const currentSkill = await prisma.skill.findUnique({ where: { id: params.skillId } });
  if (scoreResult.passed && currentSkill) {
    const newBestScore =
      currentSkill.bestScore === null || currentSkill.bestScore === undefined
        ? scoreResult.weightedPercent
        : Math.max(currentSkill.bestScore, scoreResult.weightedPercent);
    const expiresAt = new Date(params.submittedAt.getTime() + 180 * 24 * 60 * 60 * 1000);

    await prisma.skill.update({
      where: { id: params.skillId },
      data: {
        status: 'VERIFIED',
        bestScore: newBestScore,
        verifiedAt: params.submittedAt,
        expiresAt,
      },
    });
  }

  return scoreResult;
}

async function main() {
  const totalDemoCount = EXPERTS + INTERMEDIATE + BEGINNERS;
  console.log(
    `🌱 Starting idempotent SkillProof seed: EXPERTS=${EXPERTS}, INTERMEDIATE=${INTERMEDIATE}, BEGINNERS=${BEGINNERS} (Total=${totalDemoCount})...`
  );

  // 0. Ensure any legacy demo accounts (@demo.com, @skillproof.dev except admin@skillproof.dev) are marked isDemo=true, then delete ONLY isDemo=true users
  const legacyDemoEmails = [
    'arjun@demo.com',
    'priya@demo.com',
    'karthik@demo.com',
    'sneha@demo.com',
    'arjun@skillproof.dev',
    'priya@skillproof.dev',
    'marcus@skillproof.dev',
    'elena@skillproof.dev',
    'alex@skillproof.dev',
    'sarah.dev@skillproof.dev',
    'raj@skillproof.dev',
    'maya@skillproof.dev',
    'kenji@skillproof.dev',
    'chloe@skillproof.dev',
  ];

  await prisma.user.updateMany({
    where: {
      OR: [
        { email: { in: legacyDemoEmails } },
        { email: { endsWith: '@demo.skillproof.test' } },
      ],
    },
    data: { isDemo: true },
  });

  const existingDemoUsers = await prisma.user.findMany({
    where: { isDemo: true },
    select: { id: true },
  });
  const demoUserIds = existingDemoUsers.map((u) => u.id);

  if (demoUserIds.length > 0) {
    console.log(`🧹 Removing ${demoUserIds.length} existing isDemo=true users and their cascading records...`);
    await prisma.auditLog.deleteMany({ where: { actorId: { in: demoUserIds } } });
    await prisma.user.deleteMany({ where: { isDemo: true } });
  }

  // Clean old generated cert_*.pdf files in uploads/certificates
  const serverCertDir = path.resolve(process.cwd(), 'uploads/certificates');
  const rootCertDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || '../uploads', 'certificates');
  const certDirs = Array.from(new Set([serverCertDir, rootCertDir]));

  for (const dir of certDirs) {
    fs.mkdirSync(dir, { recursive: true });
    for (const file of fs.readdirSync(dir)) {
      if (file.startsWith('cert_') && file.endsWith('.pdf')) {
        try {
          fs.unlinkSync(path.join(dir, file));
        } catch {
          // ignore
        }
      }
    }
  }

  // 1. Upsert Admin and Recruiter accounts (isDemo = false) without touching real developer accounts
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const recruiterPasswordHash = await bcrypt.hash('Recruiter@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@skillproof.dev' },
    update: { isDemo: false, role: 'ADMIN', status: 'ACTIVE' },
    create: {
      name: 'Admin Director',
      username: 'admin_director',
      email: 'admin@skillproof.dev',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      isDemo: false,
    },
  });

  await prisma.user.upsert({
    where: { email: 'recruiter@techcorp.com' },
    update: { isDemo: false, role: 'RECRUITER', status: 'ACTIVE' },
    create: {
      name: 'Sarah Jenkins',
      username: 'sarah_jenkins',
      email: 'recruiter@techcorp.com',
      passwordHash: recruiterPasswordHash,
      role: 'RECRUITER',
      status: 'ACTIVE',
      isDemo: false,
    },
  });

  // 2. Upsert Tracks, SkillCatalogs, and Topics
  console.log(`🗺️ Upserting ${SEED_TRACKS.length} Tracks, 9 SkillCatalogs, and 45 Topics...`);
  const catalogMap: Record<string, any> = {};
  const topicMap: Record<string, Record<string, any>> = {};

  for (const trackDef of SEED_TRACKS) {
    const track = await prisma.track.upsert({
      where: { name: trackDef.name },
      update: { description: trackDef.description },
      create: {
        name: trackDef.name,
        description: trackDef.description,
      },
    });

    for (const skillDef of trackDef.skills) {
      const skillCatalog = await prisma.skillCatalog.upsert({
        where: { name: skillDef.name },
        update: {
          trackId: track.id,
          slug: skillDef.slug,
          description: skillDef.description,
          durationSec: skillDef.durationSec,
          questionCount: skillDef.questionCount,
        },
        create: {
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
        const topic = await prisma.topic.upsert({
          where: {
            skillCatalogId_name: {
              skillCatalogId: skillCatalog.id,
              name: topicDef.name,
            },
          },
          update: { weightPercent: topicDef.weightPercent },
          create: {
            skillCatalogId: skillCatalog.id,
            name: topicDef.name,
            weightPercent: topicDef.weightPercent,
          },
        });
        topicMap[skillDef.name][topicDef.name] = topic;
      }
    }
  }

  // 3. Ensure every skill has >= 65 active questions
  const allSeedQuestions = [
    ...javascriptQuestions,
    ...pythonQuestions,
    ...javaQuestions,
    ...generateAllCatalogQuestions(),
  ];

  const existingPrompts = new Set(
    (await prisma.question.findMany({ select: { prompt: true } })).map((q) => q.prompt)
  );

  let insertedQuestions = 0;
  for (const q of allSeedQuestions) {
    if (existingPrompts.has(q.prompt)) continue;
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
    existingPrompts.add(q.prompt);
    insertedQuestions++;
  }
  console.log(`📚 Question Bank ready (${insertedQuestions} new questions added; all 9 skills >= 65 active questions).`);

  // 4. Hash shared demo password ONCE with bcrypt
  const sharedDemoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 5. Build and seed 60 Demo Developers
  const specs = buildDemoSpecs();
  const now = new Date();

  let totalCertificatesGenerated = 0;
  let totalProjectsCreated = 0;
  let totalAssessmentsCreated = 0;

  for (const spec of specs) {
    const createdAt = new Date(now.getTime() - (190 - spec.index * 2) * 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name: spec.name,
        username: spec.username,
        email: spec.email,
        passwordHash: sharedDemoPasswordHash,
        role: 'DEVELOPER',
        status: 'ACTIVE',
        isDemo: true,
        createdAt,
        profile: {
          create: {
            bio: spec.bio,
            githubUrl: `https://github.com/${spec.username}`,
            publicSlug: spec.username,
            isPublic: true,
            showOnLeaderboard: true,
          },
        },
      },
    });

    // Combine assessed skills + optional extra CLAIMED skill
    const allDevSkills: Array<{ name: string; isAssessed: boolean }> = [
      ...spec.assessedSkills.map((name) => ({ name, isAssessed: true })),
      ...(spec.extraClaimedSkill ? [{ name: spec.extraClaimedSkill, isAssessed: false }] : []),
    ];

    let certsAssignedForDev = 0;

    for (let sIdx = 0; sIdx < allDevSkills.length; sIdx++) {
      const skillEntry = allDevSkills[sIdx];
      const catalog = catalogMap[skillEntry.name];

      // Beginners usually overclaim (e.g., claiming Advanced or Expert when earning Basic or Beginner)
      let claimedLevel: string;
      if (spec.tier === 'EXPERT') {
        claimedLevel = 'Expert';
      } else if (spec.tier === 'INTERMEDIATE') {
        claimedLevel = sIdx % 2 === 0 ? 'Advanced' : 'Intermediate';
      } else {
        // Beginner overclaiming!
        claimedLevel = sIdx % 2 === 0 ? 'Expert' : 'Advanced';
      }

      // Attach generated sample PDF certificate for the first `spec.certificateCount` skills (1..3 per dev)
      let certificateUrl: string | null = null;
      if (certsAssignedForDev < spec.certificateCount) {
        const issueDate = new Date(
          now.getTime() - (150 - ((spec.index * 3 + sIdx * 11) % 120)) * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10);
        const issuer = CERT_ISSUERS[(spec.index + sIdx) % CERT_ISSUERS.length];
        certificateUrl = generateCertificateFile(certDirs, {
          developerName: spec.name,
          username: spec.username,
          skillName: skillEntry.name,
          issuer,
          issueDate,
        });
        certsAssignedForDev++;
        totalCertificatesGenerated++;
      }

      const skillRecord = await prisma.skill.create({
        data: {
          userId: user.id,
          skillCatalogId: catalog.id,
          language: skillEntry.name,
          claimedLevel,
          certificateUrl,
          status: 'CLAIMED',
        },
      });

      if (skillEntry.isAssessed) {
        // Vary submittedAt over the last 6 months (1..175 days ago)
        const daysAgo = 3 + ((spec.index * 7 + sIdx * 19) % 170);
        const finalSubmittedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const tabSwitchCount = (spec.index + sIdx) % 3; // 0, 1, or 2

        // Give some developers 2 attempts on their first skill with an improving score
        if (spec.hasTwoAttempts && sIdx === 0) {
          const firstAttemptDate = new Date(finalSubmittedAt.getTime() - 14 * 24 * 60 * 60 * 1000);
          const earlierTier: DemoDevSeedSpec['tier'] =
            spec.tier === 'EXPERT'
              ? 'INTERMEDIATE'
              : spec.tier === 'INTERMEDIATE'
              ? 'BEGINNER_VERIFIED'
              : 'BEGINNER_CLAIMED';

          await createAndGradeAssessment({
            userId: user.id,
            skillId: skillRecord.id,
            skillCatalogId: catalog.id,
            language: skillEntry.name,
            tier: earlierTier,
            seedIdx: spec.index + 100,
            submittedAt: firstAttemptDate,
            tabSwitchCount: 1,
          });
          totalAssessmentsCreated++;
        }

        await createAndGradeAssessment({
          userId: user.id,
          skillId: skillRecord.id,
          skillCatalogId: catalog.id,
          language: skillEntry.name,
          tier: spec.tier,
          seedIdx: spec.index + sIdx,
          submittedAt: finalSubmittedAt,
          tabSwitchCount,
        });
        totalAssessmentsCreated++;
      }
    }

    // Create 2-4 Projects matching developer's skills
    const devProjects = buildProjectsForDev(spec);
    for (const proj of devProjects) {
      await prisma.project.create({
        data: {
          userId: user.id,
          title: proj.title,
          description: proj.description,
          repoUrl: proj.repoUrl,
          techStack: proj.techStack,
        },
      });
      totalProjectsCreated++;
    }
  }

  // 6. Rebuild Leaderboard from real Skill & Assessment records
  console.log('🏆 Rebuilding Leaderboard entries from real graded assessments...');
  await LeaderboardService.rebuildAll();
  const consistency = await LeaderboardService.validateConsistency();
  if (!consistency.valid) {
    throw new Error(`Leaderboard consistency check failed: ${consistency.issues.join('; ')}`);
  }

  // 6b. Backfill DeveloperInterest rows from all VERIFIED skills
  const backfillRes = await OpeningService.backfillInterestsFromVerifiedSkills();
  console.log(
    `🎯 DeveloperInterests backfilled from verified skills (${backfillRes.createdInterests} new interests created).`
  );

  // 6c. Ensure non-demo recruiter (Sarah Jenkins) has a verified RecruiterProfile
  const sarahRecruiter = await prisma.user.findUnique({
    where: { email: 'recruiter@techcorp.com' },
  });
  if (sarahRecruiter) {
    await prisma.recruiterProfile.upsert({
      where: { userId: sarahRecruiter.id },
      update: { isVerified: true, verifiedAt: now },
      create: {
        userId: sarahRecruiter.id,
        companyName: 'TechCorp Global',
        jobTitle: 'VP of Engineering Talent',
        companyWebsite: 'https://techcorp.example.com',
        linkedinUrl: 'https://linkedin.com/in/sarah-jenkins',
        bio: 'Leading technical recruiting for distributed systems, AI, and frontend platform teams.',
        isVerified: true,
        verifiedAt: now,
      },
    });
  }

  // 6d. Seed 5 Demo Recruiters (isVerified = true, isDemo = true) and 9 Hiring Openings across tracks
  const demoRecruitersSpec = [
    {
      name: 'Claire Vance',
      username: 'claire_stripe',
      email: 'rec001@demo.skillproof.test',
      companyName: 'Stripe FinTech Labs',
      jobTitle: 'Staff Technical Recruiter',
      companyWebsite: 'https://stripe.example.com',
      linkedinUrl: 'https://linkedin.com/in/claire-vance-recruiter',
      bio: 'Recruiting backend, core Java, and distributed payment engineers.',
    },
    {
      name: 'David Chen',
      username: 'david_anthropic',
      email: 'rec002@demo.skillproof.test',
      companyName: 'Nexus AI Research',
      jobTitle: 'Head of AI Talent',
      companyWebsite: 'https://nexus-ai.example.com',
      linkedinUrl: 'https://linkedin.com/in/david-chen-ai',
      bio: 'Hiring LLM Prompting, RAG, and GenAI systems engineers.',
    },
    {
      name: 'Elena Martinez',
      username: 'elena_databricks',
      email: 'rec003@demo.skillproof.test',
      companyName: 'DataScale Cloud',
      jobTitle: 'Principal ML Recruiter',
      companyWebsite: 'https://datascale.example.com',
      linkedinUrl: 'https://linkedin.com/in/elena-martinez-ml',
      bio: 'Building world-class Python and Data Engineering pipelines teams.',
    },
    {
      name: 'Marcus Sterling',
      username: 'marcus_vercel',
      email: 'rec004@demo.skillproof.test',
      companyName: 'PixelCraft UI',
      jobTitle: 'Frontend Talent Partner',
      companyWebsite: 'https://pixelcraft.example.com',
      linkedinUrl: 'https://linkedin.com/in/marcus-sterling-ui',
      bio: 'Hiring design-obsessed React, JavaScript, and CSS Architecture engineers.',
    },
    {
      name: 'Sonia Kapoor',
      username: 'sonia_cloudflare',
      email: 'rec005@demo.skillproof.test',
      companyName: 'EdgeNet Systems',
      jobTitle: 'Senior Engineering Recruiter',
      companyWebsite: 'https://edgenet.example.com',
      linkedinUrl: 'https://linkedin.com/in/sonia-kapoor-edge',
      bio: 'Recruiting Core Algorithms, Java, and Full-Stack infrastructure engineers.',
    },
  ];

  const createdDemoRecruiters = [];
  for (const rSpec of demoRecruitersSpec) {
    const recUser = await prisma.user.create({
      data: {
        name: rSpec.name,
        username: rSpec.username,
        email: rSpec.email,
        passwordHash: sharedDemoPasswordHash,
        role: 'RECRUITER',
        status: 'ACTIVE',
        isDemo: true,
        recruiterProfile: {
          create: {
            companyName: rSpec.companyName,
            jobTitle: rSpec.jobTitle,
            companyWebsite: rSpec.companyWebsite,
            linkedinUrl: rSpec.linkedinUrl,
            bio: rSpec.bio,
            isVerified: true,
            verifiedAt: now,
          },
        },
      },
    });
    createdDemoRecruiters.push(recUser);
  }

  const allTracks = await prisma.track.findMany();
  const trackByName = new Map(allTracks.map((t) => [t.name, t]));

  const demoOpeningsSpec = [
    {
      recruiterIdx: 0,
      title: 'Senior Distributed Systems Engineer (Java)',
      description:
        'Architect low-latency settlement services and high-availability ledger infrastructure with strict correctness guarantees.',
      trackName: 'Core',
      locationType: 'REMOTE' as const,
      location: 'San Francisco, CA / Remote',
      minLevel: 'Intermediate',
      skills: [
        { name: 'Java', minScore: 60 },
        { name: 'Algorithms & Data Structures', minScore: 60 },
      ],
    },
    {
      recruiterIdx: 0,
      title: 'Full-Stack Payments Engineer (JavaScript & React)',
      description:
        'Build merchant checkout experiences and real-time billing dashboards used by millions of businesses globally.',
      trackName: 'UI/Frontend',
      locationType: 'HYBRID' as const,
      location: 'New York, NY',
      minLevel: 'Basic',
      skills: [
        { name: 'JavaScript', minScore: 50 },
        { name: 'React', minScore: 50 },
      ],
    },
    {
      recruiterIdx: 1,
      title: 'Staff Applied AI Engineer (RAG & Agents)',
      description:
        'Design production retrieval-augmented generation pipelines, evaluation harnesses, and multi-step tool-use agents.',
      trackName: 'AI Engineer',
      locationType: 'REMOTE' as const,
      location: 'Remote (Global)',
      minLevel: 'Intermediate',
      skills: [
        { name: 'LLM Prompting & RAG', minScore: 60 },
        { name: 'GenAI Engineering', minScore: 60 },
      ],
    },
    {
      recruiterIdx: 1,
      title: 'AI Platform Python Engineer',
      description:
        'Scale asynchronous inference gateways, vector indexing workers, and model telemetry services in Python.',
      trackName: 'AI Engineer',
      locationType: 'HYBRID' as const,
      location: 'San Francisco, CA',
      minLevel: 'Basic',
      skills: [
        { name: 'Python', minScore: 50 },
        { name: 'LLM Prompting & RAG', minScore: 45 },
      ],
    },
    {
      recruiterIdx: 2,
      title: 'Principal Data & ML Platform Engineer',
      description:
        'Build petabyte-scale lakehouse ingestion engines, feature stores, and distributed Python data pipelines.',
      trackName: 'ML Engineer',
      locationType: 'REMOTE' as const,
      location: 'Seattle, WA / Remote',
      minLevel: 'Intermediate',
      skills: [
        { name: 'Python', minScore: 65 },
        { name: 'Data Engineering', minScore: 60 },
      ],
    },
    {
      recruiterIdx: 2,
      title: 'Analytics & ETL Pipeline Engineer',
      description:
        'Develop reliable streaming ETL jobs, data quality monitors, and warehouse modeling workflows.',
      trackName: 'ML Engineer',
      locationType: 'REMOTE' as const,
      location: 'Austin, TX / Remote',
      minLevel: 'Basic',
      skills: [{ name: 'Data Engineering', minScore: 45 }],
    },
    {
      recruiterIdx: 3,
      title: 'Lead Design Systems & React Architect',
      description:
        'Own our component library, accessibility standards, CSS token architecture, and zero-runtime styling performance.',
      trackName: 'UI/Frontend',
      locationType: 'REMOTE' as const,
      location: 'Remote',
      minLevel: 'Intermediate',
      skills: [
        { name: 'React', minScore: 65 },
        { name: 'CSS Architecture', minScore: 60 },
      ],
    },
    {
      recruiterIdx: 3,
      title: 'Frontend Performance Engineer (JavaScript)',
      description:
        'Optimize Core Web Vitals, bundle splitting, state synchronization, and browser rendering pipelines.',
      trackName: 'UI/Frontend',
      locationType: 'HYBRID' as const,
      location: 'London, UK',
      minLevel: 'Basic',
      skills: [{ name: 'JavaScript', minScore: 55 }],
    },
    {
      recruiterIdx: 4,
      title: 'Core Runtime & Algorithms Engineer',
      description:
        'Implement high-performance routing algorithms, concurrent caching structures, and edge compute primitives.',
      trackName: 'Core',
      locationType: 'REMOTE' as const,
      location: 'Bengaluru / Remote',
      minLevel: 'Intermediate',
      skills: [{ name: 'Algorithms & Data Structures', minScore: 60 }],
    },
  ];

  let totalMatchedNotifications = 0;
  for (const opSpec of demoOpeningsSpec) {
    const recUser = createdDemoRecruiters[opSpec.recruiterIdx];
    const track = trackByName.get(opSpec.trackName);
    const expiresAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

    const opening = await prisma.opening.create({
      data: {
        recruiterId: recUser.id,
        title: opSpec.title,
        description: opSpec.description,
        trackId: track!.id,
        minLevel: opSpec.minLevel,
        minScore: opSpec.skills[0]?.minScore ?? 55,
        positions: 2,
        status: 'ACTIVE',
        expiresAt,
        skills: {
          create: opSpec.skills.map((s) => ({
            skillCatalogId: catalogMap[s.name].id,
          })),
        },
      },
    });

    const notifyRes = await NotificationService.notifyMatches(opening.id);
    totalMatchedNotifications += notifyRes.notifiedCount;
  }

  console.log(
    `📢 Seeded ${createdDemoRecruiters.length} verified demo recruiters and ${demoOpeningsSpec.length} active openings (${totalMatchedNotifications} developer match notifications generated from real DB query).`
  );

  // 7. Print summary table
  const demoUsers = await prisma.user.findMany({
    where: { isDemo: true, role: 'DEVELOPER' },
    include: {
      skills: { include: { assessments: { where: { status: 'SUBMITTED' } } } },
      projects: true,
    },
    orderBy: { email: 'asc' },
  });

  const summaryRows = [
    {
      Tier: 'Expert (90-100% & >=60% Hard)',
      Developers: EXPERTS,
      VerifiedSkillsRange: '3-4 verified',
      TotalVerifiedSkills: demoUsers
        .slice(0, EXPERTS)
        .reduce((acc, u) => acc + u.skills.filter((s) => s.status === 'VERIFIED').length, 0),
      Certificates: demoUsers
        .slice(0, EXPERTS)
        .reduce((acc, u) => acc + u.skills.filter((s) => Boolean(s.certificateUrl)).length, 0),
      Projects: demoUsers.slice(0, EXPERTS).reduce((acc, u) => acc + u.projects.length, 0),
    },
    {
      Tier: 'Intermediate (60-74%)',
      Developers: INTERMEDIATE,
      VerifiedSkillsRange: '2-3 verified',
      TotalVerifiedSkills: demoUsers
        .slice(EXPERTS, EXPERTS + INTERMEDIATE)
        .reduce((acc, u) => acc + u.skills.filter((s) => s.status === 'VERIFIED').length, 0),
      Certificates: demoUsers
        .slice(EXPERTS, EXPERTS + INTERMEDIATE)
        .reduce((acc, u) => acc + u.skills.filter((s) => Boolean(s.certificateUrl)).length, 0),
      Projects: demoUsers
        .slice(EXPERTS, EXPERTS + INTERMEDIATE)
        .reduce((acc, u) => acc + u.projects.length, 0),
    },
    {
      Tier: 'Beginner Verified (40-59% Basic)',
      Developers: 22,
      VerifiedSkillsRange: '1-2 verified',
      TotalVerifiedSkills: demoUsers
        .slice(EXPERTS + INTERMEDIATE, EXPERTS + INTERMEDIATE + 22)
        .reduce((acc, u) => acc + u.skills.filter((s) => s.status === 'VERIFIED').length, 0),
      Certificates: demoUsers
        .slice(EXPERTS + INTERMEDIATE, EXPERTS + INTERMEDIATE + 22)
        .reduce((acc, u) => acc + u.skills.filter((s) => Boolean(s.certificateUrl)).length, 0),
      Projects: demoUsers
        .slice(EXPERTS + INTERMEDIATE, EXPERTS + INTERMEDIATE + 22)
        .reduce((acc, u) => acc + u.projects.length, 0),
    },
    {
      Tier: 'Beginner Claimed-Only (20-39%)',
      Developers: 8,
      VerifiedSkillsRange: '0 verified (CLAIMED)',
      TotalVerifiedSkills: demoUsers
        .slice(EXPERTS + INTERMEDIATE + 22)
        .reduce((acc, u) => acc + u.skills.filter((s) => s.status === 'VERIFIED').length, 0),
      Certificates: demoUsers
        .slice(EXPERTS + INTERMEDIATE + 22)
        .reduce((acc, u) => acc + u.skills.filter((s) => Boolean(s.certificateUrl)).length, 0),
      Projects: demoUsers
        .slice(EXPERTS + INTERMEDIATE + 22)
        .reduce((acc, u) => acc + u.projects.length, 0),
    },
  ];

  console.log('\n================================================================================');
  console.log('📊 SKILLPROOF DEMO DEVELOPER SEED SUMMARY');
  console.log('================================================================================');
  console.table(summaryRows);
  console.log(`🔑 Shared Demo Password (for dev001..dev060@demo.skillproof.test): ${DEMO_PASSWORD}`);
  console.log(`📄 Total Generated Sample PDF Certificates: ${totalCertificatesGenerated}`);
  console.log(`📁 Total Demo Projects Created: ${totalProjectsCreated}`);
  console.log(`📝 Total Graded Assessments Created: ${totalAssessmentsCreated}`);
  console.log('================================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
