import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { OnboardingRedirect } from "@/components/onboarding-redirect";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto-Poster — LinkedIn on Autopilot",
  description: "Generate LinkedIn drafts with Kimi and schedule via GetLate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased min-h-screen bg-surface text-on-surface selection:bg-primary-container/30 selection:text-primary`}
      >
        <Providers>
          <OnboardingRedirect />
          <div className="fixed inset-0 z-[-1] midnight-glow pointer-events-none" />
          <TopNav />
          <div className="pt-16">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
