import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
  const logs = await prisma.autopilotLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ logs });
}
