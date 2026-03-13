import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { createGetLateClient } from "@/lib/getlate";
import { inferMediaType } from "@/lib/media-urls";
import { toPlainLinkedInText } from "@/lib/text";
import { LateApiError, RateLimitError } from "@getlatedev/node";

export const runtime = "nodejs";

const PatchSchema = z.object({
  content: z.string().min(1).optional(),
  discard: z.boolean().optional(),
  scheduledFor: z.string().min(1).optional(),
  firstComment: z.string().optional(),
  disableLinkPreview: z.boolean().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
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
  const firstComment = parsed.data.firstComment;
  const disableLinkPreview = parsed.data.disableLinkPreview;
  const mediaUrls = parsed.data.mediaUrls;

  const hasEdits =
    content !== null ||
    scheduledFor !== null ||
    firstComment !== undefined ||
    disableLinkPreview !== undefined ||
    (Array.isArray(mediaUrls) && mediaUrls.length >= 0);

  if (hasEdits) {
    if (draft.status === "SCHEDULED" && draft.schedule?.getlatePostId) {
      const getlateKey = await getConfig("GETLATE_API_KEY");
      if (getlateKey) {
        const body: Record<string, unknown> = {};
        if (content !== null) body.content = content;
        if (scheduledFor !== null) body.scheduledFor = scheduledFor;
        if (firstComment !== undefined) body.firstComment = firstComment === "" ? null : firstComment;
        if (disableLinkPreview !== undefined) body.disableLinkPreview = disableLinkPreview;
        if (Array.isArray(mediaUrls)) {
          body.mediaItems = mediaUrls
            .filter((u) => u.startsWith("http"))
            .map((url) => ({ url, type: inferMediaType(url) }));
        }
        if (Object.keys(body).length > 0) {
          try {
            const late = createGetLateClient(getlateKey);
            await late.posts.updatePost({
              path: { postId: draft.schedule.getlatePostId },
              body: body as any,
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
    }

    const draftUpdate: { content?: string; firstComment?: string | null; disableLinkPreview?: boolean | null; mediaUrls?: string | null } = {};
    if (content !== null) draftUpdate.content = content;
    if (firstComment !== undefined) draftUpdate.firstComment = firstComment === "" ? null : firstComment;
    if (disableLinkPreview !== undefined) draftUpdate.disableLinkPreview = disableLinkPreview;
    if (Array.isArray(mediaUrls)) draftUpdate.mediaUrls = mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null;
    if (Object.keys(draftUpdate).length > 0) {
      await prisma.postDraft.update({
        where: { id },
        data: draftUpdate,
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

