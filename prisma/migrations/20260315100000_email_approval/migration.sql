-- Email approval flow: token, status, sent time, intended scheduled time
ALTER TABLE "PostDraft" ADD COLUMN "approvalToken" TEXT;
ALTER TABLE "PostDraft" ADD COLUMN "approvalStatus" TEXT;
ALTER TABLE "PostDraft" ADD COLUMN "approvalSentAt" TIMESTAMP(3);
ALTER TABLE "PostDraft" ADD COLUMN "scheduledFor" TIMESTAMP(3);
