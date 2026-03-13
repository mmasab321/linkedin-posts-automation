import { addDays, addHours, isAfter, set, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";

export async function getOrCreateMonthlyQuota(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  return prisma.monthlyQuota.upsert({
    where: { year_month: { year, month } },
    create: { year, month, usedCount: 0, maxCount: 15 },
    update: {},
  });
}

export async function getNextAvailableSlot(now = new Date()): Promise<Date | null> {
  const quota = await getOrCreateMonthlyQuota(now);
  if (quota.usedCount >= quota.maxCount) return null;

  const last = await prisma.scheduleSlot.findFirst({
    orderBy: { scheduledFor: "desc" },
    select: { scheduledFor: true },
  });

  const tomorrow9 = set(startOfDay(addDays(now, 1)), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
  const lastPlus48 = last?.scheduledFor ? addHours(last.scheduledFor, 48) : null;

  if (!lastPlus48) return tomorrow9;
  return isAfter(lastPlus48, tomorrow9) ? lastPlus48 : tomorrow9;
}

