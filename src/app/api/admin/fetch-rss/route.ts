import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/session";
import { runFetchRss } from "@/lib/autopilot/fetchRssCron";

export const runtime = "nodejs";
export const maxDuration = 60;

function checkCronAuth(req: Request): boolean {
  const auth = req.headers.get("authorization") || req.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return auth === `Bearer ${secret}` || auth === secret;
}

/**
 * Fetch RSS feeds from ContentSource (type=RSS), extract titles, add to TopicPool.
 * GET: for Vercel cron (requires CRON_SECRET if set).
 * POST: for cron or logged-in user ("Fetch RSS now" in Settings).
 */
export async function GET(req: Request) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runFetchRss();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  const cronOk = checkCronAuth(req);
  const userId = await getSessionUserId();
  if (!cronOk && !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runFetchRss();
  return NextResponse.json({ ok: true, ...result });
}
