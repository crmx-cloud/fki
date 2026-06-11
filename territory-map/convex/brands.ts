import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("brands").collect();
  },
});

export const listPublic = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const all = await ctx.db.query("brands").collect();
    return all.filter((b) => b.isActive !== false);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("brands") },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    investmentMin: v.optional(v.number()),
    investmentMax: v.optional(v.number()),
    franchiseFee: v.optional(v.number()),
    royaltyPercent: v.optional(v.number()),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    websiteUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  returns: v.id("brands"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("brands", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("brands"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    investmentMin: v.optional(v.number()),
    investmentMax: v.optional(v.number()),
    franchiseFee: v.optional(v.number()),
    royaltyPercent: v.optional(v.number()),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    websiteUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    featured: v.optional(v.boolean()),
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
  args: { id: v.id("brands") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    // Also delete associated territories
    const territories = await ctx.db
      .query("territories")
      .withIndex("by_brand", (q) => q.eq("brandId", id))
      .collect();
    for (const t of territories) {
      await ctx.db.delete(t._id);
    }
    await ctx.db.delete(id);
    return null;
  },
});

export const listWithStats = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const brands = await ctx.db.query("brands").collect();
    // Open-state counts for the consumer availability line (public cards)
    const allSA = await ctx.db.query("stateAvailability").collect();
    const openByBrand = new Map<string, number>();
    for (const row of allSA) {
      if (row.status !== "open") continue;
      const k = row.brandId.toString();
      openByBrand.set(k, (openByBrand.get(k) ?? 0) + 1);
    }
    const results = await Promise.all(
      brands.map(async (brand) => {
        const territories = await ctx.db
          .query("territories")
          .withIndex("by_brand", (q) => q.eq("brandId", brand._id))
          .collect();
        const statusCounts: Record<string, number> = {};
        for (const t of territories) {
          statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        }
        return {
          ...brand,
          openStateCount: openByBrand.get(brand._id.toString()) ?? 0,
          totalTerritories: territories.length,
          availableTerritories: territories.filter(
            (t) => t.status === "available" || t.status === "open"
          ).length,
          soldTerritories: territories.filter((t) => t.status === "sold")
            .length,
          statusCounts,
        };
      })
    );
    return results;
  },
});

/** Update registered states for a brand */
export const updateRegisteredStates = mutation({
  args: {
    brandId: v.id("brands"),
    registeredStates: v.array(v.string()),
  },
  handler: async (ctx, { brandId, registeredStates }) => {
    const brand = await ctx.db.get(brandId);
    if (!brand) throw new Error("Brand not found");
    await ctx.db.patch(brandId, { registeredStates });
    return { success: true };
  },
});

/** Get registered states for a brand */
export const getRegisteredStates = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const brand = await ctx.db.get(brandId);
    return brand?.registeredStates || [];
  },
});
