"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * FranchiseKI Website → CRMX (GoHighLevel) lead sync.
 *
 * Every lead created on the site is pushed to the FKI sub-account in CRMX via
 * the LeadConnector v2 contacts/upsert API, tagged for segmentation:
 *   - tag  "fki-website-lead"        → lead source segmentation
 *   - tag  "franchiseki-user-created" → user-created-on-site segmentation
 *   - source "FranchiseKI Website"
 *
 * Credentials come from Convex environment variables (set in the Convex
 * dashboard — never committed):
 *   GHL_PIT_TOKEN    — Private Integration token for the FKI sub-account
 *   GHL_LOCATION_ID  — the CRMX sub-account (location) id
 *
 * Fail-soft by design: if credentials are missing or CRMX is down, the lead
 * still lands in our own Convex CRM — sync failures are logged, never thrown
 * back into the user-facing flow.
 */
/** QA helper: fetch a CRMX contact server-side to verify tags/source landed. */
export const verifyContact = internalAction({
  args: { contactId: v.optional(v.string()), email: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const { contactId } = args;
    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token) return { ok: false, reason: "no token" };
    let id = contactId;
    if (!id && args.email) {
      const sr = await fetch(
        `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(args.email)}`,
        { headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28" } }
      );
      const sd = (await sr.json().catch(() => ({}))) as any;
      id = sd?.contact?.id;
      if (!id) return { ok: false, reason: "email not found in CRMX" };
    }
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${id}`, {
      headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28" },
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) return { ok: false, status: res.status };
    const c = data?.contact ?? {};
    return {
      ok: true,
      name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
      email: c.email,
      tags: c.tags,
      source: c.source,
    };
  },
});

/** QA helper: delete a CRMX contact by email (cleanup of test contacts only). */
export const deleteContactByEmail = internalAction({
  args: { email: v.string() },
  handler: async (_ctx, args) => {
    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) return { ok: false, reason: "credentials_missing" };
    const sr = await fetch(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(args.email)}`,
      { headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28" } }
    );
    const sd = (await sr.json().catch(() => ({}))) as any;
    const id = sd?.contact?.id;
    if (!id) return { ok: false, reason: "not_found" };
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28" },
    });
    return { ok: res.ok, status: res.status, contactId: id };
  },
});

export const pushLeadToCRMX = internalAction({
  args: {
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    brandName: v.optional(v.string()),
    territory: v.optional(v.string()),
    liquidCapital: v.optional(v.string()),
    leadKind: v.string(), // "brand_inquiry" | "prospect_signup" | "claim_request"
    notes: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) {
      console.warn(
        "[crmxPush] GHL_PIT_TOKEN / GHL_LOCATION_ID not set — lead NOT synced to CRMX:",
        args.email ?? args.firstName
      );
      return { synced: false, reason: "credentials_missing" };
    }

    const tags = [
      "fki-website-lead",
      "franchiseki-user-created",
      `fki-${args.leadKind.replace(/_/g, "-")}`,
    ];
    if (args.brandName) {
      tags.push(`fki-brand-${args.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`);
    }

    const body: Record<string, unknown> = {
      locationId,
      firstName: args.firstName,
      lastName: args.lastName ?? "",
      tags,
      source: "FranchiseKI Website",
    };
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;

    const noteParts = [
      args.brandName ? `Interested brand: ${args.brandName}` : null,
      args.territory ? `Territory: ${args.territory}` : null,
      args.liquidCapital ? `Liquid capital: ${args.liquidCapital}` : null,
      args.notes ?? null,
    ].filter(Boolean);

    try {
      const res = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        console.error("[crmxPush] upsert failed", res.status, JSON.stringify(data).slice(0, 300));
        return { synced: false, reason: `http_${res.status}` };
      }

      const contactId = data?.contact?.id;
      // Attach the context note to the CRMX contact (best-effort)
      if (contactId && noteParts.length > 0) {
        await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Version: "2021-07-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: `[FranchiseKI Website — ${args.leadKind}]\n${noteParts.join("\n")}` }),
        }).catch((e) => console.warn("[crmxPush] note attach failed", e));
      }

      console.log("[crmxPush] synced", args.email ?? args.firstName, "→ CRMX contact", contactId);
      return { synced: true, contactId };
    } catch (e: any) {
      console.error("[crmxPush] network error", e?.message);
      return { synced: false, reason: "network_error" };
    }
  },
});
