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
  // Fetch the YouTube page as a browser would
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });

  if (!pageRes.ok) throw new Error("Could not reach YouTube");
  const html = await pageRes.text();

  // Extract ytInitialPlayerResponse from the page
  const startIdx = html.indexOf("ytInitialPlayerResponse");
  if (startIdx === -1) throw new Error("Could not parse YouTube page");
  const jsonStart = html.indexOf("{", startIdx);
  if (jsonStart === -1) throw new Error("Could not parse YouTube page");

  let depth = 0;
  let jsonEnd = jsonStart;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) { jsonEnd = i; break; } }
  }

  let playerResponse: any;
  try {
    playerResponse = JSON.parse(html.slice(jsonStart, jsonEnd + 1));
  } catch {
    throw new Error("Could not parse player response");
  }

  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks?.length) {
    throw new Error("No captions available for this video");
  }

  // Prefer English, fall back to first available
  const track =
    captionTracks.find((t: any) => t.languageCode === "en") ||
    captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ||
    captionTracks[0];

  const captionUrl = `${track.baseUrl}&fmt=json3`;
  const captionRes = await fetch(captionUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!captionRes.ok) throw new Error("Could not fetch caption track");

  const captionData = await captionRes.json();

  const transcript = captionData.events
    ?.filter((e: any) => e.segs)
    ?.flatMap((e: any) => e.segs?.map((s: any) => s.utf8 ?? ""))
    ?.join(" ")
    ?.replace(/\[.*?\]/g, "") // remove [Music], [Applause] etc
    ?.replace(/\s+/g, " ")
    ?.trim();

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
