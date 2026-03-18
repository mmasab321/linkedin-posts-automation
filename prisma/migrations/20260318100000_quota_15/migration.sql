-- Revert monthly post quota to 15
ALTER TABLE "MonthlyQuota" ALTER COLUMN "maxCount" SET DEFAULT 15;
UPDATE "MonthlyQuota" SET "maxCount" = 15 WHERE "maxCount" = 20;
