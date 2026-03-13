import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Remove the next topic from the queue (mark as DISCARDED).
 */
export async function POST() {
  const next = await prisma.topicPool.findFirst({
    where: { status: "PENDING" },
    orderBy: [{ priorityBoost: "desc" }, { createdAt: "asc" }],
  });
  if (!next) {
    return NextResponse.json({ ok: true, skipped: false, reason: "No topics in queue" });
  }
  await prisma.topicPool.update({
    where: { id: next.id },
    data: { status: "DISCARDED" },
  });
  return NextResponse.json({ ok: true, skipped: true, topicId: next.id, title: next.title });
}
