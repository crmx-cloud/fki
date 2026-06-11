import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* ────────────────────────────────────────────────────────────
 * Toggle Save — save or un-save a brand for the current user
 * ──────────────────────────────────────────────────────────── */
export const toggleSave = mutation({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already saved
    const existing = await ctx.db
      .query("savedItems")
      .withIndex("by_user_brand", (q) => q.eq("userId", userId).eq("brandId", brandId))
      .first();

    if (existing) {
      // Un-save
      await ctx.db.delete(existing._id);
      return { saved: false };
    } else {
      // Save
      const user = await ctx.db.get(userId);
      await ctx.db.insert("savedItems", {
        userId,
        brandId,
        email: user?.email ?? undefined,
        type: "brand",
      });
      return { saved: true };
    }
  },
});

/* ────────────────────────────────────────────────────────────
 * Check if a brand is saved by the current user
 * ──────────────────────────────────────────────────────────── */
export const isBrandSaved = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const existing = await ctx.db
      .query("savedItems")
      .withIndex("by_user_brand", (q) => q.eq("userId", userId).eq("brandId", brandId))
      .first();

    return !!existing;
  },
});

/* ────────────────────────────────────────────────────────────
 * Get all saved brand IDs for current user (lightweight)
 * ──────────────────────────────────────────────────────────── */
export const getMySavedBrandIds = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("savedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return items
      .filter((i) => i.type === "brand" || !i.type)
      .map((i) => i.brandId);
  },
});

/* ────────────────────────────────────────────────────────────
 * Get all saved brands with full details for comparison
 * ──────────────────────────────────────────────────────────── */
export const getMySavedBrandsDetailed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("savedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const brandItems = items.filter((i) => i.type === "brand" || !i.type);

    const results = await Promise.all(
      brandItems.map(async (item) => {
        const brand = await ctx.db.get(item.brandId);
        if (!brand || brand.isActive === false) return null;

        // Get territory counts
        const territories = await ctx.db
          .query("territories")
          .withIndex("by_brand", (q) => q.eq("brandId", brand._id))
          .collect();
        const availableTerritories = territories.filter(
          (t) => t.status === "available" || t.status === "open"
        ).length;

        // Get franchise profile for comparison data
        const profile = await ctx.db
          .query("franchiseProfiles")
          .withIndex("by_brand", (q) => q.eq("brandId", brand._id))
          .first();

        // Resolve logo
        let resolvedLogoUrl = brand.logoUrl;
        if (profile?.logoStorageId) {
          try {
            const url = await ctx.storage.getUrl(profile.logoStorageId as any);
            if (url) resolvedLogoUrl = url;
          } catch { /* skip */ }
        }

        return {
          savedAt: item._creationTime,
          brand: {
            _id: brand._id,
            name: brand.name,
            slug: brand.slug,
            description: brand.description,
            category: brand.category,
            color: brand.color,
            investmentMin: brand.investmentMin,
            investmentMax: brand.investmentMax,
            franchiseFee: brand.franchiseFee,
            royaltyPercent: brand.royaltyPercent,
            websiteUrl: brand.websiteUrl,
            resolvedLogoUrl,
          },
          territories: {
            total: territories.length,
            available: availableTerritories,
            sold: territories.filter((t) => t.status === "sold").length,
          },
          profile: profile
            ? {
                yearFounded: profile.yearFounded,
                yearFranchising: profile.yearFranchising,
                totalUnits: profile.totalUnits,
                avgUnitRevenue: profile.avgUnitRevenue,
                avgRevenueMin: profile.avgRevenueMin,
                avgRevenueMax: profile.avgRevenueMax,
                liquidCapitalMin: profile.liquidCapitalMin,
                totalInvestmentMin: profile.totalInvestmentMin,
                totalInvestmentMax: profile.totalInvestmentMax,
                franchiseFee: profile.franchiseFee,
                royaltyPercent: profile.royaltyPercent,
                brandFundPercent: profile.brandFundPercent,
                trainingWeeks: profile.trainingWeeks,
                classroomTrainingHours: profile.classroomTrainingHours,
                onTheJobTrainingHours: profile.onTheJobTrainingHours,
                sbaApproved: profile.sbaApproved,
                veteranDiscount: profile.veteranDiscount,
                multiUnitAvailable: profile.multiUnitAvailable,
                territoryExclusivity: profile.territoryExclusivity,
                absenteeOwnership: profile.absenteeOwnership,
                canRunFromHome: profile.canRunFromHome,
                canRunPartTime: profile.canRunPartTime,
                termOfAgreement: profile.termOfAgreement,
                termRenewable: profile.termRenewable,
                sellingPoints: profile.sellingPoints,
                geographicFocus: profile.geographicFocus,
                retentionRate: profile.retentionRate,
              }
            : null,
        };
      })
    );

    return results.filter(Boolean);
  },
});
