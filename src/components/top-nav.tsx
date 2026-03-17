"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/generate", label: "Generate" },
  { href: "/settings", label: "Settings" },
];

export function TopNav({ className }: { className?: string }) {
  const { data: session, status } = useSession();

  return (
    <header className={cn("sticky top-0 z-50 border-b border-white/5 bg-[#0B0F19]/60 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0B0F19]/40", className)}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-100 hidden sm:block">
            Auto-Poster
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
          {status === "loading" ? (
            <span className="text-slate-500">…</span>
          ) : session ? (
            <>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="relative rounded-full px-4 py-2 text-slate-400 transition-colors hover:text-slate-50 hover:bg-white/5"
                >
                  {l.label}
                </Link>
              ))}
              <span className="text-slate-500 mx-1">|</span>
              <span className="text-slate-400 px-2 truncate max-w-[120px]" title={session.user?.email ?? undefined}>
                {session.user?.email ?? session.user?.name ?? "Account"}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full px-4 py-2 text-slate-400 transition-colors hover:text-slate-50 hover:bg-white/5"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className="rounded-full px-4 py-2 text-slate-400 hover:text-slate-50 hover:bg-white/5">
                Sign in
              </Link>
              <Link href="/signup" className="rounded-full px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

