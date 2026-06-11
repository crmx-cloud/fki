import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ── Helpers ────────────────────────────────────────────────

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!profile) throw new Error("No profile");
  const isAdmin = profile.role === "super_admin" || profile.role === "admin";
  if (!isAdmin) throw new Error("Only admins can manage auto-assignment rules");
  return { userId, profile };
}

// ── Queries ────────────────────────────────────────────────

/** List auto-assignment rules */
export const list = query({
  args: { brandId: v.optional(v.id("brands")) },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return [];
    const isAdmin = profile.role === "super_admin" || profile.role === "admin";
    if (!isAdmin) return [];

    if (brandId) {
      return await ctx.db
        .query("autoAssignmentRules")
        .withIndex("by_brand", (q) => q.eq("brandId", brandId))
        .collect();
    }

    return await ctx.db.query("autoAssignmentRules").collect();
  },
});

/** Get active rule for a brand */
export const getActiveRule = query({
  args: { brandId: v.optional(v.id("brands")) },
  handler: async (ctx, { brandId }) => {
    const rules = await ctx.db
      .query("autoAssignmentRules")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Find rule matching this brand, or global rule
    return rules.find((r) => r.brandId === brandId) || rules.find((r) => !r.brandId) || null;
  },
});

// ── Mutations ──────────────────────────────────────────────

/** Create or update an auto-assignment rule */
export const upsert = mutation({
  args: {
    ruleId: v.optional(v.id("autoAssignmentRules")),
    brandId: v.optional(v.id("brands")),
    mode: v.union(v.literal("equal"), v.literal("custom_ratio")),
    isActive: v.boolean(),
    assignees: v.array(v.object({
      userId: v.id("users"),
      ratio: v.optional(v.number()),
    })),
    assignAs: v.union(v.literal("sales_rep"), v.literal("setter")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const now = Date.now();

    if (args.assignees.length === 0) {
      throw new Error("At least one assignee is required");
    }

    // Validate ratios for custom mode
    if (args.mode === "custom_ratio") {
      const hasRatios = args.assignees.every((a) => a.ratio !== undefined && a.ratio > 0);
      if (!hasRatios) throw new Error("Custom ratio mode requires all assignees to have a ratio > 0");
    }

    if (args.ruleId) {
      // Update existing
      await ctx.db.patch(args.ruleId, {
        brandId: args.brandId,
        mode: args.mode,
        isActive: args.isActive,
        assignees: args.assignees,
        assignAs: args.assignAs,
        updatedAt: now,
      });
      return { success: true, ruleId: args.ruleId };
    }

    // Create new
    const ruleId = await ctx.db.insert("autoAssignmentRules", {
      brandId: args.brandId,
      mode: args.mode,
      isActive: args.isActive,
      assignees: args.assignees,
      assignAs: args.assignAs,
      currentIndex: 0,
      totalAssigned: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, ruleId };
  },
});

/** Delete an auto-assignment rule */
export const deleteRule = mutation({
  args: { ruleId: v.id("autoAssignmentRules") },
  handler: async (ctx, { ruleId }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(ruleId);
    return { success: true };
  },
});

/** Internal: assign a user to a new lead based on active rules */
export const assignNewLead = internalMutation({
  args: {
    leadId: v.id("crmLeads"),
    brandId: v.id("brands"),
  },
  handler: async (ctx, { leadId, brandId }) => {
    // Find matching rule: brand-specific first, then global
    const rules = await ctx.db
      .query("autoAssignmentRules")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const rule = rules.find((r) => r.brandId === brandId) || rules.find((r) => !r.brandId);
    if (!rule || rule.assignees.length === 0) return; // no active rule

    let assigneeUserId: string;

    if (rule.mode === "equal") {
      // Simple round-robin
      const idx = (rule.currentIndex || 0) % rule.assignees.length;
      assigneeUserId = rule.assignees[idx].userId;
      await ctx.db.patch(rule._id, {
        currentIndex: idx + 1,
        totalAssigned: (rule.totalAssigned || 0) + 1,
        updatedAt: Date.now(),
      });
    } else {
      // Custom ratio: weighted selection
      const totalRatio = rule.assignees.reduce((sum, a) => sum + (a.ratio || 1), 0);
      const counter = (rule.totalAssigned || 0) % totalRatio;
      let cumulative = 0;
      assigneeUserId = rule.assignees[0].userId; // fallback
      for (const assignee of rule.assignees) {
        cumulative += (assignee.ratio || 1);
        if (counter < cumulative) {
          assigneeUserId = assignee.userId;
          break;
        }
      }
      await ctx.db.patch(rule._id, {
        totalAssigned: (rule.totalAssigned || 0) + 1,
        updatedAt: Date.now(),
      });
    }

    // Assign to lead
    const field = rule.assignAs === "setter" ? "setterId" : "salesRepId";
    await ctx.db.patch(leadId, { [field]: assigneeUserId, updatedAt: Date.now() });
  },
});
