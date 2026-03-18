"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type Quota = { usedCount: number; maxCount: number };

export function QuotaWidget({ className }: { className?: string }) {
  const [quota, setQuota] = React.useState<Quota | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/quota")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setQuota(j.quota);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load quota");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const used = quota?.usedCount ?? 0;
  const max = quota?.maxCount ?? 15;
  const remaining = Math.max(0, max - used);
  const warning = used >= 16 && used < max;

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md", className)}>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h3 className="text-sm font-semibold tracking-tight text-slate-100">Monthly Quota</h3>
        <div className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
          {used} / {max}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/50">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              warning ? "bg-amber-500" : used >= max ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            )}
            style={{ width: `${Math.min(100, (used / max) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider text-slate-500 mt-1">
          <span>0 posts</span>
          <span>{max} posts</span>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-md bg-red-500/10 p-2 text-xs text-red-400">{error}</div> : null}
      {warning ? <div className="mt-4 rounded-md bg-amber-500/10 p-2 text-xs text-amber-400">{remaining} posts left</div> : null}
      {used >= max ? <div className="mt-4 rounded-md bg-red-500/10 p-2 text-xs text-red-400">Quota full — next month unlocks automatically.</div> : null}
    </div>
  );
}

