"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Bell, CircleUser } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/generate", label: "Generate" },
  { href: "/settings", label: "Settings" },
];

export function TopNav({ className }: { className?: string }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <header className={`fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-surface-container-low font-sans antialiased tracking-tight border-b border-outline-variant/10 ${className ?? ""}`}>
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-xl font-black tracking-tighter text-on-surface">
          Auto-Poster
        </Link>
        {status !== "loading" && session && (
          <nav className="hidden md:flex items-center gap-6">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    active
                      ? "text-[#6366f1] font-bold border-b-2 border-[#6366f1] pb-1 transition-colors"
                      : "text-on-surface-variant hover:text-on-surface transition-colors"
                  }
                >
                  {l.label}
                </Link>
              );
            })}
            {session.user?.isAdmin && (
              <Link
                href="/admin"
                className={
                  pathname === "/admin"
                    ? "text-[#6366f1] font-bold border-b-2 border-[#6366f1] pb-1 transition-colors"
                    : "text-on-surface-variant hover:text-on-surface transition-colors"
                }
              >
                Admin
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === "loading" ? (
          <span className="text-on-surface-variant text-sm">…</span>
        ) : session ? (
          <>
            <button
              type="button"
              className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-all active:scale-95"
            >
              <Bell size={20} />
            </button>
            <button
              type="button"
              className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-all active:scale-95"
            >
              <CircleUser size={20} />
            </button>
            <span className="text-on-surface-variant text-sm px-2 truncate max-w-[140px] hidden sm:block" title={session.user?.email ?? undefined}>
              {session.user?.email ?? session.user?.name ?? "Account"}
            </span>
            <span className="text-outline-variant mx-1 hidden sm:block">|</span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-on-surface-variant hover:text-on-surface text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-surface-container transition-all"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/signin"
              className="text-on-surface-variant hover:text-on-surface text-sm px-4 py-2 rounded-lg hover:bg-surface-container transition-all"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-bold px-4 py-2 rounded-full bg-primary-container text-on-primary-container hover:opacity-90 transition-all"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
