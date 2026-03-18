import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { getOrCreateAutopilotConfig } from "@/lib/autopilot/engine";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

const BodySchema = z.object({
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm
  maxAutoPerMonth: z.number().int().min(1).max(50).optional(),
  validationRules: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = getPlan(user?.plan ?? "free");
  const config = await getOrCreateAutopilotConfig(userId);
  const maxAuto = Math.min(config.maxAutoPerMonth ?? plan.maxAutoPerMonth, plan.maxAutoPerMonth);
  return NextResponse.json({
    scheduleTime: config.scheduleTime,
    maxAutoPerMonth: maxAuto,
    maxAutoPerMonthLimit: plan.maxAutoPerMonth,
    validationRules: config.validationRules,
  });
}

export async function PATCH(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = getPlan(user?.plan ?? "free");
  const config = await getOrCreateAutopilotConfig(userId);
  const maxAuto =
    parsed.data.maxAutoPerMonth != null
      ? Math.min(parsed.data.maxAutoPerMonth, plan.maxAutoPerMonth)
      : undefined;
  const updated = await prisma.autopilotConfig.update({
    where: { id: config.id },
    data: {
      ...(parsed.data.scheduleTime != null && { scheduleTime: parsed.data.scheduleTime }),
      ...(maxAuto != null && { maxAutoPerMonth: maxAuto }),
      ...(parsed.data.validationRules != null && {
        validationRules: parsed.data.validationRules as Prisma.InputJsonValue,
      }),
    },
  });
  return NextResponse.json(updated);
}
