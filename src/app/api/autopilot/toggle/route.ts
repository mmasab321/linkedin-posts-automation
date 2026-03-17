import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateAutopilotConfig } from "@/lib/autopilot/engine";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

const BodySchema = z.object({ enabled: z.boolean() });

export async function POST(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const config = await getOrCreateAutopilotConfig(userId);
  await prisma.autopilotConfig.update({
    where: { id: config.id },
    data: {
      enabled: parsed.data.enabled,
      ...(parsed.data.enabled ? { consecutiveFailures: 0, pausedUntil: null } : {}),
    },
  });

  return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
}
