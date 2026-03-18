import { NextResponse } from "next/server";

import { runFetchRss } from "@/lib/autopilot/fetchRssCron";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: run daily before autopilot. Fetches all RSS feeds and fills the topic pool.
 * Call GET /api/cron/fetch-rss with CRON_SECRET (same as autopilot cron).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runFetchRss();
  return NextResponse.json({ ok: true, ...result });
}
