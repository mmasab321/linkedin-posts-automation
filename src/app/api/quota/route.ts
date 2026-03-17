import { NextResponse } from "next/server";

import { getOrCreateMonthlyQuota } from "@/lib/scheduling";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const quota = await getOrCreateMonthlyQuota(userId, new Date());
  return NextResponse.json({ quota });
}

