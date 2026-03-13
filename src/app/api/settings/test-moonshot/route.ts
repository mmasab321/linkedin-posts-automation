import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getConfig } from "@/lib/config";
import { createMoonshotClient } from "@/lib/moonshot";

export const runtime = "nodejs";

export async function POST() {
  try {
    const moonshotKey = await getConfig("MOONSHOT_API_KEY");
    if (!moonshotKey) {
      return NextResponse.json({ error: "Moonshot API key not set." }, { status: 400 });
    }

    const promptPath = path.join(process.cwd(), "linkedin-post-generator.md");
    const systemPrompt = await readFile(promptPath, "utf8");

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

