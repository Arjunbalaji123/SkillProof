-- AlterTable DeveloperProfile
ALTER TABLE "DeveloperProfile" ADD COLUMN "allowRecruiterMessages" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DeveloperProfile" ADD COLUMN "notificationsPaused" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable RecruiterProfile
CREATE TABLE "RecruiterProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "companyWebsite" TEXT,
    "linkedinUrl" TEXT,
    "bio" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecruiterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecruiterProfile_userId_key" ON "RecruiterProfile"("userId");

-- CreateTable DeveloperInterest
CREATE TABLE "DeveloperInterest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trackId" TEXT,
    "skillCatalogId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeveloperInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeveloperInterest_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeveloperInterest_skillCatalogId_fkey" FOREIGN KEY ("skillCatalogId") REFERENCES "SkillCatalog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DeveloperInterest_userId_idx" ON "DeveloperInterest"("userId");
CREATE INDEX "DeveloperInterest_trackId_idx" ON "DeveloperInterest"("trackId");
CREATE INDEX "DeveloperInterest_skillCatalogId_idx" ON "DeveloperInterest"("skillCatalogId");

-- CreateTable Opening
CREATE TABLE "Opening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recruiterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minLevel" TEXT,
    "minScore" REAL,
    "positions" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opening_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Opening_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Opening_recruiterId_status_idx" ON "Opening"("recruiterId", "status");
CREATE INDEX "Opening_trackId_status_idx" ON "Opening"("trackId", "status");
CREATE INDEX "Opening_status_expiresAt_idx" ON "Opening"("status", "expiresAt");

-- CreateTable OpeningSkill
CREATE TABLE "OpeningSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openingId" TEXT NOT NULL,
    "skillCatalogId" TEXT NOT NULL,
    CONSTRAINT "OpeningSkill_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "Opening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpeningSkill_skillCatalogId_fkey" FOREIGN KEY ("skillCatalogId") REFERENCES "SkillCatalog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OpeningSkill_openingId_skillCatalogId_key" ON "OpeningSkill"("openingId", "skillCatalogId");
CREATE INDEX "OpeningSkill_skillCatalogId_idx" ON "OpeningSkill"("skillCatalogId");

-- CreateTable Approach
CREATE TABLE "Approach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openingId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    CONSTRAINT "Approach_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "Opening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Approach_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Approach_openingId_developerId_key" ON "Approach"("openingId", "developerId");
CREATE INDEX "Approach_developerId_createdAt_idx" ON "Approach"("developerId", "createdAt");
CREATE INDEX "Approach_openingId_status_idx" ON "Approach"("openingId", "status");

-- Drop old peer-to-peer Conversation & ConversationParticipant tables and recreate for Recruiter-Developer
DROP TABLE IF EXISTS "ConversationParticipant";
DROP TABLE IF EXISTS "Conversation";

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recruiterId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'OPENING',
    "openingId" TEXT,
    "initiatedByRecruiterId" TEXT,
    "directReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "unlockedAt" DATETIME,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "Opening" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Conversation_recruiterId_developerId_key" ON "Conversation"("recruiterId", "developerId");
CREATE INDEX "Conversation_recruiterId_lastMessageAt_idx" ON "Conversation"("recruiterId", "lastMessageAt");
CREATE INDEX "Conversation_developerId_lastMessageAt_idx" ON "Conversation"("developerId", "lastMessageAt");
CREATE INDEX "Conversation_openingId_idx" ON "Conversation"("openingId");

CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" DATETIME,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");
CREATE INDEX "ConversationParticipant_userId_archived_idx" ON "ConversationParticipant"("userId", "archived");

-- CreateTable Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

