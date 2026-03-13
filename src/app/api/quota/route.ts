import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getOrCreateMonthlyQuota } from "@/lib/scheduling";

export const runtime = "nodejs";

export async function GET() {
  const quota = await getOrCreateMonthlyQuota(new Date());
  return NextResponse.json({ quota });
}

