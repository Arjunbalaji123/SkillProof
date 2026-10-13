import { prisma } from '../config/db.js';
import { ScoringService } from '../services/scoringService.js';

async function migrateAndRegrade() {
  console.log('🔄 Starting one-time migration and re-grading...');

  // 1. Normalize Question.correctAnswer to canonical JSON array of strings
  const questions = await prisma.question.findMany();
  let migratedQuestions = 0;
  for (const q of questions) {
    let normalized: string[] = [];
    if (q.correctAnswer) {
      try {
        const parsed = JSON.parse(q.correctAnswer);
        if (Array.isArray(parsed)) {
          normalized = parsed.map(String);
        } else if (parsed !== null && parsed !== undefined) {
          normalized = [String(parsed)];
        }
      } catch {
        normalized = [q.correctAnswer];
      }
    }
    const newCorrectStr = JSON.stringify(normalized);
    if (newCorrectStr !== q.correctAnswer) {
      await prisma.question.update({
        where: { id: q.id },
        data: { correctAnswer: newCorrectStr },
      });
      migratedQuestions++;
    }
  }
  console.log(`✅ Questions normalized: ${migratedQuestions}/${questions.length}`);

  // 2. Normalize AssessmentQuestion.userAnswer to canonical JSON array of strings
  const assessmentQuestions = await prisma.assessmentQuestion.findMany({
    include: { question: true },
  });
  let migratedAnswers = 0;
  for (const aq of assessmentQuestions) {
    if (aq.userAnswer !== null && aq.userAnswer !== undefined) {
      let normalized: string[] = [];
      try {
        const parsed = JSON.parse(aq.userAnswer);
        if (Array.isArray(parsed)) {
          normalized = parsed.map(String);
        } else if (parsed !== null && parsed !== undefined) {
          normalized = [String(parsed)];
        }
      } catch {
        normalized = [aq.userAnswer];
      }

      // Check correctness with ScoringService.isAnswerCorrect
      const isCorrect = ScoringService.isAnswerCorrect(normalized, aq.question.correctAnswer);
      await prisma.assessmentQuestion.update({
        where: { id: aq.id },
        data: {
          userAnswer: JSON.stringify(normalized),
          isCorrect,
        },
      });
      migratedAnswers++;
    }
  }
  console.log(`✅ Assessment questions normalized & evaluated: ${migratedAnswers}/${assessmentQuestions.length}`);

  // 3. Re-grade all SUBMITTED assessments
  const submittedAssessments = await prisma.assessment.findMany({
    where: { status: 'SUBMITTED' },
    include: {
      questions: {
        include: { question: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  console.log(`📊 Re-grading ${submittedAssessments.length} submitted assessment attempts...`);
  for (const assessment of submittedAssessments) {
    const questionEvaluations = [];
    for (const aq of assessment.questions) {
      let parsedUser = null;
      if (aq.userAnswer) {
        try {
          parsedUser = JSON.parse(aq.userAnswer);
        } catch {
          parsedUser = aq.userAnswer;
        }
      }

      let parsedCorrect = null;
      try {
        parsedCorrect = JSON.parse(aq.question.correctAnswer);
      } catch {
        parsedCorrect = aq.question.correctAnswer;
      }

      const isCorrect = ScoringService.isAnswerCorrect(parsedUser, parsedCorrect);
      await prisma.assessmentQuestion.update({
        where: { id: aq.id },
        data: { isCorrect },
      });

      questionEvaluations.push({
        questionId: aq.questionId,
        difficulty: aq.question.difficulty,
        topic: aq.question.topic,
        userAnswer: parsedUser,
        correctAnswer: parsedCorrect,
        isCorrect,
      });
    }

    const scoreResult = ScoringService.calculateScore(questionEvaluations);

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        scorePercent: scoreResult.scorePercent,
        weightedPercent: scoreResult.weightedPercent,
        level: scoreResult.level,
        topicBreakdown: JSON.stringify(scoreResult.topicBreakdown),
      },
    });

    // Update Skill best score if passed
    if (scoreResult.passed) {
      const existingSkill = await prisma.skill.findUnique({
        where: { id: assessment.skillId },
      });
      const newBestScore = Math.max(existingSkill?.bestScore || 0, scoreResult.weightedPercent);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      await prisma.skill.update({
        where: { id: assessment.skillId },
        data: {
          status: 'VERIFIED',
          bestScore: newBestScore,
          verifiedAt: now,
          expiresAt,
        },
      });
    }

    console.log(
      `  - Assessment ${assessment.id} (${assessment.language}): score=${scoreResult.scorePercent}%, weighted=${scoreResult.weightedPercent}%, level=${scoreResult.level}`
    );
  }

  console.log('🎉 Migration and re-grading completed successfully!');
}

migrateAndRegrade()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
