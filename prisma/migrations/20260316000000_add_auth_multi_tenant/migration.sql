-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Default user for existing data (backfill)
INSERT INTO "User" ("id", "email", "name", "passwordHash", "createdAt", "updatedAt")
VALUES ('migration-default-user', 'migration@local.dev', 'Default User', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Config: add userId, backfill, then unique and FK
ALTER TABLE "Config" ADD COLUMN "userId" TEXT;
UPDATE "Config" SET "userId" = 'migration-default-user' WHERE "userId" IS NULL;
ALTER TABLE "Config" ALTER COLUMN "userId" SET NOT NULL;
DROP INDEX IF EXISTS "Config_key_key";
CREATE UNIQUE INDEX "Config_userId_key_key" ON "Config"("userId", "key");
ALTER TABLE "Config" ADD CONSTRAINT "Config_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MonthlyQuota: add userId, backfill, then unique and FK
ALTER TABLE "MonthlyQuota" ADD COLUMN "userId" TEXT;
UPDATE "MonthlyQuota" SET "userId" = 'migration-default-user' WHERE "userId" IS NULL;
ALTER TABLE "MonthlyQuota" ALTER COLUMN "userId" SET NOT NULL;
DROP INDEX IF EXISTS "MonthlyQuota_year_month_key";
CREATE UNIQUE INDEX "MonthlyQuota_userId_year_month_key" ON "MonthlyQuota"("userId", "year", "month");
ALTER TABLE "MonthlyQuota" ADD CONSTRAINT "MonthlyQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostDraft: add userId, backfill, FK
ALTER TABLE "PostDraft" ADD COLUMN "userId" TEXT;
UPDATE "PostDraft" SET "userId" = 'migration-default-user' WHERE "userId" IS NULL;
ALTER TABLE "PostDraft" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PostDraft" ADD CONSTRAINT "PostDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AutopilotConfig: add userId, backfill, unique and FK
ALTER TABLE "AutopilotConfig" ADD COLUMN "userId" TEXT;
UPDATE "AutopilotConfig" SET "userId" = 'migration-default-user' WHERE "userId" IS NULL;
ALTER TABLE "AutopilotConfig" ALTER COLUMN "userId" SET NOT NULL;
CREATE UNIQUE INDEX "AutopilotConfig_userId_key" ON "AutopilotConfig"("userId");
ALTER TABLE "AutopilotConfig" ADD CONSTRAINT "AutopilotConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ContentSource: add userId, backfill, FK
ALTER TABLE "ContentSource" ADD COLUMN "userId" TEXT;
UPDATE "ContentSource" SET "userId" = 'migration-default-user' WHERE "userId" IS NULL;
ALTER TABLE "ContentSource" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AutopilotLog: add userId, backfill, FK
ALTER TABLE "AutopilotLog" ADD COLUMN "userId" TEXT;
UPDATE "AutopilotLog" SET "userId" = 'migration-default-user' WHERE "userId" IS NULL;
ALTER TABLE "AutopilotLog" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "AutopilotLog" ADD CONSTRAINT "AutopilotLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
