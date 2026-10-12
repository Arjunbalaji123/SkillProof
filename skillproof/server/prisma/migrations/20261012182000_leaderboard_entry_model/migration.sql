-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeaderboardEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scopeId" TEXT NOT NULL DEFAULT '',
    "period" TEXT NOT NULL DEFAULT 'ALL',
    "periodKey" TEXT NOT NULL DEFAULT 'all',
    "points" REAL NOT NULL DEFAULT 0,
    "verifiedSkills" TEXT NOT NULL DEFAULT '[]',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
DROP TABLE IF EXISTS "LeaderboardEntry";
ALTER TABLE "new_LeaderboardEntry" RENAME TO "LeaderboardEntry";
CREATE INDEX "LeaderboardEntry_scope_scopeId_period_periodKey_points_idx" ON "LeaderboardEntry"("scope", "scopeId", "period", "periodKey", "points");
CREATE INDEX "LeaderboardEntry_userId_idx" ON "LeaderboardEntry"("userId");
CREATE UNIQUE INDEX "LeaderboardEntry_userId_scope_scopeId_period_periodKey_key" ON "LeaderboardEntry"("userId", "scope", "scopeId", "period", "periodKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

