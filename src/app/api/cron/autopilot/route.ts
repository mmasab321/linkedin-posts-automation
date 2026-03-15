import { NextResponse } from "next/server";

import { getOrCreateAutopilotConfig, runAutopilotOnce } from "@/lib/autopilot/engine";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Cron: run daily (e.g. 8 AM, 1h before post time). Vercel Cron or external scheduler
 * should call GET /api/cron/autopilot with CRON_SECRET header.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getOrCreateAutopilotConfig();
  if (!config.enabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Autopilot disabled" });
  }

  const result = await runAutopilotOnce();

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
