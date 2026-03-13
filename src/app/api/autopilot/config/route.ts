import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateAutopilotConfig } from "@/lib/autopilot/engine";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BodySchema = z.object({
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm
  maxAutoPerMonth: z.number().int().min(1).max(15).optional(),
  validationRules: z.record(z.unknown()).optional(),
});

export async function GET() {
  const config = await getOrCreateAutopilotConfig();
  return NextResponse.json({
    scheduleTime: config.scheduleTime,
    maxAutoPerMonth: config.maxAutoPerMonth,
    validationRules: config.validationRules,
  });
}

export async function PATCH(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const config = await getOrCreateAutopilotConfig();
  const updated = await prisma.autopilotConfig.update({
    where: { id: config.id },
    data: {
      ...(parsed.data.scheduleTime != null && { scheduleTime: parsed.data.scheduleTime }),
      ...(parsed.data.maxAutoPerMonth != null && { maxAutoPerMonth: parsed.data.maxAutoPerMonth }),
      ...(parsed.data.validationRules != null && { validationRules: parsed.data.validationRules }),
    },
  });
  return NextResponse.json(updated);
}
