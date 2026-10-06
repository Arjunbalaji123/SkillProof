import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../utils/jwt.js';
import { calculateProfileCompletion } from '../utils/completion.js';
import { AppError } from '../errors/AppError.js';
import { verifyResourceOwnership } from '../middleware/ownership.js';

async function runBackendTests() {
  console.log('🧪 Starting SKILLPROOF Backend Integration Tests...');

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      testPassed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      testFailed++;
    }
  }

  try {
    // 1. JWT & Password Hashing Test
    const plainPass = 'TestPass123!';
    const hash = await bcrypt.hash(plainPass, 10);
    const passMatches = await bcrypt.compare(plainPass, hash);
    assert(passMatches, 'Bcrypt password hashing & comparison verification');

    const payload = { userId: 'test-user-id', email: 'test@skillproof.dev', role: 'DEVELOPER' };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    assert(decoded.userId === payload.userId && decoded.role === 'DEVELOPER', 'JWT sign & verify payload token test');

    // 2. Database User & Profile Query Test
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@skillproof.dev' },
      include: { profile: true },
    });
    assert(admin !== null && admin.role === 'ADMIN', 'Seeded Admin account query test');

    const developer = await prisma.user.findUnique({
      where: { email: 'arjun@skillproof.dev' },
      include: { profile: true },
    });
    assert(developer !== null && developer.profile?.username === 'arjun', 'Seeded Developer Arjun profile query test');

    // 3. Profile Completion Engine Test
    if (developer?.profile) {
      const completion = await calculateProfileCompletion(developer.profile.id);
      assert(completion > 50, `Dynamic Profile Completion calculated: ${completion}%`);
    }

    // 4. Skill Verification Engine Test
    const reactSkill = await prisma.skill.findUnique({ where: { name: 'React' } });
    assert(reactSkill !== null, 'Skill catalog contains React master entry');

    const userSkillReact = await prisma.userSkill.findFirst({
      where: { profile_id: developer?.profile?.id, skill_id: reactSkill?.id },
    });
    assert(userSkillReact?.verification_status === 'VERIFIED', 'Developer React skill has status VERIFIED');

    // 5. Assessment Engine Query Test
    const reactAssessment = await prisma.assessment.findFirst({
      where: { title: 'React Technical Assessment' },
      include: { questions: { include: { options: true } } },
    });
    assert(reactAssessment !== null && reactAssessment.questions.length > 0, 'React assessment questions and options loaded');

    // 6. Recruiter Bookmarks Query Test
    const recruiter = await prisma.user.findUnique({ where: { email: 'recruiter1@techcorp.com' } });
    const bookmark = await prisma.recruiterBookmark.findFirst({
      where: { recruiter_id: recruiter?.id, developer_id: developer?.id },
    });
    assert(bookmark !== null, 'Recruiter bookmark relationship retrieved');

    // 7. AppError Central Error Handling Test
    const testAppErr = AppError.forbidden('Forbidden access');
    assert(testAppErr.statusCode === 403 && testAppErr.isOperational === true, 'AppError 403 status code and operational flag verification');

    const testNotFoundErr = AppError.notFound('Not found');
    assert(testNotFoundErr.statusCode === 404, 'AppError 404 helper method verification');

    // 8. Resource Ownership Check Test
    if (developer?.id) {
      const mockRes: any = {
        status: function (code: number) { this.statusCode = code; return this; },
        json: function (data: any) { this.responseData = data; return this; },
      };
      
      // Test ownership check on non-existent project returns 404
      const nonExistentResult = await verifyResourceOwnership('project', 'non-existent-id', developer.id, mockRes);
      assert(nonExistentResult === null && mockRes.statusCode === 404, 'Ownership check on non-existent resource returns 404');
    }

    // 9. Database Health Check Verification Test
    const dbPing = await prisma.$queryRaw`SELECT 1`;
    assert(Array.isArray(dbPing) && dbPing.length > 0, 'Database health check query raw ping (SELECT 1) verification');

    // 10. Admin Self-Registration Block Verification
    const { registerSchema, userSkillSchema, updateProfileSchema } = await import('../validators/index.js');
    const adminRegResult = registerSchema.safeParse({ name: 'Hacker', email: 'hacker@dev.com', password: 'password123', role: 'ADMIN' });
    assert(!adminRegResult.success, 'Register schema rejects direct ADMIN role submission');

    // 11. Email Normalization Verification
    const emailNormResult = registerSchema.parse({ name: 'Norm User', email: '  UserEmail@Domain.COM  ', password: 'password123' });
    assert(emailNormResult.email === 'useremail@domain.com', 'Register schema normalizes email to lowercase trimmed string');

    // 12. Stored XSS / Safe URL Schema Verification
    const xssUrlResult = updateProfileSchema.safeParse({ github_url: 'javascript:alert(1)' });
    assert(!xssUrlResult.success, 'Update profile schema rejects malicious javascript: URL protocol');

    // 13. Skill Proficiency Enum Validation
    const invalidSkillLevel = userSkillSchema.safeParse({ proficiency_level: 'SUPER_EXPERT' });
    assert(!invalidSkillLevel.success, 'User skill schema rejects invalid proficiency enum value');

    // 14. Dynamic Verification Quiz Generation Test
    const { getOrCreateSkillAssessment } = await import('../controllers/assessmentsController.js');
    if (reactSkill?.id) {
      const dynamicAssessment = await getOrCreateSkillAssessment(reactSkill.id);
      assert(dynamicAssessment !== null && dynamicAssessment.questions.length > 0, 'Dynamic assessment question pool generated for skill');
    }

    console.log('\n==========================================');
    console.log(`📊 TEST RESULTS: ${testPassed} Passed, ${testFailed} Failed`);
    console.log('==========================================\n');

    if (testFailed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test suite crashed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackendTests();

