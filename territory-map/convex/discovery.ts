import { query } from "./_generated/server";
import { v } from "convex/values";
import { toStateCode } from "./constants";

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

function calculateSuccessScore(
  brand: any,
  profile: any,
  nearbyTerritories: any[],
  allTerritories: any[]
): { score: number; breakdown: Record<string, number>; reasons: string[] } {
  const reasons: string[] = [];
  let brandScore = 50;
  if (profile?.avgUnitRevenue) {
    if (profile.avgUnitRevenue > 1000000) brandScore += 30;
    else if (profile.avgUnitRevenue > 500000) brandScore += 20;
    else if (profile.avgUnitRevenue > 250000) brandScore += 10;
    if (profile.avgUnitRevenue > 500000) reasons.push("Strong AUV: $" + (profile.avgUnitRevenue / 1000).toFixed(0) + "K");
  }
  if (profile?.investmentReturnRatio && profile.investmentReturnRatio > 2) {
    brandScore += 15;
    reasons.push(profile.investmentReturnRatio.toFixed(1) + "x ROI ratio");
  }
  if (profile?.closureCount !== undefined && profile.closureCount < 5) {
    brandScore += 10;
    reasons.push("Very low closure rate");
  }
  if (profile?.item19Available) {
    brandScore += 5;
    reasons.push("Item 19 data available");
  }
  brandScore = Math.min(100, brandScore);

  let marketScore = 30;
  const availableNearby = nearbyTerritories.filter((t: any) => t.status === "available").length;
  const soldNearby = nearbyTerritories.filter((t: any) => t.status === "sold").length;
  if (availableNearby > 0) {
    marketScore += 25;
    reasons.push(availableNearby + " available territor" + (availableNearby === 1 ? "y" : "ies") + " nearby");
  }
  if (soldNearby > 0) {
    marketScore += 20;
    reasons.push("Proven market: " + soldNearby + " existing location" + (soldNearby === 1 ? "" : "s"));
  }
  const totalSold = allTerritories.filter((t: any) => t.status === "sold").length;
  if (totalSold > 10) {
    marketScore += 15;
    reasons.push(totalSold + " total locations nationwide");
  }
  marketScore = Math.min(100, marketScore);

  let accessScore = 40;
  if (brand.investmentMin && brand.investmentMin < 100000) {
    accessScore += 20;
    reasons.push("Low initial investment");
  }
  if (profile?.sbaApproved) {
    accessScore += 20;
    reasons.push("SBA approved");
  }
  if (profile?.veteranDiscount) {
    accessScore += 10;
    reasons.push("Veteran discount available");
  }
  if (profile?.fddAvailable) {
    accessScore += 10;
  }
  accessScore = Math.min(100, accessScore);

  let momentumScore = 40;
  if (profile?.isGrowing) {
    momentumScore += 30;
    reasons.push("Actively growing");
  }
  const pendingCount = allTerritories.filter((t: any) => t.status === "pending_award").length;
  if (pendingCount > 3) {
    momentumScore += 20;
    reasons.push(pendingCount + " pending awards");
  }
  if (profile?.multiUnitAvailable) {
    momentumScore += 10;
    reasons.push("Multi-unit opportunities");
  }
  momentumScore = Math.min(100, momentumScore);

  const score = Math.round(
    brandScore * 0.35 +
    marketScore * 0.30 +
    accessScore * 0.15 +
    momentumScore * 0.20
  );

  return {
    score,
    breakdown: {
      brandPerformance: brandScore,
      marketFit: marketScore,
      accessibility: accessScore,
      momentum: momentumScore,
    },
    reasons: reasons.slice(0, 4),
  };
}

