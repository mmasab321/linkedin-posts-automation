import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { createGetLateClient } from "@/lib/getlate";
import { inferMediaType, parseMediaUrls } from "@/lib/media-urls";

export const runtime = "nodejs";

function htmlPage(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui;padding:2rem;max-width:480px;margin:0 auto;"><h1>${title}</h1><p>${body}</p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const action = req.nextUrl.searchParams.get("action");

  if (!token || !action || (action !== "approve" && action !== "reject")) {
    return htmlPage("Invalid link", "This link is invalid or expired. Use a link from your approval email.");
  }

  const draft = await prisma.postDraft.findFirst({
    where: { approvalToken: token },
    include: { schedule: true },
  });

  if (!draft) {
    return htmlPage("Not found", "This approval link is invalid or has already been used.");
  }

  const status = draft.approvalStatus ?? "pending";
  if (status !== "pending") {
    return htmlPage(
      "Already processed",
      `This post was already ${status}. No further action is needed.`
    );
  }

  if (action === "reject") {
    await prisma.postDraft.update({
      where: { id: draft.id },
      data: { approvalStatus: "rejected", approvalToken: null },
    });
    return htmlPage("Post rejected", "This post has been cancelled and will not go live.");
  }

  // action === "approve" — schedule with GetLate (safety gate: only here do we publish)
  const scheduledFor = draft.scheduledFor;
  if (!scheduledFor) {
    await prisma.postDraft.update({
      where: { id: draft.id },
      data: { approvalStatus: "rejected", approvalToken: null },
    });
    return htmlPage("Error", "Scheduled time was missing. Post was not published.");
  }

  const getlateKey = await getConfig("GETLATE_API_KEY", draft.userId);
  const linkedinAccountId = await getConfig("LINKEDIN_ACCOUNT_ID", draft.userId);
  if (!getlateKey || !linkedinAccountId) {
    return htmlPage("Error", "GetLate is not configured. Post was not published. Please approve from the app.");
  }

  try {
    const late = createGetLateClient(getlateKey);
    const mediaUrls = parseMediaUrls(draft.mediaUrls);
    const body: Record<string, unknown> = {
      content: draft.content,
      publishNow: false,
      scheduledFor: scheduledFor.toISOString(),
      platforms: [
        {
          platform: "linkedin",
          accountId: linkedinAccountId,
          platformSpecificData: {
            ...(draft.firstComment?.trim() && { firstComment: draft.firstComment.trim() }),
            ...(draft.disableLinkPreview && { disableLinkPreview: true }),
          },
        },
      ],
    };
    if (mediaUrls.length > 0) {
      (body as any).mediaItems = mediaUrls.map((url) => ({ url, type: inferMediaType(url) }));
    }
    const { data } = await late.posts.createPost({ body: body as any });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    await prisma.$transaction(async (tx) => {
      await tx.scheduleSlot.create({
        data: {
          draftId: draft.id,
          scheduledFor,
          getlatePostId: (data as any)?.post?._id ?? (data as any)?._id ?? null,
          getlateStatus: (data as any)?.post?.status ?? (data as any)?.status ?? "pending",
        },
      });
      await tx.postDraft.update({
        where: { id: draft.id },
        data: { status: "SCHEDULED", approvalStatus: "approved", approvalToken: null },
      });
      await tx.monthlyQuota.upsert({
        where: { userId_year_month: { userId: draft.userId, year, month } },
        create: { userId: draft.userId, year, month, usedCount: 1, maxCount: 20 },
        update: { usedCount: { increment: 1 } },
      });
    });

    const timeStr = scheduledFor.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
    return htmlPage("Post approved", `This post is now scheduled and will go live at ${timeStr}.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "GetLate error";
    return htmlPage("Error", `Could not schedule the post: ${msg}. You can try again from the app dashboard.`);
  }
}
