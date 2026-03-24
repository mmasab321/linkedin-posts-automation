"use client";

import * as React from "react";
import Link from "next/link";
import { Key, RefreshCcw, Terminal, Bot, Clock, BarChart2, BarChart, HelpCircle, LogOut, RefreshCw, BadgeCheck, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AutopilotTab } from "./autopilot-tab";
import { PromptTab } from "./prompt-tab";
import { VoiceProfileSection } from "./voice-profile-section";
import { PlanSection } from "./plan-section";
import { signOut } from "next-auth/react";

type SettingsState = {
  hasGetLateKey: boolean;
  hasMoonshotKey: boolean;
  linkedinAccountId: string;
  approvalEmail: string;
};

type PlanInfo = {
  plan: string;
  monthlyPostLimit: number;
  maxAutoPerMonth: number;
  briefGeneration: boolean;
  experienceBank: boolean;
};

function PlanCard({ planInfo }: { planInfo: PlanInfo | null }) {
  if (!planInfo) return null;
  const planLabel = planInfo.plan.charAt(0).toUpperCase() + planInfo.plan.slice(1);
  const features = [
    `${planInfo.monthlyPostLimit} posts / month`,
    `${planInfo.maxAutoPerMonth} auto-posts / month`,
    planInfo.briefGeneration ? "Brief generation" : null,
    planInfo.experienceBank ? "Experience bank" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="bg-gradient-to-br from-surface-container-high to-surface-container-highest rounded-xl border border-primary/10 relative overflow-hidden group p-6">
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="bg-primary/20 text-primary-fixed-dim text-[10px] font-black px-2 py-1 rounded tracking-widest uppercase">{planLabel} Plan</span>
          <h3 className="text-xl font-black mt-2">{planInfo.monthlyPostLimit >= 999 ? "Unlimited" : `${planInfo.monthlyPostLimit} / mo`}</h3>
        </div>
        <BadgeCheck size={20} className="text-primary-container" />
      </div>
      <ul className="space-y-2 mb-5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-on-surface-variant">
            <CheckCircle size={14} className="text-primary flex-none" />
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled
        className="w-full bg-surface-bright border border-outline-variant/20 hover:border-primary/40 text-on-surface py-3 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
      >
        Upgrade (coming soon)
      </button>
    </div>
  );
}

