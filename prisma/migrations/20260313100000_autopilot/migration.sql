-- AlterTable PostDraft: flag for autopilot-created drafts
ALTER TABLE "PostDraft" ADD COLUMN "isAutopilot" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable AutopilotConfig (singleton)
CREATE TABLE "AutopilotConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleTime" TEXT NOT NULL DEFAULT '09:00',
    "maxAutoPerMonth" INTEGER NOT NULL DEFAULT 10,
    "lastRunAt" TIMESTAMP(3),
    "nextScheduledAt" TIMESTAMP(3),
    "validationRules" JSONB NOT NULL DEFAULT '{}',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "pausedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutopilotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable ContentSource
CREATE TABLE "ContentSource" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "lastFetched" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable TopicPool
CREATE TABLE "TopicPool" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "usedAt" TIMESTAMP(3),
    "priorityBoost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable AutopilotLog
CREATE TABLE "AutopilotLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "draftId" TEXT,
    "error" TEXT,
    "validationScore" INTEGER,

    CONSTRAINT "AutopilotLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TopicPool_status_createdAt_idx" ON "TopicPool"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "TopicPool" ADD CONSTRAINT "TopicPool_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ContentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
