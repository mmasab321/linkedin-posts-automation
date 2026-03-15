import { DashboardClient } from "./ui";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Post Queue</h1>
        <p className="text-slate-400">
          Your LinkedIn timeline. Approve, edit, and cancel here. GetLate securely publishes your content.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <DashboardClient />
      </div>
    </div>
  );
}

