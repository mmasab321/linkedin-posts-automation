import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPlan, type PlanId } from "@/lib/plans";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const planId = (user?.plan ?? "free") as PlanId;
  const plan = getPlan(planId);
  return NextResponse.json({
    plan: planId,
    monthlyPostLimit: plan.monthlyPostLimit,
    maxAutoPerMonth: plan.maxAutoPerMonth,
    briefGeneration: plan.briefGeneration,
    experienceBank: plan.experienceBank,
  });
}
