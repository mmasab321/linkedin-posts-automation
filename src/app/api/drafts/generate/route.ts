import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { createMoonshotClient } from "@/lib/moonshot";
import { getSystemPrompt } from "@/lib/prompt";
import { toPlainLinkedInText } from "@/lib/text";
import { getOrCreateAutopilotConfig } from "@/lib/autopilot/engine";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

const BodySchema = z.object({
  postType: z.string().min(1),
  topic: z.string().min(1),
  keyPoint: z.string().min(1),
  toneModifier: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const moonshotKey = await getConfig("MOONSHOT_API_KEY", userId);
  if (!moonshotKey) {
    return NextResponse.json(
      { error: "Moonshot API key not set. Add it in Settings." },
      { status: 400 },
    );
  }

  let systemPrompt: string;
  try {
    systemPrompt = await getSystemPrompt(userId);
  } catch {
    return NextResponse.json(
      { error: "Missing linkedin-post-generator.md in project root." },
      { status: 500 },
    );
  }

  const { postType, topic, keyPoint, toneModifier } = parsed.data;
  const userInput = [
    `POST_TYPE: ${postType}`,
    `TOPIC: ${topic}`,
    `KEY_POINT: ${keyPoint}`,
    `TONE_MODIFIER: ${toneModifier ?? ""}`,
  ].join("\n");

  const client = createMoonshotClient(moonshotKey);

  const completion = await client.chat.completions.create({
    model: "kimi-k2.5",
    temperature: 1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content ?? "";
  const content = toPlainLinkedInText(raw);

  const draft = await prisma.postDraft.create({
    data: {
      userId,
      status: "PENDING_REVIEW",
      content,
      topic,
      postType,
      keyPoint,
      toneModifier: toneModifier ?? null,
    },
  });

  try {
    const config = await getOrCreateAutopilotConfig(userId);
    if (config.enabled) {
      const pausedUntil = new Date();
      pausedUntil.setHours(pausedUntil.getHours() + 24);
      await prisma.autopilotConfig.update({
        where: { id: config.id },
        data: { pausedUntil },
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ draft });
}

