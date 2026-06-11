import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listBrandsWithTerritories = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    let brands = await ctx.db.query("brands").collect();
    brands = brands.filter((b) => b.isActive !== false);
    if (category) brands = brands.filter((b) => b.category === category);
    const results = await Promise.all(
      brands.map(async (brand) => {
        const territories = await ctx.db.query("territories").withIndex("by_brand", (q) => q.eq("brandId", brand._id)).collect();
        const available = territories.filter((t) => t.status === "available" || t.status === "open");
        return { ...brand, totalTerritories: territories.length, availableTerritories: available.length };
      })
    );
    return results;
  },
});

export const getBrandDetail = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const brand = await ctx.db.query("brands").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (!brand) return null;
    const territories = await ctx.db.query("territories").withIndex("by_brand", (q) => q.eq("brandId", brand._id)).collect();
    const profile = await ctx.db.query("franchiseProfiles").withIndex("by_brand", (q) => q.eq("brandId", brand._id)).first();

    // Resolve photo URLs from storage
    const photoUrls: string[] = [];
    if (profile?.photos) {
      for (const storageId of profile.photos) {
        try {
          const url = await ctx.storage.getUrl(storageId as any);
          if (url) photoUrls.push(url);
        } catch { /* skip invalid */ }
      }
    }

    // Resolve logo URL from storage
    let resolvedLogoUrl = brand.logoUrl;
    if (profile?.logoStorageId) {
      try {
        const url = await ctx.storage.getUrl(profile.logoStorageId as any);
        if (url) resolvedLogoUrl = url;
      } catch { /* skip */ }
    }

    // Resolve section-specific image URLs
    const sectionImageUrls: Record<string, string> = {};
    if (profile?.sectionImages) {
      for (const [section, storageId] of Object.entries(profile.sectionImages)) {
        if (storageId) {
          try {
            const url = await ctx.storage.getUrl(storageId as any);
            if (url) sectionImageUrls[section] = url;
          } catch { /* skip */ }
        }
      }
    }

    return { brand, territories, profile, photoUrls, resolvedLogoUrl, sectionImageUrls };
  },
});

export const submitLead = mutation({
  args: { brandId: v.optional(v.id("brands")), email: v.string(), name: v.optional(v.string()), phone: v.optional(v.string()), source: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", { ...args, status: "new" });
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});
