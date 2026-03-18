import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getOrCreateAutopilotConfig } from "@/lib/autopilot/engine";
import { getPlan } from "@/lib/plans";
import { getNextAvailableSlot } from "@/lib/scheduling";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = getPlan(user?.plan ?? "free");

  const config = await getOrCreateAutopilotConfig(userId);
  const now = new Date();
  const quota = await prisma.monthlyQuota.findFirst({
    where: { userId, year: now.getFullYear(), month: now.getMonth() },
  });
  const usedCount = quota?.usedCount ?? 0;
  const nextSlot = await getNextAvailableSlot(userId, now);
  const pendingTopics = await prisma.topicPool.count({ where: { status: "PENDING", source: { userId } } });
  const rules = (config.validationRules as Record<string, unknown>) || {};
  const maxAuto = Math.min(config.maxAutoPerMonth ?? plan.maxAutoPerMonth, plan.maxAutoPerMonth);
  const autopilotUsedThisMonth = await prisma.postDraft.count({
    where: {
      userId,
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
    quotaMax: plan.monthlyPostLimit,
    nextAvailableSlot: nextSlot?.toISOString() ?? null,
    pendingTopicsInPool: pendingTopics,
    minScoreToApprove: (rules.minScoreToApprove as number) ?? 85,
  });
}
