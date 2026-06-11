"use node";
import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { createHash, randomInt } from "crypto";

/**
 * Sends verification codes through the CRMX/GHL sub-account (LeadConnector
 * conversations API) — email and SMS both ride the same credentials already
 * used for lead sync. No Twilio, no Resend. Fail-soft: a send failure returns
 * a reason instead of throwing, so the UI can tell the user what happened.
 */

const GHL = "https://services.leadconnectorhq.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };
}

async function upsertContact(
  token: string,
  locationId: string,
  args: { email?: string; phone?: string; firstName: string }
): Promise<string | null> {
  const body: Record<string, unknown> = {
    locationId,
    firstName: args.firstName,
    tags: ["fki-website-lead", "fki-verification"],
    source: "FranchiseKI Website",
  };
  if (args.email) body.email = args.email;
  if (args.phone) body.phone = args.phone;
  const res = await fetch(`${GHL}/contacts/upsert`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as any;
  return data?.contact?.id ?? null;
}

export const issueAndSend = internalAction({
  args: {
    userId: v.id("users"),
    kind: v.union(v.literal("email"), v.literal("phone")),
    target: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) {
      console.error("[verification] GHL credentials missing — cannot send code");
      return { sent: false, reason: "credentials_missing" };
    }

    // Generate + store the code (only the hash is persisted)
    const code = String(randomInt(100000, 1000000)); // 6 digits
    const codeHash = createHash("sha256").update(code).digest("hex");
    await ctx.runMutation(internal.verification.storeCode, {
      userId: args.userId,
      kind: args.kind,
      codeHash,
      target: args.target,
    });

    const contactId = await upsertContact(token, locationId, {
      email: args.kind === "email" ? args.target : undefined,
      phone: args.kind === "phone" ? args.target : undefined,
      firstName: args.firstName,
    });
    if (!contactId) {
      console.error("[verification] CRMX contact upsert failed for", args.kind);
      return { sent: false, reason: "contact_upsert_failed" };
    }

    // Send through CRMX conversations
    const payload =
      args.kind === "email"
        ? {
            type: "Email",
            contactId,
            subject: `${code} is your FranchiseKI verification code`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <div style="background:#0f1f3d;border-radius:12px 12px 0 0;padding:18px 24px;">
    <span style="color:#ffffff;font-weight:700;letter-spacing:2px;">FRANCHISE<span style="color:#d4a857;">KI</span></span>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px 24px;background:#ffffff;">
    <p style="margin:0 0 8px;color:#0f172a;">Hi ${args.firstName},</p>
    <p style="margin:0 0 20px;color:#475569;">Your verification code is:</p>
    <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0f1f3d;text-align:center;padding:16px;background:#f8fafc;border-radius:8px;">${code}</div>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
  </div>
</div>`,
          }
        : {
            type: "SMS",
            contactId,
            message: `FranchiseKI: ${code} is your verification code. Expires in 10 minutes.`,
          };

    const res = await fetch(`${GHL}/conversations/messages`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      console.error("[verification] send failed", args.kind, res.status, JSON.stringify(data).slice(0, 300));
      return { sent: false, reason: `http_${res.status}`, detail: JSON.stringify(data).slice(0, 200) };
    }
    console.log("[verification] code sent via", args.kind, "to contact", contactId);
    return { sent: true, contactId };
  },
});

/** Public action: verify a submitted code. Identity comes from auth — the
 * client never chooses whose verification to complete. */
export const verifyCode = action({
  args: {
    kind: v.union(v.literal("email"), v.literal("phone")),
    code: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, error: "Not signed in" };
    const codeHash = createHash("sha256").update(args.code.trim()).digest("hex");
    return await ctx.runMutation(internal.verification.checkAndMark, {
      userId,
      kind: args.kind,
      codeHash,
    });
  },
});
