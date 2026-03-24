"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, CheckCircle, Lightbulb, CheckSquare } from "lucide-react";

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
        body: JSON.stringify({ name: name.trim(), headline: headline.trim(), niche: niche.trim(), audience: audience.trim(), tone: tone.trim(), avoidPhrases: avoidPhrases.trim() }),
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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <span className="text-on-surface-variant text-sm">Loading…</span>
      </div>
    );
  }

  if (!session) return null;

  const progressWidth = step === 1 ? "33.33%" : step === 2 ? "66.66%" : "100%";

  return (
    <div className="min-h-screen bg-surface midnight-glow pt-8 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Step indicator */}
        <div className="w-full max-w-2xl mx-auto mb-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary block mb-1">Onboarding Journey</span>
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">Initialize Your Profile</h2>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-on-surface-variant">
                Step <span className="text-on-surface font-bold">{step}</span> of 3
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: progressWidth }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
          {/* Main form */}
          <section className="lg:col-span-8 bg-surface-container rounded-xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            {error && (
              <div className="mb-6 rounded-lg border border-error/30 bg-error-container/20 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {step === 1 && (
              <>
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-on-surface mb-2">Step 1: Voice Profile</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    We need to understand your unique professional voice to generate authentic LinkedIn content that resonates with your audience.
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant ml-1 block">Full Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Rivera"
                        className="w-full bg-surface-container-lowest ghost-border rounded-lg px-4 py-3 text-on-surface outline-none placeholder:text-outline transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant ml-1 block">Professional Headline</label>
                      <input
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Senior Product Designer"
                        className="w-full bg-surface-container-lowest ghost-border rounded-lg px-4 py-3 text-on-surface outline-none placeholder:text-outline transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant ml-1 block">Niche / Industry</label>
                      <input
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        placeholder="e.g. Fintech, Web3, UX Design"
                        className="w-full bg-surface-container-lowest ghost-border rounded-lg px-4 py-3 text-on-surface outline-none placeholder:text-outline transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant ml-1 block">Target Audience</label>
                      <input
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        placeholder="e.g. Tech Founders, Recruiters"
                        className="w-full bg-surface-container-lowest ghost-border rounded-lg px-4 py-3 text-on-surface outline-none placeholder:text-outline transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant ml-1 block">Writing Tone</label>
                    <div className="relative">
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full bg-surface-container-lowest ghost-border rounded-lg px-4 py-3 text-on-surface appearance-none outline-none transition-all"
                      >
                        <option value="">Select a tone…</option>
                        <option value="punchy">Punchy &amp; Provocative</option>
                        <option value="casual">Casual &amp; Relatable</option>
                        <option value="technical">Analytical &amp; Data-Driven</option>
                        <option value="neutral">Professional &amp; Authoritative</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant ml-1 block">Phrases to Avoid</label>
                    <textarea
                      value={avoidPhrases}
                      onChange={(e) => setAvoidPhrases(e.target.value)}
                      placeholder="Comma-separated list (e.g. 'game-changer', 'synergy', 'deep dive')"
                      rows={3}
                      className="w-full bg-surface-container-lowest ghost-border rounded-lg px-4 py-3 text-on-surface outline-none placeholder:text-outline transition-all resize-none"
                    />
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={saveVoiceProfile}
                      disabled={saving || !name.trim() || !headline.trim() || !niche.trim() || !audience.trim() || !tone.trim()}
                      className="bg-gradient-to-r from-primary to-primary-container text-on-primary-container px-8 py-3 rounded-full font-bold tracking-tight hover:shadow-[0_0_20px_rgba(128,131,255,0.3)] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save & Continue"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-on-surface mb-2">Step 2: API Authentication</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">Connect your AI and scheduling services to enable post generation and publishing.</p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant ml-1 block">Moonshot API Key (Kimi)</label>
                    <input
                      value={moonshotApiKey}
                      onChange={(e) => setMoonshotApiKey(e.target.value)}
                      type="password"
                      autoComplete="off"
                      placeholder="sk-..."
                      className="w-full bg-surface-container-lowest ghost-border rounded-lg px-4 py-3 text-on-surface outline-none placeholder:text-outline transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant ml-1 block">GetLate API Key</label>
                    <input
                      value={getlateApiKey}
                      onChange={(e) => setGetlateApiKey(e.target.value)}
                      type="password"
                      autoComplete="off"
                      placeholder="sk_..."
                      className="w-full bg-surface-container-lowest ghost-border rounded-lg px-4 py-3 text-on-surface outline-none placeholder:text-outline transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant ml-1 block">LinkedIn Account ID (from GetLate)</label>
                    <input
                      value={linkedinAccountId}
                      onChange={(e) => setLinkedinAccountId(e.target.value)}
                      placeholder="acc_..."
                      className="w-full bg-surface-container-lowest ghost-border rounded-lg px-4 py-3 text-on-surface outline-none placeholder:text-outline transition-all"
                    />
                  </div>
                  <div className="pt-4 flex justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-6 py-3 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all font-bold"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      onClick={saveApiKeys}
                      disabled={saving}
                      className="bg-gradient-to-r from-primary to-primary-container text-on-primary-container px-8 py-3 rounded-full font-bold tracking-tight hover:shadow-[0_0_20px_rgba(128,131,255,0.3)] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save & Continue"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <div className="flex flex-col items-center text-center space-y-6 py-8">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle size={48} className="text-primary" />
                </div>
                <h3 className="text-3xl font-black tracking-tighter text-on-surface">You&apos;re all set</h3>
                <p className="text-on-surface-variant max-w-sm">Your command center is configured. LinkedIn strategy is now on autopilot.</p>
                <button
                  onClick={completeOnboarding}
                  disabled={saving}
                  className="bg-primary text-on-primary px-10 py-4 rounded-full font-bold text-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? "…" : "Go to Dashboard"}
                </button>
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Step 2 preview */}
            <div className={`bg-surface-container-low rounded-xl p-6 transition-all ${step >= 2 ? "opacity-100" : "opacity-50 grayscale-[0.5]"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold text-on-surface">2</div>
                <h4 className="text-sm font-bold tracking-tight text-on-surface-variant uppercase">API Configuration</h4>
              </div>
              <div className="space-y-3">
                <div className="h-10 w-full bg-surface-container-highest rounded-lg" />
                <div className="h-10 w-full bg-surface-container-highest rounded-lg" />
              </div>
            </div>

            {/* Step 3 preview */}
            <div className={`bg-surface-container-low rounded-xl p-6 transition-all ${step >= 3 ? "opacity-100" : "opacity-50 grayscale-[0.5]"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold text-on-surface">3</div>
                <h4 className="text-sm font-bold tracking-tight text-on-surface-variant uppercase">Ready for Autopilot</h4>
              </div>
              <div className="h-20 w-full bg-surface-container-highest rounded-lg flex items-center justify-center">
                <CheckSquare size={32} className="text-outline-variant" />
              </div>
            </div>

            {/* Info card */}
            <div className="bg-primary-container/10 border border-primary/20 rounded-xl p-6">
              <Lightbulb size={20} className="text-primary mb-3" />
              <h5 className="text-sm font-bold text-primary mb-2">Why this matters?</h5>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Our AI uses these anchors to prevent &quot;hallucinations&quot; and ensure every post feels like it was written by you, not a machine.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
