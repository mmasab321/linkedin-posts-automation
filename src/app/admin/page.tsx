"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Bot, HelpCircle, LogOut, Search, MoreVertical, ChevronLeft, ChevronRight, BarChart2, BarChart, Clock, Sparkles } from "lucide-react";
import { signOut } from "next-auth/react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  onboardingComplete: boolean;
  createdAt: string;
  postsThisMonth: number;
  autopilotOn: boolean;
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (status === "unauthenticated") { router.replace("/signin"); return; }
    if (status !== "authenticated") return;
    fetch("/api/admin/users")
      .then((res) => {
        if (res.status === 403) { router.replace("/dashboard"); return null; }
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => { if (data?.users) setUsers(data.users); })
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [status, router]);

  async function setPlan(userId: string, plan: string) {
    setUpdatingId(userId); setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan } : u)));
    } catch {
      setError("Failed to update plan.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = users.filter((u) =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || (u.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (status === "loading" || (status === "authenticated" && loading && users.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <span className="text-on-surface-variant text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface midnight-glow">
      {/* Sidebar */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-surface-container flex flex-col p-4 shadow-[20px_0_40px_rgba(0,0,0,0.4)] z-40 hidden md:flex">
        <div className="mb-8 px-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Command Center</p>
          <p className="text-xs text-primary-fixed-dim mt-1">LinkedIn Strategy</p>
        </div>
        <nav className="flex-1 space-y-1">
          {[
            { icon: Bot, label: "Autopilot", href: "/settings" },
            { icon: Clock, label: "Queue", href: "/dashboard" },
            { icon: BarChart2, label: "Quota", href: "/dashboard" },
            { icon: BarChart, label: "Insights", href: "/dashboard" },
          ].map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-high transition-all hover:translate-x-1 duration-200 rounded-lg">
              <Icon size={18} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            </Link>
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
      <main className="md:ml-64 flex-1 px-8 pb-12 pt-8">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-on-surface-variant block mb-2">System Administration</span>
            <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface leading-none">User Management</h1>
            <p className="mt-3 text-on-surface-variant max-w-lg">Oversee the growth and subscription health of the Auto-Poster ecosystem.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant/10 flex items-center gap-3">
              <Users size={20} className="text-primary" />
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Total Users</div>
                <div className="text-lg font-bold leading-none">{users.length}</div>
              </div>
            </div>
            <Link href="/dashboard" className="bg-gradient-to-r from-primary to-primary-container text-on-primary-container px-6 py-3 rounded-full font-bold text-sm transition-transform active:scale-95 shadow-lg shadow-primary/20 hover:opacity-90">
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Table container */}
        <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-2xl">
          {/* Controls */}
          <div className="p-6 bg-surface-container/50 border-b border-outline-variant/5 flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name, email or plan…"
                className="w-full bg-surface-container-lowest rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-on-surface placeholder:text-on-surface-variant/50 border border-outline-variant/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-lg bg-surface-container-high text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">All</button>
              <button className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high transition-colors">Active</button>
              <button className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high transition-colors">Pending</button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest">
                  {["Name & Identity", "Subscription Plan", "Onboarding", "Activity (Mo)", "Autopilot", "Joined Date", ""].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] uppercase font-bold tracking-[0.1em] text-on-surface-variant/70">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-high/40 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/10">
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-on-surface block">{u.name ?? "—"}</span>
                          <span className="text-xs text-on-surface-variant/70">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <select
                        value={u.plan}
                        onChange={(e) => setPlan(u.id, e.target.value)}
                        disabled={updatingId === u.id}
                        className="bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-xs font-bold px-3 py-1.5 text-primary outline-none cursor-pointer disabled:opacity-50 appearance-none"
                      >
                        <option value="free">FREE</option>
                        <option value="pro">PRO</option>
                        <option value="agency">AGENCY</option>
                      </select>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.onboardingComplete ? "bg-primary/10 text-primary" : "bg-surface-variant text-on-surface-variant"}`}>
                        {u.onboardingComplete ? "Done" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-medium text-on-surface">{u.postsThisMonth}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className={`h-2.5 w-2.5 rounded-full mx-auto ${u.autopilotOn ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "bg-surface-container-highest"}`} />
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs text-on-surface-variant">{new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-surface-container-highest rounded-lg transition-all">
                        <MoreVertical size={16} className="text-on-surface-variant" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant text-sm">
                      {search ? "No users match your search." : "No users found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/5 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant/60">Showing {filtered.length} of {users.length} users</span>
            <div className="flex gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                <ChevronLeft size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/20 text-primary text-xs font-bold">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 bg-surface-container rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-primary/10 transition-colors" />
            <h4 className="text-lg font-bold mb-6 text-on-surface relative z-10">Platform Overview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1">Total Users</p>
                <p className="text-2xl font-black text-on-surface">{users.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1">Autopilot On</p>
                <p className="text-2xl font-black text-emerald-400">{users.filter((u) => u.autopilotOn).length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1">Pro+</p>
                <p className="text-2xl font-black text-on-surface">{users.filter((u) => u.plan !== "free").length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1">Onboarded</p>
                <p className="text-2xl font-black text-on-surface">{users.filter((u) => u.onboardingComplete).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-primary/10 rounded-xl p-8 border border-primary/10 flex flex-col justify-between">
            <div>
              <Sparkles size={28} className="text-primary mb-4" />
              <h4 className="text-lg font-bold text-on-surface">Quick Actions</h4>
              <p className="text-sm text-on-surface-variant mt-2">Manage users, update plans, and monitor activity from this panel.</p>
            </div>
            <Link href="/settings" className="mt-6 text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 hover:gap-3 transition-all">
              Go to Settings →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
