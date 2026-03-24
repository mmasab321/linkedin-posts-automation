import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  }
  return null;
}

async function fetchTranscript(videoId: string): Promise<string> {
  // Use Jina AI reader to extract YouTube transcript — works from serverless
  const jinaUrl = `https://r.jina.ai/https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(jinaUrl, {
    headers: {
      Accept: "text/plain",
      "X-Return-Format": "text",
    },
  });

  if (!res.ok) throw new Error("Could not fetch transcript");

  const text = await res.text();
  if (!text || text.length < 100) throw new Error("No transcript found for this video");

  // Jina returns the full page text — strip the header/metadata lines
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  // Find where the transcript content starts (after title/metadata)
  const transcriptStart = lines.findIndex(
    (l) => l.length > 80 || l.includes(".") || l.includes(","),
  );
  const transcriptLines = transcriptStart > 0 ? lines.slice(transcriptStart) : lines;
  const transcript = transcriptLines.join(" ").replace(/\s+/g, " ").trim();

  if (!transcript) throw new Error("Transcript is empty");
  return transcript.slice(0, 8000);
}

export async function POST(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json().catch(() => ({}));
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const videoId = extractVideoId(url);
  if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });

  try {
    const transcript = await fetchTranscript(videoId);
    return NextResponse.json({ transcript });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Could not fetch transcript. Try a different video." },
      { status: 422 },
    );
  }
}
