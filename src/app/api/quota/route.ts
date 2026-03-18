import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";
import { getOrCreateMonthlyQuota } from "@/lib/scheduling";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const quota = await getOrCreateMonthlyQuota(userId, new Date());
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const effectiveLimit = getPlan(user?.plan ?? "free").monthlyPostLimit;
  return NextResponse.json({ quota: { ...quota, maxCount: effectiveLimit } });
}

