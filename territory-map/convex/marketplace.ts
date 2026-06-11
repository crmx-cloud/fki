import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listBrandsWithTerritories = query({
  args: { category: v.optional(v.string()), stateCode: v.optional(v.string()) },
  handler: async (ctx, { category, stateCode }) => {
    let brands = await ctx.db.query("brands").collect();
    brands = brands.filter((b) => b.isActive !== false);
    if (category) brands = brands.filter((b) => b.category === category);

    // State-level availability — the consumer-facing answer to "can I get
    // this where I am?" (same table the matcher and maps read).
    const allSA = await ctx.db.query("stateAvailability").collect();
    const saByBrand = new Map<string, { open: number; openInState: boolean }>();
    const code = stateCode?.toUpperCase();
    for (const row of allSA) {
      const k = row.brandId.toString();
      const cur = saByBrand.get(k) ?? { open: 0, openInState: false };
      if (row.status === "open") {
        cur.open++;
        if (code && row.state.toUpperCase() === code) cur.openInState = true;
      }
      saByBrand.set(k, cur);
    }

    const results = await Promise.all(
      brands.map(async (brand) => {
        const territories = await ctx.db.query("territories").withIndex("by_brand", (q) => q.eq("brandId", brand._id)).collect();
        const available = territories.filter((t) => t.status === "available" || t.status === "open");
        const sa = saByBrand.get(brand._id.toString());
        return {
          ...brand,
          totalTerritories: territories.length,
          availableTerritories: available.length,
          openStateCount: sa?.open ?? 0,
          // true = open in user state; false = has data, not open there; null = no data
          availableInState: code ? (sa ? sa.openInState : null) : null,
        };
      })
    );
    return results;
  },
});

/** Public, PII-free platform stats — powers the live credibility counter.
 * Convex queries are reactive: the homepage number ticks up in real time
 * as people complete their PerfectFit profile. */
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("prospectProfiles").collect();
    const brands = await ctx.db.query("brands").collect();
    return {
      peopleMatched: profiles.filter((p) => p.profileComplete).length,
      peopleStarted: profiles.length,
      activeBrands: brands.filter((b) => b.isActive !== false).length,
    };
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
