import { NextResponse } from "next/server";

import { runAutopilotOnce } from "@/lib/autopilot/engine";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Manual trigger: run autopilot once now.
 */
export async function POST() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runAutopilotOnce(userId);

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
    return NextResponse.json({
      ok: false,
      action: result.action,
      reason: result.reason,
      disableAutopilot: result.disableAutopilot,
    });
  }
  return NextResponse.json({ ok: true, result });
}
