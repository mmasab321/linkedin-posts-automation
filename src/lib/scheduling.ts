import { addDays, addHours, differenceInHours, isAfter, set, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

export async function getOrCreateMonthlyQuota(userId: string, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = getPlan(user?.plan ?? "free");
  const maxCount = plan.monthlyPostLimit;

  return prisma.monthlyQuota.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: { userId, year, month, usedCount: 0, maxCount },
    update: {},
  });
}

/**
 * Next slot: plan-based posts/month. One rest day after every 2 consecutive posting days.
 */
export async function getNextAvailableSlot(userId: string, now = new Date()): Promise<Date | null> {
  const quota = await getOrCreateMonthlyQuota(userId, now);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const limit = getPlan(user?.plan ?? "free").monthlyPostLimit;
  if (quota.usedCount >= limit) return null;

  const lastTwo = await prisma.scheduleSlot.findMany({
    where: { draft: { userId } },
    orderBy: { scheduledFor: "desc" },
    take: 2,
    select: { scheduledFor: true },
  });
  const last = lastTwo[0]?.scheduledFor ?? null;
  const secondLast = lastTwo[1]?.scheduledFor ?? null;

  const tomorrow9 = set(startOfDay(addDays(now, 1)), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
  if (!last) return tomorrow9;

  // Consecutive = last two posts are within ~36h (same or adjacent 9 AM days)
  const consecutive = secondLast != null && differenceInHours(last, secondLast) <= 36;
  const hoursUntilNext = consecutive ? 48 : 24;
  const candidate = addHours(last, hoursUntilNext);

  const slot = isAfter(candidate, now) ? candidate : tomorrow9;
  return isAfter(slot, tomorrow9) ? slot : tomorrow9;
}