export function SettingsClient() {
  const [loaded, setLoaded] = React.useState(false);
  const [state, setState] = React.useState<SettingsState | null>(null);
  const [planInfo, setPlanInfo] = React.useState<PlanInfo | null>(null);

  const [getlateApiKey, setGetlateApiKey] = React.useState("");
  const [moonshotApiKey, setMoonshotApiKey] = React.useState("");
  const [linkedinAccountId, setLinkedinAccountId] = React.useState("");
  const [approvalEmail, setApprovalEmail] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState<"moonshot" | "getlate" | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"api" | "autopilot" | "prompt">("api");

  async function load() {
    setError(null);
    try {
      const [settingsRes, planRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/user/plan"),
      ]);
      const settingsText = await settingsRes.text();
      const settingsJson = settingsText ? JSON.parse(settingsText) : null;
      if (!settingsRes.ok) throw new Error(settingsJson?.error ?? settingsText ?? "Failed to load settings.");
      setState(settingsJson);
      setLinkedinAccountId(settingsJson.linkedinAccountId ?? "");
      setApprovalEmail(settingsJson.approvalEmail ?? "");
      if (planRes.ok) {
        const planData = await planRes.json();
        if (planData.plan != null) setPlanInfo(planData);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load settings.");
    } finally {
      setLoaded(true);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setMessage(null); setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ getlateApiKey, moonshotApiKey, linkedinAccountId, approvalEmail: approvalEmail.trim() || null }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? text ?? "Failed to save.");
      setGetlateApiKey(""); setMoonshotApiKey("");
      await load();
      setMessage("Settings saved successfully.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function test(which: "moonshot" | "getlate") {
    setTesting(which); setMessage(null); setError(null);
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

  if (!loaded) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <span className="text-on-surface-variant text-sm">Loading…</span>
    </div>
  );

  const sideNavItems = [
    { icon: Bot, label: "Autopilot", onClick: () => setTab("autopilot") },
    { icon: Clock, label: "Queue", href: "/dashboard" },
    { icon: BarChart2, label: "Quota", href: "/dashboard" },
    { icon: BarChart, label: "Insights", href: "/dashboard" },
  ];

  return (
    <div className="flex min-h-screen bg-surface midnight-glow">
      {/* Sidebar */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-surface-container flex flex-col p-4 shadow-[20px_0_40px_rgba(0,0,0,0.4)] z-40 hidden md:flex">
        <div className="mb-8 px-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Command Center</p>
          <p className="text-xs text-primary-fixed-dim mt-1">LinkedIn Strategy</p>
        </div>
        <nav className="flex-1 space-y-1">
          {sideNavItems.map(({ icon: Icon, label, onClick, href }) => (
            href ? (
              <Link key={label} href={href} className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-high transition-all hover:translate-x-1 duration-200 rounded-lg">
                <Icon size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
              </Link>
            ) : (
              <button key={label} type="button" onClick={onClick} className="w-full flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-high transition-all hover:translate-x-1 duration-200 rounded-lg text-left">
                <Icon size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
              </button>
            )
          ))}
        </nav>
        <div className="border-t border-outline-variant/10 pt-4 space-y-1">
          <a href="mailto:support@example.com" className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-high transition-all rounded-lg">
            <HelpCircle size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Support</span>
          </a>
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="w-full flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-high transition-all rounded-lg text-left">
            <LogOut size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-64 flex-1 px-6 pb-12 pt-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-on-surface mb-2">Configuration</h1>
            <p className="text-on-surface-variant max-w-2xl">Manage API endpoints, automation parameters, and your digital voice.</p>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-surface-container-low rounded-xl w-fit mb-10">
            {([
              { id: "api", label: "API Keys", icon: Key },
              { id: "autopilot", label: "Autopilot", icon: RefreshCcw },
              { id: "prompt", label: "Prompt", icon: Terminal },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
                  tab === id
                    ? "bg-surface-container-high text-primary font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* API Keys tab */}
          {tab === "api" && (
            <div className="grid grid-cols-12 gap-8">
              {/* Left col: API keys */}
              <div className="col-span-12 lg:col-span-7 space-y-6">
                <div className="bg-surface-container rounded-xl p-8 space-y-6">
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Service Connectivity</h2>

                  {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">{message}</div>}
                  {error && <div className="rounded-xl border border-error/20 bg-error-container/10 p-4 text-sm text-error">{error}</div>}

                  {/* GetLate */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">GetLate API Key</label>
                    <div className="flex gap-2">
                      <input
                        value={getlateApiKey}
                        onChange={(e) => setGetlateApiKey(e.target.value)}
                        type="password"
                        autoComplete="off"
                        placeholder={state?.hasGetLateKey ? "Saved (enter new to replace)" : "sk_..."}
                        className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => test("getlate")}
                        disabled={testing !== null}
                        className="px-4 py-2.5 bg-secondary-container text-on-secondary-container text-[11px] font-bold rounded-lg hover:opacity-90 transition-all uppercase tracking-tighter disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        {testing === "getlate" ? "…" : "Test"}
                      </button>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">Used only when you click Approve &amp; Schedule.</p>
                  </div>

                  {/* Moonshot */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Moonshot API Key (Kimi)</label>
                    <div className="flex gap-2">
                      <input
                        value={moonshotApiKey}
                        onChange={(e) => setMoonshotApiKey(e.target.value)}
                        type="password"
                        autoComplete="off"
                        placeholder={state?.hasMoonshotKey ? "Saved (enter new to replace)" : "sk-..."}
                        className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => test("moonshot")}
                        disabled={testing !== null}
                        className="px-4 py-2.5 bg-secondary-container text-on-secondary-container text-[11px] font-bold rounded-lg hover:opacity-90 transition-all uppercase tracking-tighter disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        {testing === "moonshot" ? "…" : "Test"}
                      </button>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">Used only to generate drafts.</p>
                  </div>

                  {/* LinkedIn Account ID */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">LinkedIn Account ID</label>
                    <input
                      value={linkedinAccountId}
                      onChange={(e) => setLinkedinAccountId(e.target.value)}
                      placeholder="acc_... or your id"
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                    />
                    <p className="text-[10px] text-on-surface-variant">From GetLate dashboard after connecting LinkedIn.</p>
                  </div>

                  {/* Approval email */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Approval Email</label>
                    <input
                      type="email"
                      value={approvalEmail}
                      onChange={(e) => setApprovalEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                    />
                    <p className="text-[10px] text-on-surface-variant">Where to send Approve/Reject links for autopilot posts.</p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save Settings"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right col: Plan card */}
              <div className="col-span-12 lg:col-span-5">
                <PlanCard planInfo={planInfo} />
              </div>
            </div>
          )}

          {/* Autopilot tab */}
          {tab === "autopilot" && <AutopilotTab />}

          {/* Prompt tab */}
          {tab === "prompt" && (
            <>
              <VoiceProfileSection />
              <PromptTab />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
