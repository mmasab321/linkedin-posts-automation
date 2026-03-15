import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { QuotaWidget } from "@/components/quota-widget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkedIn Auto-Poster",
  description: "Generate LinkedIn drafts with Kimi and schedule via GetLate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#0B0F19] text-slate-50 selection:bg-indigo-500/30`}
      >
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0B0F19] to-[#0B0F19]"></div>
        <TopNav />
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
          <main className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">{children}</main>
          <aside className="lg:sticky lg:top-8 lg:self-start animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out delay-150 fill-mode-both">
            <QuotaWidget />
          </aside>
        </div>
      </body>
    </html>
  );
}
