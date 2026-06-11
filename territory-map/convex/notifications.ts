import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Auth helpers ───────────────────────────────────────────
async function getProfile(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  return profile ? { userId, profile } : null;
}

async function requireAdmin(ctx: any) {
  const auth = await getProfile(ctx);
  if (!auth) throw new Error("Not authenticated");
  if (auth.profile.role !== "admin" && auth.profile.role !== "super_admin")
    throw new Error("Admin access required");
  return auth;
}

const notificationTypeValidator = v.union(
  v.literal("announcement"),
  v.literal("new_brand"),
  v.literal("feature"),
  v.literal("offer"),
  v.literal("update")
);

const audienceValidator = v.union(
  v.literal("all"),
  v.literal("leads"),
  v.literal("brands")
);

const displayTypeValidator = v.optional(v.union(
  v.literal("basic"),
  v.literal("top_bar"),
  v.literal("center_popup")
));

// ── Queries ────────────────────────────────────────────────

/** List active notifications for current user (not dismissed, not expired) */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getProfile(ctx);
    if (!auth) return [];

    const now = Date.now();

    // Get all active notifications
    const notifications = await ctx.db
      .query("appNotifications")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter out expired and not-yet-scheduled
    const active = notifications.filter((n) => {
      if (n.expiresAt && n.expiresAt <= now) return false;
      // If scheduledAt is in the future, don't show yet
      if (n.scheduledAt && n.scheduledAt > now) return false;
      // For repeat notifications that have ended
      if (n.scheduleType === "repeat") {
        if (n.repeatEndType === "date" && n.repeatEndDate && n.repeatEndDate < now) return false;
        if (n.repeatEndType === "after_count" && n.repeatEndCount && (n.repeatCount ?? 0) >= n.repeatEndCount) return false;
      }
      return true;
    });

    // Get user's lead record for targeting checks
    const userLead = await ctx.db
      .query("crmLeads")
      .filter((q) => q.eq(q.field("email"), auth.profile.email))
      .first();

    // Filter by targeting
    const targeted = active.filter((n) => {
      // Brand targeting
      if (n.targetBrandIds && n.targetBrandIds.length > 0) {
        if (!userLead || !n.targetBrandIds.includes(userLead.brandId)) return false;
      }
      // Liquid capital targeting
      if (n.targetLiquidCapital && n.targetLiquidCapital.length > 0) {
        if (!userLead || !userLead.liquidCapital || !n.targetLiquidCapital.includes(userLead.liquidCapital)) return false;
      }
      // Stage targeting
      if (n.targetStages && n.targetStages.length > 0) {
        if (!userLead || !n.targetStages.includes(userLead.stage)) return false;
      }
      // State targeting
      if (n.targetStates && n.targetStates.length > 0) {
        const leadState = userLead?.address?.split(",").pop()?.trim()?.split(" ")[0] || "";
        if (!leadState || !n.targetStates.includes(leadState)) return false;
      }
      // Tag targeting
      if (n.targetTags && n.targetTags.length > 0) {
        const leadTags = userLead?.tags || [];
        if (!leadTags.some((t: string) => n.targetTags!.includes(t))) return false;
      }
      return true;
    });

    // Get user's dismissals
    const dismissals = await ctx.db
      .query("notificationDismissals")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();
    const dismissedIds = new Set(dismissals.map((d) => d.notificationId.toString()));

    // Filter out dismissed
    const undismissed = targeted.filter(
      (n) => !dismissedIds.has(n._id.toString())
    );

    // Sort newest first
    return undismissed.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** List all notifications (admin only, for management) */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getProfile(ctx);
    if (!auth) return [];
    if (auth.profile.role !== "admin" && auth.profile.role !== "super_admin")
      return [];

    const notifications = await ctx.db
      .query("appNotifications")
      .withIndex("by_created")
      .order("desc")
      .collect();

    return notifications;
  },
});

