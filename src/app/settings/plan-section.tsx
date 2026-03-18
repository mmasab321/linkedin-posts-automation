"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type PlanInfo = {
  plan: string;
  monthlyPostLimit: number;
  maxAutoPerMonth: number;
  briefGeneration: boolean;
  experienceBank: boolean;
};

export function PlanSection() {
  const [planInfo, setPlanInfo] = React.useState<PlanInfo | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/user/plan")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.plan != null) setPlanInfo(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !planInfo) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
      <Label className="block text-sm font-semibold text-slate-300 mb-2">Plan</Label>
      <p className="text-sm text-white capitalize mb-2">{planInfo.plan}</p>
      <ul className="text-xs text-slate-400 space-y-1 mb-3">
        <li>Posts per month: {planInfo.monthlyPostLimit}</li>
        <li>Max auto-posts per month: {planInfo.maxAutoPerMonth}</li>
        <li>Brief generation: {planInfo.briefGeneration ? "Yes" : "No"}</li>
        <li>Experience bank: {planInfo.experienceBank ? "Yes" : "No"}</li>
      </ul>
      <Button type="button" variant="outline" size="sm" disabled>
        Upgrade (coming soon)
      </Button>
    </div>
  );
}
