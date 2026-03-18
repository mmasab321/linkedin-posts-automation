import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

const CreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.string().min(1), // comma-separated
});

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entries = await prisma.experienceEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const entry = await prisma.experienceEntry.create({
    data: {
      userId,
      title: parsed.data.title,
      description: parsed.data.description,
      tags: parsed.data.tags.trim(),
    },
  });
  return NextResponse.json({ entry });
}
