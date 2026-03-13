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
  schedule?: { scheduledFor: string; getlatePostId?: string | null; getlateStatus?: string | null } | null;
};

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
  const [editScheduledFor, setEditScheduledFor] = React.useState<string>(""); // datetime-local value for scheduled posts
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "pending" | "scheduled" | "done">("all");

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

  React.useEffect(() => {
    load();
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
      const body: { content: string; scheduledFor?: string } = { content: editValue };
      if (isScheduled && editScheduledFor) {
        body.scheduledFor = new Date(editScheduledFor).toISOString();
      }
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

  const pending = drafts.filter((d) => PENDING_STATUSES.includes(d.status));
  const scheduled = drafts.filter((d) => d.status === SCHEDULED_STATUS);
  const done = drafts.filter((d) => DONE_STATUSES.includes(d.status));

  const filtered =
    filter === "pending"
      ? pending
      : filter === "scheduled"
        ? scheduled
        : filter === "done"
          ? done
          : drafts;

  if (loading) return <div className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Show:</span>
        {(["all", "pending", "scheduled", "done"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
            )}
          >
            {f === "all" ? "All" : f === "pending" ? `Pending (${pending.length})` : f === "scheduled" ? `Scheduled (${scheduled.length})` : `Done (${done.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
          {filter === "pending" && "No drafts pending review. "}
          {filter === "scheduled" && "No scheduled posts. Approve a draft to schedule. "}
          {filter === "done" && "No published or failed posts yet. "}
          {filter === "all" && drafts.length === 0 && "No posts yet. "}
          <a className="underline" href="/generate">Generate a draft</a>
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
            <div key={d.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {d.postType} • {new Date(d.createdAt).toLocaleString()} •{" "}
                    <span
                      className={cn(
                        d.status === "APPROVED" && "text-amber-700 dark:text-amber-300",
                        isScheduled && "text-emerald-700 dark:text-emerald-300",
                        d.status === "PUBLISHED" && "text-sky-700 dark:text-sky-300",
                        d.status === "FAILED" && "text-red-600 dark:text-red-400",
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
                  <div className="mt-1 text-sm font-medium">{d.topic}</div>
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
                        }}
                        disabled={isBusy}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      {(isPending || isScheduled) && (
                        <Button
                          variant="outline"
                          size="sm"
                        onClick={() => {
                          setEditingId(d.id);
                          setEditValue(d.content);
                          setEditScheduledFor(
                            isScheduled && d.schedule?.scheduledFor ? toDateTimeLocal(d.schedule.scheduledFor) : "",
                          );
                        }}
                          disabled={isBusy}
                        >
                          Edit
                        </Button>
                      )}
                      {isPending && (
                        <>
                          <Button variant="destructive" size="sm" onClick={() => discard(d.id)} disabled={isBusy}>
                            Discard
                          </Button>
                          <Button variant="default" size="sm" onClick={() => approve(d.id)} disabled={isBusy}>
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
                  <>
                    <Label className="text-xs">Content</Label>
                    <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={10} />
                  </>
                ) : (
                  <div
                    className={cn(
                      "rounded-lg border border-neutral-200 bg-white p-4 text-[15px] leading-6 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
                      "whitespace-pre-wrap",
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

