import { NextResponse } from "next/server";

import { runAutopilotOnce } from "@/lib/autopilot/engine";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Manual trigger: run autopilot once now.
 */
export async function POST() {
  const result = await runAutopilotOnce();

  if (result.ok && result.action === "SKIPPED") {
    return NextResponse.json({ ok: true, skipped: true, reason: result.reason });
  }
  if (result.ok && (result.action === "SCHEDULED" || result.action === "PENDING_REVIEW")) {
    return NextResponse.json({
      ok: true,
      action: result.action,
      draftId: result.draftId,
      topic: result.topic,
      score: result.score,
    });
  }
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      action: result.action,
      reason: result.reason,
      disableAutopilot: result.disableAutopilot,
    });
  }
  return NextResponse.json({ ok: true, result });
}
