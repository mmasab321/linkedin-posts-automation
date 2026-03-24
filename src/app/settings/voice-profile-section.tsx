"use client";

import * as React from "react";

export function VoiceProfileSection() {
  const [name, setName] = React.useState("");
  const [headline, setHeadline] = React.useState("");
  const [niche, setNiche] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [tone, setTone] = React.useState("");
  const [avoidPhrases, setAvoidPhrases] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/user/voice-profile");
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setName(data.name ?? "");
        setHeadline(data.headline ?? "");
        setNiche(data.niche ?? "");
        setAudience(data.audience ?? "");
        setTone(data.tone ?? "");
        setAvoidPhrases(data.avoidPhrases ?? "");
      }
    } catch {
      setError("Failed to load voice profile.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setMessage(null); setError(null);
    try {
      const res = await fetch("/api/user/voice-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          headline: headline.trim(),
          niche: niche.trim(),
          audience: audience.trim(),
          tone: tone.trim(),
          avoidPhrases: avoidPhrases.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save");
      }
      setMessage("Voice profile saved.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-on-surface-variant">Loading…</div>;

  return (
    <div className="bg-surface-container rounded-xl p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Voice Profile</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Your identity injected into the system prompt when all fields are filled.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2 text-[11px] font-bold bg-primary text-on-primary rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all uppercase disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>

      {message && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">{message}</div>}
      {error && <div className="mb-4 rounded-xl border border-error/20 bg-error-container/10 p-4 text-sm text-error">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Headline</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. AI Automation & SaaS Developer"
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Niche</label>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. AI, SaaS, developer tools"
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Target Audience</label>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Who you write for"
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tone</label>
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="e.g. casual, direct, builder-minded"
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Never Use (comma-separated)</label>
          <textarea
            value={avoidPhrases}
            onChange={(e) => setAvoidPhrases(e.target.value)}
            placeholder="Phrases to avoid"
            rows={2}
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-3 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
