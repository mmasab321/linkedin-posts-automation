export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-md">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-4">Welcome to Auto-Poster</h2>
        <p className="text-slate-400 mb-6 max-w-sm mx-auto">
          Manage your LinkedIn generating and scheduling via GetLate.
        </p>
        <a
          href="/dashboard"
          className="inline-block rounded-full bg-indigo-600 px-8 py-3 font-semibold text-white transition-all hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
