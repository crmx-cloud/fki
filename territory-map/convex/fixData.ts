import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Recreate a missing brand from a claim record and link it to the user's profile.
 * Used to fix orphaned brandIds.
 */
export const recreateBrandFromClaim = mutation({
  args: { claimId: v.id("brandClaims") },
  handler: async (ctx, { claimId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");

    // Check if the brand already exists
    if (claim.brandId) {
      const existingBrand = await ctx.db.get(claim.brandId);
      if (existingBrand) {
        return { message: "Brand already exists", brandId: claim.brandId };
      }
    }

    // Generate slug
    const baseSlug = claim.brandName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    let slug = baseSlug;
    let counter = 0;
    while (true) {
      const existing = await ctx.db
        .query("brands")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create the brand
    const brandId = await ctx.db.insert("brands", {
      name: claim.brandName,
      slug,
      contactEmail: claim.contactEmail,
      isActive: true,
      isClaimed: true,
    });

    // Update the claim to point to the new brand
    await ctx.db.patch(claimId, { brandId });

    // Find the user profile by matching email to auth users
    const allUsers = await ctx.db.query("users").collect();
    const authUser = allUsers.find(
      (u) => (u.email || "").toLowerCase() === claim.contactEmail.toLowerCase()
    );

    if (authUser) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", authUser._id))
        .first();

      if (profile) {
        const oldIds = profile.brandIds || [];
        // Replace the ghost brand ID with the new one
        const newIds = oldIds.filter((id: any) => {
          // Check if this ID still exists
          return false; // Remove all ghost IDs
        });
        newIds.push(brandId);
        await ctx.db.patch(profile._id, { brandIds: newIds, role: "franchisor" });
      }
    }

    return { message: "Brand recreated and linked", brandId, slug };
  },
});

/**
 * Directly patch a user profile's brandIds. Admin tool.
 */
export const patchProfileBrandIds = mutation({
  args: {
    profileId: v.id("userProfiles"),
    brandIds: v.array(v.id("brands")),
  },
  handler: async (ctx, { profileId, brandIds }) => {
    await ctx.db.patch(profileId, { brandIds });
    return { success: true };
  },
});

/**
 * Unauthenticated enrichment mutation for bulk data backfill.
 * Same logic as franchiseProfile:updateProfile but without auth.
 * Used by Cody/Leo pipeline to fill brand data from web sources.
 */
export const enrichProfile = mutation({
  args: {
    brandId: v.id("brands"),

    // Performance
    yearFounded: v.optional(v.number()),
    yearFranchising: v.optional(v.number()),
    totalUnits: v.optional(v.number()),
    closureCount: v.optional(v.number()),
    avgUnitRevenue: v.optional(v.number()),
    avgRevenueMin: v.optional(v.number()),
    avgRevenueMax: v.optional(v.number()),
    retentionRate: v.optional(v.string()),

    // Investment
    totalInvestmentMin: v.optional(v.number()),
    totalInvestmentMax: v.optional(v.number()),
    liquidCapitalMin: v.optional(v.number()),
    franchiseFee: v.optional(v.number()),
    royaltyPercent: v.optional(v.number()),
    brandFundPercent: v.optional(v.number()),
    marketingFees: v.optional(v.string()),

    // Content
    brandStory: v.optional(v.string()),
    model: v.optional(v.string()),
    positioning: v.optional(v.string()),
    sellingPoints: v.optional(v.array(v.string())),
    idealPartner: v.optional(v.array(v.string())),
    faqs: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.string(),
    }))),

    // Flags
    fddAvailable: v.optional(v.boolean()),
    item19Available: v.optional(v.boolean()),
    isGrowing: v.optional(v.boolean()),
    sbaApproved: v.optional(v.boolean()),
    veteranDiscount: v.optional(v.boolean()),
    multiUnitAvailable: v.optional(v.boolean()),
    territoryExclusivity: v.optional(v.boolean()),
    trainingWeeks: v.optional(v.number()),

    // Owner
    ownerTypes: v.optional(v.array(v.string())),

    // Company
    parentCompany: v.optional(v.string()),
    leadershipName: v.optional(v.string()),
    leadershipTitle: v.optional(v.string()),
    corporateAddress: v.optional(v.string()),
    corporateCity: v.optional(v.string()),
    corporateState: v.optional(v.string()),
    corporateZip: v.optional(v.string()),
    geographicFocus: v.optional(v.string()),

    // Operations
    absenteeOwnership: v.optional(v.boolean()),
    canRunFromHome: v.optional(v.boolean()),
    canRunPartTime: v.optional(v.boolean()),
    employeesRequired: v.optional(v.string()),
    exclusiveTerritories: v.optional(v.boolean()),
    termOfAgreement: v.optional(v.string()),
    termRenewable: v.optional(v.boolean()),
    veteranIncentiveDetails: v.optional(v.string()),

    // Rankings
    franchiseRanking: v.optional(v.number()),
    rankingYear: v.optional(v.number()),
    rankingSource: v.optional(v.string()),

    // FDD fields
    royaltyNotes: v.optional(v.string()),
    techFeeAnnual: v.optional(v.number()),
    techFeeDetails: v.optional(v.string()),
    otherRecurringFees: v.optional(v.string()),
    item7Breakdown: v.optional(v.array(v.object({
      name: v.string(),
      low: v.number(),
      high: v.number(),
    }))),
    item7Average: v.optional(v.number()),
    item19Revenue: v.optional(v.object({
      average: v.optional(v.number()),
      median: v.optional(v.number()),
      high: v.optional(v.number()),
      low: v.optional(v.number()),
    })),
    item19Profit: v.optional(v.object({
      estimatedAverage: v.optional(v.number()),
      estimatedMargin: v.optional(v.number()),
      notes: v.optional(v.string()),
    })),
    item20: v.optional(v.object({
      reportingYear: v.optional(v.number()),
      franchisedUnitsStart: v.optional(v.number()),
      franchisedUnitsEnd: v.optional(v.number()),
      companyUnitsStart: v.optional(v.number()),
      companyUnitsEnd: v.optional(v.number()),
      transfers: v.optional(v.number()),
      newOpenings: v.optional(v.number()),
      closures: v.optional(v.number()),
      terminations: v.optional(v.number()),
      netGrowth: v.optional(v.number()),
      growthRate: v.optional(v.number()),
    })),
    activeLawsuits: v.optional(v.boolean()),
    activeLawsuitCount: v.optional(v.number()),
    activeLawsuitNotes: v.optional(v.string()),
    territorySize: v.optional(v.string()),
    territoryPopulation: v.optional(v.number()),
    fddYear: v.optional(v.number()),
  },
  handler: async (ctx, { brandId, ...data }) => {
    const brand = await ctx.db.get(brandId);
    if (!brand) throw new Error("Brand not found");

    let fp = await ctx.db
      .query("franchiseProfiles")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .first();

    const clean: Record<string, any> = {};
    for (const [k, val] of Object.entries(data)) {
      if (val !== undefined) clean[k] = val;
    }

    if (fp) {
      await ctx.db.patch(fp._id, clean);
    } else {
      await ctx.db.insert("franchiseProfiles", { brandId, ...clean });
    }

    // Sync investment fields to brand table
    const brandUpdates: Record<string, any> = {};
    if (data.totalInvestmentMin !== undefined) brandUpdates.investmentMin = data.totalInvestmentMin;
    if (data.totalInvestmentMax !== undefined) brandUpdates.investmentMax = data.totalInvestmentMax;
    if (data.franchiseFee !== undefined) brandUpdates.franchiseFee = data.franchiseFee;
    if (data.royaltyPercent !== undefined) brandUpdates.royaltyPercent = data.royaltyPercent;
    if (Object.keys(brandUpdates).length > 0) {
      await ctx.db.patch(brandId, brandUpdates);
    }

    return { success: true, brandId, patched: Object.keys(clean) };
  },
});

