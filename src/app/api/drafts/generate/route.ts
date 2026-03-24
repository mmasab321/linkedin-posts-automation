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
export const maxDuration = 60;

const BodySchema = z.union([
  z.object({
    source: z.literal("manual").optional(),
    postType: z.string().min(1),
    topic: z.string().min(1),
    keyPoint: z.string().min(1),
    toneModifier: z.string().optional().nullable(),
  }),
  z.object({
    source: z.literal("youtube"),
    transcript: z.string().min(1),
    toneModifier: z.string().optional().nullable(),
    postType: z.string().optional().default("insight"),
  }),
]);

async function scoreHook(
  client: ReturnType<typeof createMoonshotClient>,
  hook: string,
): Promise<number> {
  const result = await client.chat.completions.create({
    model: "kimi-k2.5",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a LinkedIn hook quality scorer. Score the given first line on a scale of 1-10 based ONLY on these criteria:\n1. Creates curiosity or tension\n2. Makes a bold or surprising claim\n3. Uses a specific number or timeframe\n4. Is under 12 words\n\nReply with ONLY a single integer between 1 and 10. Nothing else.",
      },
      { role: "user", content: hook },
    ],
  });
  const raw = result.choices?.[0]?.message?.content?.trim() ?? "5";
  const score = parseInt(raw, 10);
  return isNaN(score) ? 5 : Math.min(10, Math.max(1, score));
}

async function rewriteHook(
  client: ReturnType<typeof createMoonshotClient>,
  systemPrompt: string,
  currentPost: string,
): Promise<string> {
  const result = await client.chat.completions.create({
    model: "kimi-k2.5",
    temperature: 1,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `The following LinkedIn post has a weak opening line. Rewrite ONLY the first line to be more scroll-stopping — create curiosity, make a bold claim, or use a specific number/timeframe. Keep it under 12 words. Do NOT start with "I". Return the FULL post with the new first line replacing the old one.\n\nPOST:\n${currentPost}`,
      },
    ],
  });
  return result.choices?.[0]?.message?.content?.trim() ?? currentPost;
}

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

  const client = createMoonshotClient(moonshotKey);
  const data = parsed.data;

  let userInput: string;
  let topic: string;
  let keyPoint: string;
  let postType: string;

  if (data.source === "youtube") {
    postType = data.postType ?? "insight";
    topic = "YouTube video insight";
    keyPoint = "Extracted from transcript";
    userInput = [
      `POST_TYPE: ${postType}`,
      `SOURCE: youtube`,
      `TONE_MODIFIER: ${data.toneModifier ?? ""}`,
      ``,
      `TRANSCRIPT:`,
      data.transcript,
      ``,
      `Instructions: Extract the single most valuable insight from this transcript. Reframe it as a LinkedIn post in my voice. Do not summarise the video — write a post that stands alone and delivers real value to the reader.`,
    ].join("\n");
  } else {
    postType = data.postType;
    topic = data.topic;
    keyPoint = data.keyPoint;
    userInput = [
      `POST_TYPE: ${postType}`,
      `TOPIC: ${topic}`,
      `KEY_POINT: ${keyPoint}`,
      `TONE_MODIFIER: ${data.toneModifier ?? ""}`,
    ].join("\n");
  }

  const completion = await client.chat.completions.create({
    model: "kimi-k2.5",
    temperature: 1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ],
  });

  let raw = completion.choices?.[0]?.message?.content ?? "";

  // Hook scoring — if the first line scores below 7, rewrite just the hook
  const firstLine = raw.split("\n").find((l) => l.trim().length > 0) ?? "";
  const hookScore = await scoreHook(client, firstLine);
  if (hookScore < 7) {
    const improved = await rewriteHook(client, systemPrompt, raw);
    if (improved) raw = improved;
  }

  const content = toPlainLinkedInText(raw);

  const draft = await prisma.postDraft.create({
    data: {
      userId,
      status: "PENDING_REVIEW",
      content,
      topic,
      postType,
      keyPoint,
      toneModifier: data.toneModifier ?? null,
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
