import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("territories").collect();
  },
});

export const listByBrand = query({
  args: { brandId: v.id("brands") },
  returns: v.array(v.any()),
  handler: async (ctx, { brandId }) => {
    return await ctx.db
      .query("territories")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("territories") },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    brandId: v.id("brands"),
    name: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("high_interest"),
      v.literal("pending_award"),
      v.literal("sold"),
      v.literal("open")
    ),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
  },
  returns: v.id("territories"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("territories", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("territories"),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("high_interest"),
        v.literal("pending_award"),
        v.literal("sold"),
        v.literal("open")
      )
    ),
    notes: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    assignedTo: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("territories") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return null;
  },
});

export const countByBrandAndStatus = query({
  args: { brandId: v.id("brands") },
  returns: v.any(),
  handler: async (ctx, { brandId }) => {
    const territories = await ctx.db
      .query("territories")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();
    const counts: Record<string, number> = {};
    for (const t of territories) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  },
});

export const createBatch = mutation({
  args: {
    brandId: v.id("brands"),
    territories: v.array(v.object({
      city: v.string(),
      state: v.string(),
      status: v.union(
        v.literal("available"),
        v.literal("high_interest"),
        v.literal("pending_award"),
        v.literal("sold"),
        v.literal("open")
      ),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    })),
  },
  returns: v.array(v.id("territories")),
  handler: async (ctx, { brandId, territories }) => {
    const ids = [];
    for (const t of territories) {
      const id = await ctx.db.insert("territories", { brandId, ...t });
      ids.push(id);
    }
    return ids;
  },
});

export const removeBatch = mutation({
  args: {
    ids: v.array(v.id("territories")),
  },
  returns: v.null(),
  handler: async (ctx, { ids }) => {
    for (const id of ids) {
      await ctx.db.delete(id);
    }
    return null;
  },
});

export const stats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("territories").collect();
    const counts: Record<string, number> = {};
    for (const t of all) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return { total: all.length, byStatus: counts };
  },
});
