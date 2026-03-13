import Link from "next/link";

import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/generate", label: "Generate" },
  { href: "/settings", label: "Settings" },
];

export function TopNav({ className }: { className?: string }) {
  return (
    <header className={cn("border-b border-neutral-200 bg-white/70 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70", className)}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          LinkedIn Auto-Poster
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

