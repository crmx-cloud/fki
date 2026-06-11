import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { toStateCode } from "./constants";

/* ──────────────────────────────────────────────
   Constants shared between frontend & backend
   ────────────────────────────────────────────── */

export const LIQUID_CAPITAL_OPTIONS = [
  { label: "Under $50K", value: "under_50k", min: 0, max: 50_000 },
  { label: "$50K – $100K", value: "50k_100k", min: 50_000, max: 100_000 },
  { label: "$100K – $150K", value: "100k_150k", min: 100_000, max: 150_000 },
  { label: "$150K – $250K", value: "150k_250k", min: 150_000, max: 250_000 },
  { label: "$250K – $500K", value: "250k_500k", min: 250_000, max: 500_000 },
  { label: "$500K – $1M", value: "500k_1m", min: 500_000, max: 1_000_000 },
  { label: "$1M+", value: "1m_plus", min: 1_000_000, max: Infinity },
];

export const OWNER_TYPE_OPTIONS = [
  { label: "Owner/Operator", value: "owner_operator" },
  { label: "Semi-Absentee", value: "semi_absentee" },
  { label: "Absentee/Executive", value: "absentee" },
  { label: "Investor/Multi-Unit", value: "investor" },
];

export const FRANCHISE_CATEGORY_OPTIONS = [
  { label: "Food & Beverage", value: "food_bev" },
  { label: "Health & Fitness", value: "health_fitness" },
  { label: "Services", value: "services" },
  { label: "Home Services", value: "home_services" },
  { label: "Education", value: "education" },
  { label: "Beauty & Self Care", value: "beauty_selfcare" },
];

export const RADIUS_OPTIONS = [
  { label: "10 miles", value: 10 },
  { label: "25 miles", value: 25 },
  { label: "50 miles", value: 50 },
  { label: "100 miles", value: 100 },
  { label: "200 miles", value: 200 },
];

export const TIMELINE_OPTIONS = [
  { label: "ASAP", value: "asap" },
  { label: "Within 3 months", value: "3_months" },
  { label: "Within 6 months", value: "6_months" },
  { label: "Within 12 months", value: "12_months" },
  { label: "Just exploring", value: "exploring" },
];

export const EXPERIENCE_OPTIONS = [
  { label: "No business experience", value: "none" },
  { label: "Some business experience", value: "some_business" },
  { label: "Current franchise owner", value: "franchise_owner" },
  { label: "Multi-unit operator", value: "multi_unit" },
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function liquidCapitalToMin(val: string): number {
  const opt = LIQUID_CAPITAL_OPTIONS.find((o) => o.value === val);
  return opt ? opt.min : 0;
}

/** Haversine distance in miles */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ──────────────────────────────────────────────
   Prospect Radius (safe, targeted update)
   ────────────────────────────────────────────── */

export const updateProspectRadius = mutation({
  args: { primaryRadius: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const existing = await ctx.db
      .query("prospectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { primaryRadius: args.primaryRadius });
    }
    // Don't create a profile just for radius — they'll create one via GetStarted/Profile
  },
});

/* ──────────────────────────────────────────────
   Prospect Profile CRUD
   ────────────────────────────────────────────── */

export const getMyProspectProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("prospectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const updateProspectProfile = mutation({
  args: {
    liquidCapital: v.optional(v.string()),
    ownerType: v.optional(v.string()),
    preferredCategories: v.optional(v.array(v.string())),
    primaryCity: v.optional(v.string()),
    primaryState: v.optional(v.string()),
    primaryRadius: v.optional(v.number()),
    secondaryCity: v.optional(v.string()),
    secondaryState: v.optional(v.string()),
    secondaryRadius: v.optional(v.number()),
    timeline: v.optional(v.string()),
    priorExperience: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);

    const existing = await ctx.db
      .query("prospectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Determine if profile is complete enough for matching
    const hasCapital = !!args.liquidCapital;
    const hasLocation = !!(args.primaryCity && args.primaryState);
    const profileComplete = hasCapital && hasLocation;

    const data: any = {
      ...args,
      profileComplete,
      email: user?.email || undefined,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("prospectProfiles", {
        userId,
        ...data,
      });
    }
  },
});

/* ──────────────────────────────────────────────
   Brand Profile Completeness Helper
   ────────────────────────────────────────────── */

