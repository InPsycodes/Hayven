import "server-only";

import { Resend } from "resend";

/**
 * No key configured -- local dev/CI without RESEND_API_KEY set should
 * degrade to a silent no-op, not a crash. This is fire-and-forget by
 * design, same contract as createNotification: an email failing to send
 * must never roll back or block the action that triggered it.
 */
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sandbox default -- Resend will only actually deliver mail sent from this
 * address to the account owner's own verified email until a real sending
 * domain is added and verified in the Resend dashboard. Once that's done,
 * set EMAIL_FROM (e.g. "Hayven <notifications@send.hayven.com.ng>") and
 * every call site here picks it up automatically, no code change needed.
 */
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Hayven <onboarding@resend.dev>";

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  if (!resend) {
    console.warn("sendEmail skipped -- RESEND_API_KEY not configured:", params.subject);
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) console.error("sendEmail failed", params.subject, error);
  } catch (err) {
    console.error("sendEmail threw", params.subject, err);
  }
}

/**
 * Notification title/body ultimately trace back to user-supplied text (a
 * chat message, a support ticket subject/message, a signup full_name) --
 * unlike JSX, a plain template-literal HTML string sent as an email gets no
 * automatic escaping, so every interpolated value here must be escaped
 * explicitly or it's a stored-HTML-injection vector into someone else's
 * inbox (phishing look-alikes, tracking pixels).
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Minimal branded wrapper around a notification's title/body -- inline
 * styles throughout since email clients strip <style> tags and most of
 * Tailwind's utility classes. Kept deliberately plain (one accent color,
 * no imagery) so it renders consistently across clients without a full
 * email-testing pass.
 *
 * actionUrl/actionLabel add a clickable button -- previously every
 * notification email was a dead end (title + body only, no way to act on
 * it without already knowing where to navigate manually). Found via a
 * real user testing the pediatrician-referral flow and reporting the
 * resulting email as "vague and non-explanatory": createNotification
 * already carries a `url` for the in-app bell's deep link, but never
 * passed it into this template at all.
 */
export function renderNotificationEmail(
  title: string,
  body: string,
  opts?: { unsubscribeUrl?: string; actionUrl?: string; actionLabel?: string; footerNote?: string }
): string {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  // Default assumes the recipient has a Hayven account (true for every
  // existing caller -- createNotification only ever targets a user row).
  // Wrong for a cold, no-account recipient like the pediatrician-referral
  // flow's new parent email -- caught by actually looking at the rendered
  // output before shipping, not assumed correct from the code alone.
  const safeFooterNote = escapeHtml(opts?.footerNote ?? "You’re receiving this because of activity on your account.");
  const unsubscribeLine = opts?.unsubscribeUrl
    ? `<br /><a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#4a4744;text-decoration:underline;">Manage or turn off these emails</a>.`
    : "";
  const actionButton = opts?.actionUrl
    ? `<tr>
              <td style="padding:0 28px 28px;">
                <a href="${escapeHtml(opts.actionUrl)}" style="display:inline-block;background-color:#1a1a1a;color:#faf8f6;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">${escapeHtml(opts.actionLabel ?? "Open in Hayven")}</a>
              </td>
            </tr>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#e4e1df;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e4e1df;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#faf8f6;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#1a1a1a;padding:20px 28px;">
                <span style="color:#faf8f6;font-size:16px;font-weight:600;letter-spacing:0.02em;">HAYVEN</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 20px;">
                <h1 style="margin:0 0 12px;color:#1a1a1a;font-size:19px;font-weight:600;">${safeTitle}</h1>
                <p style="margin:0;color:#4a4744;font-size:15px;line-height:1.6;">${safeBody}</p>
              </td>
            </tr>
            ${actionButton}
            <tr>
              <td style="padding:16px 28px 24px;border-top:1px solid rgba(26,26,26,0.08);">
                <p style="margin:0;color:#4a4744;font-size:12px;">
                  Hayven &middot; Nigeria pilot &middot; ${safeFooterNote}${unsubscribeLine}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
