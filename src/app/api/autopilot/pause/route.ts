import { NextResponse } from "next/server";

import { getOrCreateAutopilotConfig } from "@/lib/autopilot/engine";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Emergency stop: disable autopilot and optionally pause for 24h.
 */
export async function POST(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const pauseHours = typeof body.pauseHours === "number" ? body.pauseHours : 24;

  const config = await getOrCreateAutopilotConfig(userId);
  const pausedUntil = new Date();
  pausedUntil.setHours(pausedUntil.getHours() + pauseHours);

  await prisma.autopilotConfig.update({
    where: { id: config.id },
    data: { enabled: false, pausedUntil },
  });

  return NextResponse.json({ ok: true, enabled: false, pausedUntil: pausedUntil.toISOString() });
}
