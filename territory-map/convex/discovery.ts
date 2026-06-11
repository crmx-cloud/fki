import { query } from "./_generated/server";
import { v } from "convex/values";
import { toStateCode } from "./constants";
import { scoreBrandForProspect } from "./prospect";

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const discoverByLocation = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusMiles: v.optional(v.number()),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const radius = args.radiusMiles ?? 50;
    const allBrands = await ctx.db.query("brands").collect();
    const brands = allBrands.filter((b) => b.isActive !== false);
    const allTerritories = await ctx.db.query("territories").collect();
    const allFranchiseProfiles = await ctx.db.query("franchiseProfiles").collect();
    const fpMap = new Map(allFranchiseProfiles.map((fp) => [fp.brandId.toString(), fp]));
    const allSA = await ctx.db.query("stateAvailability").collect();
    const saMap = new Map<string, Map<string, string>>();
    for (const row of allSA) {
      const k = row.brandId.toString();
      if (!saMap.has(k)) saMap.set(k, new Map());
      saMap.get(k)!.set(row.state.toUpperCase(), row.status);
    }

    // ONE ENGINE: the homepage location search scores with the exact same
    // scoreBrandForProspect as the dashboard/quiz/brand page.
    const prospectLike = {
      primaryLat: args.latitude,
      primaryLng: args.longitude,
      primaryRadius: radius,
      primaryState: args.state,
    };

    const results = [];
    for (const brand of brands) {
      if (args.budgetMin && brand.investmentMax && brand.investmentMax < args.budgetMin) continue;
      if (args.budgetMax && brand.investmentMin && brand.investmentMin > args.budgetMax) continue;

      const brandTerritories = allTerritories.filter((t) => t.brandId === brand._id);
      const profile = fpMap.get(brand._id.toString()) || null;
      const r = scoreBrandForProspect({
        prospect: prospectLike,
        brand,
        fp: profile,
        brandTerritories,
        saMap,
        capitalOverride: args.budgetMax,
      });
      if (!r || r.knockedOut) continue;

      const nearbyTerritories = brandTerritories.filter((t) => {
        if (!t.latitude || !t.longitude) return false;
        return haversineDistance(args.latitude, args.longitude, t.latitude, t.longitude) <= radius;
      });

      results.push({
        brand,
        profile,
        score: r.matchScore,
        breakdown: {},
        reasons: (r.matchReasons || []).slice(0, 4),
        nearbyAvailable: nearbyTerritories.filter((t) => t.status === "available").length,
        nearbyTotal: nearbyTerritories.length,
        totalTerritories: brandTerritories.length,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  },
});

export const getQuizResults = query({
  args: {
    budget: v.string(),
    involvement: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    timeline: v.optional(v.string()),
    location: v.optional(v.string()),
    category: v.optional(v.string()),
    // Primary location (from quiz step 1)
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    primaryCity: v.optional(v.string()),
    primaryState: v.optional(v.string()),
    primaryRadius: v.optional(v.number()),
    // Secondary location
    secondaryLatitude: v.optional(v.number()),
    secondaryLongitude: v.optional(v.number()),
    secondaryCity: v.optional(v.string()),
    secondaryState: v.optional(v.string()),
    secondaryRadius: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allBrands = await ctx.db.query("brands").collect();
    const brands = allBrands.filter((b) => b.isActive !== false);
    const allTerritories = await ctx.db.query("territories").collect();
    const allFranchiseProfiles = await ctx.db.query("franchiseProfiles").collect();
    const fpMap = new Map(allFranchiseProfiles.map((fp) => [fp.brandId.toString(), fp]));
    const allSA = await ctx.db.query("stateAvailability").collect();
    const saMap = new Map<string, Map<string, string>>();
    for (const row of allSA) {
      const k = row.brandId.toString();
      if (!saMap.has(k)) saMap.set(k, new Map());
      saMap.get(k)!.set(row.state.toUpperCase(), row.status);
    }

    // Budget = "up to $X" — used as available capital in the shared engine
    const budgetMaxMap: Record<string, number> = {
      "under-50k": 50000, "50k-100k": 100000, "100k-250k": 250000,
      "250k-500k": 500000, "500k-plus": 10000000,
      "up-to-50k": 50000, "up-to-100k": 100000, "up-to-150k": 150000,
      "up-to-250k": 250000, "up-to-500k": 500000, "up-to-1m": 1000000,
      "1m-plus": 10000000,
    };
    const budgetMax = budgetMaxMap[args.budget] ?? 10000000;
    const selectedCategories = [
      ...(args.categories || []),
      ...(args.category ? [args.category] : []),
    ];

    // ONE ENGINE: quiz answers become a prospect-like object scored by the
    // exact same scoreBrandForProspect the dashboard/brand page/dossier use.
    // A quiz taker who signs up sees consistent scores, not a different math.
    const prospectLike = {
      ownerType: args.involvement,
      preferredCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
      timeline: args.timeline,
      primaryCity: args.primaryCity,
      primaryState: args.primaryState,
      primaryRadius: args.primaryRadius,
      primaryLat: args.latitude,
      primaryLng: args.longitude,
      secondaryCity: args.secondaryCity,
      secondaryState: args.secondaryState,
      secondaryRadius: args.secondaryRadius,
      secondaryLat: args.secondaryLatitude,
      secondaryLng: args.secondaryLongitude,
    };

    const results: any[] = [];
    for (const brand of brands) {
      const brandTerritories = allTerritories.filter((t) => t.brandId === brand._id);
      const availableCount = brandTerritories.filter((t) => t.status === "available").length;
      const profile = fpMap.get(brand._id.toString()) || null;
      const r = scoreBrandForProspect({
        prospect: prospectLike,
        brand,
        fp: profile,
        brandTerritories,
        saMap,
        capitalOverride: budgetMax,
      });
      if (!r || r.knockedOut) continue;
      results.push({
        brand,
        profile,
        fitScore: r.matchScore,
        matchScore: r.matchScore,
        reasons: (r.matchReasons || []).slice(0, 5),
        availableTerritories: availableCount,
        totalTerritories: brandTerritories.length,
        hasAvailable: availableCount > 0 || !!r.availableInYourState,
      });
    }

    // Sort: brands WITH availability first, then by score desc
    results.sort((a, b) => {
      if (a.hasAvailable && !b.hasAvailable) return -1;
      if (!a.hasAvailable && b.hasAvailable) return 1;
      return b.fitScore - a.fitScore;
    });

    // Tag top 3 with availability as "topPick"
    let topCount = 0;
    for (const r of results) {
      if (r.hasAvailable && topCount < 3) {
        r.topPick = true;
        topCount++;
      } else {
        r.topPick = false;
      }
    }

    return results;
  },
});
