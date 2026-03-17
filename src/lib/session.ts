import { auth } from "@/auth";

/** Returns current user id or null. Use in API routes and server code. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Throws if not logged in; returns userId. */
export async function requireUserId(): Promise<string> {
  const id = await getSessionUserId();
  if (!id) throw new Error("UNAUTHORIZED");
  return id;
}
