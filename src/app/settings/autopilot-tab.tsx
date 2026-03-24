"use client";

import * as React from "react";
import { Rss, BookOpen, RefreshCw, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const POST_TYPES = ["story", "insight", "project", "tip", "hot_take", "results"] as const;
type PostTypeName = (typeof POST_TYPES)[number];
const DEFAULT_PILLARS: Record<PostTypeName, number> = {
  story: 0, insight: 0, project: 0, tip: 0, hot_take: 0, results: 0,
};

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

type ExperienceEntry = {
  id: string;
  title: string;
  description: string;
  tags: string;
  createdAt: string;
};

export function AutopilotTab() {
  const [status, setStatus] = React.useState<AutopilotStatus | null>(null);
  const [sources, setSources] = React.useState<ContentSource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [enabled, setEnabled] = React.useState(false);
  const [scheduleTime, setScheduleTime] = React.useState("09:00");
  const [maxAutoPerMonth, setMaxAutoPerMonth] = React.useState(10);
  const [maxAutoPerMonthLimit, setMaxAutoPerMonthLimit] = React.useState(15);
  const [minScore, setMinScore] = React.useState(85);
  const [saving, setSaving] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [newRssUrl, setNewRssUrl] = React.useState("");
  const [newEvergreen, setNewEvergreen] = React.useState("");
  const [fetchRssLoading, setFetchRssLoading] = React.useState(false);
  const [experiences, setExperiences] = React.useState<ExperienceEntry[]>([]);
  const [expTitle, setExpTitle] = React.useState("");
  const [expDescription, setExpDescription] = React.useState("");
  const [expTags, setExpTags] = React.useState("");
  const [expSaving, setExpSaving] = React.useState(false);
  const [pillarsEnabled, setPillarsEnabled] = React.useState(false);
  const [pillars, setPillars] = React.useState<Record<PostTypeName, number>>(DEFAULT_PILLARS);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [statusRes, configRes, sourcesRes, experiencesRes] = await Promise.all([
        fetch("/api/autopilot/status"),
        fetch("/api/autopilot/config"),
        fetch("/api/admin/content-sources"),
        fetch("/api/admin/experiences"),
      ]);
      const statusJson = statusRes.ok ? await statusRes.json() : null;
      const configJson = configRes.ok ? await configRes.json() : null;
      const sourcesJson = sourcesRes.ok ? await sourcesRes.json() : null;
      const experiencesJson = experiencesRes.ok ? await experiencesRes.json() : null;
      if (statusJson) setStatus(statusJson);
      if (statusJson?.enabled != null) setEnabled(statusJson.enabled);
      if (configJson?.scheduleTime != null) setScheduleTime(configJson.scheduleTime);
      if (configJson?.maxAutoPerMonth != null) setMaxAutoPerMonth(configJson.maxAutoPerMonth);
      if (configJson?.maxAutoPerMonthLimit != null) setMaxAutoPerMonthLimit(configJson.maxAutoPerMonthLimit);
      const rules = (configJson?.validationRules ?? {}) as Record<string, unknown>;
      setMinScore(Number(rules.minScoreToApprove) || 85);
      const storedPillars = rules.contentPillars as Record<string, number> | undefined;
      if (storedPillars && Object.values(storedPillars).some((v) => Number(v) > 0)) {
        setPillarsEnabled(true);
        setPillars({ ...DEFAULT_PILLARS, ...Object.fromEntries(Object.entries(storedPillars).map(([k, v]) => [k, Number(v)])) } as Record<PostTypeName, number>);
      } else {
        setPillarsEnabled(false);
        setPillars(DEFAULT_PILLARS);
      }
      if (sourcesJson?.sources) setSources(sourcesJson.sources);
      if (experiencesJson?.entries) setExperiences(experiencesJson.entries);
    } catch {
      setError("Failed to load autopilot.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function toggleEnabled() {
    setToggling(true); setError(null); setMessage(null);
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
    setSaving(true); setError(null); setMessage(null);
    try {
      await fetch("/api/autopilot/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleTime,
          maxAutoPerMonth,
          validationRules: { minScoreToApprove: minScore, contentPillars: pillarsEnabled ? pillars : {} },
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

  async function fetchRssNow() {
    setFetchRssLoading(true); setError(null); setMessage(null);
    try {
      const res = await fetch("/api/admin/fetch-rss", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to fetch RSS");
      setMessage(data.added != null ? `RSS fetch done: ${data.added} topics added, ${data.skipped} skipped.` : "RSS fetch done.");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch RSS.");
    } finally {
      setFetchRssLoading(false);
    }
  }

  async function addExperience() {
    if (!expTitle.trim() || !expDescription.trim() || !expTags.trim()) return;
    setExpSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: expTitle.trim(), description: expDescription.trim(), tags: expTags.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to add");
      }
      setExpTitle(""); setExpDescription(""); setExpTags("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to add experience.");
    } finally {
      setExpSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-on-surface-variant">Loading…</div>;

  const rssSources = sources.filter((s) => s.type === "RSS");
  const evergreenSources = sources.filter((s) => s.type === "EVERGREEN");
  const totalPillar = Object.values(pillars).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">{message}</div>}
      {error && <div className="rounded-xl border border-error/20 bg-error-container/10 p-4 text-sm text-error">{error}</div>}

      {/* Automation Engine card */}
      <div className="bg-surface-container rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Automation Engine</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Hands-free: system picks topics, generates and schedules within your quota.
            </p>
          </div>
          {/* Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={toggleEnabled}
            disabled={toggling}
            className="flex items-center gap-3 disabled:opacity-50"
          >
            <span
              className={cn(
                "relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-200",
                enabled ? "bg-emerald-500" : "bg-surface-container-highest"
              )}
            >
              <span
                className={cn(
                  "absolute top-[2px] h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200",
                  enabled ? "left-[2px] translate-x-5" : "left-[2px] translate-x-0"
                )}
              />
            </span>
            <span className={cn("text-sm font-bold uppercase tracking-wider", enabled ? "text-emerald-400" : "text-on-surface-variant")}>
              {enabled ? "On" : "Off"}
            </span>
          </button>
        </div>

        {/* Status stats */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1">Auto Used</p>
              <p className="text-lg font-black text-on-surface">{status.autopilotUsedThisMonth}<span className="text-on-surface-variant font-normal text-sm">/{status.maxAutoPerMonth}</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1">Topics Pool</p>
              <p className="text-lg font-black text-on-surface">{status.pendingTopicsInPool}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1">Min Score</p>
              <p className="text-lg font-black text-on-surface">{minScore}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1">Status</p>
              {status.pausedUntil ? (
                <p className="text-sm font-bold text-amber-400">Paused</p>
              ) : (
                <p className={cn("text-sm font-bold", enabled ? "text-emerald-400" : "text-on-surface-variant")}>
                  {enabled ? "Active" : "Inactive"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bento grid: sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
            <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-3">Post Time (24h)</p>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
          </div>
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Max Posts/Mo</p>
              <span className="text-lg font-black text-primary">{maxAutoPerMonth}</span>
            </div>
            <input
              type="range"
              min={1}
              max={maxAutoPerMonthLimit}
              value={maxAutoPerMonth}
              onChange={(e) => setMaxAutoPerMonth(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
              <span>1</span><span>{maxAutoPerMonthLimit}</span>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
            <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-3">Quality Threshold</p>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all appearance-none"
            >
              <option value={70}>Relaxed (70+)</option>
              <option value={85}>Strict (85+)</option>
              <option value={95}>Very strict (95+)</option>
            </select>
          </div>
        </div>

        {/* Content Pillars */}
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Content Pillars</p>
              <p className="text-xs text-on-surface-variant/60 mt-0.5">Set target % per post type for bias balancing</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={cn(
                  "relative h-6 w-10 rounded-full transition-colors duration-200",
                  pillarsEnabled ? "bg-primary/40" : "bg-surface-container-highest"
                )}
                onClick={() => setPillarsEnabled(!pillarsEnabled)}
              >
                <span className={cn("absolute top-[2px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200", pillarsEnabled ? "left-[2px] translate-x-4" : "left-[2px] translate-x-0")} />
              </div>
              <span className="text-xs font-bold text-on-surface-variant uppercase">{pillarsEnabled ? "On" : "Off"}</span>
            </label>
          </div>
          {pillarsEnabled && (
            <>
              <div className="space-y-3">
                {POST_TYPES.map((type) => (
                  <div key={type} className="flex items-center gap-4">
                    <span className="w-20 text-xs font-medium capitalize text-on-surface-variant">{type.replace("_", " ")}</span>
                    <div className="flex-1 relative">
                      <div className="h-1.5 bg-surface-container-highest rounded-full">
                        <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${pillars[type]}%` }} />
                      </div>
                      <input
                        type="range"
                        min={0} max={100} step={5}
                        value={pillars[type]}
                        onChange={(e) => setPillars((prev) => ({ ...prev, [type]: Number(e.target.value) }))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-bold text-primary">{pillars[type]}%</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-on-surface-variant mt-3">
                Total: <span className={cn("font-bold", totalPillar === 0 ? "text-amber-400" : "text-on-surface")}>{totalPillar}%</span> — normalised automatically.
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={saveConfig}
          disabled={saving}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Config"}
        </button>
      </div>

      {/* Content Sources */}
      <div className="bg-surface-container rounded-xl p-8">
        <h2 className="text-xl font-bold text-on-surface mb-1">Content Sources</h2>
        <p className="text-sm text-on-surface-variant mb-6">RSS feeds and evergreen topics for autopilot to draw from.</p>

        <div className="space-y-6">
          {/* RSS */}
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-3">
              <Rss size={16} className="text-primary" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">RSS Feed URL</p>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={newRssUrl}
                onChange={(e) => setNewRssUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
              <button
                type="button"
                onClick={addRss}
                className="px-4 py-2.5 bg-surface-container-high border border-outline-variant/20 text-[11px] font-bold rounded-lg hover:border-primary/40 transition-all uppercase tracking-tighter flex items-center gap-1 text-on-surface-variant"
              >
                <Plus size={12} /> Add
              </button>
              <button
                type="button"
                onClick={fetchRssNow}
                disabled={fetchRssLoading || rssSources.length === 0}
                className="px-4 py-2.5 bg-secondary-container text-on-secondary-container text-[11px] font-bold rounded-lg hover:opacity-90 transition-all uppercase tracking-tighter disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw size={12} />
                {fetchRssLoading ? "Fetching…" : "Fetch Now"}
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant/60">RSS titles fetched daily at 7:00 UTC. Use &quot;Fetch Now&quot; to refresh immediately.</p>
            {rssSources.length > 0 && (
              <ul className="mt-3 space-y-1">
                {rssSources.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className={cn("w-2 h-2 rounded-full flex-none", s.isActive ? "bg-emerald-500" : "bg-surface-container-highest")} />
                    {s.url || s.title.slice(0, 60)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Evergreen */}
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-primary" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Evergreen Topics</p>
              <span className="text-[10px] text-on-surface-variant/60">(one per line)</span>
            </div>
            <textarea
              value={newEvergreen}
              onChange={(e) => setNewEvergreen(e.target.value)}
              placeholder={"Why I stopped using X\nThe $5k mistake..."}
              rows={3}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-3 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all resize-none mb-2"
            />
            <button
              type="button"
              onClick={addEvergreen}
              className="px-4 py-2 bg-surface-container-high border border-outline-variant/20 text-[11px] font-bold rounded-lg hover:border-primary/40 transition-all uppercase tracking-tighter flex items-center gap-1 text-on-surface-variant"
            >
              <Plus size={12} /> Add Topics
            </button>
            {evergreenSources.length > 0 && (
              <ul className="mt-3 space-y-1">
                {evergreenSources.map((s) => (
                  <li key={s.id} className="text-xs text-on-surface-variant">{s.title.slice(0, 60)}{s.title.length > 60 ? "…" : ""}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Experience Bank */}
      <div className="bg-surface-container rounded-xl p-8">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={20} className="text-primary" />
          <h2 className="text-xl font-bold text-on-surface">Experience Bank</h2>
        </div>
        <p className="text-sm text-on-surface-variant mb-6">
          Short experiences autopilot can reference when a topic matches your tags.
        </p>

        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10 mb-4">
          <div className="space-y-3">
            <input
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              placeholder="Title (e.g. Built SubSlice in a weekend)"
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
            <textarea
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
              placeholder="Description (1–3 sentences)"
              rows={2}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-3 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all resize-none"
            />
            <input
              value={expTags}
              onChange={(e) => setExpTags(e.target.value)}
              placeholder="Tags, comma-separated (e.g. react-native,mvp,speed)"
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
            <button
              type="button"
              onClick={addExperience}
              disabled={expSaving || !expTitle.trim() || !expDescription.trim() || !expTags.trim()}
              className="px-5 py-2 text-[11px] font-bold bg-primary text-on-primary rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all uppercase disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={12} />
              {expSaving ? "Adding…" : "Add Entry"}
            </button>
          </div>
        </div>

        {experiences.length > 0 && (
          <ul className="space-y-2">
            {experiences.map((e) => (
              <li key={e.id} className="rounded-xl border border-outline-variant/10 bg-surface-container-low px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-sm font-semibold text-on-surface">{e.title}</span>
                    <p className="text-xs text-on-surface-variant mt-0.5">{e.description.slice(0, 80)}{e.description.length > 80 ? "…" : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 flex-none">
                    {e.tags.split(",").map((t) => (
                      <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t.trim()}</span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
