-- Add feedback and experience bank (Upgrades 2 & 3)
ALTER TABLE "PostDraft" ADD COLUMN "engagementScore" DOUBLE PRECISION;
ALTER TABLE "PostDraft" ADD COLUMN "manualFeedback" TEXT;

CREATE TABLE IF NOT EXISTS "ExperienceEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ExperienceEntry" ADD CONSTRAINT "ExperienceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
