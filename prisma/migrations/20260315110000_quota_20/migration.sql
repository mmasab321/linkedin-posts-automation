-- Increase monthly post quota from 15 to 20
ALTER TABLE "MonthlyQuota" ALTER COLUMN "maxCount" SET DEFAULT 20;
UPDATE "MonthlyQuota" SET "maxCount" = 20 WHERE "maxCount" = 15;
