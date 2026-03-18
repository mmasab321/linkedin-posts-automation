"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const PROTECTED_PATHS = ["/dashboard", "/generate", "/settings"];

export function OnboardingRedirect() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !pathname) return;
    const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
    if (isProtected && session?.user?.onboardingComplete === false) {
      router.replace("/onboarding");
    }
  }, [status, session, pathname, router]);

  return null;
}
