process.env.NODE_ENV = 'test';
process.env.PORT = '5009';
import assert from 'assert';
import http from 'http';
import app from '../app.js';
import { prisma } from '../config/db.js';

interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: any;
  cookie?: string;
}

function makeRequest(server: http.Server, options: RequestOptions): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders; cookies: string[] }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: address.port,
        method: options.method,
        path: options.path,
        headers: {
          'Content-Type': 'application/json',
          ...(options.cookie ? { Cookie: options.cookie } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { raw };
          }
          const cookies = res.headers['set-cookie'] || [];
          resolve({
            status: res.statusCode || 500,
            body: parsed,
            headers: res.headers,
            cookies: Array.isArray(cookies) ? cookies : [cookies],
          });
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runEndToEndVerification() {
  console.log('🚀 Running Requirement 8 End-to-End Verification...');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  console.log(`📡 In-process test server listening on port ${port}`);

  try {
    // 1. Admin Login
    console.log('\nStep 1: Admin Login');
    const adminLoginRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'admin@skillproof.dev', password: 'Admin@123' },
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login should succeed');
    const adminCookie = adminLoginRes.cookies.find((c) => c.startsWith('token='))?.split(';')[0] || '';
    assert(adminCookie, 'Admin session cookie must be received');
    console.log('  ✅ Admin authenticated successfully');

    // 2. Fetch Catalog and get or create a Track
    console.log('\nStep 2: Catalog and Track Inspection');
    const catalogRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/catalog',
      cookie: adminCookie,
    });
    assert.strictEqual(catalogRes.status, 200);
    assert(Array.isArray(catalogRes.body.data), 'Catalog data should be an array of tracks');
    
    let track = catalogRes.body.data[0];
    if (!track) {
      const newTrackRes = await makeRequest(server, {
        method: 'POST',
        path: '/api/admin/tracks',
        cookie: adminCookie,
        body: { name: 'Backend Engineering', description: 'Server and systems architecture' },
      });
      track = newTrackRes.body.data;
    }
    console.log(`  ✅ Using Track: "${track.name}" (${track.id})`);

    // Clean up any previous test skill named "GoLang"
    const existingGo = await prisma.skillCatalog.findFirst({
      where: { name: 'GoLang' },
      include: { topics: true },
    });
    if (existingGo) {
      await prisma.assessmentQuestion.deleteMany({
        where: { assessment: { language: 'GoLang' } },
      });
      await prisma.assessment.deleteMany({
        where: { language: 'GoLang' },
      });
      await prisma.skill.deleteMany({
        where: { language: 'GoLang' },
      });
      await prisma.question.deleteMany({
        where: { OR: [{ skillCatalogId: existingGo.id }, { language: 'GoLang' }] },
      });
      await prisma.topic.deleteMany({
        where: { skillCatalogId: existingGo.id },
      });
      await prisma.skillCatalog.delete({
        where: { id: existingGo.id },
      });
    }

    // 3. Add a New Skill via Admin Panel
    console.log('\nStep 3: Admin adds a new Skill ("GoLang")');
    const newSkillRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/admin/skills',
      cookie: adminCookie,
      body: {
        trackId: track.id,
        name: 'GoLang',
        slug: 'golang',
        description: 'Systems programming with Go, goroutines, and channels',
        durationSec: 1800,
        questionCount: 20,
      },
    });
    assert.strictEqual(newSkillRes.status, 201, 'Skill creation must return 201');
    const newSkill = newSkillRes.body.data;
    console.log(`  ✅ Skill created: ${newSkill.name} (${newSkill.id})`);

    // 4. Add 4 Topics to GoLang whose weights sum strictly to 100%
    console.log('\nStep 4: Admin adds 4 topics to GoLang');
    const topicDefs = [
      { name: 'Goroutines & Concurrency', weightPercent: 30 },
      { name: 'Channels & Synchronization', weightPercent: 30 },
      { name: 'Interfaces & Type System', weightPercent: 20 },
      { name: 'Memory & Pointer Semantics', weightPercent: 20 },
    ];

    const createdTopics: any[] = [];
    for (const td of topicDefs) {
      const topRes = await makeRequest(server, {
        method: 'POST',
        path: '/api/admin/topics',
        cookie: adminCookie,
        body: {
          skillCatalogId: newSkill.id,
          name: td.name,
          weightPercent: td.weightPercent,
        },
      });
      assert.strictEqual(topRes.status, 201, `Topic ${td.name} must be created`);
      createdTopics.push(topRes.body.data);
    }
    console.log(`  ✅ Added ${createdTopics.length} topics. Total weight: 100%`);

    // 5. Check Question Pool Health: topics must be flagged isLow (< 15)
    console.log('\nStep 5: Question Pool Health check (< 15 active questions warning)');
    const poolHealthRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/pool-health',
      cookie: adminCookie,
    });
    assert.strictEqual(poolHealthRes.status, 200);
    const goTopicsHealth = poolHealthRes.body.data.filter((p: any) => p.skillName === 'GoLang');
    assert.strictEqual(goTopicsHealth.length, 4, 'Must report 4 topics for GoLang in pool health');
    assert(
      goTopicsHealth.every((t: any) => t.isLow === true && t.activeCount === 0),
      'All topics should be flagged isLow: true with 0 active questions'
    );
    console.log('  ✅ Question Pool Health correctly flagged low pool (< 15) on all 4 topics');

    // 6. Developer Login
    console.log('\nStep 6: Developer Login');
    const devLoginRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'arjun@skillproof.dev', password: 'Dev@123' },
    });
    assert.strictEqual(devLoginRes.status, 200, 'Developer login must succeed');
    const devCookie = devLoginRes.cookies.find((c) => c.startsWith('token='))?.split(';')[0] || '';
    assert(devCookie, 'Developer cookie must be received');
    console.log('  ✅ Developer authenticated');

    // 7. Verify start assessment is blocked when pool < 60 questions
    console.log('\nStep 7: Verify Assessment Initiation is Blocked (< 60 questions in pool)');
    const startBlockedRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/assessments/start',
      cookie: devCookie,
      body: { language: 'GoLang' },
    });
    assert.strictEqual(startBlockedRes.status, 400, 'Starting assessment with < 60 questions must be blocked');
    assert(
      startBlockedRes.body.message.includes('fewer than 60 active questions'),
      `Expected error message about fewer than 60 questions, got: ${startBlockedRes.body.message}`
    );
    console.log('  ✅ Assessment correctly blocked: "The question pool for GoLang has fewer than 60 active questions (found 0)"');

    // 8. Admin imports 60 questions for GoLang (15 per topic, mixed types, 6 Easy / 6 Med / 3 Hard per topic)
    console.log('\nStep 8: Admin imports 60 questions across all 4 GoLang topics');
    const importPayload: any[] = [];
    const questionTypes = ['MCQ', 'MULTI', 'CODE_OUTPUT', 'SCENARIO'];

    for (const topic of createdTopics) {
      for (let i = 1; i <= 15; i++) {
        let diff = 'EASY';
        if (i > 6 && i <= 12) diff = 'MEDIUM';
        if (i > 12) diff = 'HARD';

        const qType = questionTypes[(i - 1) % questionTypes.length];
        const prompt = `[${qType}] Question ${i} on Go topic "${topic.name}": How does Go runtime manage this behavior in concurrent execution?`;
        const options = ['Runtime scheduler', 'Kernel threads directly', 'Cooperative multitasking', 'Goroutine queue'];
        const correctAnswer = ['Runtime scheduler'];
        const explanation = `In Go, the runtime M:N scheduler multiplexes G goroutines across M OS threads.`;

        importPayload.push({
          skillCatalogId: newSkill.id,
          topicId: topic.id,
          language: 'GoLang',
          topic: topic.name,
          difficulty: diff,
          type: qType,
          prompt,
          options,
          correctAnswer,
          explanation,
        });
      }
    }
    assert.strictEqual(importPayload.length, 60, 'Must have prepared 60 questions');

    const importRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/admin/questions/import',
      cookie: adminCookie,
      body: { questions: importPayload },
    });
    assert.strictEqual(importRes.status, 201, 'Import questions must return 201');
    assert.strictEqual(importRes.body.data.count, 60, 'Imported count must be 60');
    console.log('  ✅ 60 questions successfully imported for GoLang');

    // 9. Re-check Pool Health: all topics now healthy (15 active, isLow: false)
    console.log('\nStep 9: Verify Pool Health is now Healthy');
    const updatedPoolRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/pool-health',
      cookie: adminCookie,
    });
    const goHealthy = updatedPoolRes.body.data.filter((p: any) => p.skillName === 'GoLang');
    assert(
      goHealthy.every((t: any) => t.isLow === false && t.activeCount === 15),
      'All GoLang topics must have activeCount = 15 and isLow = false'
    );
    console.log('  ✅ Question Pool Health: 4/4 topics now healthy with 15 active questions each');

    // 10. Developer starts assessment for GoLang
    console.log('\nStep 10: Developer starts Assessment for GoLang');
    const startRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/assessments/start',
      cookie: devCookie,
      body: { language: 'GoLang' },
    });
    assert.strictEqual(startRes.status, 201, 'Starting assessment must succeed');
    const assessment = startRes.body.data;
    assert.strictEqual(assessment.questions.length, 20, 'Assessment must sample exactly 20 questions');

    // Verify Blueprint Sampling distribution: 8 Easy, 8 Medium, 4 Hard
    const easyCount = assessment.questions.filter((q: any) => q.difficulty === 'EASY').length;
    const medCount = assessment.questions.filter((q: any) => q.difficulty === 'MEDIUM').length;
    const hardCount = assessment.questions.filter((q: any) => q.difficulty === 'HARD').length;
    console.log(`  Blueprint Difficulty Sample: ${easyCount} EASY, ${medCount} MEDIUM, ${hardCount} HARD`);
    assert.strictEqual(easyCount, 8, 'Must sample 8 Easy questions');
    assert.strictEqual(medCount, 8, 'Must sample 8 Medium questions');
    assert.strictEqual(hardCount, 4, 'Must sample 4 Hard questions');

    // Check Question Types included
    const typesPresent = new Set(assessment.questions.map((q: any) => q.type));
    console.log(`  Question Types in Sample: ${Array.from(typesPresent).join(', ')}`);
    assert(typesPresent.has('MCQ'), 'Should include MCQ');
    assert(typesPresent.has('MULTI'), 'Should include MULTI');
    assert(typesPresent.has('CODE_OUTPUT'), 'Should include CODE_OUTPUT');
    assert(typesPresent.has('SCENARIO'), 'Should include SCENARIO');

    // 11. Developer answers questions: answer correctly for first 3 topics, wrong for 4th topic to test weak topic detection
    console.log('\nStep 11: Developer answers questions');
    for (const q of assessment.questions) {
      let ans = 'Runtime scheduler';
      // Deliberately fail questions for 'Memory & Pointer Semantics' to verify weak topic suggestion
      if (q.topic.includes('Memory')) {
        ans = 'Wrong Answer';
      }

      const ansRes = await makeRequest(server, {
        method: 'POST',
        path: `/api/assessments/${assessment.assessmentId}/answer`,
        cookie: devCookie,
        body: {
          order: q.order,
          userAnswer: ans,
        },
      });
      assert.strictEqual(ansRes.status, 200, `Answer saving for question ${q.order} must succeed`);
    }
    console.log('  ✅ All 20 questions answered');

    // 12. Submit Assessment & Verify Topic Breakdown and Confidence
    console.log('\nStep 12: Developer submits assessment');
    const submitRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/assessments/${assessment.assessmentId}/submit`,
      cookie: devCookie,
    });
    assert.strictEqual(submitRes.status, 200, 'Assessment submission must return 200');
    const result = submitRes.body.data;

    console.log(`  Assessment Result:
    - Status: ${result.status}
    - Score: ${result.scorePercent}% (Weighted: ${result.weightedPercent}%)
    - Level: ${result.level}
    - Confidence Label: ${result.confidence}
    - Coverage: ${JSON.stringify(result.coverage)}`);

    assert.strictEqual(result.status, 'SUBMITTED');
    assert.strictEqual(result.confidence, 'Low', '1st attempt confidence must be "Low"');
    assert.strictEqual(result.coverage.attemptsCount, 1);
    assert.strictEqual(result.coverage.topicsCovered, 4);
    assert.strictEqual(result.coverage.questionsAnswered, 20);

    // Verify Topic Breakdown
    assert(result.topicBreakdown, 'topicBreakdown must be present');
    const topicsEvaluated = Object.keys(result.topicBreakdown);
    console.log(`  Topics in Breakdown (${topicsEvaluated.length}): ${topicsEvaluated.join(', ')}`);
    assert.strictEqual(topicsEvaluated.length, 4, 'Must contain stats for all 4 topics');

    // Verify Cumulative Profile with Weak Topic Study Suggestions
    assert(Array.isArray(result.cumulativeProfile), 'cumulativeProfile must be an array');
    console.log('  Cumulative Profile Summary:');
    let weakTopicFound = false;
    for (const cp of result.cumulativeProfile) {
      console.log(`    • ${cp.topic}: ${cp.accuracy}% (${cp.strength})${cp.studySuggestion ? ` -> Suggestion: "${cp.studySuggestion}"` : ''}`);
      if (cp.strength === 'Needs Focus' && cp.studySuggestion) {
        weakTopicFound = true;
      }
    }
    assert(weakTopicFound, 'Weak topic (< 60%) must have a tailored study suggestion');

    // 13. Verify Public Portfolio reflects topic strengths and verified skill
    console.log('\nStep 13: Verify Public Portfolio reflects verified GoLang skill and topic strengths');
    const portfolioRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/profile/public/arjun',
    });
    assert.strictEqual(portfolioRes.status, 200);
    const goVerified = portfolioRes.body.data.verifiedSkills.find((s: any) => s.language === 'GoLang');
    assert(goVerified, 'Public portfolio must show GoLang as verified');
    console.log(`  Portfolio GoLang: Level ${goVerified.latestLevel}, Score ${goVerified.score}%`);
    assert(Array.isArray(goVerified.topicStrengths), 'topicStrengths must be attached');
    console.log(`  Portfolio Topic Strengths: ${goVerified.topicStrengths.map((ts: any) => `${ts.topic} (${ts.strength})`).join(', ')}`);

    console.log('\n========================================');
    console.log('🎉 ALL REQUIREMENT 8 VERIFICATION CHECKS PASSED!');
    console.log('========================================\n');
  } finally {
    server.close();
  }
}

runEndToEndVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
