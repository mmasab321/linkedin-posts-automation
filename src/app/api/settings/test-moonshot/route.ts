import { NextResponse } from "next/server";

import { getConfig } from "@/lib/config";
import { createMoonshotClient } from "@/lib/moonshot";
import { getSystemPrompt } from "@/lib/prompt";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const moonshotKey = await getConfig("MOONSHOT_API_KEY", userId);
    if (!moonshotKey) {
      return NextResponse.json({ error: "Moonshot API key not set." }, { status: 400 });
    }

    const systemPrompt = await getSystemPrompt(userId);

    const client = createMoonshotClient(moonshotKey);
    const completion = await client.chat.completions.create({
      model: "kimi-k2.5",
      temperature: 1,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            "POST_TYPE: insight",
            "TOPIC: Test connection",
            "KEY_POINT: Reply with a short sentence confirming access.",
            "TONE_MODIFIER: neutral",
          ].join("\n"),
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ ok: true, sample: text.slice(0, 120) });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = typeof err?.message === "string" ? err.message : "Moonshot test failed.";
    return NextResponse.json({ error: message }, { status });
  }
}