const PROFILE_FIELDS: string[] = [
  "brandStory", "avgUnitRevenue", "totalUnits", "yearFounded", "franchiseFee",
  "royaltyPercent", "liquidCapitalMin", "ownerTypes", "sellingPoints",
  "trainingWeeks", "fddAvailable", "item19Available", "model",
];

function profileCompleteness(fp: any | undefined): number {
  if (!fp) return 0;
  let filled = 0;
  for (const f of PROFILE_FIELDS) {
    const v = (fp as any)[f];
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) filled++;
  }
  return filled;
}

/* ──────────────────────────────────────────────
   Matching Engine (v3 — PerfectFit™ Enhanced)
   21 dimensions across 3 tiers
   ────────────────────────────────────────────── */

/* Helper: convert total investment budget string → numeric range */
function totalBudgetToRange(val: string): { min: number; max: number } {
  const map: Record<string, { min: number; max: number }> = {
    under_100k: { min: 0, max: 100_000 },
    "100k_250k": { min: 100_000, max: 250_000 },
    "250k_500k": { min: 250_000, max: 500_000 },
    "500k_1m": { min: 500_000, max: 1_000_000 },
    "1m_plus": { min: 1_000_000, max: Infinity },
  };
  return map[val] || { min: 0, max: Infinity };
}

/* Helper: revenue goal string → numeric range */
function revenueGoalToRange(val: string): { min: number; max: number } {
  const map: Record<string, { min: number; max: number }> = {
    under_500k: { min: 0, max: 500_000 },
    "500k_1m": { min: 500_000, max: 1_000_000 },
    "1m_2m": { min: 1_000_000, max: 2_000_000 },
    "2m_plus": { min: 2_000_000, max: Infinity },
    not_sure: { min: 0, max: Infinity },
  };
  return map[val] || { min: 0, max: Infinity };
}

/* Helper: income goal string → numeric range */
function incomeGoalToRange(val: string): { min: number; max: number } {
  const map: Record<string, { min: number; max: number }> = {
    "50k_100k": { min: 50_000, max: 100_000 },
    "100k_200k": { min: 100_000, max: 200_000 },
    "200k_500k": { min: 200_000, max: 500_000 },
    "500k_plus": { min: 500_000, max: Infinity },
    equity: { min: 0, max: Infinity },
  };
  return map[val] || { min: 0, max: Infinity };
}

/* Helper: employee comfort string → numeric range */
function employeeRangeForComfort(val: string): { min: number; max: number } {
  const map: Record<string, { min: number; max: number }> = {
    solo: { min: 0, max: 1 },
    small_1_5: { min: 1, max: 5 },
    medium_5_15: { min: 5, max: 15 },
    large_15_plus: { min: 15, max: 1000 },
    hire_manager: { min: 0, max: 1000 },
    no_preference: { min: 0, max: 1000 },
  };
  return map[val] || { min: 0, max: 1000 };
}

/* Helper: parse "3-5" or "10-15" employee string → average */
function parseEmployeeCount(val: string | undefined): number | null {
  if (!val) return null;
  const match = val.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) return (parseInt(match[1]) + parseInt(match[2])) / 2;
  const single = parseInt(val);
  return isNaN(single) ? null : single;
}

/* Helper: brand total units → maturity stage */
function getBrandMaturity(fp: any | null): string {
  const units = fp?.totalUnits ?? fp?.item20?.franchisedUnitsEnd ?? 0;
  if (units >= 100) return "established";
  if (units >= 20) return "growth";
  return "emerging";
}

