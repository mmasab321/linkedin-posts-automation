import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? "LinkedIn Auto-Poster <onboarding@resend.dev>";
const APPROVAL_EMAIL = process.env.APPROVAL_EMAIL ?? "";
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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approve post: ${escapeHtml(topic.slice(0, 50))}</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem; margin-bottom: 8px;">LinkedIn Auto-Poster – Post ready for review</h1>
  <p style="color: #666; margin-bottom: 24px;">Scheduled for <strong>${escapeHtml(scheduledStr)}</strong>. Approve to publish or reject to cancel.</p>
  <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px; white-space: pre-wrap;">${escapeHtml(content)}</div>
  <p style="margin-bottom: 16px;">Choose an action (one-time use):</p>
  <p style="margin-bottom: 12px;">
    <a href="${approveUrl}" style="display: inline-block; background: #0a0; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Approve – post will go live as scheduled</a>
  </p>
  <p>
    <a href="${rejectUrl}" style="display: inline-block; background: #c00; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reject – cancel this post</a>
  </p>
  <p style="margin-top: 24px; font-size: 0.875rem; color: #888;">If you do nothing, this post will not be published.</p>
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

export function getApprovalEmailTo(): string {
  return APPROVAL_EMAIL;
}
