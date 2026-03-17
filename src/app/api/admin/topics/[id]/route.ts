import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

const UpdateSchema = z.object({
  priorityBoost: z.number().int().optional(),
  status: z.enum(["PENDING", "USED", "DISCARDED"]).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const topic = await prisma.topicPool.findFirst({ where: { id, source: { userId } } });
  if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.topicPool.update({
    where: { id },
    data: {
      ...(parsed.data.priorityBoost !== undefined && { priorityBoost: parsed.data.priorityBoost }),
      ...(parsed.data.status != null && { status: parsed.data.status }),
    },
  });
  return NextResponse.json({ topic: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const topic = await prisma.topicPool.findFirst({ where: { id, source: { userId } } });
  if (topic) await prisma.topicPool.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
