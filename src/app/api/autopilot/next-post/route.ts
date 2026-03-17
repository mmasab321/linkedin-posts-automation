import { NextResponse } from "next/server";

import { getNextAvailableSlot } from "@/lib/scheduling";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Returns the post that will go out at the next slot (next day / 24h from now)
 * and its approval status (pending, approved, rejected).
 * So you can see "tomorrow's article" 24h early with status.
 */
export async function GET() {
  const now = new Date();
  const nextSlot = await getNextAvailableSlot(now);
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

  // Already scheduled: draft with ScheduleSlot at next slot
  const scheduled = await prisma.scheduleSlot.findFirst({
    where: {
      scheduledFor: { gte: slotStart, lt: slotEnd },
    },
    orderBy: { scheduledFor: "asc" },
    include: {
      draft: true,
    },
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

  // Pending email approval: draft with scheduledFor = next slot, no ScheduleSlot yet
  const pending = await prisma.postDraft.findFirst({
    where: {
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
