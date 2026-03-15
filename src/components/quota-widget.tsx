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
  const max = quota?.maxCount ?? 20;
  const remaining = Math.max(0, max - used);
  const warning = used >= 16 && used < max;

  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium">Monthly quota</div>
        <div className="text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
          {used}/{max}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1">
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < used;
          return (
            <div
              key={i}
              className={cn(
                "h-2 rounded-sm border",
                filled
                  ? "border-neutral-900 bg-neutral-900 dark:border-neutral-50 dark:bg-neutral-50"
                  : "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900",
              )}
            />
          );
        })}
      </div>

      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
      {warning ? <div className="mt-2 text-xs text-amber-600">{remaining} posts left</div> : null}
      {used >= max ? <div className="mt-2 text-xs text-red-600">Quota full — next month unlocks automatically.</div> : null}
    </div>
  );
}

