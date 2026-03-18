import { NextResponse } from "next/server";
import { z } from "zod";

import { getConfig, setConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

const PutSchema = z.object({
  getlateApiKey: z.string().optional(),
  moonshotApiKey: z.string().optional(),
  linkedinAccountId: z.string().optional(),
  approvalEmail: z.string().email().optional().nullable(),
});

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [getlate, moonshot, linkedin, user] = await Promise.all([
    getConfig("GETLATE_API_KEY", userId),
    getConfig("MOONSHOT_API_KEY", userId),
    getConfig("LINKEDIN_ACCOUNT_ID", userId),
    prisma.user.findUnique({ where: { id: userId }, select: { approvalEmail: true } }),
  ]);

  return NextResponse.json({
    hasGetLateKey: Boolean(getlate),
    hasMoonshotKey: Boolean(moonshot),
    linkedinAccountId: linkedin ?? "",
    approvalEmail: user?.approvalEmail ?? "",
  });
}

export async function PUT(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const ops: Promise<unknown>[] = [];
  if (typeof parsed.data.getlateApiKey === "string" && parsed.data.getlateApiKey.trim()) {
    ops.push(setConfig("GETLATE_API_KEY", parsed.data.getlateApiKey.trim(), userId));
  }
  if (typeof parsed.data.moonshotApiKey === "string" && parsed.data.moonshotApiKey.trim()) {
    ops.push(setConfig("MOONSHOT_API_KEY", parsed.data.moonshotApiKey.trim(), userId));
  }
  if (typeof parsed.data.linkedinAccountId === "string" && parsed.data.linkedinAccountId.trim()) {
    ops.push(setConfig("LINKEDIN_ACCOUNT_ID", parsed.data.linkedinAccountId.trim(), userId));
  }
  if (parsed.data.approvalEmail !== undefined) {
    ops.push(
      prisma.user.update({
        where: { id: userId },
        data: { approvalEmail: parsed.data.approvalEmail?.trim() || null },
      })
    );
  }

  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}

