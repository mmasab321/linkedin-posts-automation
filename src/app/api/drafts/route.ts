import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

const QuerySchema = z.object({
  status: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ status: url.searchParams.get("status") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drafts = await prisma.postDraft.findMany({
    where: {
      userId,
      ...(parsed.data.status ? { status: parsed.data.status as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { schedule: true },
  });

  return NextResponse.json({ drafts });
}

