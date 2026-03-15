"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AutopilotStatus = {
  enabled: boolean;
  pausedUntil: string | null;
  scheduleTime: string;
  maxAutoPerMonth: number;
  autopilotUsedThisMonth: number;
  pendingTopicsInPool: number;
  minScoreToApprove: number;
};

type ContentSource = {
  id: string;
  type: string;
  url: string | null;
  title: string;
  isActive: boolean;
  priority: number;
};

export function AutopilotTab() {
  const [status, setStatus] = React.useState<AutopilotStatus | null>(null);
  const [sources, setSources] = React.useState<ContentSource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [enabled, setEnabled] = React.useState(false);
  const [scheduleTime, setScheduleTime] = React.useState("09:00");
  const [maxAutoPerMonth, setMaxAutoPerMonth] = React.useState(10);
  const [minScore, setMinScore] = React.useState(85);
  const [saving, setSaving] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [newRssUrl, setNewRssUrl] = React.useState("");
  const [newEvergreen, setNewEvergreen] = React.useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, configRes, sourcesRes] = await Promise.all([
        fetch("/api/autopilot/status"),
        fetch("/api/autopilot/config"),
        fetch("/api/admin/content-sources"),
      ]);
      const statusJson = statusRes.ok ? await statusRes.json() : null;
      const configJson = configRes.ok ? await configRes.json() : null;
      const sourcesJson = sourcesRes.ok ? await sourcesRes.json() : null;
      if (statusJson) setStatus(statusJson);
      if (statusJson?.enabled != null) setEnabled(statusJson.enabled);
      if (configJson?.scheduleTime != null) setScheduleTime(configJson.scheduleTime);
      if (configJson?.maxAutoPerMonth != null) setMaxAutoPerMonth(configJson.maxAutoPerMonth);
      const rules = (configJson?.validationRules ?? {}) as Record<string, unknown>;
      setMinScore(Number(rules.minScoreToApprove) || 85);
      if (sourcesJson?.sources) setSources(sourcesJson.sources);
    } catch (e) {
      setError("Failed to load autopilot.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function toggleEnabled() {
    setToggling(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/autopilot/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      setEnabled(json.enabled ?? !enabled);
      setMessage(json.enabled ? "Autopilot enabled." : "Autopilot disabled.");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to toggle.");
    } finally {
      setToggling(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await fetch("/api/autopilot/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleTime,
          maxAutoPerMonth,
          validationRules: { minScoreToApprove: minScore },
        }),
      });
      setMessage("Config saved.");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function addRss() {
    if (!newRssUrl.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/content-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "RSS", url: newRssUrl.trim(), title: newRssUrl.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setNewRssUrl("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed.");
    }
  }

  async function addEvergreen() {
    const lines = newEvergreen.split("\n").map((t) => t.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/content-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "EVERGREEN", title: lines.join("\n") }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setNewEvergreen("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed.");
    }
  }

  if (loading) return <div className="text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <div className="font-medium">Autopilot Mode</div>
          <div className="text-sm text-neutral-500">Hands-free: system picks topics, generates and schedules within your quota.</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggleEnabled}
          disabled={toggling}
          className="inline-flex items-center gap-2"
        >
          <span
            className={cn(
              "relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-200",
              enabled ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-600",
            )}
          >
            <span
              className={cn(
                "absolute top-[2px] h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200",
                enabled ? "left-[2px] translate-x-5" : "left-[2px] translate-x-0",
              )}
            />
          </span>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {enabled ? "On" : "Off"}
          </span>
        </button>
      </div>

      {status && (
        <div className="rounded-lg border bg-neutral-50 p-3 text-sm dark:bg-neutral-900/50">
          <div className="grid gap-1 sm:grid-cols-2">
            <span>Quota this month: {status.autopilotUsedThisMonth} / {status.maxAutoPerMonth} auto</span>
            <span>Topics in pool: {status.pendingTopicsInPool}</span>
            <span>Min score to auto-approve: {minScore}</span>
            {status.pausedUntil && <span className="text-amber-600">Paused until {new Date(status.pausedUntil).toLocaleString()}</span>}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Post at (24h)</Label>
        <Input
          type="time"
          value={scheduleTime}
          onChange={(e) => setScheduleTime(e.target.value)}
          className="max-w-[8rem]"
        />
      </div>
      <div className="space-y-2">
        <Label>Max auto-posts per month (1–15)</Label>
        <input
          type="range"
          min={1}
          max={15}
          value={maxAutoPerMonth}
          onChange={(e) => setMaxAutoPerMonth(Number(e.target.value))}
          className="w-full max-w-xs"
        />
        <span className="text-sm">{maxAutoPerMonth}</span>
      </div>
      <div className="space-y-2">
        <Label>Validation: min score to auto-approve (70–95)</Label>
        <select
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="rounded border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value={70}>Relaxed (70+)</option>
          <option value={85}>Strict (85+)</option>
          <option value={95}>Very strict (95+)</option>
        </select>
      </div>
      <Button type="button" onClick={saveConfig} disabled={saving}>
        {saving ? "Saving…" : "Save config"}
      </Button>

      <div className="border-t pt-4">
        <Label className="mb-2 block">Content sources</Label>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-neutral-500 mb-1">RSS feed URL</div>
            <div className="flex gap-2">
              <Input value={newRssUrl} onChange={(e) => setNewRssUrl(e.target.value)} placeholder="https://..." />
              <Button type="button" variant="outline" size="sm" onClick={addRss}>Add</Button>
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Evergreen topics (one per line)</div>
            <Textarea value={newEvergreen} onChange={(e) => setNewEvergreen(e.target.value)} placeholder="Why I stopped using X&#10;The $5k mistake..." rows={3} />
            <Button type="button" variant="outline" size="sm" onClick={addEvergreen} className="mt-1">Add</Button>
          </div>
          {sources.length > 0 && (
            <ul className="text-sm">
              {sources.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className={cn(!s.isActive && "text-neutral-400")}>[{s.type}] {s.url || s.title.slice(0, 40)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {message && <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">{message}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    </div>
  );
}
