import { addDays, addHours, differenceInHours, isAfter, set, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";

const DEFAULT_MAX_COUNT = 15;

export async function getOrCreateMonthlyQuota(userId: string, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  return prisma.monthlyQuota.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: { userId, year, month, usedCount: 0, maxCount: DEFAULT_MAX_COUNT },
    update: {},
  });
}

/**
 * Next slot: 20 posts/month. One rest day after every 2 consecutive posting days
 * (post, post, rest, post, post, rest … → 2 posts per 3 days ≈ 15/month).
 */
export async function getNextAvailableSlot(userId: string, now = new Date()): Promise<Date | null> {
  const quota = await getOrCreateMonthlyQuota(userId, now);
  if (quota.usedCount >= quota.maxCount) return null;

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

