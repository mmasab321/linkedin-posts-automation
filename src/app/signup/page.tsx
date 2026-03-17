"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignUpPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Sign up failed.");
        return;
      }
      router.push("/signin?callbackUrl=/dashboard");
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
          <CardTitle className="text-slate-100">Sign up</CardTitle>
          <CardDescription>Create an account to use the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : null}
            <div>
              <Label htmlFor="name" className="text-slate-300">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 bg-white/5 border-white/10 text-slate-100"
              />
            </div>
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
              <Label htmlFor="password" className="text-slate-300">Password (min 8 characters)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 bg-white/5 border-white/10 text-slate-100"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/signin" className="text-indigo-400 hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
