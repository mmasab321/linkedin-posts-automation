import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UpdateSchema = z.object({
  type: z.enum(["RSS", "EVERGREEN", "TRENDING"]).optional(),
  url: z.string().url().optional().nullable(),
  title: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const source = await prisma.contentSource.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.contentSource.update({
    where: { id },
    data: {
      ...(parsed.data.type != null && { type: parsed.data.type }),
      ...(parsed.data.url !== undefined && { url: parsed.data.url }),
      ...(parsed.data.title != null && { title: parsed.data.title }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      ...(parsed.data.priority != null && { priority: parsed.data.priority }),
    },
  });
  return NextResponse.json({ source: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.contentSource.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