/**
 * Clear specific fields from a franchise profile (set to undefined).
 * Used to undo bad enrichment writes.
 */
export const clearProfileFields = mutation({
  args: {
    profileId: v.id("franchiseProfiles"),
    fields: v.array(v.string()),
  },
  handler: async (ctx, { profileId, fields }) => {
    const fp = await ctx.db.get(profileId);
    if (!fp) throw new Error("Profile not found");

    const patch: Record<string, undefined> = {};
    for (const field of fields) {
      if (field !== "_id" && field !== "_creationTime" && field !== "brandId") {
        patch[field] = undefined;
      }
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(profileId, patch);
    }
    return { success: true, cleared: Object.keys(patch) };
  },
});

/**
 * Clear specific fields from a brand record (set to undefined).
 */
export const clearBrandFields = mutation({
  args: {
    brandId: v.id("brands"),
    fields: v.array(v.string()),
  },
  handler: async (ctx, { brandId, fields }) => {
    const brand = await ctx.db.get(brandId);
    if (!brand) throw new Error("Brand not found");

    const patch: Record<string, undefined> = {};
    for (const field of fields) {
      if (field !== "_id" && field !== "_creationTime" && field !== "name" && field !== "slug") {
        patch[field] = undefined;
      }
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(brandId, patch);
    }
    return { success: true, cleared: Object.keys(patch) };
  },
});

/**
 * Re-link an orphaned franchise profile to a different brand.
 */
export const relinkFranchiseProfile = mutation({
  args: {
    profileId: v.id("franchiseProfiles"),
    newBrandId: v.id("brands"),
  },
  handler: async (ctx, { profileId, newBrandId }) => {
    const fp = await ctx.db.get(profileId);
    if (!fp) throw new Error("Franchise profile not found");
    
    const brand = await ctx.db.get(newBrandId);
    if (!brand) throw new Error("Target brand not found");
    
    await ctx.db.patch(profileId, { brandId: newBrandId });
    return { success: true, oldBrandId: fp.brandId, newBrandId };
  },
});
