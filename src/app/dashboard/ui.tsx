"use client";

import * as React from "react";
import { Pencil, Trash2, CheckCircle, Clock, TrendingUp, Bot, BarChart2, Circle, Plus, X, Eye, MessageSquare } from "lucide-react";
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
      return <span key={idx} className="text-primary">{p}</span>;
    }
    return <React.Fragment key={idx}>{p}</React.Fragment>;
  });
}

const PENDING_STATUSES = ["PENDING_REVIEW", "APPROVED"];
const SCHEDULED_STATUS = "SCHEDULED";
const DONE_STATUSES = ["PUBLISHED", "FAILED"];

function statusBadge(status: string) {
  switch (status) {
    case "PENDING_REVIEW":
      return <span className="px-2 py-1 bg-tertiary-container/20 text-tertiary text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-tertiary" />Pending Review</span>;
    case "APPROVED":
      return <span className="px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Approved</span>;
    case "SCHEDULED":
      return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Scheduled</span>;
    case "PUBLISHED":
      return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Published</span>;
    case "FAILED":
      return <span className="px-2 py-1 bg-error-container/20 text-error text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-error" />Failed</span>;
    default:
      return <span className="px-2 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-full">{status}</span>;
  }
}

// Edit Modal
function EditModal({
  draft,
  editValue, setEditValue,
  editScheduledFor, setEditScheduledFor,
  editFirstComment, setEditFirstComment,
  editDisableLinkPreview, setEditDisableLinkPreview,
  editMediaUrls, setEditMediaUrls,
  onSave, onCancel, isBusy,
}: {
  draft: Draft;
  editValue: string; setEditValue: (v: string) => void;
  editScheduledFor: string; setEditScheduledFor: (v: string) => void;
  editFirstComment: string; setEditFirstComment: (v: string) => void;
  editDisableLinkPreview: boolean; setEditDisableLinkPreview: (v: boolean) => void;
  editMediaUrls: string[]; setEditMediaUrls: (v: string[]) => void;
  onSave: () => void; onCancel: () => void; isBusy: boolean;
}) {
  const isScheduled = draft.status === SCHEDULED_STATUS;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/70 backdrop-blur-sm">
      <div className="w-full max-w-[700px] bg-surface-container/90 backdrop-blur-xl rounded-xl shadow-[0px_20px_40px_rgba(0,0,0,0.4)] border border-outline-variant/20 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant/10">
          <div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">Edit Post Draft</h2>
            <p className="text-on-surface-variant text-sm mt-1">Refine your LinkedIn content and scheduling</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-bright transition-colors text-on-surface-variant">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {/* Content */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Content</label>
            <div className="relative">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={6}
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none outline-none"
              />
              <div className="absolute bottom-3 right-3 text-[10px] text-on-surface-variant font-mono bg-surface-container/50 px-2 py-1 rounded">
                {editValue.length} / 3000
              </div>
            </div>
          </div>

          {/* Grid: schedule + link preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {isScheduled && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={editScheduledFor}
                  onChange={(e) => setEditScheduledFor(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-on-surface focus:border-primary outline-none"
                />
              </div>
            )}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Link Preview</label>
              <div className="flex items-center justify-between h-[58px] bg-surface-container-low px-4 rounded-xl border border-outline-variant/10">
                <span className="text-sm text-on-surface-variant">Show metadata cards</span>
                <button
                  type="button"
                  onClick={() => setEditDisableLinkPreview(!editDisableLinkPreview)}
                  className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", !editDisableLinkPreview ? "bg-primary" : "bg-surface-container-highest")}
                >
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", !editDisableLinkPreview ? "translate-x-6" : "translate-x-1")} />
                </button>
              </div>
            </div>
          </div>

          {/* Media URLs */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Media URLs</label>
            <div className="flex flex-wrap gap-2 p-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl min-h-[58px]">
              {editMediaUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-medium">
                  <span className="max-w-[180px] truncate">{url}</span>
                  <button type="button" onClick={() => setEditMediaUrls(editMediaUrls.filter((_, i) => i !== idx))}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              <input
                type="url"
                placeholder="Add URL…"
                className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface min-w-[120px] placeholder:text-outline"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val.startsWith("http")) {
                      setEditMediaUrls([...editMediaUrls, val]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
            </div>
            <p className="text-[10px] text-on-surface-variant italic">Press Enter to add a URL. Paste URLs for images, videos, or PDFs.</p>
          </div>

          {/* First comment */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">First Comment (Auto-Post)</label>
            <div className="relative">
              <textarea
                value={editFirstComment}
                onChange={(e) => setEditFirstComment(e.target.value)}
                placeholder="Add a link or extra context in the first comment…"
                rows={2}
                maxLength={1250}
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-on-surface focus:border-primary transition-all resize-none outline-none"
              />
              <MessageSquare size={16} className="absolute right-4 bottom-4 text-on-surface-variant/40" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-surface-container-low flex items-center justify-between gap-4 border-t border-outline-variant/10">
          <button onClick={onCancel} className="text-on-surface-variant text-sm font-semibold px-6 py-3 hover:bg-surface-bright rounded-full transition-all active:scale-95">
            Cancel
          </button>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-surface-container-high text-on-surface px-6 py-3 rounded-full text-sm font-semibold border border-outline-variant/20 hover:bg-surface-bright transition-all active:scale-95">
              <Eye size={16} /> Preview
            </button>
            <button
              onClick={onSave}
              disabled={isBusy}
              className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 disabled:opacity-50"
            >
              {isBusy ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    nextPost: { id: string; topic: string; content: string; approvalStatus: string; scheduledFor: string | null } | null;
    message?: string;
  } | null>(null);
  const [insights, setInsights] = React.useState<{
    totalWithFeedback: number;
    perType: { postType: string; total: number; approved: number; rejected: number; approvalRate: number }[];
    topPerforming: { postType: string; approvalRate: number }[];
    underperforming: { postType: string; approvalRate: number }[];
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
      const [statusRes, topicsRes, pileRes, nextPostRes, insightsRes] = await Promise.all([
        fetch("/api/autopilot/status"),
        fetch("/api/admin/topics?status=PENDING&limit=3"),
        fetch("/api/admin/topics?status=PENDING&limit=50"),
        fetch("/api/autopilot/next-post"),
        fetch("/api/autopilot/insights"),
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
        setNextPostData({ nextSlot: j.nextSlot ?? null, nextPost: j.nextPost ?? null, message: j.message });
      }
      if (insightsRes.ok) {
        const j = await insightsRes.json();
        if (j.totalWithFeedback >= 5) {
          setInsights({ totalWithFeedback: j.totalWithFeedback, perType: j.perType ?? [], topPerforming: j.topPerforming ?? [], underperforming: j.underperforming ?? [] });
        } else {
          setInsights(null);
        }
      } else {
        setInsights(null);
      }
    } catch { /* ignore */ }
  }

  React.useEffect(() => { load(); }, []);
  React.useEffect(() => { loadAutopilot(); }, []);

  async function discard(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/drafts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discard: true }) });
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
      const body: { content: string; scheduledFor?: string; firstComment?: string; disableLinkPreview?: boolean; mediaUrls?: string[] } = { content: editValue };
      if (isScheduled && editScheduledFor) body.scheduledFor = new Date(editScheduledFor).toISOString();
      body.firstComment = editFirstComment.trim();
      body.disableLinkPreview = editDisableLinkPreview;
      body.mediaUrls = editMediaUrls.filter((u) => u.trim().startsWith("http"));
      const res = await fetch(`/api/drafts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to save.");
      setEditingId(null); setEditValue(""); setEditScheduledFor(""); setEditFirstComment(""); setEditDisableLinkPreview(false); setEditMediaUrls([]);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save.");
    } finally {
      setBusyId(null);
    }
  }

  async function approve(id: string) {
    setBusyId(id); setError(null);
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
    setBusyId(id); setError(null);
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
    setBusyId(id); setError(null);
    try {
      if (isScheduled) {
        const res = await fetch(`/api/drafts/${id}/unschedule`, { method: "POST" });
        if (!res.ok) { const json = await res.json().catch(() => ({})); throw new Error(json?.error ?? "Failed to cancel schedule."); }
      }
      const res = await fetch(`/api/drafts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discard: true }) });
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

  async function emergencyStop() {
    setPausing(true);
    try {
      await fetch("/api/autopilot/pause", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      await loadAutopilot();
    } finally {
      setPausing(false);
    }
  }

  const pending = drafts.filter((d) => PENDING_STATUSES.includes(d.status));
  const scheduled = drafts.filter((d) => d.status === SCHEDULED_STATUS);
  const done = drafts.filter((d) => DONE_STATUSES.includes(d.status));
  let filtered = filter === "pending" ? pending : filter === "scheduled" ? scheduled : filter === "done" ? done : drafts;
  if (sourceFilter === "manual") filtered = filtered.filter((d) => !d.isAutopilot);
  if (sourceFilter === "autopilot") filtered = filtered.filter((d) => d.isAutopilot);

  const editingDraft = drafts.find((d) => d.id === editingId);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-on-surface-variant text-sm">Loading…</div>
    </div>
  );

  return (
    <div className="px-6 pb-12 max-w-7xl mx-auto">
      {/* Edit modal */}
      {editingId && editingDraft && (
        <EditModal
          draft={editingDraft}
          editValue={editValue} setEditValue={setEditValue}
          editScheduledFor={editScheduledFor} setEditScheduledFor={setEditScheduledFor}
          editFirstComment={editFirstComment} setEditFirstComment={setEditFirstComment}
          editDisableLinkPreview={editDisableLinkPreview} setEditDisableLinkPreview={setEditDisableLinkPreview}
          editMediaUrls={editMediaUrls} setEditMediaUrls={setEditMediaUrls}
          onSave={() => saveEdit(editingId, editingDraft.status === SCHEDULED_STATUS)}
          onCancel={() => { setEditingId(null); setEditValue(""); setEditScheduledFor(""); setEditFirstComment(""); setEditDisableLinkPreview(false); setEditMediaUrls([]); }}
          isBusy={busyId === editingId}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-8 pt-8">
        {/* LEFT: Post queue */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">Post Management</h1>
              <p className="text-sm text-on-surface-variant mt-1">Review and manage your LinkedIn content pipeline.</p>
            </div>
            <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl w-fit">
              {(["all", "pending", "scheduled", "done"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                    filter === f ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {f === "all" ? "All Posts" : f === "pending" ? `Pending (${pending.length})` : f === "scheduled" ? `Scheduled (${scheduled.length})` : `Done (${done.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Source filter */}
          <div className="flex items-center gap-3">
            {(["all", "manual", "autopilot"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSourceFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                  sourceFilter === f ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                )}
              >
                {f === "all" ? "All Sources" : f === "manual" ? "Manual" : "Autopilot"}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {/* Autopilot panel */}
          {autopilotStatus?.enabled && (
            <div className="bg-surface-container rounded-xl p-5 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active</span>
                  </div>
                  <Bot size={16} className="text-on-surface-variant" />
                  <span className="font-bold text-on-surface">Autopilot Engaged</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => { await fetch("/api/autopilot/skip-next", { method: "POST" }); loadAutopilot(); }}
                    className="px-4 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/30 rounded-full hover:bg-surface-container-high transition-all"
                  >
                    Skip Next
                  </button>
                  <button
                    type="button"
                    onClick={emergencyStop}
                    disabled={pausing}
                    className="px-4 py-1.5 text-xs font-bold text-error border border-error/30 rounded-full hover:bg-error-container/10 transition-all disabled:opacity-50"
                  >
                    {pausing ? "Stopping…" : "Emergency Stop"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant mb-2">
                {autopilotStatus.pendingTopicsInPool} topics in queue
                {nextTopics.length > 0 && ` • Next: "${nextTopics[0].topic.slice(0, 40)}…"`}
              </p>
              {nextTopics.length > 0 && (
                <ul className="space-y-1">
                  {nextTopics.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Circle size={6} className="text-primary fill-primary" />
                      {t.topic.slice(0, 60)}{t.topic.length > 60 ? "…" : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Post cards */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container p-10 text-center text-on-surface-variant flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-2">
                <Plus size={20} className="text-on-surface-variant" />
              </div>
              <p className="text-sm">
                {filter === "pending" ? "No drafts pending review." :
                 filter === "scheduled" ? "No scheduled posts. Approve a draft to schedule." :
                 filter === "done" ? "No published or failed posts yet." :
                 "No posts yet."}
              </p>
              <a href="/generate" className="text-primary hover:text-primary-fixed-dim hover:underline mt-1 inline-flex items-center gap-1 text-sm font-medium">
                Generate your first draft →
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((d) => {
                const isBusy = busyId === d.id;
                const isPending = PENDING_STATUSES.includes(d.status);
                const isScheduled = d.status === SCHEDULED_STATUS;
                const isDone = DONE_STATUSES.includes(d.status);

                return (
                  <div key={d.id} className={cn("group bg-surface-container rounded-xl overflow-hidden transition-all hover:bg-surface-container-high", isDone && "opacity-80")}>
                    <div className="p-6 space-y-4">
                      {/* Top row: badges + status */}
                      <div className="flex justify-between items-start">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 bg-surface-container-lowest text-primary text-[10px] font-bold uppercase tracking-widest rounded">{d.postType}</span>
                          {d.isAutopilot && (
                            <span className="px-2 py-0.5 bg-surface-container-lowest text-secondary text-[10px] font-bold uppercase tracking-widest rounded">Autopilot</span>
                          )}
                        </div>
                        {statusBadge(d.status)}
                      </div>

                      {/* Topic */}
                      <p className="font-semibold text-on-surface">{d.topic}</p>

                      {/* Content preview */}
                      <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-3">
                        {renderLinkedInText(d.content)}
                      </p>

                      {/* Footer: meta + actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                        <div className="flex items-center gap-4 text-on-surface-variant text-xs">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(d.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                          </span>
                          {isScheduled && d.schedule?.scheduledFor && (
                            <span className="flex items-center gap-1 font-bold text-primary">
                              <Clock size={12} />
                              {new Date(d.schedule.scheduledFor).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          {(isPending || isScheduled) && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(d.id);
                                  setEditValue(d.content);
                                  setEditScheduledFor(isScheduled && d.schedule?.scheduledFor ? toDateTimeLocal(d.schedule.scheduledFor) : "");
                                  setEditFirstComment(d.firstComment ?? "");
                                  setEditDisableLinkPreview(d.disableLinkPreview ?? false);
                                  setEditMediaUrls(parseMediaUrlsFromDraft(d.mediaUrls));
                                }}
                                disabled={isBusy}
                                className="p-2 rounded-lg hover:bg-surface-bright text-on-surface-variant hover:text-primary transition-all"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteDraft(d.id, isScheduled)}
                                disabled={isBusy}
                                className="p-2 rounded-lg hover:bg-surface-bright text-error transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => approve(d.id)}
                              disabled={isBusy}
                              className="px-4 py-1.5 bg-primary text-on-primary rounded-full text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                            >
                              {isBusy ? "Scheduling…" : d.status === "APPROVED" ? "Retry Schedule" : "Approve"}
                            </button>
                          )}
                          {isScheduled && (
                            <button
                              type="button"
                              onClick={() => unschedule(d.id)}
                              disabled={isBusy}
                              className="px-4 py-1.5 border border-outline-variant/30 text-on-surface-variant rounded-full text-xs font-bold hover:bg-surface-container-high transition-all disabled:opacity-50"
                            >
                              {isBusy ? "Cancelling…" : "Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <aside className="w-full lg:w-80 space-y-5 lg:sticky lg:top-24 lg:self-start">
          {/* Autopilot status */}
          <div className="bg-surface-container p-5 rounded-xl border-l-4 border-emerald-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">System Status</span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", autopilotStatus?.enabled ? "bg-emerald-400" : "bg-outline")} />
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", autopilotStatus?.enabled ? "bg-emerald-500" : "bg-outline")} />
                </span>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", autopilotStatus?.enabled ? "text-emerald-400" : "text-on-surface-variant")}>
                  {autopilotStatus?.enabled ? "Active" : "Off"}
                </span>
              </div>
            </div>
            <h3 className="font-bold text-on-surface">
              {autopilotStatus?.enabled ? "Autopilot Engaged" : "Autopilot Off"}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              {autopilotStatus?.enabled
                ? `${autopilotStatus.pendingTopicsInPool} topics queued for generation.`
                : "Enable autopilot in Settings to auto-generate posts."}
            </p>
          </div>

          {/* Performance insights */}
          {insights && insights.totalWithFeedback >= 5 && (
            <div className="bg-surface-container p-5 rounded-xl space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Performance Insights</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-lowest p-3 rounded-lg">
                  <span className="text-[10px] text-on-surface-variant block mb-1">Top Type</span>
                  <span className="text-sm font-bold text-primary">{insights.topPerforming[0]?.postType ?? "—"}</span>
                </div>
                <div className="bg-surface-container-lowest p-3 rounded-lg">
                  <span className="text-[10px] text-on-surface-variant block mb-1">Approval Rate</span>
                  <span className="text-sm font-bold text-secondary">
                    {insights.topPerforming[0] ? `${Math.round(insights.topPerforming[0].approvalRate * 100)}%` : "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {insights.perType.slice(0, 4).map((t) => (
                  <div key={t.postType} className="flex items-center gap-2">
                    <span className="text-[10px] text-on-surface-variant w-20 truncate">{t.postType}</span>
                    <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round(t.approvalRate * 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-on-surface-variant w-8 text-right">{Math.round(t.approvalRate * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly quota */}
          <div className="bg-surface-container p-5 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Monthly Quota</span>
              <BarChart2 size={14} className="text-on-surface-variant" />
            </div>
            {/* Quota widget is now embedded in layout - this is a placeholder */}
            <p className="text-xs text-on-surface-variant">Manage quota in Settings.</p>
          </div>

          {/* Topic queue */}
          {topicPile.length > 0 && (
            <div className="bg-surface-container p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Topic Queue</span>
                <a href="/settings" className="text-primary text-[10px] font-bold uppercase hover:underline">Edit</a>
              </div>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {topicPile.slice(0, 8).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-xs text-on-surface">
                    <Circle size={6} className="text-primary fill-primary flex-none" />
                    <span className="truncate">{t.title}</span>
                  </li>
                ))}
                {topicPile.length > 8 && (
                  <li className="text-xs text-on-surface-variant pl-4">+{topicPile.length - 8} more…</li>
                )}
              </ul>
            </div>
          )}

          {/* Next post preview */}
          {nextPostData && (nextPostData.nextSlot || nextPostData.nextPost) && (
            <div className="relative overflow-hidden bg-surface-container-highest rounded-xl p-5">
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary-fixed-dim block">Next Up</span>
                {nextPostData.nextPost ? (
                  <>
                    <h4 className="text-sm font-bold text-on-surface">{nextPostData.nextPost.topic}</h4>
                    <p className="text-[10px] text-on-surface-variant line-clamp-2">{nextPostData.nextPost.content}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <TrendingUp size={12} className="text-primary" />
                      <span className="text-[10px] font-medium text-on-surface">
                        {nextPostData.nextSlot ? new Date(nextPostData.nextSlot).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "Upcoming"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-on-surface-variant">{nextPostData.message ?? "No post yet for this slot."}</p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
