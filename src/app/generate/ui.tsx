"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Post type</Label>
          <Select value={postType} onValueChange={(v) => setPostType(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {postTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tone</Label>
          <Select value={toneModifier} onValueChange={(v) => setToneModifier(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {tones.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Topic</Label>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Automating client reporting with AI" />
      </div>

      <div className="space-y-2">
        <Label>Key point</Label>
        <Textarea
          value={keyPoint}
          onChange={(e) => setKeyPoint(e.target.value)}
          placeholder="What’s the main takeaway you want to land?"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
        <Button
          type="submit"
          disabled={loading || !topic.trim() || !keyPoint.trim()}
          className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] disabled:opacity-50 transition-all rounded-full px-8 py-6 text-base font-semibold"
        >
          {loading ? "Generating…" : "Generate Draft"}
        </Button>
      </div>
    </form>
  );
}

