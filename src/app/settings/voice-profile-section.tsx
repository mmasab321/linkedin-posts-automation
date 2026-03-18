"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

  React.useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
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

  if (loading) return <div className="text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="space-y-4 border-b border-white/10 pb-6 mb-6">
      <h3 className="text-lg font-semibold text-white">Voice profile</h3>
      <p className="text-xs text-neutral-500">
        Your identity for the LLM. Injected into the system prompt when all fields are filled.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your display name" />
        </div>
        <div className="space-y-1">
          <Label>Headline</Label>
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. AI Automation & SaaS Developer" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Niche</Label>
        <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. AI, SaaS, developer tools" />
      </div>
      <div className="space-y-1">
        <Label>Audience</Label>
        <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Who you write for" />
      </div>
      <div className="space-y-1">
        <Label>Tone</Label>
        <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. casual, direct, builder-minded" />
      </div>
      <div className="space-y-1">
        <Label>Never use (comma-separated)</Label>
        <Textarea value={avoidPhrases} onChange={(e) => setAvoidPhrases(e.target.value)} placeholder="Phrases to avoid" rows={2} />
      </div>
      <Button type="button" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save voice profile"}
      </Button>
      {message && (
        <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
