import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { fetchRssTitles } from "@/lib/autopilot/rss";
import { textSimilarity } from "@/lib/autopilot/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Fetch RSS feeds from ContentSource (type=RSS), extract titles, add to TopicPool.
 * Avoids duplicates (similar title in last 30 days).
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.contentSource.findMany({
    where: { type: "RSS", isActive: true, url: { not: null } },
  });

  const added: string[] = [];
  const skipped: string[] = [];
  const since = new Date();
  since.setDate(since.getDate() - 30);

  for (const src of sources) {
    const url = src.url!;
    try {
      const titles = await fetchRssTitles(url, 15);
      await prisma.contentSource.update({
        where: { id: src.id },
        data: { lastFetched: new Date() },
      });

      const recentTopics = await prisma.topicPool.findMany({
        where: { sourceId: src.id, createdAt: { gte: since } },
        select: { title: true },
      });

      for (const title of titles) {
        const tooSimilar = recentTopics.some((r) => textSimilarity(title, r.title) >= 0.8);
        if (tooSimilar) {
          skipped.push(title.slice(0, 50));
          continue;
        }
        const existing = await prisma.topicPool.findFirst({
          where: { sourceId: src.id, title: { equals: title, mode: "insensitive" }, status: "PENDING" },
        });
        if (existing) {
          skipped.push(title.slice(0, 50));
          continue;
        }
        await prisma.topicPool.create({
          data: { sourceId: src.id, title, status: "PENDING", priorityBoost: src.priority },
        });
        added.push(title.slice(0, 50));
      }
    } catch (err) {
      console.error("RSS fetch error", url, err);
    }
  }

  return NextResponse.json({ ok: true, added: added.length, skipped: skipped.length, addedSample: added.slice(0, 5) });
}
