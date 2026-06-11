import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper: verify user has access to this brand
async function requireBrandAccess(ctx: any, brandId: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile) throw new Error("No profile found");

  // Admins can access everything
  if (profile.role === "admin" || profile.role === "super_admin" || profile.role === "standard") return { userId, profile };

  // Franchisors / brand_admins must have this brand in their brandIds
  if (profile.brandIds?.includes(brandId)) return { userId, profile };

  throw new Error("Access denied");
}

/**
 * Get the franchise profile for a brand.
 * Merges brand data + franchiseProfile data for a complete view.
 */
export const getProfile = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const brand = await ctx.db.get(brandId);
    if (!brand) return null;

    const fp = await ctx.db
      .query("franchiseProfiles")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .first();

    // Resolve logo URL from storage
    let logoUrl = brand.logoUrl;
    if (fp?.logoStorageId) {
      try {
        const url = await ctx.storage.getUrl(fp.logoStorageId as any);
        if (url) logoUrl = url;
      } catch {
        // Storage ID might be invalid
      }
    }

    // Resolve photo URLs
    const photoUrls: string[] = [];
    if (fp?.photos) {
      for (const storageId of fp.photos) {
        try {
          const url = await ctx.storage.getUrl(storageId as any);
          if (url) photoUrls.push(url);
        } catch {
          // Skip invalid
        }
      }
    }

    return {
      brand,
      franchiseProfile: fp,
      logoUrl,
      photoUrls,
    };
  },
});

/**
 * Get franchise profile for public brand listing (no auth required).
 */
export const getPublicProfile = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const fp = await ctx.db
      .query("franchiseProfiles")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .first();

    if (!fp) return null;

    // Resolve photo URLs
    const photoUrls: string[] = [];
    if (fp?.photos) {
      for (const storageId of fp.photos) {
        try {
          const url = await ctx.storage.getUrl(storageId as any);
          if (url) photoUrls.push(url);
        } catch {
          // skip
        }
      }
    }

    let logoUrl: string | undefined;
    if (fp?.logoStorageId) {
      try {
        const url = await ctx.storage.getUrl(fp.logoStorageId as any);
        if (url) logoUrl = url;
      } catch {
        // skip
      }
    }

    return { ...fp, photoUrls, logoUrl };
  },
});

/**
 * Update brand details (name, description, website, etc.)
 */
export const updateBrand = mutation({
  args: {
    brandId: v.id("brands"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    color: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { brandId, ...updates }) => {
    await requireBrandAccess(ctx, brandId);

    const clean: Record<string, any> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) clean[k] = val;
    }
    // Always ensure brand is active when franchisor saves updates
    clean.isActive = true;
    if (Object.keys(clean).length > 0) {
      await ctx.db.patch(brandId, clean);
    }
  },
});

/**
 * Update the full franchise profile (performance, investment, content, etc.)
 */
