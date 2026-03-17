import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8, "At least 8 characters"),
  name: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors?.password?.[0] ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name: name ?? null, passwordHash },
  });
  return NextResponse.json({ ok: true });
}
