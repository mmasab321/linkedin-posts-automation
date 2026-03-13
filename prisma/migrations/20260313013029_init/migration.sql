-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "MonthlyQuota" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxCount" INTEGER NOT NULL DEFAULT 15
);

-- CreateTable
CREATE TABLE "PostDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "content" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "keyPoint" TEXT NOT NULL,
    "toneModifier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "getlatePostId" TEXT,
    "getlateStatus" TEXT,
    CONSTRAINT "ScheduleSlot_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PostDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyQuota_year_month_key" ON "MonthlyQuota"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSlot_draftId_key" ON "ScheduleSlot"("draftId");
