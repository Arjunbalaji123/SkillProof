import { prisma } from '../config/db.js';

export async function validateQuestions() {
  console.log('🔍 Running Question Validation Engine...');

  const questions = await prisma.question.findMany({
    include: {
      skillCatalog: true,
      topicRelation: true,
    },
  });

  console.log(`📊 Total questions loaded from database: ${questions.length}`);

  let errors = 0;
  const topicCounts: Record<string, Record<string, number>> = {};

  for (const q of questions) {
    const qLabel = `[ID: ${q.id} | ${q.language} | ${q.topic}]`;

    // 1. Topic validation
    if (!q.topic || q.topic.trim().length === 0) {
      console.error(`❌ ${qLabel} Missing topic name`);
      errors++;
    }

    // 2. Explanation validation
    if (!q.explanation || q.explanation.trim().length === 0) {
      console.error(`❌ ${qLabel} Missing explanation`);
      errors++;
    }

    // 3. Prompt validation
    if (!q.prompt || q.prompt.trim().length === 0) {
      console.error(`❌ ${qLabel} Missing prompt`);
      errors++;
    }

    // 4. Correct answer validation (must be canonical non-empty array)
    let parsedCorrect: string[] = [];
    try {
      const parsed = JSON.parse(q.correctAnswer);
      if (Array.isArray(parsed)) {
        parsedCorrect = parsed.map(String).map((s) => s.trim()).filter(Boolean);
      } else if (parsed) {
        parsedCorrect = [String(parsed).trim()];
      }
    } catch {
      if (q.correctAnswer && q.correctAnswer.trim()) {
        parsedCorrect = [q.correctAnswer.trim()];
      }
    }

    if (parsedCorrect.length === 0) {
      console.error(`❌ ${qLabel} Correct answer is empty or invalid: "${q.correctAnswer}"`);
      errors++;
    }

    // 5. Options validation
    let parsedOptions: string[] = [];
    try {
      parsedOptions = JSON.parse(q.options);
      if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
        console.error(`❌ ${qLabel} Options array has fewer than 2 choices: "${q.options}"`);
        errors++;
      }
    } catch {
      console.error(`❌ ${qLabel} Options is not valid JSON array: "${q.options}"`);
      errors++;
    }

    // Track counts per skill and topic
    const lang = q.language || 'Unknown';
    if (!topicCounts[lang]) topicCounts[lang] = {};
    topicCounts[lang][q.topic] = (topicCounts[lang][q.topic] || 0) + 1;
  }

  console.log('\n📈 Question Pool Breakdown by Skill & Topic:');
  for (const [lang, topics] of Object.entries(topicCounts)) {
    console.log(`\n  Skill: ${lang}`);
    for (const [topic, count] of Object.entries(topics)) {
      const statusIcon = count >= 15 ? '✅' : '⚠️';
      console.log(`    ${statusIcon} ${topic}: ${count} questions`);
    }
  }

  // Check template skills (JavaScript and Python) have 15+ per topic
  for (const targetSkill of ['JavaScript', 'Python']) {
    const topics = topicCounts[targetSkill] || {};
    const topicList = Object.keys(topics);
    if (topicList.length < 5) {
      console.error(`❌ ${targetSkill} should have at least 5 topics, found ${topicList.length}`);
      errors++;
    }
    for (const [t, count] of Object.entries(topics)) {
      if (count < 15) {
        console.error(`❌ ${targetSkill} topic "${t}" has only ${count} questions (minimum 15 required)`);
        errors++;
      }
    }
  }

  console.log('\n========================================');
  if (errors === 0) {
    console.log('🎉 QUESTION VALIDATION PASSED: All questions are structurally sound and meet pool thresholds!');
    console.log('========================================\n');
  } else {
    console.error(`❌ QUESTION VALIDATION FAILED: Found ${errors} error(s).`);
    console.log('========================================\n');
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('validateQuestions.ts') || process.argv[1]?.endsWith('validateQuestions.js')) {
  validateQuestions()
    .catch((err) => {
      console.error('Fatal validation error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

