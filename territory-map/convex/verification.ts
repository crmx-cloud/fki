import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Email + phone verification — codes are sent through CRMX/GHL (the
 * sub-account's own email + SMS), never a third-party mailer. Every
 * verification touch is visible in the contact's CRMX conversation history.
 *
 * Flow: requestCode (rate-limited) → node action generates + hashes the code,
 * stores the hash, sends via GHL → verifyCode action hashes the submission and
 * marks emailVerifiedAt / phoneVerifiedAt on the user profile.
 */

const KIND = v.union(v.literal("email"), v.literal("phone"));
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

/** Step 1 — user asks for a code. Returns fast; sending happens async. */
export const requestCode = mutation({
  args: { kind: KIND, phone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!user) throw new Error("No user");

    let target: string | undefined;
    if (args.kind === "email") {
      target = user.email ?? undefined;
    } else {
      target = args.phone || profile?.phone || undefined;
      // Persist the phone they're verifying so the profile matches the proof
      if (args.phone && profile && profile.phone !== args.phone) {
        await ctx.db.patch(profile._id, { phone: args.phone });
      }
      // ONE identity: mirror to the PerfectFit profile too
      if (args.phone) {
        const prospect = await ctx.db
          .query("prospectProfiles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first();
        const clean = args.phone.replace(/\D/g, "");
        if (prospect && prospect.phone !== clean) {
          await ctx.db.patch(prospect._id, { phone: clean });
        }
      }
    }
    if (!target) throw new Error(args.kind === "email" ? "No email on account" : "Add a phone number first");

    // Rate limit: one open code per kind, reissue allowed after 60s
    const existing = await ctx.db
      .query("verificationCodes")
      .withIndex("by_user_kind", (q) => q.eq("userId", userId).eq("kind", args.kind))
      .first();
    if (existing) {
      const age = Date.now() - (existing.expiresAt - CODE_TTL_MS);
      if (age < 60_000) throw new Error("Code just sent — check your inbox, or retry in a minute");
      await ctx.db.delete(existing._id);
    }

    await ctx.scheduler.runAfter(0, internal.verificationSend.issueAndSend, {
      userId,
      kind: args.kind,
      target,
      firstName: profile?.firstName || user.name?.split(" ")[0] || "there",
    });
    return { ok: true, target: maskTarget(args.kind, target) };
  },
});

/** Internal — store the hashed code (called by the send action). */
export const storeCode = internalMutation({
  args: { userId: v.id("users"), kind: KIND, codeHash: v.string(), target: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("verificationCodes")
      .withIndex("by_user_kind", (q) => q.eq("userId", args.userId).eq("kind", args.kind))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("verificationCodes", {
      userId: args.userId,
      kind: args.kind,
      codeHash: args.codeHash,
      target: args.target,
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
    });
    return { ok: true };
  },
});

/** Internal — compare a hash and mark verified (called by verify action). */
export const checkAndMark = internalMutation({
  args: { userId: v.id("users"), kind: KIND, codeHash: v.string() },
  handler: async (ctx, args) => {
    const rec = await ctx.db
      .query("verificationCodes")
      .withIndex("by_user_kind", (q) => q.eq("userId", args.userId).eq("kind", args.kind))
      .first();
    if (!rec) return { ok: false, error: "No code pending — request a new one" };
    if (Date.now() > rec.expiresAt) {
      await ctx.db.delete(rec._id);
      return { ok: false, error: "Code expired — request a new one" };
    }
    if (rec.attempts >= MAX_ATTEMPTS) {
      await ctx.db.delete(rec._id);
      return { ok: false, error: "Too many attempts — request a new one" };
    }
    if (rec.codeHash !== args.codeHash) {
      await ctx.db.patch(rec._id, { attempts: rec.attempts + 1 });
      return { ok: false, error: "Incorrect code" };
    }

    await ctx.db.delete(rec._id);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (profile) {
      await ctx.db.patch(
        profile._id,
        args.kind === "email" ? { emailVerifiedAt: Date.now() } : { phoneVerifiedAt: Date.now() }
      );
      // KPI activity stream (see convex/metricsDefs.ts)
      await ctx.db.insert("activityEvents", {
        userId: args.userId,
        eventType: args.kind === "email" ? "email_verified" : "phone_verified",
        ts: Date.now(),
      });
    }
    return { ok: true };
  },
});

/** Current user's verification status (drives gates + banners). */
export const myStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return {
      email: user?.email,
      phone: profile?.phone,
      emailVerified: !!profile?.emailVerifiedAt,
      phoneVerified: !!profile?.phoneVerifiedAt,
      fullyVerified: !!profile?.emailVerifiedAt && !!profile?.phoneVerifiedAt,
    };
  },
});

function maskTarget(kind: "email" | "phone", target: string): string {
  if (kind === "email") {
    const [local, domain] = target.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `***-${target.slice(-4)}`;
}
