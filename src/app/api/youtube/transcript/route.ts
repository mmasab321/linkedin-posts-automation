import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {
    // bare video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  }
  return null;
}

export async function POST(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json().catch(() => ({}));
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const videoId = extractVideoId(url);
  if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
    if (!transcript) return NextResponse.json({ error: "No transcript found for this video." }, { status: 404 });
    // Truncate to ~8000 chars to stay within token limits
    return NextResponse.json({ transcript: transcript.slice(0, 8000) });
  } catch {
    return NextResponse.json(
      { error: "Could not fetch transcript. The video may not have captions enabled." },
      { status: 422 },
    );
  }
}
