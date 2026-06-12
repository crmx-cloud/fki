"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createHash, randomInt } from "crypto";

/**
 * Brand Showcase onboarding: sends contact-verification codes (email + SMS)
 * to franchisor inquiries through the CRMX/GHL sub-account — same
 * conversations-API pipeline as verificationSend.ts, but keyed to a
 * brandShowcaseInquiries row instead of a signed-in user (the submitter has
 * no platform account yet).
 */

const GHL = "https://services.leadconnectorhq.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };
}

export const sendCode = internalAction({
  args: {
    inquiryId: v.id("brandShowcaseInquiries"),
    kind: v.union(v.literal("email"), v.literal("phone")),
  },
  handler: async (ctx, args): Promise<{ sent: boolean; reason?: string }> => {
    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) {
      console.error("[brandShowcaseVerify] GHL credentials missing — cannot send code");
      return { sent: false, reason: "credentials_missing" };
    }

    const inquiry: any = await ctx.runQuery(internal.brandShowcase.getInquiry, {
      inquiryId: args.inquiryId,
    });
    if (!inquiry) return { sent: false, reason: "inquiry_not_found" };

    // Generate + store the code (only the hash is persisted)
    const code = String(randomInt(100000, 1000000)); // 6 digits
    const codeHash = createHash("sha256").update(code).digest("hex");
    await ctx.runMutation(internal.brandShowcase.storeVerifyCode, {
      inquiryId: args.inquiryId,
      kind: args.kind,
      codeHash,
    });

    // Upsert the contact (it already exists from the inquiry push — this just
    // resolves the contactId without creating duplicates).
    const upsertBody: Record<string, unknown> = {
      locationId,
      firstName: inquiry.firstName,
      tags: ["franchiseki brand showcase requested"],
      source: "FranchiseKI Brand Showcase",
    };
    if (args.kind === "email") upsertBody.email = inquiry.email;
    else upsertBody.phone = inquiry.phone;
    const upsert = await fetch(`${GHL}/contacts/upsert`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(upsertBody),
    });
    const upsertData = (await upsert.json().catch(() => ({}))) as any;
    const contactId = upsertData?.contact?.id;
    if (!upsert.ok || !contactId) {
      console.error("[brandShowcaseVerify] contact upsert failed", upsert.status);
      return { sent: false, reason: "contact_upsert_failed" };
    }

    const payload =
      args.kind === "email"
        ? {
            type: "Email",
            contactId,
            subject: `${code} is your Brand Showcase verification code`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <div style="background:#0f1f3d;border-radius:12px 12px 0 0;padding:18px 24px;">
    <span style="color:#ffffff;font-weight:700;letter-spacing:2px;">FRANCHISE<span style="color:#d4a857;">KI</span></span>
    <span style="color:#d4a857;font-size:12px;font-weight:600;letter-spacing:1px;float:right;margin-top:3px;">BRAND SHOWCASE</span>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px 24px;background:#ffffff;">
    <p style="margin:0 0 8px;color:#0f172a;">Hi ${inquiry.firstName},</p>
    <p style="margin:0 0 20px;color:#475569;">Your verification code for <strong>${inquiry.brandName}</strong> is:</p>
    <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0f1f3d;text-align:center;padding:16px;background:#f8fafc;border-radius:8px;">${code}</div>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
  </div>
</div>`,
          }
        : {
            type: "SMS",
            contactId,
            message: `FranchiseKI Brand Showcase: ${code} is your verification code. Expires in 10 minutes.`,
          };

    const res = await fetch(`${GHL}/conversations/messages`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      console.error(
        "[brandShowcaseVerify] send failed",
        args.kind,
        res.status,
        JSON.stringify(data).slice(0, 300)
      );
      return { sent: false, reason: `http_${res.status}` };
    }
    console.log("[brandShowcaseVerify] code sent via", args.kind, "for inquiry", args.inquiryId);
    return { sent: true };
  },
});

/** Tags the CRMX contact once both channels are verified (fail-soft). */
export const tagVerified = internalAction({
  args: { inquiryId: v.id("brandShowcaseInquiries") },
  handler: async (ctx, args): Promise<{ ok: boolean; reason?: string }> => {
    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) return { ok: false, reason: "credentials_missing" };
    const inquiry: any = await ctx.runQuery(internal.brandShowcase.getInquiry, {
      inquiryId: args.inquiryId,
    });
    if (!inquiry) return { ok: false, reason: "inquiry_not_found" };
    const res = await fetch(`${GHL}/contacts/upsert`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        locationId,
        email: inquiry.email,
        tags: ["fki showcase contact verified"],
        source: "FranchiseKI Brand Showcase",
      }),
    });
    return { ok: res.ok };
  },
});
