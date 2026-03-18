"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function OnboardingPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Voice profile
  const [name, setName] = React.useState("");
  const [headline, setHeadline] = React.useState("");
  const [niche, setNiche] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [tone, setTone] = React.useState("");
  const [avoidPhrases, setAvoidPhrases] = React.useState("");

  // API keys
  const [moonshotApiKey, setMoonshotApiKey] = React.useState("");
  const [getlateApiKey, setGetlateApiKey] = React.useState("");
  const [linkedinAccountId, setLinkedinAccountId] = React.useState("");

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
      return;
    }
    if (session?.user?.onboardingComplete === true) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  async function saveVoiceProfile() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/voice-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          headline: headline.trim(),
          niche: niche.trim(),
          audience: audience.trim(),
          tone: tone.trim(),
          avoidPhrases: avoidPhrases.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save");
      }
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function saveApiKeys() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moonshotApiKey: moonshotApiKey.trim() || undefined,
          getlateApiKey: getlateApiKey.trim() || undefined,
          linkedinAccountId: linkedinAccountId.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save");
      }
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function completeOnboarding() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/onboarding-complete", { method: "POST" });
      if (!res.ok) throw new Error("Failed to complete");
      await updateSession?.();
      router.replace("/dashboard");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to complete.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || (session && session.user?.onboardingComplete === true)) {
    return (
      <div className="flex flex-col gap-6 max-w-xl mx-auto py-10">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-bold text-white">Welcome — set up your account</h1>
      <p className="text-slate-400 text-sm">Step {step} of 3</p>

      {step === 1 && (
        <>
          <div className="space-y-4">
            <Label>Your name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
            <Label>Headline</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. AI Automation & SaaS Developer" />
            <Label>Niche</Label>
            <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. AI, SaaS, developer tools" />
            <Label>Audience</Label>
            <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Who you write for" />
            <Label>Tone</Label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. casual, direct" />
            <Label>Phrases to avoid (comma-separated)</Label>
            <Textarea value={avoidPhrases} onChange={(e) => setAvoidPhrases(e.target.value)} rows={2} />
          </div>
          <Button onClick={saveVoiceProfile} disabled={saving || !name.trim() || !headline.trim() || !niche.trim() || !audience.trim() || !tone.trim()}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-4">
            <Label>Moonshot API key (Kimi)</Label>
            <Input value={moonshotApiKey} onChange={(e) => setMoonshotApiKey(e.target.value)} placeholder="sk-..." type="password" autoComplete="off" />
            <Label>GetLate API key</Label>
            <Input value={getlateApiKey} onChange={(e) => setGetlateApiKey(e.target.value)} placeholder="sk_..." type="password" autoComplete="off" />
            <Label>LinkedIn Account ID (from GetLate)</Label>
            <Input value={linkedinAccountId} onChange={(e) => setLinkedinAccountId(e.target.value)} placeholder="acc_..." />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={saveApiKeys} disabled={saving}>Continue</Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-slate-300">You&apos;re all set. Go to the dashboard to generate and schedule posts.</p>
          <Button onClick={completeOnboarding} disabled={saving}>
            {saving ? "…" : "Go to Dashboard"}
          </Button>
        </>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
