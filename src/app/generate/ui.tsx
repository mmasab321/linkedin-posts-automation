"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Sparkles } from "lucide-react";

const postTypes = ["story", "insight", "project", "tip", "hot_take", "results"] as const;
const tones = ["punchy", "casual", "technical", "neutral"] as const;

export function GenerateForm() {
  const router = useRouter();
  const [postType, setPostType] = React.useState<(typeof postTypes)[number]>("insight");
  const [toneModifier, setToneModifier] = React.useState<(typeof tones)[number]>("neutral");
  const [topic, setTopic] = React.useState("");
  const [keyPoint, setKeyPoint] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postType, topic, keyPoint, toneModifier }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to generate.");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Failed to generate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface midnight-glow">
      <main className="pt-8 pb-12 px-6 flex justify-center">
        <div className="w-full max-w-2xl flex flex-col gap-10">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-[2.75rem] font-black tracking-tighter leading-tight text-on-surface">Generate a Post</h1>
            <p className="text-on-surface-variant text-lg">Define your vision and let the curator craft your narrative.</p>
          </div>

          {/* Form card */}
          <form onSubmit={onSubmit} className="bg-surface-container rounded-xl p-8 space-y-8 shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
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

            {/* Tone segmented buttons */}
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
              <div className="rounded-xl border border-error/20 bg-error-container/10 p-4 text-sm text-error">
                {error}
              </div>
            )}

            {/* CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !topic.trim() || !keyPoint.trim()}
                className="w-full py-5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Generating…" : "Generate Post"}
              </button>
            </div>
          </form>

          {/* Preview / loading area */}
          <div className="bg-surface-container-low rounded-xl p-8 border border-dashed border-outline-variant/30 flex flex-col items-center justify-center min-h-[200px] text-center space-y-4">
            {loading ? (
              <>
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={16} className="text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-on-surface font-semibold">Crafting your post…</p>
                  <p className="text-on-surface-variant text-sm">This usually takes 5–10 seconds.</p>
                </div>
              </>
            ) : (
              <>
                <Sparkles size={24} className="text-outline" />
                <div className="space-y-1">
                  <p className="text-on-surface font-semibold">Ready to craft your masterpiece</p>
                  <p className="text-on-surface-variant text-sm max-w-sm">Once generated, your post preview will appear in the dashboard for final edits and scheduling.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