/** List active + recently dismissed notifications for bell history (30 days) */
export const listWithHistory = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getProfile(ctx);
    if (!auth) return { active: [], history: [] };

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const notifications = await ctx.db
      .query("appNotifications")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const userLead = await ctx.db
      .query("crmLeads")
      .filter((q) => q.eq(q.field("email"), auth.profile.email))
      .first();

    const targeted = notifications.filter((n) => {
      if (n.expiresAt && n.expiresAt <= now) return false;
      if (n.scheduledAt && n.scheduledAt > now) return false;
      if (n.scheduleType === "repeat") {
        if (n.repeatEndType === "date" && n.repeatEndDate && n.repeatEndDate < now) return false;
        if (n.repeatEndType === "after_count" && n.repeatEndCount && (n.repeatCount ?? 0) >= n.repeatEndCount) return false;
      }
      if (n.targetBrandIds && n.targetBrandIds.length > 0) {
        if (!userLead || !n.targetBrandIds.includes(userLead.brandId)) return false;
      }
      if (n.targetLiquidCapital && n.targetLiquidCapital.length > 0) {
        if (!userLead || !userLead.liquidCapital || !n.targetLiquidCapital.includes(userLead.liquidCapital)) return false;
      }
      if (n.targetStages && n.targetStages.length > 0) {
        if (!userLead || !n.targetStages.includes(userLead.stage)) return false;
      }
      if (n.targetStates && n.targetStates.length > 0) {
        const leadState = userLead?.address?.split(",").pop()?.trim()?.split(" ")[0] || "";
        if (!leadState || !n.targetStates.includes(leadState)) return false;
      }
      if (n.targetTags && n.targetTags.length > 0) {
        const leadTags = userLead?.tags || [];
        if (!leadTags.some((t: string) => n.targetTags!.includes(t))) return false;
      }
      return true;
    });

    const dismissals = await ctx.db
      .query("notificationDismissals")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();
    const dismissalMap = new Map(dismissals.map((d) => [d.notificationId.toString(), d]));

    const active = targeted
      .filter((n) => !dismissalMap.has(n._id.toString()))
      .sort((a, b) => b.createdAt - a.createdAt);

    const history = targeted
      .filter((n) => {
        const d = dismissalMap.get(n._id.toString());
        return d && d.dismissedAt >= thirtyDaysAgo;
      })
      .map((n) => {
        const d = dismissalMap.get(n._id.toString())!;
        return { ...n, dismissed: true as const, dismissedAt: d.dismissedAt, hearted: d.hearted };
      })
      .sort((a, b) => b.dismissedAt - a.dismissedAt);

    return { active, history };
  },
});

/** Count of undismissed active notifications for current user */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getProfile(ctx);
    if (!auth) return 0;

    const now = Date.now();

    const notifications = await ctx.db
      .query("appNotifications")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const active = notifications.filter((n) => {
      if (n.expiresAt && n.expiresAt <= now) return false;
      if (n.scheduledAt && n.scheduledAt > now) return false;
      if (n.scheduleType === "repeat") {
        if (n.repeatEndType === "date" && n.repeatEndDate && n.repeatEndDate < now) return false;
        if (n.repeatEndType === "after_count" && n.repeatEndCount && (n.repeatCount ?? 0) >= n.repeatEndCount) return false;
      }
      return true;
    });

    const dismissals = await ctx.db
      .query("notificationDismissals")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();
    const dismissedIds = new Set(dismissals.map((d) => d.notificationId.toString()));

    return active.filter((n) => !dismissedIds.has(n._id.toString())).length;
  },
});

// ── Mutations ──────────────────────────────────────────────

/** Create a notification (admin/super_admin only) */
export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    type: notificationTypeValidator,
    displayType: displayTypeValidator,
    audience: audienceValidator,
    brandId: v.optional(v.id("brands")),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    // Scheduling
    scheduledAt: v.optional(v.number()),
    timezone: v.optional(v.string()),
    scheduleType: v.optional(v.union(v.literal("single"), v.literal("repeat"))),
    repeatFrequency: v.optional(v.union(
      v.literal("daily"), v.literal("weekly"), v.literal("monthly"),
      v.literal("quarterly"), v.literal("annually")
    )),
    repeatDays: v.optional(v.array(v.number())),
    repeatEndType: v.optional(v.union(
      v.literal("date"), v.literal("after_count"), v.literal("never")
    )),
    repeatEndDate: v.optional(v.number()),
    repeatEndCount: v.optional(v.number()),
    // Targeting
    targetBrandIds: v.optional(v.array(v.id("brands"))),
    targetLiquidCapital: v.optional(v.array(v.string())),
    targetStages: v.optional(v.array(v.string())),
    targetStates: v.optional(v.array(v.string())),
    targetTags: v.optional(v.array(v.string())),
    expiresAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    const id = await ctx.db.insert("appNotifications", {
      title: args.title,
      body: args.body,
      type: args.type,
      displayType: args.displayType,
      audience: args.audience,
      brandId: args.brandId,
      ctaText: args.ctaText,
      ctaUrl: args.ctaUrl,
      imageUrl: args.imageUrl,
      linkUrl: args.linkUrl,
      videoUrl: args.videoUrl,
      scheduledAt: args.scheduledAt,
      timezone: args.timezone,
      scheduleType: args.scheduleType,
      repeatFrequency: args.repeatFrequency,
      repeatDays: args.repeatDays,
      repeatEndType: args.repeatEndType,
      repeatEndDate: args.repeatEndDate,
      repeatEndCount: args.repeatEndCount,
      repeatCount: 0,
      targetBrandIds: args.targetBrandIds,
      targetLiquidCapital: args.targetLiquidCapital,
      targetStages: args.targetStages,
      targetStates: args.targetStates,
      targetTags: args.targetTags,
      expiresAt: args.expiresAt,
      isActive: args.isActive !== false, // default true
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { id };
  },
});

