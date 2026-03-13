/**
 * Fetch RSS feed and return cleaned article titles for topic pool.
 */
import Parser from "rss-parser";

const PREFIXES_TO_STRIP = [
  /^how to\s+/i,
  /^the ultimate\s+/i,
  /^why\s+/i,
  /^\d+\.\s*/,
  /^best\s+/i,
  /^top\s+\d+\s+/i,
];

function cleanTitle(title: string): string {
  let t = title.trim();
  for (const re of PREFIXES_TO_STRIP) {
    t = t.replace(re, "");
  }
  return t.trim();
}

export async function fetchRssTitles(url: string, maxItems = 15): Promise<string[]> {
  const parser = new Parser();
  const feed = await parser.parseURL(url);
  const titles: string[] = [];
  const seen = new Set<string>();
  const items = feed.items?.slice(0, maxItems) ?? [];
  for (const item of items) {
    const raw = item.title?.trim();
    if (!raw || raw.length < 10) continue;
    const cleaned = cleanTitle(raw);
    if (cleaned.length < 10) continue;
    const key = cleaned.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(cleaned);
  }
  return titles;
}
