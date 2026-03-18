import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getDefaultSystemPrompt, getSystemPrompt } from "@/lib/prompt";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("default") === "true") {
    try {
      const defaultPrompt = await getDefaultSystemPrompt();
      return NextResponse.json({ systemPrompt: defaultPrompt });
    } catch {
      return NextResponse.json({ error: "Default prompt file not found" }, { status: 500 });
    }
  }

  try {
    const systemPrompt = await getSystemPrompt(userId);
    return NextResponse.json({ systemPrompt });
  } catch {
    try {
      const defaultPrompt = await getDefaultSystemPrompt();
      return NextResponse.json({ systemPrompt: defaultPrompt });
    } catch {
      return NextResponse.json({ error: "Default prompt file not found" }, { status: 500 });
    }
  }
}

const PutSchema = z.object({ systemPrompt: z.string().min(1) });

export async function PUT(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await prisma.userPrompt.upsert({
    where: { userId },
    create: { userId, systemPrompt: parsed.data.systemPrompt },
    update: { systemPrompt: parsed.data.systemPrompt },
  });
  return NextResponse.json({ ok: true });
}
