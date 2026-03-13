import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getOrCreateAutopilotConfig } from "@/lib/autopilot/engine";
import { getNextAvailableSlot } from "@/lib/scheduling";

export const runtime = "nodejs";

export async function GET() {
  const config = await getOrCreateAutopilotConfig();
  const now = new Date();
  const quota = await prisma.monthlyQuota.findFirst({
    where: { year: now.getFullYear(), month: now.getMonth() },
  });
  const usedCount = quota?.usedCount ?? 0;
  const nextSlot = getNextAvailableSlot(now);
  const pendingTopics = await prisma.topicPool.count({ where: { status: "PENDING" } });
  const rules = (config.validationRules as Record<string, unknown>) || {};
  const maxAuto = config.maxAutoPerMonth ?? 10;
  const autopilotUsedThisMonth = await prisma.postDraft.count({
    where: {
      isAutopilot: true,
      createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      status: { in: ["SCHEDULED", "PUBLISHED"] },
    },
  });

  return NextResponse.json({
    enabled: config.enabled,
    pausedUntil: config.pausedUntil?.toISOString() ?? null,
    scheduleTime: config.scheduleTime,
    maxAutoPerMonth: maxAuto,
    autopilotUsedThisMonth,
    lastRunAt: config.lastRunAt?.toISOString() ?? null,
    nextScheduledAt: config.nextScheduledAt?.toISOString() ?? null,
    consecutiveFailures: config.consecutiveFailures,
    quotaUsed: usedCount,
    quotaMax: 15,
    nextAvailableSlot: nextSlot?.toISOString() ?? null,
    pendingTopicsInPool: pendingTopics,
    minScoreToApprove: (rules.minScoreToApprove as number) ?? 85,
  });
}
