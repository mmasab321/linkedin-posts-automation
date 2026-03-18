"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Draft = {
  id: string;
  status: string;
  content: string;
  topic: string;
  postType: string;
  createdAt: string;
  isAutopilot?: boolean;
  firstComment?: string | null;
  disableLinkPreview?: boolean | null;
  mediaUrls?: string | null;
  schedule?: { scheduledFor: string; getlatePostId?: string | null; getlateStatus?: string | null } | null;
};

function parseMediaUrlsFromDraft(json: string | null | undefined): string[] {
  if (json == null || String(json).trim() === "") return [];
  try {
    const a = JSON.parse(json) as unknown;
    return Array.isArray(a) ? a.filter((u): u is string => typeof u === "string" && u.startsWith("http")) : [];
  } catch {
    return [];
  }
}

function renderLinkedInText(content: string) {
  const parts = content.split(/(\#[A-Za-z0-9_]+)/g);
  return parts.map((p, idx) => {
    if (p.startsWith("#")) {
      return (
        <span key={idx} className="text-sky-600 dark:text-sky-400">
          {p}
        </span>
      );
    }
    return <React.Fragment key={idx}>{p}</React.Fragment>;
  });
}

const PENDING_STATUSES = ["PENDING_REVIEW", "APPROVED"];
const SCHEDULED_STATUS = "SCHEDULED";
const DONE_STATUSES = ["PUBLISHED", "FAILED"];

export function DashboardClient() {
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [editScheduledFor, setEditScheduledFor] = React.useState<string>("");
  const [editFirstComment, setEditFirstComment] = React.useState<string>("");
  const [editDisableLinkPreview, setEditDisableLinkPreview] = React.useState<boolean>(false);
  const [editMediaUrls, setEditMediaUrls] = React.useState<string[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "pending" | "scheduled" | "done">("all");
  const [sourceFilter, setSourceFilter] = React.useState<"all" | "manual" | "autopilot">("all");
  const [autopilotStatus, setAutopilotStatus] = React.useState<{ enabled: boolean; pendingTopicsInPool: number } | null>(null);
  const [nextTopics, setNextTopics] = React.useState<{ topic: string; id: string }[]>([]);
  const [topicPile, setTopicPile] = React.useState<{ id: string; title: string }[]>([]);
  const [nextPostData, setNextPostData] = React.useState<{
    nextSlot: string | null;
    nextPost: {
      id: string;
      topic: string;
      content: string;
      approvalStatus: string;
      scheduledFor: string | null;
    } | null;
    message?: string;
  } | null>(null);
  const [pausing, setPausing] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/drafts");
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to load drafts.");
      const all: Draft[] = json.drafts ?? [];
      setDrafts(all.filter((d) => d.status !== "DISCARDED"));
    } catch (err: any) {
      setError(err?.message ?? "Failed to load drafts.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAutopilot() {
    try {
      const [statusRes, topicsRes, pileRes, nextPostRes] = await Promise.all([
        fetch("/api/autopilot/status"),
        fetch("/api/admin/topics?status=PENDING&limit=3"),
        fetch("/api/admin/topics?status=PENDING&limit=50"),
        fetch("/api/autopilot/next-post"),
      ]);
      if (statusRes.ok) {
        const j = await statusRes.json();
        setAutopilotStatus({ enabled: j.enabled, pendingTopicsInPool: j.pendingTopicsInPool ?? 0 });
      }
      if (topicsRes.ok) {
        const j = await topicsRes.json();
        setNextTopics((j.topics ?? []).map((t: { id: string; title: string }) => ({ id: t.id, topic: t.title })));
      }
      if (pileRes.ok) {
        const j = await pileRes.json();
        setTopicPile((j.topics ?? []).map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })));
      }
      if (nextPostRes.ok) {
        const j = await nextPostRes.json();
        setNextPostData({
          nextSlot: j.nextSlot ?? null,
          nextPost: j.nextPost ?? null,
          message: j.message,
        });
      }
    } catch {
      // ignore
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  React.useEffect(() => {
    loadAutopilot();
  }, []);

  async function discard(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discard: true }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to discard.");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to discard.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(id: string, isScheduled: boolean) {
    setBusyId(id);
    try {
      const body: {
        content: string;
        scheduledFor?: string;
        firstComment?: string;
        disableLinkPreview?: boolean;
        mediaUrls?: string[];
      } = { content: editValue };
      if (isScheduled && editScheduledFor) {
        body.scheduledFor = new Date(editScheduledFor).toISOString();
      }
      body.firstComment = editFirstComment.trim();
      body.disableLinkPreview = editDisableLinkPreview;
      const validUrls = editMediaUrls.filter((u) => u.trim().startsWith("http"));
      body.mediaUrls = validUrls;
      const res = await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to save.");
      setEditingId(null);
      setEditValue("");
      setEditScheduledFor("");
      setEditFirstComment("");
      setEditDisableLinkPreview(false);
      setEditMediaUrls([]);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save.");
    } finally {
      setBusyId(null);
    }
  }

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${id}/approve`, { method: "POST" });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to schedule.");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to schedule.");
    } finally {
      setBusyId(null);
    }
  }

  async function unschedule(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${id}/unschedule`, { method: "POST" });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to cancel.");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to cancel.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDraft(id: string, isScheduled: boolean) {
    setBusyId(id);
    setError(null);
    try {
      if (isScheduled) {
        const res = await fetch(`/api/drafts/${id}/unschedule`, { method: "POST" });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error ?? "Failed to cancel schedule.");
        }
      }
      const res = await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discard: true }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to delete.");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = drafts.filter((d) => PENDING_STATUSES.includes(d.status));
  const scheduled = drafts.filter((d) => d.status === SCHEDULED_STATUS);
  const done = drafts.filter((d) => DONE_STATUSES.includes(d.status));

  let filtered =
    filter === "pending"
      ? pending
      : filter === "scheduled"
        ? scheduled
        : filter === "done"
          ? done
          : drafts;
  if (sourceFilter === "manual") filtered = filtered.filter((d) => !d.isAutopilot);
  if (sourceFilter === "autopilot") filtered = filtered.filter((d) => d.isAutopilot);

  async function emergencyStop() {
    setPausing(true);
    try {
      await fetch("/api/autopilot/pause", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      await loadAutopilot();
    } finally {
      setPausing(false);
    }
  }

  if (loading) return <div className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 bg-white/5 p-2 rounded-2xl w-fit border border-white/10 backdrop-blur-md">
        <div className="flex bg-slate-900/50 rounded-xl p-1">
          {(["all", "pending", "scheduled", "done"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300",
                filter === f
                  ? "bg-slate-700 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
            >
              {f === "all" ? "All" : f === "pending" ? `Pending (${pending.length})` : f === "scheduled" ? `Scheduled (${scheduled.length})` : `Done (${done.length})`}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-white/10 mx-1"></div>
        <div className="flex bg-slate-900/50 rounded-xl p-1">
          {(["all", "manual", "autopilot"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSourceFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300",
                sourceFilter === f
                  ? "bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
            >
              {f === "all" ? "All" : f === "manual" ? "Manual" : "Autopilot"}
            </button>
          ))}
        </div>
      </div>

      {autopilotStatus?.enabled && (
        <div className="overflow-hidden relative rounded-2xl border border-indigo-500/30 bg-indigo-900/20 p-5 shadow-[0_0_20px_rgba(79,70,229,0.1)]">
          <div className="absolute top-0 left-0 w-1 bg-indigo-500 h-full shadow-[0_0_10px_rgba(79,70,229,1)]"></div>
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <span className="font-bold tracking-wide text-indigo-400">AUTOPILOT ON</span>
              <span className="ml-3 text-sm text-indigo-200/70">
                • {autopilotStatus.pendingTopicsInPool} topics in queue
                {nextTopics.length > 0 && ` • Next: "${nextTopics[0].topic.slice(0, 40)}…"`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await fetch("/api/autopilot/skip-next", { method: "POST" });
                  loadAutopilot();
                }}
              >
                Skip next
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={emergencyStop} disabled={pausing}>
                {pausing ? "Pausing…" : "Emergency stop"}
              </Button>
            </div>
          </div>
          {nextTopics.length > 0 && (
            <ul className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
              {nextTopics.map((t) => (
                <li key={t.id}>{t.topic.slice(0, 60)}{t.topic.length > 60 ? "…" : ""}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* RSS / topic pile: titles from feed */}
      {topicPile.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">RSS / topic queue ({topicPile.length} titles)</h3>
          <ul className="max-h-48 overflow-y-auto space-y-1 text-sm text-slate-300">
            {topicPile.map((t) => (
              <li key={t.id} className="truncate border-b border-white/5 pb-1 last:border-0">
                {t.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next day's post — 24h early with status */}
      {nextPostData && (nextPostData.nextSlot || nextPostData.nextPost) && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4">
          <h3 className="text-sm font-semibold text-amber-200 mb-2">Next day&apos;s post (24h early)</h3>
          <p className="text-xs text-amber-200/70 mb-2">
            Slot: {nextPostData.nextSlot
              ? new Date(nextPostData.nextSlot).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })
              : "—"}
          </p>
          {nextPostData.nextPost ? (
            <div className="space-y-2">
              <p className="font-medium text-white">{nextPostData.nextPost.topic}</p>
              <p className="text-xs text-slate-400 line-clamp-2">{nextPostData.nextPost.content}</p>
              <span
                className={cn(
                  "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                  nextPostData.nextPost.approvalStatus === "approved" && "bg-emerald-500/20 text-emerald-300",
                  nextPostData.nextPost.approvalStatus === "pending" && "bg-amber-500/20 text-amber-300",
                  nextPostData.nextPost.approvalStatus === "rejected" && "bg-red-500/20 text-red-300",
                )}
              >
                {nextPostData.nextPost.approvalStatus === "approved"
                  ? "Approved"
                  : nextPostData.nextPost.approvalStatus === "pending"
                    ? "Pending your approval"
                    : nextPostData.nextPost.approvalStatus === "rejected"
                      ? "Rejected"
                      : nextPostData.nextPost.approvalStatus}
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{nextPostData.message ?? "No post yet for this slot."}</p>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-10 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="text-4xl opacity-50 mb-2">📭</div>
          <p>
            {filter === "pending" && "No drafts pending review. "}
            {filter === "scheduled" && "No scheduled posts. Approve a draft to schedule. "}
            {filter === "done" && "No published or failed posts yet. "}
            {filter === "all" && drafts.length === 0 && "No posts yet. "}
          </p>
          <a className="text-indigo-400 hover:text-indigo-300 hover:underline mt-2 inline-flex items-center gap-1 font-medium" href="/generate">
            Generate your first draft
            <span>→</span>
          </a>
        </div>
      ) : null}

      <div className="grid gap-4">
        {filtered.map((d) => {
          const isEditing = editingId === d.id;
          const isBusy = busyId === d.id;
          const isPending = PENDING_STATUSES.includes(d.status);
          const isScheduled = d.status === SCHEDULED_STATUS;
          const isDone = DONE_STATUSES.includes(d.status);
          return (
            <div key={d.id} className="group rounded-2xl border border-white/5 bg-[#141B2D] p-6 shadow-xl transition-all hover:border-white/10 hover:shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                    <span className="bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">{d.postType}</span>
                    <span>• {new Date(d.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full font-bold",
                        d.status === "APPROVED" && "text-amber-400 bg-amber-400/10",
                        isScheduled && "text-emerald-400 bg-emerald-400/10",
                        d.status === "PUBLISHED" && "text-sky-400 bg-sky-400/10",
                        d.status === "FAILED" && "text-red-400 bg-red-400/10",
                      )}
                    >
                      {d.status}
                    </span>
                    {isScheduled && d.schedule?.scheduledFor && (
                      <> • {new Date(d.schedule.scheduledFor).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</>
                    )}
                    {isScheduled && d.schedule?.getlateStatus && (
                      <> • GetLate: {d.schedule.getlateStatus}</>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-base font-semibold text-white">{d.topic}</span>
                    {d.isAutopilot && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-300 border border-indigo-500/20">
                        🤖 Autopilot
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => saveEdit(d.id, isScheduled)} disabled={isBusy}>
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditValue("");
                          setEditScheduledFor("");
                          setEditFirstComment("");
                          setEditDisableLinkPreview(false);
                          setEditMediaUrls([]);
                        }}
                        disabled={isBusy}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      {(isPending || isScheduled) && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(d.id);
                              setEditValue(d.content);
                              setEditScheduledFor(
                                isScheduled && d.schedule?.scheduledFor ? toDateTimeLocal(d.schedule.scheduledFor) : "",
                              );
                              setEditFirstComment(d.firstComment ?? "");
                              setEditDisableLinkPreview(d.disableLinkPreview ?? false);
                              setEditMediaUrls(parseMediaUrlsFromDraft(d.mediaUrls));
                            }}
                            disabled={isBusy}
                          >
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteDraft(d.id, isScheduled)} disabled={isBusy} className="text-red-400 border-red-400/50 hover:bg-red-500/10 hover:text-red-300">
                            Delete
                          </Button>
                        </>
                      )}
                      {isPending && (
                        <>
                          <Button variant="destructive" size="sm" onClick={() => discard(d.id)} disabled={isBusy}>
                            Discard
                          </Button>
                          <Button variant="default" size="sm" onClick={() => approve(d.id)} disabled={isBusy} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full">
                            {isBusy ? "Scheduling…" : d.status === "APPROVED" ? "Retry schedule" : "Approve & Schedule"}
                          </Button>
                        </>
                      )}
                      {isScheduled && (
                        <Button variant="destructive" size="sm" onClick={() => unschedule(d.id)} disabled={isBusy}>
                          {isBusy ? "Cancelling…" : "Cancel schedule"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {isEditing && isScheduled ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Scheduled for (date & time)</Label>
                    <Input
                      type="datetime-local"
                      value={editScheduledFor}
                      onChange={(e) => setEditScheduledFor(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                ) : null}
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Content</Label>
                      <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={10} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">First comment (optional)</Label>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">LinkedIn first comment: links, CTA, extra context. Max 1250 chars.</p>
                      <Textarea
                        value={editFirstComment}
                        onChange={(e) => setEditFirstComment(e.target.value)}
                        placeholder="e.g. Link to article or CTA"
                        rows={2}
                        maxLength={1250}
                        className="mt-1"
                      />
                      {editFirstComment.length > 0 && (
                        <span className="text-xs text-neutral-500">{editFirstComment.length}/1250</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`disable-preview-${d.id}`}
                        checked={editDisableLinkPreview}
                        onChange={(e) => setEditDisableLinkPreview(e.target.checked)}
                        className="rounded border-neutral-300"
                      />
                      <Label htmlFor={`disable-preview-${d.id}`} className="text-xs font-normal cursor-pointer">
                        Disable link preview (URLs in post won’t show preview cards)
                      </Label>
                    </div>
                    <div>
                      <Label className="text-xs">Media (optional)</Label>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Public image/video/PDF URLs. One per line or add rows.</p>
                      <div className="mt-1 space-y-2">
                        {editMediaUrls.map((url, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              type="url"
                              value={url}
                              onChange={(e) => {
                                const next = [...editMediaUrls];
                                next[idx] = e.target.value;
                                setEditMediaUrls(next);
                              }}
                              placeholder="https://…"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditMediaUrls(editMediaUrls.filter((_, i) => i !== idx))}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditMediaUrls([...editMediaUrls, ""])}
                        >
                          Add media URL
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded-xl bg-slate-900/50 border border-white/5 p-6 text-[15px] leading-relaxed text-slate-300",
                      "whitespace-pre-wrap font-sans",
                    )}
                  >
                    {renderLinkedInText(d.content)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

