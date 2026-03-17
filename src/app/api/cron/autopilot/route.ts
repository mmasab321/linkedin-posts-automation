import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getOrCreateAutopilotConfig, runAutopilotOnce } from "@/lib/autopilot/engine";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Cron: run daily. Runs autopilot for each user who has it enabled.
 * Call GET /api/cron/autopilot with CRON_SECRET header.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabledConfigs = await prisma.autopilotConfig.findMany({
    where: { enabled: true },
    select: { userId: true },
  });
  if (enabledConfigs.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "No users with autopilot enabled" });
  }

  const results: { userId: string; result: Awaited<ReturnType<typeof runAutopilotOnce>> }[] = [];
  for (const { userId } of enabledConfigs) {
    const result = await runAutopilotOnce(userId);
    results.push({ userId, result });
  }

  const result = results[0]?.result;
  if (!result) return NextResponse.json({ ok: true, results });

  if (result.ok && result.action === "SKIPPED") {
    return NextResponse.json({ ok: true, skipped: true, reason: result.reason });
  }
  if (result.ok && (result.action === "SCHEDULED" || result.action === "PENDING_REVIEW" || result.action === "PENDING_APPROVAL")) {
    return NextResponse.json({
      ok: true,
      action: result.action,
      draftId: result.draftId,
      topic: result.topic,
      score: result.score,
    });
  }
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        action: result.action,
        reason: result.reason,
        disableAutopilot: result.disableAutopilot,
      },
      { status: 200 }
    );
  }
  return NextResponse.json({ ok: true, result });
}
