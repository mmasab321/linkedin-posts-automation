export default function Home() {
  // We keep the root route simple.
  // (Redirect happens on the client for now to avoid server redirects during dev reloads.)
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
      Go to <a className="font-medium text-neutral-950 underline dark:text-neutral-50" href="/dashboard">Dashboard</a>.
    </div>
  );
}
