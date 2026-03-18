import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

const VoiceProfileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  niche: z.string().min(1),
  audience: z.string().min(1),
  tone: z.string().min(1),
  avoidPhrases: z.string().optional().nullable(),
});

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.voiceProfile.findUnique({
    where: { userId },
  });
  return NextResponse.json(profile ?? null);
}

export async function PUT(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = VoiceProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data = {
    name: parsed.data.name,
    headline: parsed.data.headline,
    niche: parsed.data.niche,
    audience: parsed.data.audience,
    tone: parsed.data.tone,
    avoidPhrases: parsed.data.avoidPhrases ?? "",
  };

  await prisma.voiceProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true });
}
