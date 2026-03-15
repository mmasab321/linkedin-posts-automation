"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AutopilotTab } from "./autopilot-tab";

type SettingsState = {
  hasGetLateKey: boolean;
  hasMoonshotKey: boolean;
  linkedinAccountId: string;
};

export function SettingsClient() {
  const [loaded, setLoaded] = React.useState(false);
  const [state, setState] = React.useState<SettingsState | null>(null);

  const [getlateApiKey, setGetlateApiKey] = React.useState("");
  const [moonshotApiKey, setMoonshotApiKey] = React.useState("");
  const [linkedinAccountId, setLinkedinAccountId] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState<"moonshot" | "getlate" | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"api" | "autopilot">("api");

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/settings");
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to load settings.");
      setState(json);
      setLinkedinAccountId(json.linkedinAccountId ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load settings.");
    } finally {
      setLoaded(true);
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
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ getlateApiKey, moonshotApiKey, linkedinAccountId }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to save.");
      setGetlateApiKey("");
      setMoonshotApiKey("");
      await load();
      setMessage("Saved.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function test(which: "moonshot" | "getlate") {
    setTesting(which);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/settings/test-${which}`, { method: "POST" });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Test failed.");
      setMessage(which === "moonshot" ? `Moonshot OK: ${json.sample ?? "ok"}` : `GetLate OK: ${(json.accounts?.length ?? 0)} accounts`);
    } catch (e: any) {
      setError(e?.message ?? "Test failed.");
    } finally {
      setTesting(null);
    }
  }

  if (!loaded) return <div className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => setTab("api")}
          className={cn(
            "relative px-4 py-2 text-sm font-semibold transition-colors rounded-full",
            tab === "api"
              ? "bg-slate-800 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10"
              : "text-slate-400 hover:text-white hover:bg-white/5",
          )}
        >
          API Keys
        </button>
        <button
          type="button"
          onClick={() => setTab("autopilot")}
          className={cn(
            "relative px-4 py-2 text-sm font-semibold transition-colors rounded-full",
            tab === "autopilot"
              ? "bg-slate-800 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10"
              : "text-slate-400 hover:text-white hover:bg-white/5",
          )}
        >
          Autopilot
        </button>
      </div>

      {tab === "autopilot" ? (
        <AutopilotTab />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>GetLate API key</Label>
              <Input
                value={getlateApiKey}
                onChange={(e) => setGetlateApiKey(e.target.value)}
                placeholder={state?.hasGetLateKey ? "Saved (enter new to replace)" : "sk_..."}
                autoComplete="off"
              />
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Used only when you click Approve &amp; Schedule.</div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => test("getlate")} disabled={testing !== null}>
                  {testing === "getlate" ? "Testing…" : "Test GetLate"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Moonshot API key (Kimi 2.5)</Label>
              <Input
                value={moonshotApiKey}
                onChange={(e) => setMoonshotApiKey(e.target.value)}
                placeholder={state?.hasMoonshotKey ? "Saved (enter new to replace)" : "sk-..."}
                autoComplete="off"
              />
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Used only to generate drafts.</div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => test("moonshot")} disabled={testing !== null}>
                  {testing === "moonshot" ? "Testing…" : "Test Moonshot"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>LinkedIn Account ID (GetLate)</Label>
            <Input value={linkedinAccountId} onChange={(e) => setLinkedinAccountId(e.target.value)} placeholder="acc_... or your id" />
            <div className="text-xs text-neutral-500 dark:text-neutral-400">From GetLate dashboard after connecting LinkedIn.</div>
          </div>

          {message ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">{message}</div> : null}
          {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div> : null}

          <div className="flex items-center justify-end border-t border-white/10 pt-6 mt-6">
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] disabled:opacity-50 transition-all rounded-full px-8 py-6 text-base font-semibold"
            >
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

