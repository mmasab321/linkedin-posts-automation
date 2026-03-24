import { Resend } from "resend";

import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? "LinkedIn Auto-Poster <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type SendApprovalEmailParams = {
  to: string;
  draftId: string;
  token: string;
  content: string;
  topic: string;
  scheduledFor: Date;
};

export async function sendApprovalEmail(params: SendApprovalEmailParams): Promise<{ ok: boolean; error?: string }> {
  const { to, draftId, token, content, topic, scheduledFor } = params;
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const approveUrl = `${APP_URL.replace(/\/$/, "")}/api/approval?token=${encodeURIComponent(token)}&action=approve`;
  const rejectUrl = `${APP_URL.replace(/\/$/, "")}/api/approval?token=${encodeURIComponent(token)}&action=reject`;
  const scheduledStr = scheduledFor.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  const previewText = content.slice(0, 120).replace(/\n/g, " ");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review your LinkedIn post</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#6366f1;color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;">
        LinkedIn Autopilot
      </div>
    </div>

    <!-- Card -->
    <div style="background:#1e293b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;margin-bottom:24px;">

      <!-- Card header -->
      <div style="padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">Post ready for review</p>
        <h1 style="margin:0;font-size:17px;font-weight:700;color:#f1f5f9;line-height:1.4;">${escapeHtml(topic)}</h1>
        <p style="margin:8px 0 0;font-size:13px;color:#64748b;">
          Scheduled for <span style="color:#a5b4fc;font-weight:600;">${escapeHtml(scheduledStr)}</span>
        </p>
      </div>

      <!-- Post preview -->
      <div style="padding:20px 24px;background:#0f172a;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#475569;">Post preview</p>
        <div style="font-size:14px;line-height:1.7;color:#cbd5e1;white-space:pre-wrap;max-height:280px;overflow:hidden;">${escapeHtml(content.slice(0, 800))}${content.length > 800 ? "\n\n…" : ""}</div>
      </div>

      <!-- Action buttons -->
      <div style="padding:20px 24px;">
        <p style="margin:0 0 16px;font-size:13px;color:#64748b;">One-time use links — each button works only once.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding-right:8px;">
              <a href="${approveUrl}"
                style="display:block;text-align:center;background:#16a34a;color:#fff;padding:14px 20px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                ✓ Approve &amp; Schedule
              </a>
            </td>
            <td style="padding-left:8px;">
              <a href="${rejectUrl}"
                style="display:block;text-align:center;background:#dc2626;color:#fff;padding:14px 20px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                ✕ Reject
              </a>
            </td>
          </tr>
        </table>
      </div>

    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:12px;color:#334155;line-height:1.6;margin:0;">
      If you do nothing, this post will <strong style="color:#475569;">not</strong> be published.<br>
      This link expires after use. If you didn't expect this email, ignore it.
    </p>

  </div>
</body>
</html>
`.trim();

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Approve post: ${topic.slice(0, 60)}${topic.length > 60 ? "…" : ""}`,
    html,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Per-user approval email if set, else APPROVAL_EMAIL env. */
export async function getApprovalEmailTo(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { approvalEmail: true },
  });
  const fromUser = user?.approvalEmail?.trim();
  if (fromUser) return fromUser;
  return process.env.APPROVAL_EMAIL ?? "";
}

/** Sync version for callers that already have the value (e.g. from cache). */
export function getApprovalEmailToEnv(): string {
  return process.env.APPROVAL_EMAIL ?? "";
}
