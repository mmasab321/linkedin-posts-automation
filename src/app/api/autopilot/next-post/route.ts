import { NextResponse } from "next/server";

import { getNextAvailableSlot } from "@/lib/scheduling";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Returns the post that will go out at the next slot (next day / 24h from now)
 * and its approval status (pending, approved, rejected).
 */
export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const nextSlot = await getNextAvailableSlot(userId, now);
  if (!nextSlot) {
    return NextResponse.json({
      nextSlot: null,
      nextPost: null,
      message: "No slot available (quota full).",
    });
  }

  const slotStart = new Date(nextSlot);
  slotStart.setSeconds(0, 0);
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // 1h window

  const scheduled = await prisma.scheduleSlot.findFirst({
    where: {
      scheduledFor: { gte: slotStart, lt: slotEnd },
      draft: { userId },
    },
    orderBy: { scheduledFor: "asc" },
    include: { draft: true },
  });

  if (scheduled) {
    const d = scheduled.draft;
    return NextResponse.json({
      nextSlot: nextSlot.toISOString(),
      nextPost: {
        id: d.id,
        topic: d.topic,
        content: d.content,
        status: d.status,
        approvalStatus: d.approvalStatus ?? "approved",
        scheduledFor: scheduled.scheduledFor.toISOString(),
      },
    });
  }

  const pending = await prisma.postDraft.findFirst({
    where: {
      userId,
      scheduledFor: { gte: slotStart, lt: slotEnd },
      schedule: null,
      status: { in: ["PENDING_REVIEW", "APPROVED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (pending) {
    return NextResponse.json({
      nextSlot: nextSlot.toISOString(),
      nextPost: {
        id: pending.id,
        topic: pending.topic,
        content: pending.content,
        status: pending.status,
        approvalStatus: pending.approvalStatus ?? "pending",
        scheduledFor: pending.scheduledFor?.toISOString() ?? null,
      },
    });
  }

  return NextResponse.json({
    nextSlot: nextSlot.toISOString(),
    nextPost: null,
    message: "No post yet for the next slot. Autopilot may generate one.",
  });
}
