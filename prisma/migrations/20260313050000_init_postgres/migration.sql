-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'DISCARDED', 'FAILED');

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyQuota" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxCount" INTEGER NOT NULL DEFAULT 15,

    CONSTRAINT "MonthlyQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostDraft" (
    "id" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "content" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "keyPoint" TEXT NOT NULL,
    "toneModifier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "getlatePostId" TEXT,
    "getlateStatus" TEXT,

    CONSTRAINT "ScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyQuota_year_month_key" ON "MonthlyQuota"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSlot_draftId_key" ON "ScheduleSlot"("draftId");

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PostDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
