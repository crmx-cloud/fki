import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { EVENT_TYPES, type EventType } from "./metricsDefs";

/**
 * Intent/activity event stream (see metricsDefs.ts for the vocabulary).
 * Feeds "active profile" counts on the KPI dashboard and future intent
 * scoring. Client events come through `track` (authed users only);
 * server-side flows insert through `log` (a plain helper, same txn).
 */

export async function logEvent(
  ctx: any,
  ev: {
    userId?: any;
    email?: string;
    eventType: EventType;
    brandId?: any;
    source?: string;
    campaign?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await ctx.db.insert("activityEvents", {
    userId: ev.userId,
    email: ev.email?.toLowerCase(),
    eventType: ev.eventType,
    ts: Date.now(),
    brandId: ev.brandId,
    source: ev.source,
    campaign: ev.campaign,
    metadata: ev.metadata ? JSON.stringify(ev.metadata) : undefined,
  });
}

/** Client-side intent events (brand viewed/compared, dossier requested…). */
export const track = mutation({
  args: {
    eventType: v.string(),
    brandId: v.optional(v.id("brands")),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return; // anonymous browsing isn't tracked
    if (!(EVENT_TYPES as readonly string[]).includes(args.eventType)) return;
    // Light dedupe: same user + type + brand within 10 min = one event
    const recent = await ctx.db
      .query("activityEvents")
      .withIndex("by_user_ts", (q) => q.eq("userId", userId).gt("ts", Date.now() - 10 * 60 * 1000))
      .collect();
    if (recent.some((e) => e.eventType === args.eventType && String(e.brandId) === String(args.brandId)))
      return;
    await ctx.db.insert("activityEvents", {
      userId,
      eventType: args.eventType,
      ts: Date.now(),
      brandId: args.brandId,
      metadata: args.metadata,
    });
  },
});

/** Internal escape hatch for scripted/backfill inserts. */
export const logInternal = internalMutation({
  args: {
    email: v.optional(v.string()),
    eventType: v.string(),
    ts: v.optional(v.number()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityEvents", {
      email: args.email?.toLowerCase(),
      eventType: args.eventType,
      ts: args.ts ?? Date.now(),
      metadata: args.metadata,
    });
  },
});
