-- AlterTable PostDraft: first comment, link preview, media URLs for full LinkedIn control
ALTER TABLE "PostDraft" ADD COLUMN "firstComment" TEXT;
ALTER TABLE "PostDraft" ADD COLUMN "disableLinkPreview" BOOLEAN DEFAULT false;
ALTER TABLE "PostDraft" ADD COLUMN "mediaUrls" TEXT;
