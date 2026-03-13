import { NextResponse } from "next/server";
import { z } from "zod";

import { getConfig, setConfig } from "@/lib/config";

export const runtime = "nodejs";

const PutSchema = z.object({
  getlateApiKey: z.string().optional(),
  moonshotApiKey: z.string().optional(),
  linkedinAccountId: z.string().optional(),
});

export async function GET() {
  const [getlate, moonshot, linkedin] = await Promise.all([
    getConfig("GETLATE_API_KEY"),
    getConfig("MOONSHOT_API_KEY"),
    getConfig("LINKEDIN_ACCOUNT_ID"),
  ]);

  return NextResponse.json({
    hasGetLateKey: Boolean(getlate),
    hasMoonshotKey: Boolean(moonshot),
    linkedinAccountId: linkedin ?? "",
  });
}

export async function PUT(req: Request) {
  const parsed = PutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const ops: Promise<void>[] = [];
  if (typeof parsed.data.getlateApiKey === "string" && parsed.data.getlateApiKey.trim()) {
    ops.push(setConfig("GETLATE_API_KEY", parsed.data.getlateApiKey.trim()));
  }
  if (typeof parsed.data.moonshotApiKey === "string" && parsed.data.moonshotApiKey.trim()) {
    ops.push(setConfig("MOONSHOT_API_KEY", parsed.data.moonshotApiKey.trim()));
  }
  if (typeof parsed.data.linkedinAccountId === "string" && parsed.data.linkedinAccountId.trim()) {
    ops.push(setConfig("LINKEDIN_ACCOUNT_ID", parsed.data.linkedinAccountId.trim()));
  }

  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}

