import { mutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Footer newsletter capture. Stores the subscriber and pushes a tagged
 * contact to CRMX (fail-soft — a GHL hiccup never blocks the signup).
 */

export const subscribe = mutation({
  args: { email: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Invalid email" };
    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) return { ok: true, already: true };
    await ctx.db.insert("newsletterSubscribers", {
      email,
      source: args.source,
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.newsletter.pushToGHL, { email });
    return { ok: true };
  },
});

export const pushToGHL = internalAction({
  args: { email: v.string() },
  handler: async (_ctx, { email }) => {
    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) return;
    try {
      await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId,
          email,
          tags: ["fki-newsletter"],
          source: "FranchiseKI Newsletter",
        }),
      });
    } catch (e) {
      console.error("[newsletter] GHL push failed", e);
    }
  },
});
