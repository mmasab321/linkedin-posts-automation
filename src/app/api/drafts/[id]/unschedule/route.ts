import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { createGetLateClient } from "@/lib/getlate";
import { requireUserId } from "@/lib/session";
import { LateApiError, RateLimitError } from "@getlatedev/node";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const draft = await prisma.postDraft.findFirst({ where: { id, userId }, include: { schedule: true } });
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draft.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Only scheduled posts can be cancelled." }, { status: 400 });
  }
  const slot = draft.schedule;
  if (!slot?.getlatePostId) {
    return NextResponse.json({ error: "No GetLate post ID." }, { status: 400 });
  }

  const getlateKey = await getConfig("GETLATE_API_KEY", userId);
  if (!getlateKey) {
    return NextResponse.json({ error: "GetLate API key not set. Save in Settings." }, { status: 400 });
  }

  try {
    const late = createGetLateClient(getlateKey);
    await late.posts.deletePost({ path: { postId: slot.getlatePostId } });
  } catch (err: any) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: `GetLate rate limited. Retry in ~${err.getSecondsUntilReset()}s.` },
        { status: 429 },
      );
    }
    if (err instanceof LateApiError) {
      const code = (err as any).statusCode ?? 502;
      return NextResponse.json({ error: `GetLate ${code}: ${err.message}` }, { status: code });
    }
    return NextResponse.json({ error: err?.message ?? "Failed to cancel on GetLate." }, { status: 502 });
  }

  const scheduledFor = slot.scheduledFor;
  const year = new Date(scheduledFor).getFullYear();
  const month = new Date(scheduledFor).getMonth();

  await prisma.$transaction(async (tx) => {
    await tx.scheduleSlot.delete({ where: { draftId: id } });
    await tx.postDraft.update({
      where: { id },
      data: { status: "DISCARDED" },
    });
    const quota = await tx.monthlyQuota.findUnique({
      where: { userId_year_month: { userId, year, month } },
    });
    if (quota && quota.usedCount > 0) {
      await tx.monthlyQuota.update({
        where: { id: quota.id },
        data: { usedCount: { decrement: 1 } },
      });
    }
  });

  const updated = await prisma.postDraft.findUnique({
    where: { id },
    include: { schedule: true },
  });
  return NextResponse.json({ draft: updated });
}
