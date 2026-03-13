import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { createGetLateClient } from "@/lib/getlate";
import { inferMediaType, parseMediaUrls } from "@/lib/media-urls";
import { getNextAvailableSlot } from "@/lib/scheduling";
import { LateApiError, RateLimitError } from "@getlatedev/node";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const draft = await prisma.postDraft.findUnique({ where: { id }, include: { schedule: true } });
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draft.status === "DISCARDED") {
    return NextResponse.json({ error: "Draft discarded" }, { status: 400 });
  }
  if (draft.status === "SCHEDULED") {
    return NextResponse.json({ error: "Already scheduled" }, { status: 400 });
  }

  const slot = await getNextAvailableSlot(new Date());
  if (!slot) {
    return NextResponse.json({ error: "Monthly quota full (15/15)." }, { status: 400 });
  }

  const getlateKey = await getConfig("GETLATE_API_KEY");
  const linkedinAccountId = await getConfig("LINKEDIN_ACCOUNT_ID");
  if (!getlateKey || !linkedinAccountId) {
    return NextResponse.json(
      { error: "GetLate API key or LinkedIn Account ID not set. Add them in Settings." },
      { status: 400 },
    );
  }

  // Mark as approved so the user can retry if scheduling fails.
  await prisma.postDraft.update({ where: { id }, data: { status: "APPROVED" } });

  try {
    const late = createGetLateClient(getlateKey);
    const mediaUrls = parseMediaUrls(draft.mediaUrls);
    const body: {
      content: string;
      publishNow: false;
      scheduledFor: string;
      mediaItems?: Array<{ type?: "image" | "video" | "document"; url: string }>;
      platforms: Array<{
        platform: "linkedin";
        accountId: string;
        platformSpecificData?: { firstComment?: string; disableLinkPreview?: boolean };
      }>;
    } = {
      content: draft.content,
      publishNow: false,
      scheduledFor: slot.toISOString(),
      platforms: [
        {
          platform: "linkedin",
          accountId: linkedinAccountId,
          platformSpecificData: {
            ...(draft.firstComment != null && draft.firstComment.trim() !== "" && { firstComment: draft.firstComment.trim() }),
            ...(draft.disableLinkPreview === true && { disableLinkPreview: true }),
          },
        },
      ],
    };
    if (mediaUrls.length > 0) {
      body.mediaItems = mediaUrls.map((url) => ({ url, type: inferMediaType(url) }));
    }
    const { data } = await late.posts.createPost({ body });

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      const quota = await tx.monthlyQuota.upsert({
        where: { year_month: { year, month } },
        create: { year, month, usedCount: 0, maxCount: 15 },
        update: {},
      });

      if (quota.usedCount >= quota.maxCount) {
        throw new Error("QUOTA_FULL");
      }

      await tx.scheduleSlot.create({
        data: {
          draftId: id,
          scheduledFor: slot,
          getlatePostId: (data as any)?.post?._id ?? (data as any)?._id ?? null,
          getlateStatus: (data as any)?.post?.status ?? (data as any)?.status ?? "pending",
        },
      });

      await tx.monthlyQuota.update({
        where: { id: quota.id },
        data: { usedCount: { increment: 1 } },
      });

      return tx.postDraft.update({
        where: { id },
        data: { status: "SCHEDULED" },
        include: { schedule: true },
      });
    });

    return NextResponse.json({ draft: updated });
  } catch (err: any) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: `Rate limited by GetLate. Retry in ~${err.getSecondsUntilReset()}s.` },
        { status: 429 },
      );
    }
    if (err instanceof LateApiError) {
      // Keep draft APPROVED for retry.
      const statusCode = (err as any).statusCode ?? 502;
      return NextResponse.json({ error: `GetLate error ${statusCode}: ${err.message}` }, { status: statusCode });
    }

    const message = typeof err?.message === "string" ? err.message : "Failed to schedule.";
    const status = message === "QUOTA_FULL" ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

