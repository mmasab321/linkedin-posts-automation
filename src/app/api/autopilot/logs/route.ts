import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
  const logs = await prisma.autopilotLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ logs });
}
