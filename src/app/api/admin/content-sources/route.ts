import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CreateSchema = z.object({
  type: z.enum(["RSS", "EVERGREEN", "TRENDING"]),
  url: z.string().url().optional().nullable(),
  title: z.string().min(1),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
});

export async function GET() {
  const sources = await prisma.contentSource.findMany({
    orderBy: { priority: "desc" },
    include: { _count: { select: { topics: true } } },
  });
  return NextResponse.json({ sources });
}

export async function POST(req: Request) {
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data = {
    type: parsed.data.type,
    url: parsed.data.url ?? null,
    title: parsed.data.title,
    isActive: parsed.data.isActive ?? true,
    priority: parsed.data.priority ?? 50,
  };

  const source = await prisma.contentSource.create({ data });
  return NextResponse.json({ source });
}
