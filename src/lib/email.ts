import "server-only";
import { Resend } from "resend";

// Lazily constructed so a missing key doesn't crash anything that merely
// imports this module — sendInviteEmail below just reports "not configured"
// instead, and the caller decides how to surface that.
function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

// The address invite emails are sent from. Resend's shared onboarding@
// address only delivers to the Resend account's own verified email, so
// actually reaching arbitrary family members' inboxes requires verifying a
// custom domain in Resend and setting RESEND_FROM_EMAIL to an address on it.
const DEFAULT_FROM = "onboarding@resend.dev";

export async function sendInviteEmail({
  to,
  name,
  loginUrl,
  password,
}: {
  to: string;
  name: string;
  loginUrl: string;
  password: string | null;
}): Promise<SendEmailResult> {
  const resend = getClient();
  if (!resend) {
    return { ok: false, error: "Email isn't set up yet (missing RESEND_API_KEY)." };
  }

  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  const accessLine = password
    ? `<p>Your temporary password is: <strong>${password}</strong></p>`
    : `<p>No password needed — just enter your email address to sign in.</p>`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "You've been added to the family planner",
    html: `
      <p>Hi ${name},</p>
      <p>You've been added to the family planner. Sign in here:</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
      ${accessLine}
    `,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
