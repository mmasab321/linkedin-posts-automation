import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      onboardingComplete: true,
      createdAt: true,
    },
  });

  const withStats = await Promise.all(
    users.map(async (u) => {
      const [postsThisMonth, autopilotConfig] = await Promise.all([
        prisma.postDraft.count({
          where: {
            userId: u.id,
            createdAt: { gte: startOfMonth },
            status: { in: ["SCHEDULED", "PUBLISHED"] },
          },
        }),
        prisma.autopilotConfig.findUnique({
          where: { userId: u.id },
          select: { enabled: true },
        }),
      ]);
      return {
        ...u,
        postsThisMonth,
        autopilotOn: autopilotConfig?.enabled ?? false,
      };
    })
  );

  return NextResponse.json({ users: withStats });
}
