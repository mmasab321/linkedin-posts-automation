import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "PENDING";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 30, 100);
  const topics = await prisma.topicPool.findMany({
    where: {
      source: { userId },
      ...(status ? { status } : {}),
    },
    orderBy: [{ priorityBoost: "desc" }, { createdAt: "asc" }],
    take: limit,
    include: { source: { select: { title: true, type: true } } },
  });
  return NextResponse.json({ topics });
}