export const updateProfile = mutation({
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
    guestRating: v.optional(v.string()),

    // Investment
    totalInvestmentMin: v.optional(v.number()),
    totalInvestmentMax: v.optional(v.number()),
    liquidCapitalMin: v.optional(v.number()),
    franchiseFee: v.optional(v.number()),
    royaltyPercent: v.optional(v.number()),
    brandFundPercent: v.optional(v.number()),
    marketingFees: v.optional(v.string()),
    minFootprint: v.optional(v.string()),
    investmentReturnRatio: v.optional(v.number()),

    // Identity
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    logoStorageId: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),

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

    // Owner & Capital
    ownerTypes: v.optional(v.array(v.string())),

    // Company Details
    parentCompany: v.optional(v.string()),
    leadershipName: v.optional(v.string()),
    leadershipTitle: v.optional(v.string()),
    corporateAddress: v.optional(v.string()),
    corporateCity: v.optional(v.string()),
    corporateState: v.optional(v.string()),
    corporateZip: v.optional(v.string()),
    socialLinks: v.optional(v.object({
      facebook: v.optional(v.string()),
      twitter: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      instagram: v.optional(v.string()),
      youtube: v.optional(v.string()),
      tiktok: v.optional(v.string()),
    })),
    employeesAtHQ: v.optional(v.number()),
    geographicFocus: v.optional(v.string()),

    // Media
    overviewVideoUrl: v.optional(v.string()),
    testimonialVideoUrl: v.optional(v.string()),
    sectionImages: v.optional(v.object({
      brandStory: v.optional(v.string()),
      performance: v.optional(v.string()),
      idealPartner: v.optional(v.string()),
      whyChoose: v.optional(v.string()),
    })),

    // Operations & Support
    classroomTrainingHours: v.optional(v.number()),
    onTheJobTrainingHours: v.optional(v.number()),
    ongoingSupport: v.optional(v.array(v.string())),
    marketingSupport: v.optional(v.array(v.string())),

    // Additional Operations Flags
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

    // ═══ FDD ENRICHMENT FIELDS ═══
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
    await requireBrandAccess(ctx, brandId);

    // Find or create franchise profile
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
      await ctx.db.insert("franchiseProfiles", {
        brandId,
        ...clean,
      });
    }

    // Also sync investment fields to brand table for listings
    const brandUpdates: Record<string, any> = {};
    if (data.totalInvestmentMin !== undefined) brandUpdates.investmentMin = data.totalInvestmentMin;
    if (data.totalInvestmentMax !== undefined) brandUpdates.investmentMax = data.totalInvestmentMax;
    if (data.franchiseFee !== undefined) brandUpdates.franchiseFee = data.franchiseFee;
    if (data.royaltyPercent !== undefined) brandUpdates.royaltyPercent = data.royaltyPercent;
    if (data.primaryColor !== undefined) brandUpdates.color = data.primaryColor;
    if (Object.keys(brandUpdates).length > 0) {
      await ctx.db.patch(brandId, brandUpdates);
    }
  },
});

/**
 * Generate upload URL for logo/photos.
 */
export const generateUploadUrl = mutation({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    await requireBrandAccess(ctx, brandId);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get onboarding completion status for a brand.
 * Returns which sections are complete and overall progress.
 */
export const getOnboardingStatus = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const brand = await ctx.db.get(brandId);
    if (!brand) return null;

    const fp = await ctx.db
      .query("franchiseProfiles")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .first();

    const territories = await ctx.db
      .query("territories")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();

    // Check each section
    const sections = {
      brand: !!(brand.name && brand.contactEmail),
      identity: !!(fp?.primaryColor || fp?.logoStorageId),
      investment: !!(fp?.totalInvestmentMin || fp?.franchiseFee),
      performance: !!(fp?.yearFounded || fp?.totalUnits || fp?.avgRevenueMin),
      territories: territories.length > 0,
      content: !!(fp?.brandStory || (fp?.sellingPoints && fp.sellingPoints.length > 0)),
      photos: !!(fp?.photos && fp.photos.length > 0),
      faqs: !!(fp?.faqs && fp.faqs.length > 0),
      flags: !!(fp?.fddAvailable !== undefined || fp?.item19Available !== undefined || fp?.sbaApproved !== undefined),
    };

    const completedCount = Object.values(sections).filter(Boolean).length;
    const totalSections = Object.keys(sections).length;
    const progress = Math.round((completedCount / totalSections) * 100);

    return {
      sections,
      completedCount,
      totalSections,
      progress,
      isComplete: completedCount === totalSections,
      territoryCount: territories.length,
    };
  },
});

/**
 * Get my brands (for franchisor dashboard).
 */
export const myBrands = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return [];

    // Admins see all brands
    if (profile.role === "admin" || profile.role === "super_admin" || profile.role === "standard") {
      return await ctx.db.query("brands").collect();
    }

    // Others see only their assigned brands
    if (!profile.brandIds || profile.brandIds.length === 0) return [];

    const brands = [];
    for (const id of profile.brandIds) {
      const brand = await ctx.db.get(id);
      if (brand) brands.push(brand);
    }
    return brands;
  },
});