export const getMatches = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const prospect = await ctx.db
      .query("prospectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!prospect || !prospect.profileComplete) return [];

    const prospectCapitalMin = prospect.liquidCapital
      ? liquidCapitalToMin(prospect.liquidCapital)
      : 0;

    // Get all data upfront
    const allBrands = await ctx.db.query("brands").collect();
    const brands = allBrands.filter((b) => b.isActive !== false);
    const allTerritories = await ctx.db.query("territories").collect();
    const allFP = await ctx.db.query("franchiseProfiles").collect();
    const fpMap = new Map(allFP.map((fp) => [fp.brandId.toString(), fp]));

    // State-level availability — the real unit of franchise availability.
    // brandId -> Map(stateCode -> status)
    const allSA = await ctx.db.query("stateAvailability").collect();
    const saMap = new Map<string, Map<string, string>>();
    for (const row of allSA) {
      const key = row.brandId.toString();
      if (!saMap.has(key)) saMap.set(key, new Map());
      saMap.get(key)!.set(row.state.toUpperCase(), row.status);
    }

    const results: Array<{
      brand: (typeof brands)[0];
      franchiseProfile: (typeof allFP)[0] | null;
      score: number;
      breakdown: {
        locationScore: number;
        capitalFit: number;
        roiScore: number;
        categoryMatch: number;
        completenessScore: number;
        ownershipScore: number;
        mustHavePenalty: number;
        maturityScore: number;
        supportScore: number;
        lifestyleScore: number;
        psychographicScore: number;
        veteranBonus: number;
      };
      nearbyTerritories: Array<{ city: string; state: string; status: string; distance: number }>;
      totalAvailable: number;
    }> = [];

    for (const brand of brands) {
      const fp = fpMap.get(brand._id.toString()) || null;
      const brandTerritories = allTerritories.filter((t) => t.brandId === brand._id);
      const openStatuses = ["available", "high_interest", "pending_award"];
      const openTerritories = brandTerritories.filter((t) => openStatuses.includes(t.status));

      // ═══════════════════════════════════════════════════
      //  PHASE 0: MUST-HAVE HARD FILTERS (knockout)
      // ═══════════════════════════════════════════════════
      let mustHavePenalty = 0;
      const mustHaves = (prospect as any).mustHaveFilters as string[] | undefined;
      if (mustHaves?.length) {
        for (const filter of mustHaves) {
          let passes = true;
          switch (filter) {
            case "item19": passes = !!(fp?.item19Available); break;
            case "fdd": passes = !!(fp?.fddAvailable); break;
            case "sba": passes = !!(fp?.sbaApproved); break;
            case "exclusive_territory": passes = !!(fp?.exclusiveTerritories ?? fp?.territoryExclusivity); break;
            case "veteran_discount": passes = !!(fp?.veteranDiscount); break;
            case "multi_unit": passes = !!(fp?.multiUnitAvailable); break;
          }
          if (!passes) mustHavePenalty -= 15; // heavy penalty per missing requirement
        }
      }

      // ═══════════════════════════════════════════════════
      //  DIM 1: LOCATION PROXIMITY (0–25 pts)
      // ═══════════════════════════════════════════════════
      let locationScore = 0;
      const nearbyTerritories: Array<{ city: string; state: string; status: string; distance: number }> = [];

      const checkLocation = (lat: number | undefined, lng: number | undefined, state: string | undefined, radius: number) => {
        for (const t of openTerritories) {
          if (lat && lng && t.latitude && t.longitude) {
            const dist = haversine(lat, lng, t.latitude, t.longitude);
            if (dist <= radius) {
              const key = `${t.city}|${t.state}`;
              if (!nearbyTerritories.some((n) => `${n.city}|${n.state}` === key)) {
                nearbyTerritories.push({ city: t.city, state: t.state, status: t.status, distance: Math.round(dist) });
              }
            }
          } else if (state && t.state?.toLowerCase() === state.toLowerCase()) {
            const key = `${t.city}|${t.state}`;
            if (!nearbyTerritories.some((n) => `${n.city}|${n.state}` === key)) {
              nearbyTerritories.push({ city: t.city, state: t.state, status: t.status, distance: -1 });
            }
          }
        }
      };

      checkLocation(prospect.primaryLat, prospect.primaryLng, prospect.primaryState, prospect.primaryRadius || 50);
      checkLocation(prospect.secondaryLat, prospect.secondaryLng, prospect.secondaryState, prospect.secondaryRadius || 50);

      nearbyTerritories.sort((a, b) => {
        if (a.distance === -1 && b.distance !== -1) return 1;
        if (b.distance === -1 && a.distance !== -1) return -1;
        return a.distance - b.distance;
      });

      const haversineHits = nearbyTerritories.filter((t) => t.distance >= 0);
      const stateHits = nearbyTerritories.filter((t) => t.distance === -1);
      const closest = haversineHits.length > 0 ? haversineHits[0].distance : Infinity;

      if (haversineHits.length > 0) {
        // Franchisor-confirmed open territories near the prospect — strongest signal
        if (closest < 10) locationScore = 25;
        else if (closest < 25) locationScore = 22;
        else if (closest < 50) locationScore = 18;
        else if (closest < 100) locationScore = 14;
        else locationScore = 10;
        locationScore = Math.min(25, locationScore + Math.min(3, haversineHits.length - 1));
      } else {
        // State-level availability: franchisors open STATES; specific territories
        // are inquire-to-confirm. "open" state = genuinely available signal.
        const sa = saMap.get(brand._id.toString());
        const prospectStates = [prospect.primaryState, prospect.secondaryState]
          .map((s) => toStateCode(s))
          .filter((s): s is string => !!s);
        const stateStatuses = prospectStates.map((s) => sa?.get(s));
        if (stateStatuses.includes("open")) {
          locationScore = 18; // brand actively selling in prospect's state
        } else if (stateStatuses.includes("registered")) {
          locationScore = 10; // legally able to sell there, not a focus
        } else if (sa && sa.size > 0 && stateStatuses.every((s) => s === "closed")) {
          locationScore = 0; // verified NOT available in their state
        } else if (stateHits.length > 0) {
          locationScore = 6; // legacy territory record in their state
        } else if (sa && sa.size > 0) {
          locationScore = 2; // brand has state data, none for their state
        } else if (openTerritories.length > 0) {
          locationScore = 2; // no state data at all — legacy fallback
        }
      }

      // ═══════════════════════════════════════════════════
      //  DIM 2: FINANCIAL FIT (0–20 pts)
      //  Liquid capital + total investment budget
      // ═══════════════════════════════════════════════════
      let capitalFit = 0;
      const requiredMin = fp?.liquidCapitalMin ?? brand.investmentMin ?? 0;

      // 2a. Liquid capital match (0–12 pts)
      if (requiredMin === 0) {
        capitalFit = 8; // no requirement = neutral
      } else if (prospectCapitalMin >= requiredMin * 1.5) {
        capitalFit = 12;
      } else if (prospectCapitalMin >= requiredMin) {
        capitalFit = 10;
      } else if (prospectCapitalMin >= requiredMin * 0.8) {
        capitalFit = 6;
      } else if (prospectCapitalMin >= requiredMin * 0.6) {
        capitalFit = 3;
      }

      // 2b. Total investment budget vs brand's total investment range (0–8 pts)
      const prospectBudget = (prospect as any).totalInvestmentBudget as string | undefined;
      if (prospectBudget) {
        const budgetRange = totalBudgetToRange(prospectBudget);
        const brandInvMin = fp?.totalInvestmentMin ?? brand.investmentMin ?? 0;
        const brandInvMax = fp?.totalInvestmentMax ?? brand.investmentMax ?? 0;
        const brandMid = brandInvMax > 0 ? (brandInvMin + brandInvMax) / 2 : 0;

        if (brandMid === 0) {
          capitalFit += 4; // no data = neutral
        } else if (budgetRange.min <= brandMid && brandMid <= budgetRange.max) {
          capitalFit += 8; // perfect fit
        } else if (budgetRange.max >= brandInvMin) {
          capitalFit += 5; // can stretch to cover minimum
        } else {
          capitalFit += 1; // out of range
        }
      } else {
        capitalFit += 4; // no budget set = neutral
      }

      // ═══════════════════════════════════════════════════
      //  DIM 3: ROI & REVENUE GOALS (0–12 pts)
      // ═══════════════════════════════════════════════════
      let roiScore = 0;

      // 3a. Revenue goal alignment (0–5 pts)
      const revenueGoal = (prospect as any).revenueGoal as string | undefined;
      if (revenueGoal && revenueGoal !== "not_sure") {
        const goalRange = revenueGoalToRange(revenueGoal);
        const brandAUV = fp?.avgUnitRevenue ?? fp?.item19Revenue?.average ?? 0;
        if (brandAUV > 0) {
          if (brandAUV >= goalRange.min) roiScore += 5;
          else if (brandAUV >= goalRange.min * 0.7) roiScore += 3;
          else roiScore += 1;
        } else {
          roiScore += 2; // no data, neutral
        }
      }

      // 3b. Income goal alignment (0–4 pts)
      const incomeGoal = (prospect as any).incomeGoal as string | undefined;
      if (incomeGoal && incomeGoal !== "equity") {
        const goalRange = incomeGoalToRange(incomeGoal);
        const estimatedIncome = fp?.item19Profit?.estimatedAverage ?? 0;
        if (estimatedIncome > 0) {
          if (estimatedIncome >= goalRange.min) roiScore += 4;
          else if (estimatedIncome >= goalRange.min * 0.7) roiScore += 2;
        } else {
          roiScore += 1; // no data
        }
      }

      // 3c. General signals (0–3 pts)
      if (fp) {
        if (fp.isGrowing) roiScore += 1;
        if (fp.item19Available) roiScore += 1;
        if (fp.closureCount !== undefined && fp.closureCount < 5) roiScore += 1;
      }
      roiScore = Math.min(12, roiScore);

      // ═══════════════════════════════════════════════════
      //  DIM 4: CATEGORY MATCH (0–8 pts)
      // ═══════════════════════════════════════════════════
      let categoryMatch = 0;
      if (prospect.preferredCategories?.length && brand.category) {
        const brandCat = brand.category.toLowerCase().replace(/[& ]+/g, "_");
        const matched = prospect.preferredCategories.some(
          (c) => brandCat.includes(c.toLowerCase()) || c.toLowerCase().includes(brandCat)
        );
        if (matched) categoryMatch = 8;
      }

      // ═══════════════════════════════════════════════════
      //  DIM 5: OWNERSHIP COMPATIBILITY (0–10 pts)
      //  Owner type + home/PT + multi-unit
      // ═══════════════════════════════════════════════════
      let ownershipScore = 0;

      // 5a. Owner type match (0–4 pts)
      const prospectOwnerModels = ((prospect as any).ownershipModel as string[] | undefined) ?? (prospect.ownerType ? [prospect.ownerType] : []);
      if (prospectOwnerModels.length > 0 && !prospectOwnerModels.includes("open_to_all")) {
        if (fp?.ownerTypes?.length) {
          const overlap = prospectOwnerModels.some((m) => fp.ownerTypes!.includes(m));
          ownershipScore += overlap ? 4 : 0;
        } else {
          ownershipScore += 2; // no brand data, neutral
        }
      } else {
        ownershipScore += 2; // prospect has no preference
      }

      // 5b. Run from home (0–2 pts)
      const runFromHome = (prospect as any).runFromHome as string | undefined;
      if (runFromHome === "yes") {
        ownershipScore += fp?.canRunFromHome ? 2 : 0;
      } else if (runFromHome === "no") {
        ownershipScore += fp?.canRunFromHome === false || !fp?.canRunFromHome ? 2 : 1;
      } else {
        ownershipScore += 1; // open / not set
      }

      // 5c. Full/part time (0–2 pts)
      const fullTimePartTime = (prospect as any).fullTimePartTime as string | undefined;
      if (fullTimePartTime === "part_time" || fullTimePartTime === "start_part_transition") {
        ownershipScore += fp?.canRunPartTime ? 2 : 0;
      } else if (fullTimePartTime === "full_time") {
        ownershipScore += 2; // most franchises support full-time
      } else {
        ownershipScore += 1;
      }

      // 5d. Multi-unit interest (0–2 pts)
      const multiUnit = (prospect as any).multiUnitInterest as string | undefined;
      if (multiUnit && multiUnit !== "1") {
        ownershipScore += fp?.multiUnitAvailable ? 2 : 0;
      } else {
        ownershipScore += 1;
      }

      // ═══════════════════════════════════════════════════
      //  DIM 6: BRAND MATURITY FIT (0–5 pts)
      // ═══════════════════════════════════════════════════
      let maturityScore = 0;
      const maturityPref = (prospect as any).brandMaturity as string | undefined;
      if (maturityPref && maturityPref !== "no_preference") {
        const actual = getBrandMaturity(fp);
        if (actual === maturityPref) maturityScore = 5;
        else if (
          (maturityPref === "growth" && (actual === "emerging" || actual === "established")) ||
          (maturityPref === "emerging" && actual === "growth") ||
          (maturityPref === "established" && actual === "growth")
        ) maturityScore = 2; // adjacent stage
      } else {
        maturityScore = 3; // no preference = neutral
      }

      // ═══════════════════════════════════════════════════
      //  DIM 7: SUPPORT ALIGNMENT (0–5 pts)
      // ═══════════════════════════════════════════════════
      let supportScore = 0;
      const supportImp = (prospect as any).supportImportance as string | undefined;
      const supportPriorities = (prospect as any).supportPriorities as string[] | undefined;

      // 7a. Support importance vs brand data (0–2 pts)
      if (supportImp === "critical") {
        // Brands with more training / support data score higher
        const hasStrongSupport = (fp?.trainingWeeks ?? 0) >= 2 || (fp?.ongoingSupport?.length ?? 0) >= 3;
        supportScore += hasStrongSupport ? 2 : 0;
      } else if (supportImp === "minimal") {
        supportScore += 2; // minimal = any brand works
      } else {
        supportScore += 1;
      }

      // 7b. Priority overlap (0–3 pts)
      if (supportPriorities?.length && !supportPriorities.includes("all")) {
        const brandSupports = [...(fp?.ongoingSupport ?? []), ...(fp?.marketingSupport ?? [])].map((s: string) => s.toLowerCase());
        let matches = 0;
        for (const p of supportPriorities) {
          if (brandSupports.some((s: string) => s.includes(p) || p.includes(s))) matches++;
        }
        if (matches >= 2) supportScore += 3;
        else if (matches >= 1) supportScore += 2;
        else if (brandSupports.length === 0) supportScore += 1; // no data
      } else {
        supportScore += 2; // no priorities or "all"
      }

      // ═══════════════════════════════════════════════════
      //  DIM 8: LIFESTYLE & SPACE FIT (0–7 pts)
      //  Employee comfort + space preference + avoid list
      // ═══════════════════════════════════════════════════
      let lifestyleScore = 0;

      // 8a. Employee comfort (0–2 pts)
      const empComfort = (prospect as any).employeeComfort as string | undefined;
      if (empComfort && empComfort !== "no_preference" && empComfort !== "hire_manager") {
        const comfortRange = employeeRangeForComfort(empComfort);
        const brandEmpCount = parseEmployeeCount(fp?.employeesRequired ?? undefined);
        if (brandEmpCount !== null) {
          if (brandEmpCount >= comfortRange.min && brandEmpCount <= comfortRange.max) lifestyleScore += 2;
          else if (Math.abs(brandEmpCount - (comfortRange.min + comfortRange.max) / 2) < 5) lifestyleScore += 1;
        } else {
          lifestyleScore += 1; // no brand data
        }
      } else {
        lifestyleScore += 1;
      }

      // 8b. Space preference (0–2 pts)
      const spacePref = (prospect as any).spacePreference as string | undefined;
      if (spacePref && spacePref !== "no_preference") {
        const isHomeBased = fp?.canRunFromHome;
        const footprint = fp?.minFootprint?.toLowerCase() ?? "";
        if (spacePref === "home_mobile") {
          lifestyleScore += isHomeBased ? 2 : 0;
        } else if (spacePref === "small_retail") {
          lifestyleScore += (footprint.includes("1") || footprint.includes("2") || !footprint) ? 2 : 1;
        } else if (spacePref === "standard_retail") {
          lifestyleScore += (!isHomeBased || !footprint) ? 2 : 1;
        } else if (spacePref === "large_format") {
          lifestyleScore += footprint.includes("10") || footprint.includes("15") || footprint.includes("20") ? 2 : 1;
        }
      } else {
        lifestyleScore += 1;
      }

      // 8c. Avoid list penalties (0 to –3 pts)
      const avoidItems = (prospect as any).avoidList as string[] | undefined;
      if (avoidItems?.length) {
        for (const avoid of avoidItems) {
          switch (avoid) {
            case "nights_weekends":
              // Food brands often require nights/weekends
              if (brand.category?.toLowerCase().includes("food")) lifestyleScore -= 1;
              break;
            case "heavy_buildout":
              if ((fp?.totalInvestmentMax ?? 0) > 500_000) lifestyleScore -= 1;
              break;
            case "large_teams":
              if (parseEmployeeCount(fp?.employeesRequired ?? undefined) !== null &&
                  (parseEmployeeCount(fp?.employeesRequired ?? undefined) ?? 0) > 15) lifestyleScore -= 1;
              break;
            case "perishable_inventory":
              if (brand.category?.toLowerCase().includes("food")) lifestyleScore -= 1;
              break;
            case "cold_calling":
              // Service / home-service franchises often involve outbound sales
              if (brand.category?.toLowerCase().includes("service")) lifestyleScore -= 0.5;
              break;
          }
        }
      }
      lifestyleScore = Math.max(0, lifestyleScore) + 3; // baseline +3 for everyone
      lifestyleScore = Math.min(7, lifestyleScore);

      // ═══════════════════════════════════════════════════
      //  DIM 9: PSYCHOGRAPHIC RESONANCE (0–5 pts)
      //  Motivations + risk tolerance + professional background
      // ═══════════════════════════════════════════════════
      let psychographicScore = 0;

      // 9a. Risk tolerance (0–2 pts)
      const riskTol = (prospect as any).riskTolerance as string | undefined;
      if (riskTol) {
        const maturity = getBrandMaturity(fp);
        if (riskTol === "conservative" && maturity === "established") psychographicScore += 2;
        else if (riskTol === "conservative" && maturity === "growth") psychographicScore += 1;
        else if (riskTol === "moderate" && (maturity === "growth" || maturity === "established")) psychographicScore += 2;
        else if (riskTol === "aggressive" && maturity === "emerging") psychographicScore += 2;
        else if (riskTol === "aggressive" && maturity === "growth") psychographicScore += 1;
      } else {
        psychographicScore += 1;
      }

      // 9b. Motivations alignment (0–2 pts)
      const motivations = (prospect as any).motivations as string[] | undefined;
      if (motivations?.length) {
        let motBonus = 0;
        if (motivations.includes("financial_freedom") || motivations.includes("high_earning")) {
          if ((fp?.avgUnitRevenue ?? 0) > 1_000_000 || (fp?.investmentReturnRatio ?? 0) > 2) motBonus++;
        }
        if (motivations.includes("lifestyle") || motivations.includes("be_my_own_boss")) {
          if (fp?.canRunPartTime || fp?.absenteeOwnership) motBonus++;
        }
        if (motivations.includes("community")) {
          if (brand.category?.match(/education|health|fitness/i)) motBonus++;
        }
        if (motivations.includes("passion")) {
          // Category match already covers this — small bonus
          motBonus += 0.5;
        }
        psychographicScore += Math.min(2, motBonus);
      }

      // 9c. Professional background (0–1 pt)
      const profBg = (prospect as any).professionalBackground as string[] | undefined;
      if (profBg?.length) {
        if (profBg.includes("hospitality") && brand.category?.toLowerCase().includes("food")) psychographicScore += 1;
        else if (profBg.includes("healthcare") && brand.category?.match(/health|fitness/i)) psychographicScore += 1;
        else if (profBg.includes("trades") && brand.category?.toLowerCase().includes("service")) psychographicScore += 1;
        else if (profBg.includes("sales")) psychographicScore += 0.5; // sales background is versatile
      }
      psychographicScore = Math.min(5, psychographicScore);

      // ═══════════════════════════════════════════════════
      //  DIM 10: VETERAN BONUS (0–3 pts)
      // ═══════════════════════════════════════════════════
      let veteranBonus = 0;
      const isVeteran = (prospect as any).veteranStatus as boolean | undefined;
      if (isVeteran === true) {
        if (fp?.veteranDiscount) veteranBonus = 3;
        else veteranBonus = 0; // no penalty, just no bonus
      }

      // ═══════════════════════════════════════════════════
      //  DIM 11: BRAND DATA QUALITY (0–3 pts)
      // ═══════════════════════════════════════════════════
      const filled = profileCompleteness(fp);
      let completenessScore = 0;
      if (filled >= 11) completenessScore = 3;
      else if (filled >= 8) completenessScore = 2;
      else if (filled >= 5) completenessScore = 1;

      // ═══════════════════════════════════════════════════
      //  FINAL SCORE (0–100)
      // ═══════════════════════════════════════════════════
      const totalAvailable = openTerritories.length;
      const rawScore = locationScore + capitalFit + roiScore + categoryMatch +
                       ownershipScore + maturityScore + supportScore + lifestyleScore +
                       psychographicScore + veteranBonus + completenessScore + mustHavePenalty;
      const score = Math.max(0, Math.min(100, Math.round(rawScore)));

      if (score >= 8) {
        const displayTerrs = nearbyTerritories
          .map((t) => ({ ...t, distance: t.distance === -1 ? 0 : t.distance }))
          .slice(0, 5);

        results.push({
          brand,
          franchiseProfile: fp,
          score,
          breakdown: {
            locationScore,
            capitalFit,
            roiScore,
            categoryMatch,
            completenessScore,
            ownershipScore,
            mustHavePenalty,
            maturityScore,
            supportScore,
            lifestyleScore,
            psychographicScore,
            veteranBonus,
          },
          nearbyTerritories: displayTerrs,
          totalAvailable,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  },
});