/** Update a notification */
export const update = mutation({
  args: {
    notificationId: v.id("appNotifications"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    type: v.optional(notificationTypeValidator),
    displayType: displayTypeValidator,
    audience: v.optional(audienceValidator),
    brandId: v.optional(v.id("brands")),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    timezone: v.optional(v.string()),
    scheduleType: v.optional(v.union(v.literal("single"), v.literal("repeat"))),
    repeatFrequency: v.optional(v.union(
      v.literal("daily"), v.literal("weekly"), v.literal("monthly"),
      v.literal("quarterly"), v.literal("annually")
    )),
    repeatDays: v.optional(v.array(v.number())),
    repeatEndType: v.optional(v.union(
      v.literal("date"), v.literal("after_count"), v.literal("never")
    )),
    repeatEndDate: v.optional(v.number()),
    repeatEndCount: v.optional(v.number()),
    targetBrandIds: v.optional(v.array(v.id("brands"))),
    targetLiquidCapital: v.optional(v.array(v.string())),
    targetStages: v.optional(v.array(v.string())),
    targetStates: v.optional(v.array(v.string())),
    targetTags: v.optional(v.array(v.string())),
    expiresAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    const { notificationId, ...updates } = args;
    const filtered: any = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) filtered[k] = val;
    }

    await ctx.db.patch(args.notificationId, filtered);
    return { success: true };
  },
});

/** Delete a notification */
export const deleteNotification = mutation({
  args: { notificationId: v.id("appNotifications") },
  handler: async (ctx, { notificationId }) => {
    await requireAdmin(ctx);

    const notification = await ctx.db.get(notificationId);
    if (!notification) throw new Error("Notification not found");

    // Delete all associated dismissals
    const dismissals = await ctx.db.query("notificationDismissals").collect();
    for (const d of dismissals) {
      if (d.notificationId === notificationId) {
        await ctx.db.delete(d._id);
      }
    }

    await ctx.db.delete(notificationId);
    return { success: true };
  },
});

/** Dismiss a notification for current user */
export const dismiss = mutation({
  args: { notificationId: v.id("appNotifications") },
  handler: async (ctx, { notificationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already dismissed
    const existing = await ctx.db
      .query("notificationDismissals")
      .withIndex("by_user_notification", (q) =>
        q.eq("userId", userId).eq("notificationId", notificationId)
      )
      .first();
    if (existing) return { success: true, alreadyDismissed: true };

    await ctx.db.insert("notificationDismissals", {
      notificationId,
      userId,
      dismissedAt: Date.now(),
    });

    return { success: true, alreadyDismissed: false };
  },
});

/** Heart a brand from a notification (saves to savedItems) */
export const heartBrand = mutation({
  args: {
    notificationId: v.id("appNotifications"),
    brandId: v.id("brands"),
  },
  handler: async (ctx, { notificationId, brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already saved
    const existing = await ctx.db
      .query("savedItems")
      .withIndex("by_user_brand", (q) =>
        q.eq("userId", userId).eq("brandId", brandId)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("savedItems", {
        userId,
        brandId,
        type: "heart",
      });
    }

    // Mark as hearted in the dismissal record
    const dismissal = await ctx.db
      .query("notificationDismissals")
      .withIndex("by_user_notification", (q) =>
        q.eq("userId", userId).eq("notificationId", notificationId)
      )
      .first();

    if (dismissal) {
      await ctx.db.patch(dismissal._id, { hearted: true });
    } else {
      await ctx.db.insert("notificationDismissals", {
        notificationId,
        userId,
        dismissedAt: Date.now(),
        hearted: true,
      });
    }

    return { success: true };
  },
});
