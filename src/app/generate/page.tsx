import { GenerateForm } from "./ui";

export default function GeneratePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Generate a Draft</h1>
        <p className="text-slate-400">
          Kimi writes content perfectly aligned to your voice. Scheduling happens after approval.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <GenerateForm />
      </div>
    </div>
  );
}

