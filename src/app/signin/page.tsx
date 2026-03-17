"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
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
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm border-white/10 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-slate-100">Sign in</CardTitle>
          <CardDescription>Use your email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : null}
            <div>
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 bg-white/5 border-white/10 text-slate-100"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 bg-white/5 border-white/10 text-slate-100"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-400">
            No account?{" "}
            <Link href="/signup" className="text-indigo-400 hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
