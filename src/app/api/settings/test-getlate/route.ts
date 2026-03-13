import { NextResponse } from "next/server";

import { getConfig } from "@/lib/config";
import { createGetLateClient } from "@/lib/getlate";

export const runtime = "nodejs";

export async function POST() {
  try {
    const key = await getConfig("GETLATE_API_KEY");
    if (!key) return NextResponse.json({ error: "GetLate API key not set." }, { status: 400 });

    const late = createGetLateClient(key);
    const { data } = await late.accounts.listAccounts();

    return NextResponse.json({
      ok: true,
      accounts: (data.accounts ?? []).map((a: any) => ({ platform: a.platform, id: a._id, username: a.username })),
    });
  } catch (err: any) {
    const status = typeof err?.statusCode === "number" ? err.statusCode : typeof err?.status === "number" ? err.status : 500;
    const message = typeof err?.message === "string" ? err.message : "GetLate test failed.";
    return NextResponse.json({ error: message }, { status });
  }
}