export const discoverByLocation = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusMiles: v.optional(v.number()),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const radius = args.radiusMiles ?? 50;
    // Get all brands and filter — don't use strict index (misses brands with isActive undefined)
    const allBrands = await ctx.db.query("brands").collect();
    const brands = allBrands.filter((b) => b.isActive !== false);

    const results = [];
    for (const brand of brands) {
      if (args.budgetMin && brand.investmentMax && brand.investmentMax < args.budgetMin) continue;
      if (args.budgetMax && brand.investmentMin && brand.investmentMin > args.budgetMax) continue;

      const allTerritories = await ctx.db
        .query("territories")
        .withIndex("by_brand", (q) => q.eq("brandId", brand._id))
        .collect();

      const nearbyTerritories = allTerritories.filter((t) => {
        if (!t.latitude || !t.longitude) return false;
        return haversineDistance(args.latitude, args.longitude, t.latitude, t.longitude) <= radius;
      });

      const profile = await ctx.db
        .query("franchiseProfiles")
        .withIndex("by_brand", (q) => q.eq("brandId", brand._id))
        .first();

      const { score, breakdown, reasons } = calculateSuccessScore(
        brand, profile, nearbyTerritories, allTerritories
      );

      results.push({
        brand,
        profile,
        score,
        breakdown,
        reasons,
        nearbyAvailable: nearbyTerritories.filter((t) => t.status === "available").length,
        nearbyTotal: nearbyTerritories.length,
        totalTerritories: allTerritories.length,
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

    // Budget = "up to $X" — include ALL brands with investmentMin at or below the max
    const budgetMaxMap: Record<string, number> = {
      "under-50k": 50000,
      "50k-100k": 100000,
      "100k-250k": 250000,
      "250k-500k": 500000,
      "500k-plus": 10000000,
      // New slider values (backwards-compatible)
      "up-to-50k": 50000,
      "up-to-100k": 100000,
      "up-to-150k": 150000,
      "up-to-250k": 250000,
      "up-to-500k": 500000,
      "up-to-1m": 1000000,
      "1m-plus": 10000000,
    };
    const budgetMax = budgetMaxMap[args.budget] ?? 10000000;
    const budgetRange: [number, number] = [0, budgetMax];

    // Merge categories array + single category for backwards compat
    const selectedCategories = [
      ...(args.categories || []),
      ...(args.category ? [args.category] : []),
    ];

    // Location params
    const pLat = args.latitude;
    const pLng = args.longitude;
    const pRadius = args.primaryRadius ?? 50;
    const pState = args.primaryState;
    const sLat = args.secondaryLatitude;
    const sLng = args.secondaryLongitude;
    const sRadius = args.secondaryRadius ?? 50;
    const sState = args.secondaryState;
    const hasLocation = !!(pLat && pLng);

    // Preload all territories and franchise profiles
    const allTerritories = await ctx.db.query("territories").collect();
    const allFranchiseProfiles = await ctx.db.query("franchiseProfiles").collect();
    const fpMap = new Map(allFranchiseProfiles.map((fp) => [fp.brandId.toString(), fp]));

    // State-level availability — same data the dashboard matcher uses.
    // brandId -> Map(stateCode -> status). Quiz states may be full names.
    const allSA = await ctx.db.query("stateAvailability").collect();
    const saMap = new Map<string, Map<string, string>>();
    for (const row of allSA) {
      const k = row.brandId.toString();
      if (!saMap.has(k)) saMap.set(k, new Map());
      saMap.get(k)!.set(row.state.toUpperCase(), row.status);
    }
    const quizStateCodes = [pState, sState]
      .map((s) => toStateCode(s))
      .filter((s): s is string => !!s);

    const results = [];
    for (const brand of brands) {
      let fitScore = 0;
      const reasons: string[] = [];

      const brandTerritories = allTerritories.filter((t) => t.brandId === brand._id);
      const openStatuses = ["available", "high_interest", "pending_award"];
      const openTerritories = brandTerritories.filter((t) => openStatuses.includes(t.status));
      const availableCount = openTerritories.filter((t) => t.status === "available").length;
      const profile = fpMap.get(brand._id.toString()) || null;

      // ═══ 1. LOCATION PROXIMITY (0–35 pts) — highest weight ═══
      let locationScore = 0;
      const nearbyTerritories: { city: string; state: string; status: string; distance: number }[] = [];

      const checkLocation = (
        lat: number | undefined,
        lng: number | undefined,
        state: string | undefined,
        radius: number,
      ) => {
        for (const t of openTerritories) {
          const key = `${t.city}|${t.state}`;
          if (nearbyTerritories.some((n) => `${n.city}|${n.state}` === key)) continue;
          if (lat && lng && t.latitude && t.longitude) {
            const dist = haversineDistance(lat, lng, t.latitude, t.longitude);
            if (dist <= radius) {
              nearbyTerritories.push({ city: t.city, state: t.state, status: t.status, distance: Math.round(dist) });
            }
          } else if (state && t.state && t.state.toLowerCase() === state.toLowerCase()) {
            nearbyTerritories.push({ city: t.city, state: t.state, status: t.status, distance: -1 });
          }
        }
      };

      // Check primary location
      checkLocation(pLat, pLng, pState, pRadius);
      // Check secondary location
      if (sLat && sLng) {
        checkLocation(sLat, sLng, sState, sRadius);
      }

      nearbyTerritories.sort((a, b) => {
        if (a.distance === -1 && b.distance !== -1) return 1;
        if (b.distance === -1 && a.distance !== -1) return -1;
        return a.distance - b.distance;
      });

      const haversineHits = nearbyTerritories.filter((t) => t.distance >= 0);
      const stateHits = nearbyTerritories.filter((t) => t.distance === -1);
      const closest = haversineHits.length > 0 ? haversineHits[0].distance : Infinity;

      if (haversineHits.length > 0) {
        // Distance-weighted scoring
        if (closest < 10) locationScore = 35;
        else if (closest < 25) locationScore = 30;
        else if (closest < 50) locationScore = 25;
        else if (closest < 100) locationScore = 20;
        else locationScore = 15;
        // Bonus for multiple nearby territories (up to +5)
        locationScore = Math.min(35, locationScore + Math.min(5, haversineHits.length - 1));

        const avNearby = haversineHits.filter((t) => t.status === "available").length;
        if (avNearby > 0) {
          reasons.push(avNearby + " available territor" + (avNearby === 1 ? "y" : "ies") + " near you" + (closest > 0 ? " (" + closest + " mi)" : ""));
        } else {
          reasons.push(haversineHits.length + " territor" + (haversineHits.length === 1 ? "y" : "ies") + " within " + pRadius + " mi");
        }
      } else if (stateHits.length > 0) {
        locationScore = 8;
        reasons.push(stateHits.length + " territories in " + (pState || sState || "your state"));
      } else if (quizStateCodes.length > 0) {
        // State-level availability — same signal the dashboard matcher uses
        const sa = saMap.get(brand._id.toString());
        const statuses = quizStateCodes.map((s) => sa?.get(s));
        if (statuses.includes("open")) {
          locationScore = 25;
          reasons.push("Actively franchising in " + (pState || sState || "your state"));
        } else if (statuses.includes("registered")) {
          locationScore = 12;
          reasons.push("Registered to sell in " + (pState || sState || "your state"));
        } else if (sa && sa.size > 0 && statuses.every((s) => s === "closed")) {
          locationScore = 0;
        } else if (hasLocation && openTerritories.length > 0) {
          locationScore = 3;
          reasons.push(openTerritories.length + " territories (not in your area)");
        } else if (!hasLocation) {
          locationScore = 15;
        }
      } else if (hasLocation && openTerritories.length > 0) {
        locationScore = 3;
        reasons.push(openTerritories.length + " territories (not in your area)");
      } else if (!hasLocation) {
        // No location provided (legacy quiz flow) — neutral
        locationScore = 15;
      }
      fitScore += locationScore;

      // ═══ 2. BUDGET FIT (0–25 pts) ═══
      let capitalScore = 0;
      if (brand.investmentMin && brand.investmentMax) {
        if (brand.investmentMin >= budgetRange[0] && brand.investmentMin <= budgetRange[1]) {
          capitalScore = 25;
          reasons.push("Within your budget");
        } else if (brand.investmentMin < budgetRange[0]) {
          capitalScore = 15;
          reasons.push("Below your budget range");
        } else if (brand.investmentMin <= budgetRange[1] * 1.3) {
          capitalScore = 8;
          reasons.push("Slightly above budget");
        }
      } else {
        capitalScore = 12; // No investment data — neutral
      }
      fitScore += capitalScore;

      // ═══ 3. CATEGORY MATCH (0–15 pts) ═══
      if (selectedCategories.length > 0 && brand.category) {
        const brandCat = brand.category.toLowerCase();
        const matched = selectedCategories.some((cat) =>
          brandCat.includes(cat.toLowerCase()) || cat.toLowerCase().includes(brandCat)
        );
        if (matched) {
          fitScore += 15;
          reasons.push("Matches your " + brand.category + " interest");
        }
      }

      // ═══ 4. INVOLVEMENT MATCH (0–10 pts) ═══
      if (args.involvement) {
        if (args.involvement === "owner-operator") {
          fitScore += 5;
        } else if (args.involvement === "semi-absentee" || args.involvement === "investor") {
          if (brand.investmentMin && brand.investmentMin > 100000) {
            fitScore += 10;
            reasons.push("Good for " + args.involvement.replace("-", " ") + " model");
          } else {
            fitScore += 3;
          }
        }
      }

      // ═══ 5. BRAND QUALITY SIGNALS (0–10 pts) ═══
      let qualityScore = 0;
      if (profile?.sbaApproved) {
        qualityScore += 3;
        reasons.push("SBA financing available");
      }
      if (profile?.isGrowing) {
        qualityScore += 3;
        reasons.push("Actively expanding");
      }
      if (profile?.item19Available) {
        qualityScore += 2;
      }
      if (profile?.avgUnitRevenue && profile.avgUnitRevenue > 500000) {
        qualityScore += 2;
        reasons.push("Strong AUV: $" + Math.round(profile.avgUnitRevenue / 1000) + "K");
      }
      fitScore += Math.min(10, qualityScore);

      // ═══ 6. TIMELINE BONUS (0–5 pts) ═══
      if (args.timeline === "asap") {
        fitScore += 5;
        reasons.push("Open for immediate start");
      } else if (args.timeline === "6months") {
        fitScore += 3;
      }

      const finalScore = Math.min(100, fitScore);

      results.push({
        brand,
        profile,
        fitScore: finalScore,
        matchScore: finalScore,
        reasons: reasons.slice(0, 5),
        availableTerritories: availableCount,
        totalTerritories: brandTerritories.length,
        hasAvailable:
          availableCount > 0 ||
          quizStateCodes.some((s) => saMap.get(brand._id.toString())?.get(s) === "open"),
      });
    }

    // Sort: brands WITH available territories first, then by fitScore desc
    results.sort((a, b) => {
      // Primary sort: available territories first
      if (a.hasAvailable && !b.hasAvailable) return -1;
      if (!a.hasAvailable && b.hasAvailable) return 1;
      // Secondary sort: fitScore desc
      return b.fitScore - a.fitScore;
    });

    // Tag top 3 with available territories as "topPick"
    let topCount = 0;
    for (const r of results) {
      if (r.hasAvailable && topCount < 3) {
        (r as any).topPick = true;
        topCount++;
      } else {
        (r as any).topPick = false;
      }
    }

    return results;
  },
});
