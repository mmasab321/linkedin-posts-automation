export function parseMediaUrls(json: string | null): string[] {
  if (json == null || json.trim() === "") return [];
  try {
    const arr = JSON.parse(json) as unknown;
    return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === "string" && u.startsWith("http")) : [];
  } catch {
    return [];
  }
}

export function inferMediaType(url: string): "image" | "video" | "document" {
  const u = url.toLowerCase();
  if (/\.(pdf)(\?|$)/i.test(u)) return "document";
  if (/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(u)) return "video";
  return "image";
}
