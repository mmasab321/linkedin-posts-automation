-- Increase monthly post quota to 20 (matches GetLate account limit)
ALTER TABLE "MonthlyQuota" ALTER COLUMN "maxCount" SET DEFAULT 20;
UPDATE "MonthlyQuota" SET "maxCount" = 20 WHERE "maxCount" = 15;
