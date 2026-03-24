"use client";

import * as React from "react";

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

  React.useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setMessage(null); setError(null);
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
    setResetting(true); setMessage(null); setError(null);
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

  if (loading) return <div className="text-sm text-on-surface-variant">Loading…</div>;

  return (
    <div className="bg-surface-container rounded-xl p-8 mt-6">
      <div className="flex justify-between mb-6 items-start">
        <div>
          <h2 className="text-xl font-bold text-on-surface">System Personality</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            The core prompt that dictates your writing style, formatting, and constraints.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={resetToDefault}
            disabled={resetting}
            className="px-5 py-2 text-[11px] font-bold text-on-surface-variant hover:bg-surface-bright rounded-lg transition-all uppercase disabled:opacity-50"
          >
            {resetting ? "Resetting…" : "Reset to Default"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-[11px] font-bold bg-primary text-on-primary rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all uppercase disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {message && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">{message}</div>}
      {error && <div className="mb-4 rounded-xl border border-error/20 bg-error-container/10 p-4 text-sm text-error">{error}</div>}

      <div className="relative">
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={18}
          spellCheck={false}
          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6 text-sm font-mono text-on-surface leading-relaxed focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all outline-none resize-none"
        />
        <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-surface-container-highest/80 backdrop-blur-md rounded-lg border border-outline-variant/20">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">LLM: Kimi (Moonshot)</span>
        </div>
      </div>
    </div>
  );
}
