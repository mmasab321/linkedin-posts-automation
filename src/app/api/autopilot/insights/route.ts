import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

type PostType = "story" | "insight" | "project" | "tip" | "hot_take" | "results";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drafts = await prisma.postDraft.findMany({
    where: { userId, isAutopilot: true, manualFeedback: { not: null } },
    select: { postType: true, manualFeedback: true },
  });

  const totalWithFeedback = drafts.length;
  if (totalWithFeedback < 5) {
    return NextResponse.json({
      totalWithFeedback,
      perType: [],
      topPerforming: [],
      underperforming: [],
      message: "Need at least 5 posts with feedback to show insights.",
    });
  }

  const byType = new Map<string, { total: number; approved: number; rejected: number }>();
  for (const d of drafts) {
    const t = (d.postType ?? "tip") as PostType;
    if (!byType.has(t)) byType.set(t, { total: 0, approved: 0, rejected: 0 });
    const cur = byType.get(t)!;
    cur.total++;
    if (d.manualFeedback === "approved") cur.approved++;
    else cur.rejected++;
  }

  const perType = Array.from(byType.entries()).map(([postType, counts]) => ({
    postType,
    total: counts.total,
    approved: counts.approved,
    rejected: counts.rejected,
    approvalRate: counts.total > 0 ? counts.approved / counts.total : 0,
  }));

  const sorted = [...perType].sort((a, b) => b.approvalRate - a.approvalRate);
  const topPerforming = sorted.slice(0, 3).map((p) => ({ postType: p.postType, approvalRate: p.approvalRate }));
  const underperforming = sorted.reverse().slice(0, 3).map((p) => ({ postType: p.postType, approvalRate: p.approvalRate }));

  return NextResponse.json({
    totalWithFeedback,
    perType,
    topPerforming,
    underperforming,
  });
}
