-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Opening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recruiterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minLevel" TEXT,
    "minScore" REAL,
    "positions" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "rejectionReason" TEXT,
    "notifiedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opening_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Opening_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Opening" ("createdAt", "description", "expiresAt", "id", "minLevel", "minScore", "positions", "recruiterId", "status", "title", "trackId", "updatedAt") SELECT "createdAt", "description", "expiresAt", "id", "minLevel", "minScore", "positions", "recruiterId", "status", "title", "trackId", "updatedAt" FROM "Opening";
DROP TABLE "Opening";
ALTER TABLE "new_Opening" RENAME TO "Opening";
CREATE INDEX "Opening_recruiterId_status_idx" ON "Opening"("recruiterId", "status");
CREATE INDEX "Opening_trackId_status_idx" ON "Opening"("trackId", "status");
CREATE INDEX "Opening_status_expiresAt_idx" ON "Opening"("status", "expiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_userId_entityId_type_idx" ON "Notification"("userId", "entityId", "type");
