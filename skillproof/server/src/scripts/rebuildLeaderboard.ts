import { LeaderboardService } from '../services/leaderboardService.js';
import { prisma } from '../config/db.js';

async function main() {
  console.log('🚀 Starting leaderboard rebuild script...');
  const countBefore = await prisma.leaderboardEntry.count();
  console.log(`📊 LeaderboardEntry rows before rebuild: ${countBefore}`);

  const startTime = Date.now();
  await LeaderboardService.rebuildAll();

  // Safety net consistency validation
  console.log('🛡️ Running safety net consistency check across all leaderboard entries...');
  const consistency = await LeaderboardService.validateConsistency();
  if (!consistency.valid) {
    console.warn(`⚠️ Consistency check detected ${consistency.issues.length} issues, auto-fixed ${consistency.fixed}:`, consistency.issues);
  } else {
    console.log('✅ Safety net consistency check passed cleanly: 0 mismatches found.');
  }

  const countAfter = await prisma.leaderboardEntry.count();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`📊 LeaderboardEntry rows after rebuild: ${countAfter} (change: ${countAfter - countBefore})`);
  console.log(`✨ Leaderboard rebuild completed in ${elapsed}s`);
}

main()
  .catch((err) => {
    console.error('❌ Leaderboard rebuild failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

