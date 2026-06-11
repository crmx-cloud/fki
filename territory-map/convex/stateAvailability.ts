import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const STATUS = v.union(v.literal("open"), v.literal("registered"), v.literal("closed"));

/** Public: state availability for one brand (powers the brand-page map shading). */
export const getByBrand = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    return await ctx.db
      .query("stateAvailability")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();
  },
});

/** Public: compact summary for a brand — open/registered state code lists. */
export const getSummaryByBrand = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const rows = await ctx.db
      .query("stateAvailability")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();
    return {
      open: rows.filter((r) => r.status === "open").map((r) => r.state).sort(),
      registered: rows.filter((r) => r.status === "registered").map((r) => r.state).sort(),
      closed: rows.filter((r) => r.status === "closed").map((r) => r.state).sort(),
      total: rows.length,
    };
  },
});

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  const role = profile?.role;
  if (role !== "admin" && role !== "super_admin") throw new Error("Admin only");
  return userId;
}

/** Admin: set one state's status for a brand (upsert). */
export const setStateStatus = mutation({
  args: {
    brandId: v.id("brands"),
    state: v.string(),
    status: STATUS,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    const state = args.state.toUpperCase();
    const existing = await ctx.db
      .query("stateAvailability")
      .withIndex("by_brand_state", (q) =>
        q.eq("brandId", args.brandId).eq("state", state)
      )
      .first();
    const patch = {
      status: args.status,
      note: args.note,
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: userId.toString(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("stateAvailability", {
      brandId: args.brandId,
      state,
      ...patch,
    });
  },
});

/** Admin: bulk-set many states at once (the state-checklist editor save). */
export const bulkSetStates = mutation({
  args: {
    brandId: v.id("brands"),
    entries: v.array(v.object({ state: v.string(), status: STATUS, note: v.optional(v.string()) })),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    const today = new Date().toISOString().slice(0, 10);
    let written = 0;
    for (const e of args.entries) {
      const state = e.state.toUpperCase();
      const existing = await ctx.db
        .query("stateAvailability")
        .withIndex("by_brand_state", (q) =>
          q.eq("brandId", args.brandId).eq("state", state)
        )
        .first();
      const patch = { status: e.status, note: e.note, updatedAt: today, updatedBy: userId.toString() };
      if (existing) await ctx.db.patch(existing._id, patch);
      else await ctx.db.insert("stateAvailability", { brandId: args.brandId, state, ...patch });
      written++;
    }
    return { written };
  },
});

/** Pipeline: seed state availability with provenance (no auth — internal only). */
export const seedStates = internalMutation({
  args: {
    brandName: v.string(),
    states: v.array(v.object({ state: v.string(), status: STATUS, note: v.optional(v.string()) })),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const brand = (await ctx.db.query("brands").collect()).find(
      (b) => b.name.toLowerCase().trim() === args.brandName.toLowerCase().trim()
    );
    if (!brand) return { ok: false, error: `brand not found: ${args.brandName}` };
    const today = new Date().toISOString().slice(0, 10);
    let written = 0;
    for (const e of args.states) {
      const state = e.state.toUpperCase();
      const existing = await ctx.db
        .query("stateAvailability")
        .withIndex("by_brand_state", (q) =>
          q.eq("brandId", brand._id).eq("state", state)
        )
        .first();
      const doc = { status: e.status, note: e.note, source: args.source, updatedAt: today, updatedBy: "enrichment-pipeline" };
      if (existing) await ctx.db.patch(existing._id, doc);
      else await ctx.db.insert("stateAvailability", { brandId: brand._id, state, ...doc });
      written++;
    }
    return { ok: true, written };
  },
});
