"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PromptTab() {
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/user/prompt");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load");
      setSystemPrompt(data.systemPrompt ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load prompt.");
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
      const res = await fetch("/api/user/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save");
      }
      setMessage("Prompt saved.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    setResetting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/user/prompt?default=true");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load default");
      const defaultPrompt = data.systemPrompt ?? "";
      const putRes = await fetch("/api/user/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: defaultPrompt }),
      });
      if (!putRes.ok) throw new Error("Failed to save default");
      setSystemPrompt(defaultPrompt);
      setMessage("Reset to default prompt.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reset.");
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <div className="text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="space-y-4 border-t pt-4">
      <Label className="block">System prompt (LLM)</Label>
      <p className="text-xs text-neutral-500">
        This prompt is used when generating LinkedIn drafts. Edit to match your voice and niche.
      </p>
      <Textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        rows={18}
        className="font-mono text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={resetToDefault} disabled={resetting}>
          {resetting ? "Resetting…" : "Reset to default"}
        </Button>
      </div>
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
