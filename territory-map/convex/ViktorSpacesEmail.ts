import { Email } from "@convex-dev/auth/providers/Email";
import { APP_NAME } from "./constants";

declare const process: { env: Record<string, string | undefined> };

function generateOTP() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

// Sends through CRMX/GHL (LeadConnector) — same account as the verification
// and invite emails. Viktor's email API is decommissioned.
const GHL = "https://services.leadconnectorhq.com";

async function sendEmail({
  email,
  token,
  subject,
  heading,
  description,
}: {
  email: string;
  token: string;
  subject: string;
  heading: string;
  description: string;
}) {
  const ghlToken = process.env.GHL_PIT_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!ghlToken || !locationId) {
    throw new Error("GHL env vars missing (GHL_PIT_TOKEN, GHL_LOCATION_ID)");
  }
  const headers = {
    Authorization: `Bearer ${ghlToken}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  const upsert = await fetch(`${GHL}/contacts/upsert`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      locationId,
      email,
      tags: ["fki-website-lead", "fki-password-reset"],
      source: "FranchiseKI Website",
    }),
  });
  const upsertData = (await upsert.json().catch(() => ({}))) as any;
  const contactId = upsertData?.contact?.id;
  if (!upsert.ok || !contactId) {
    throw new Error(`GHL contact upsert failed: ${JSON.stringify(upsertData).slice(0, 200)}`);
  }

  const res = await fetch(`${GHL}/conversations/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "Email",
      contactId,
      subject: `${subject} — ${APP_NAME}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <div style="background:#0f1f3d;border-radius:12px 12px 0 0;padding:18px 24px;">
    <span style="color:#ffffff;font-weight:700;letter-spacing:2px;">FRANCHISE<span style="color:#d4a857;">KI</span></span>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px 24px;background:#ffffff;">
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:18px;">${heading}</h2>
    <p style="margin:0 0 20px;color:#475569;">${description}</p>
    <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0f1f3d;text-align:center;padding:16px;background:#f8fafc;border-radius:8px;">${token}</div>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">This code expires in 15 minutes. If you didn't request it, you can safely ignore this email.</p>
  </div>
</div>`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL email send failed: ${err.slice(0, 200)}`);
  }
}

/**
 * Email verification provider for sign-up flow.
 * Sends OTP codes via Viktor Spaces API which:
 * - Rate limits per project (100 emails/hour)
 * - Sends from project-specific email addresses
 * - Keeps the Resend API key secure on the backend
 */
export const ViktorSpacesEmail = Email({
  id: "viktor-spaces-email",
  maxAge: 60 * 15, // 15 minutes

  async generateVerificationToken() {
    return generateOTP();
  },

  async sendVerificationRequest({ identifier: email, token }) {
    await sendEmail({
      email,
      token,
      subject: "Verify your email",
      heading: "Verify your email",
      description: "Your verification code is:",
    });
  },
});

/**
 * Password reset email provider.
 * Uses the same Viktor Spaces API but with different email template.
 */
export const ViktorSpacesPasswordReset = Email({
  id: "viktor-spaces-password-reset",
  maxAge: 60 * 15, // 15 minutes

  async generateVerificationToken() {
    return generateOTP();
  },

  async sendVerificationRequest({ identifier: email, token }) {
    await sendEmail({
      email,
      token,
      subject: "Reset your password",
      heading: "Reset your password",
      description: "Your password reset code is:",
    });
  },
});
