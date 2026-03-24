"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Rocket, ArrowRight, Sparkles, Calendar, Zap, Mail, Lock } from "lucide-react";

function SignInForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col md:flex-row overflow-hidden">
      {/* LEFT PANEL */}
      <section className="relative w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 bg-surface-container-lowest overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(128,131,255,0.08),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(128,131,255,0.03),transparent_40%)]" />
        <div className="relative z-10 max-w-lg">
          <div className="mb-12 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(128,131,255,0.3)]">
              <Rocket size={20} className="text-on-primary-container" />
            </div>
            <span className="text-xl font-black tracking-tighter text-on-surface">Auto-Poster</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-8 text-on-surface">
            Your LinkedIn on <span className="text-primary">autopilot.</span>
          </h1>

          <div className="space-y-6">
            {[
              { icon: Sparkles, step: "01", label: "Generate" },
              { icon: Calendar, step: "02", label: "Schedule" },
              { icon: Zap, step: "03", label: "Automate" },
            ].map(({ icon: Icon, step, label }, i) => (
              <div key={step} className="flex items-center gap-4 group" style={{ marginLeft: `${i * 16}px` }}>
                <div className="flex-none w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center group-hover:bg-primary-container transition-colors duration-300">
                  <Icon size={20} className="text-primary group-hover:text-on-primary-container transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Step {step}</p>
                  <h3 className="text-lg font-bold text-on-surface">{label}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RIGHT PANEL */}
      <section className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 bg-surface">
        <div className="w-full max-w-md">
          <div className="bg-surface-container rounded-xl p-8 md:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-on-surface mb-2">Welcome Back</h2>
              <p className="text-sm text-on-surface-variant">Log in to manage your professional presence.</p>
            </div>

            {/* Auth toggle tabs */}
            <div className="flex p-1 mb-8 bg-surface-container-lowest rounded-full max-w-xs mx-auto">
              <span className="flex-1 py-2 px-4 text-sm font-bold rounded-full bg-primary-container text-on-primary-container shadow-sm text-center">
                Sign In
              </span>
              <Link href="/signup" className="flex-1 py-2 px-4 text-sm font-bold rounded-full text-on-surface-variant hover:text-on-surface transition-all text-center">
                Sign Up
              </Link>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              {error && <p className="text-sm text-error bg-error-container/20 rounded-lg px-4 py-2">{error}</p>}

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@company.com"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-outline-variant/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-outline-variant/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-4 px-4 rounded-full text-sm font-black uppercase tracking-widest text-on-primary-container bg-primary-container hover:opacity-90 transition-all active:scale-95 shadow-[0_10px_20px_rgba(128,131,255,0.2)] disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Continue to Console"}
                <ArrowRight size={16} className="absolute right-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-surface-container px-4 text-on-surface-variant font-bold">Or</span>
              </div>
            </div>

            <p className="text-center text-xs text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:text-primary-fixed-dim underline underline-offset-4 transition-colors">
                Sign up free
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <span className="text-on-surface-variant text-sm">Loading…</span>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
