import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { createGetLateClient } from "@/lib/getlate";
import { toPlainLinkedInText } from "@/lib/text";
import { LateApiError, RateLimitError } from "@getlatedev/node";

export const runtime = "nodejs";

const PatchSchema = z.object({
  content: z.string().min(1).optional(),
  discard: z.boolean().optional(),
  scheduledFor: z.string().min(1).optional(), // ISO 8601 for scheduled post time
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const draft = await prisma.postDraft.findUnique({ where: { id }, include: { schedule: true } });
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.discard) {
    const updated = await prisma.postDraft.update({
      where: { id },
      data: { status: "DISCARDED" },
      include: { schedule: true },
    });
    return NextResponse.json({ draft: updated });
  }

  const content = typeof parsed.data.content === "string" ? toPlainLinkedInText(parsed.data.content) : null;
  const scheduledFor = parsed.data.scheduledFor ?? null;

  if (content !== null || scheduledFor !== null) {
    // If already scheduled on GetLate, sync content and/or time there.
    if (draft.status === "SCHEDULED" && draft.schedule?.getlatePostId) {
      const getlateKey = await getConfig("GETLATE_API_KEY");
      if (!getlateKey) {
        return NextResponse.json({ error: "GetLate API key not set. Save in Settings." }, { status: 400 });
      }
      const body: { content?: string; scheduledFor?: string } = {};
      if (content !== null) body.content = content;
      if (scheduledFor !== null) body.scheduledFor = scheduledFor;
      if (Object.keys(body).length > 0) {
        try {
          const late = createGetLateClient(getlateKey);
          await late.posts.updatePost({
            path: { postId: draft.schedule.getlatePostId },
            body,
          });
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
          return NextResponse.json({ error: err?.message ?? "Failed to update post on GetLate." }, { status: 502 });
        }
      }
    }

    if (content !== null) {
      await prisma.postDraft.update({
        where: { id },
        data: { content },
      });
    }
    if (scheduledFor !== null && draft.schedule?.id) {
      await prisma.scheduleSlot.update({
        where: { draftId: id },
        data: { scheduledFor: new Date(scheduledFor) },
      });
    }

    const updated = await prisma.postDraft.findUnique({
      where: { id },
      include: { schedule: true },
    });
    return NextResponse.json({ draft: updated });
  }

  return NextResponse.json({ error: "No changes" }, { status: 400 });
}

