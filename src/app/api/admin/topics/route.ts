import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "PENDING";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 30, 100);
  const topics = await prisma.topicPool.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ priorityBoost: "desc" }, { createdAt: "asc" }],
    take: limit,
    include: { source: { select: { title: true, type: true } } },
  });
  return NextResponse.json({ topics });
}
