"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";

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

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/admin/users")
      .then((res) => {
        if (res.status === 403) {
          router.replace("/dashboard");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (data?.users) setUsers(data.users);
      })
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [status, router]);

  async function setPlan(userId: string, plan: string) {
    setUpdatingId(userId);
    setError(null);
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

  if (status === "loading" || (status === "authenticated" && loading && users.length === 0)) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-white">Admin</h1>
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin — Users</h1>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="p-3">Email</th>
              <th className="p-3">Name</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Onboarding</th>
              <th className="p-3">Posts (month)</th>
              <th className="p-3">Autopilot</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 text-slate-200">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.name ?? "—"}</td>
                <td className="p-3 capitalize">{u.plan}</td>
                <td className="p-3">{u.onboardingComplete ? "Yes" : "No"}</td>
                <td className="p-3">{u.postsThisMonth}</td>
                <td className="p-3">{u.autopilotOn ? "On" : "Off"}</td>
                <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-3">
                  <select
                    value={u.plan}
                    onChange={(e) => setPlan(u.id, e.target.value)}
                    disabled={updatingId === u.id}
                    className="rounded border border-white/20 bg-white/5 px-2 py-1 text-slate-200"
                  >
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="agency">agency</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
