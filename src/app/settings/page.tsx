import { SettingsClient } from "./ui";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings & API Keys</h1>
        <p className="text-slate-400">
          Keys are stored securely in your Postgres database via Prisma and are never exposed to the client.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <SettingsClient />
      </div>
    </div>
  );
}

