"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Sparkles, Youtube, PenLine } from "lucide-react";

const postTypes = ["story", "insight", "project", "tip", "hot_take", "results"] as const;
const tones = ["punchy", "casual", "technical", "neutral"] as const;
type Tab = "manual" | "youtube";

export function GenerateForm() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("manual");

  // Manual form state
  const [postType, setPostType] = React.useState<(typeof postTypes)[number]>("insight");
  const [toneModifier, setToneModifier] = React.useState<(typeof tones)[number]>("neutral");
  const [topic, setTopic] = React.useState("");
  const [keyPoint, setKeyPoint] = React.useState("");

  // YouTube form state
  const [youtubeUrl, setYoutubeUrl] = React.useState("");
  const [youtubeTone, setYoutubeTone] = React.useState<(typeof tones)[number]>("neutral");
  const [fetchingTranscript, setFetchingTranscript] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmitManual(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "manual", postType, topic, keyPoint, toneModifier }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to generate.");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Failed to generate.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitYoutube(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFetchingTranscript(true);
    try {
      // Step 1: fetch transcript
      const tRes = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      const tJson = await tRes.json().catch(() => null);
      if (!tRes.ok) throw new Error(tJson?.error ?? "Could not fetch transcript.");
      setFetchingTranscript(false);

      // Step 2: generate post from transcript
      setLoading(true);
      const gRes = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "youtube", transcript: tJson.transcript, toneModifier: youtubeTone }),
      });
      const gJson = await gRes.json().catch(() => null);
      if (!gRes.ok) throw new Error(gJson?.error ?? "Failed to generate.");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Failed to generate.");
      setFetchingTranscript(false);
    } finally {
      setLoading(false);
    }
  }

  const isGenerating = loading || fetchingTranscript;

  const loadingMessage = fetchingTranscript
    ? "Fetching transcript…"
    : "Crafting your post…";

  return (
    <div className="min-h-screen bg-surface midnight-glow">
      <main className="pt-8 pb-12 px-6 flex justify-center">
        <div className="w-full max-w-2xl flex flex-col gap-10">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-[2.75rem] font-black tracking-tighter leading-tight text-on-surface">Generate a Post</h1>
            <p className="text-on-surface-variant text-lg">Define your vision and let the curator craft your narrative.</p>
          </div>

          {/* Source tabs */}
          <div className="flex gap-1 p-1 bg-surface-container rounded-xl">
            <button
              type="button"
              onClick={() => { setTab("manual"); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                tab === "manual"
                  ? "bg-surface-container-high text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <PenLine size={16} />
              Write Manually
            </button>
            <button
              type="button"
              onClick={() => { setTab("youtube"); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                tab === "youtube"
                  ? "bg-surface-container-high text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Youtube size={16} />
              From YouTube
            </button>
          </div>

          {/* Manual form */}
          {tab === "manual" && (
            <form onSubmit={onSubmitManual} className="bg-surface-container rounded-xl p-8 space-y-8 shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
              {/* Post type */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Post Type</label>
                <div className="relative">
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as any)}
                    className="w-full bg-surface-container-lowest text-on-surface ghost-border rounded-lg px-4 py-4 appearance-none outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  >
                    {postTypes.map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Tone of Voice</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-surface-container-lowest rounded-xl">
                  {tones.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setToneModifier(t)}
                      className={
                        toneModifier === t
                          ? "py-3 px-4 rounded-lg text-sm font-semibold bg-surface-container-high text-primary shadow-sm transition-all"
                          : "py-3 px-4 rounded-lg text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-all"
                      }
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Core Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. The future of decentralized finance"
                  className="w-full bg-surface-container-lowest text-on-surface ghost-border rounded-lg px-4 py-4 outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-outline"
                />
              </div>

              {/* Key point */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">The Key Takeaway</label>
                <textarea
                  value={keyPoint}
                  onChange={(e) => setKeyPoint(e.target.value)}
                  placeholder="What is the one thing you want readers to remember?"
                  rows={4}
                  className="w-full bg-surface-container-lowest text-on-surface ghost-border rounded-lg px-4 py-4 outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none placeholder:text-outline"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-error/20 bg-error-container/10 p-4 text-sm text-error">{error}</div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGenerating || !topic.trim() || !keyPoint.trim()}
                  className="w-full py-5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? "Generating…" : "Generate Post"}
                </button>
              </div>
            </form>
          )}

          {/* YouTube form */}
          {tab === "youtube" && (
            <form onSubmit={onSubmitYoutube} className="bg-surface-container rounded-xl p-8 space-y-8 shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
              <div className="space-y-2">
                <h2 className="text-on-surface font-semibold text-lg">YouTube → LinkedIn</h2>
                <p className="text-on-surface-variant text-sm">
                  Paste any YouTube video URL. We'll fetch the transcript, extract the core insight, and write a LinkedIn post in your voice.
                </p>
              </div>

              {/* URL input */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">YouTube Video URL</label>
                <div className="relative">
                  <Youtube size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-surface-container-lowest text-on-surface ghost-border rounded-lg pl-11 pr-4 py-4 outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-outline"
                  />
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Tone of Voice</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-surface-container-lowest rounded-xl">
                  {tones.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setYoutubeTone(t)}
                      className={
                        youtubeTone === t
                          ? "py-3 px-4 rounded-lg text-sm font-semibold bg-surface-container-high text-primary shadow-sm transition-all"
                          : "py-3 px-4 rounded-lg text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-all"
                      }
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4 space-y-2">
                <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-3">What happens next</p>
                {[
                  { step: "01", label: "Transcript fetched from YouTube" },
                  { step: "02", label: "Kimi extracts the core insight" },
                  { step: "03", label: "Post written in your voice" },
                  { step: "04", label: "Hook scored + improved if needed" },
                  { step: "05", label: "Sent to dashboard for approval" },
                ].map(({ step, label }) => (
                  <div key={step} className="flex items-center gap-3 text-sm">
                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{step}</span>
                    <span className="text-on-surface-variant">{label}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="rounded-xl border border-error/20 bg-error-container/10 p-4 text-sm text-error">{error}</div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGenerating || !youtubeUrl.trim()}
                  className="w-full py-5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? loadingMessage : "Generate from Video"}
                </button>
              </div>
            </form>
          )}

          {/* Loading / idle preview */}
          <div className="bg-surface-container-low rounded-xl p-8 border border-dashed border-outline-variant/30 flex flex-col items-center justify-center min-h-[180px] text-center space-y-4">
            {isGenerating ? (
              <>
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={16} className="text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-on-surface font-semibold">{loadingMessage}</p>
                  <p className="text-on-surface-variant text-sm">
                    {fetchingTranscript ? "Pulling captions from YouTube…" : "This usually takes 10–20 seconds."}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Sparkles size={24} className="text-outline" />
                <div className="space-y-1">
                  <p className="text-on-surface font-semibold">Ready to craft your masterpiece</p>
                  <p className="text-on-surface-variant text-sm max-w-sm">
                    Once generated, your post preview will appear in the dashboard for final edits and scheduling.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
