import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MIGRATION_USER_ID = "migration-default-user";

const BodySchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8, "At least 8 characters"),
  name: z.string().max(200).optional(),
});

/**
 * One-time claim: create your user and reassign all existing data (posts, API keys, etc.)
 * from the migration user to your account. Call once after deploy with CLAIM_SECRET.
 *
 * POST /api/auth/claim
 * Header: Authorization: Bearer <CLAIM_SECRET>  (or X-Claim-Secret)
 * Body: { "email": "you@example.com", "password": "your-password", "name": "Optional" }
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("x-claim-secret");
  const secret = process.env.CLAIM_SECRET || process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json(
      { error: "Email already registered. Sign in at /signin instead." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: { email, name: name ?? null, passwordHash },
  });

  await prisma.$transaction([
    prisma.config.updateMany({ where: { userId: MIGRATION_USER_ID }, data: { userId: newUser.id } }),
    prisma.monthlyQuota.updateMany({ where: { userId: MIGRATION_USER_ID }, data: { userId: newUser.id } }),
    prisma.postDraft.updateMany({ where: { userId: MIGRATION_USER_ID }, data: { userId: newUser.id } }),
    prisma.autopilotConfig.updateMany({ where: { userId: MIGRATION_USER_ID }, data: { userId: newUser.id } }),
    prisma.contentSource.updateMany({ where: { userId: MIGRATION_USER_ID }, data: { userId: newUser.id } }),
    prisma.autopilotLog.updateMany({ where: { userId: MIGRATION_USER_ID }, data: { userId: newUser.id } }),
  ]);

  await prisma.user.deleteMany({ where: { id: MIGRATION_USER_ID } }).catch(() => null);

  return NextResponse.json({
    ok: true,
    message: "Account created and existing data assigned. Sign in at /signin with your email and password.",
  });
}
