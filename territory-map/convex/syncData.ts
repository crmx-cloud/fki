import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Temporary sync mutation: update a brand by matching on slug.
 * Used to sync preview data → production. Remove after sync.
 */
export const syncBrandBySlug = mutation({
  args: {
    slug: v.string(),
    updates: v.object({
      description: v.optional(v.string()),
      category: v.optional(v.string()),
      investmentMin: v.optional(v.number()),
      investmentMax: v.optional(v.number()),
      franchiseFee: v.optional(v.number()),
      royaltyPercent: v.optional(v.number()),
      color: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      websiteUrl: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
    }),
    // whether to overwrite existing values or only fill empty ones
    onlyFillEmpty: v.optional(v.boolean()),
  },
  handler: async (ctx, { slug, updates, onlyFillEmpty }) => {
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!brand) return { status: "not_found", slug };

    const patch: Record<string, any> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined || val === null) continue;
      if (onlyFillEmpty) {
        const existing = (brand as any)[key];
        if (existing !== undefined && existing !== null && existing !== "") continue;
      }
      patch[key] = val;
    }

    if (Object.keys(patch).length === 0) return { status: "no_changes", slug };
    await ctx.db.patch(brand._id, patch);
    return { status: "updated", slug, fields: Object.keys(patch) };
  },
});

/**
 * Temporary sync mutation: update franchise profile by brand slug.
 * Used to sync preview data → production. Remove after sync.
 */
export const syncProfileBySlug = mutation({
  args: {
    slug: v.string(),
    updates: v.any(),
    onlyFillEmpty: v.optional(v.boolean()),
  },
  handler: async (ctx, { slug, updates, onlyFillEmpty }) => {
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!brand) return { status: "brand_not_found", slug };

    const fp = await ctx.db
      .query("franchiseProfiles")
      .withIndex("by_brand", (q) => q.eq("brandId", brand._id))
      .first();
    if (!fp) return { status: "profile_not_found", slug };

    const patch: Record<string, any> = {};
    const data = updates as Record<string, any>;
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined || val === null) continue;
      if (key === "_id" || key === "_creationTime" || key === "brandId") continue;
      if (onlyFillEmpty) {
        const existing = (fp as any)[key];
        if (existing !== undefined && existing !== null && existing !== "" &&
            !(Array.isArray(existing) && existing.length === 0)) continue;
      }
      patch[key] = val;
    }

    if (Object.keys(patch).length === 0) return { status: "no_changes", slug };
    await ctx.db.patch(fp._id, patch);
    return { status: "updated", slug, fields: Object.keys(patch) };
  },
});
