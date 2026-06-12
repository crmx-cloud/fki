import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { toStateCode } from "./constants";

/* ────────────────────────────────────────────────────────────
 * Shared constants — keep in sync with frontend
 * ──────────────────────────────────────────────────────────── */

export const LIQUID_CAPITAL_OPTIONS = [
  { label: "Under $50K", value: "under_50k", min: 0 },
  { label: "$50K – $100K", value: "50k_100k", min: 50_000 },
  { label: "$100K – $150K", value: "100k_150k", min: 100_000 },
  { label: "$150K – $250K", value: "150k_250k", min: 150_000 },
  { label: "$250K – $500K", value: "250k_500k", min: 250_000 },
  { label: "$500K – $1M", value: "500k_1m", min: 500_000 },
  { label: "$1M+", value: "1m_plus", min: 1_000_000 },
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
  { label: "Current/past franchise owner", value: "franchise_owner" },
  { label: "Multi-unit operator", value: "multi_unit" },
];

/* ────────────────────────────────────────────────────────────
 * Get prospect profile for current user
 * ──────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────────
 * Save / update prospect profile
 * ──────────────────────────────────────────────────────────── */
export const saveProfile = mutation({
  args: {
    // ── Contact Info ──
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    contactCity: v.optional(v.string()),
    contactState: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    // ── Financial ──
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
    // ── Tier 1: Hard Match ──
    totalInvestmentBudget: v.optional(v.string()),
    sbaFinancingIntent: v.optional(v.string()),
    ownershipModel: v.optional(v.array(v.string())),
    runFromHome: v.optional(v.string()),
    fullTimePartTime: v.optional(v.string()),
    multiUnitInterest: v.optional(v.string()),
    veteranStatus: v.optional(v.boolean()),
    revenueGoal: v.optional(v.string()),
    incomeGoal: v.optional(v.string()),
    // ── Tier 2: Soft Match ──
    mustHaveFilters: v.optional(v.array(v.string())),
    brandMaturity: v.optional(v.string()),
    supportImportance: v.optional(v.string()),
    supportPriorities: v.optional(v.array(v.string())),
    employeeComfort: v.optional(v.string()),
    spacePreference: v.optional(v.string()),
    // ── Tier 3: Psychographic ──
    motivations: v.optional(v.array(v.string())),
    riskTolerance: v.optional(v.string()),
    professionalBackground: v.optional(v.array(v.string())),
    lifestylePriorities: v.optional(v.array(v.string())),
    avoidList: v.optional(v.array(v.string())),
    // ── Source attribution (captured client-side, see src/lib/attribution.ts) ──
    attribution: v.optional(
      v.object({
        utmSource: v.optional(v.string()),
        utmMedium: v.optional(v.string()),
        utmCampaign: v.optional(v.string()),
        utmContent: v.optional(v.string()),
        utmTerm: v.optional(v.string()),
        referrer: v.optional(v.string()),
        landingPage: v.optional(v.string()),
        firstTouchAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    const email = user?.email || undefined;

    let existing = await ctx.db
      .query("prospectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // DEDUPE GUARD: no profile under this userId, but one already exists for
    // this email (created via lead import / an earlier session) → claim it
    // instead of inserting a duplicate. Never steal another user's profile.
    if (!existing && email) {
      const byEmail = await ctx.db
        .query("prospectProfiles")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect();
      const claimable = byEmail.find((p) => !p.userId || p.userId === userId);
      if (claimable) {
        await ctx.db.patch(claimable._id, { userId });
        existing = { ...claimable, userId };
      }
    }

    // Separate contact fields → store as schema fields (not nested under "args" prefix)
    const { contactCity, contactState, attribution, ...restArgs } = args;

    // First-touch attribution is write-once; last touch always updates
    const attributionFields: Record<string, any> = {};
    if (attribution) {
      attributionFields.lastTouchAt = Date.now();
      if (!existing?.firstTouchAt) {
        for (const k of [
          "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm",
          "referrer", "landingPage",
        ] as const) {
          if (attribution[k] !== undefined) attributionFields[k] = attribution[k];
        }
        attributionFields.firstTouchAt = attribution.firstTouchAt ?? Date.now();
      }
    }
    const contactFields: Record<string, any> = {};
    if (args.firstName !== undefined) contactFields.firstName = args.firstName;
    if (args.lastName !== undefined) contactFields.lastName = args.lastName;
    if (args.phone !== undefined) contactFields.phone = args.phone;
    if (args.address !== undefined) contactFields.address = args.address;
    if (contactCity !== undefined) contactFields.city = contactCity;
    if (contactState !== undefined) contactFields.state = contactState;
    if (args.zipCode !== undefined) contactFields.zipCode = args.zipCode;

    // Check if prospect is editing contact info that was admin-verified
    const contactChanged = Object.keys(contactFields).length > 0;
    const auditFields: Record<string, any> = {};
    if (contactChanged) {
      auditFields.contactLastEditedBy = "prospect";
      auditFields.contactLastEditedAt = Date.now();
      // If admin previously verified, flag the modification
      if (existing?.adminVerified) {
        auditFields.prospectModifiedAfterVerify = true;
      }
    }

    // Determine profile completeness
    const profileComplete = !!(
      args.liquidCapital &&
      args.ownerType &&
      args.preferredCategories?.length &&
      args.primaryCity &&
      args.primaryState
    );

    // Enhanced profile = at least 5 of the 15 enhanced fields filled
    const enhancedFields = [
      args.totalInvestmentBudget,
      args.sbaFinancingIntent,
      args.ownershipModel?.length,
      args.runFromHome,
      args.fullTimePartTime,
      args.multiUnitInterest,
      args.veteranStatus,
      args.revenueGoal,
      args.incomeGoal,
      args.mustHaveFilters?.length,
      args.brandMaturity,
      args.supportImportance,
      args.motivations?.length,
      args.riskTolerance,
      args.avoidList?.length,
    ].filter(Boolean).length;

    const enhancedProfileComplete = !!(profileComplete && enhancedFields >= 5);

    // Build the data payload (strip contactCity/contactState, add city/state)
    const { firstName: _fn, lastName: _ln, phone: _ph, address: _addr, zipCode: _zc, ...matchingArgs } = restArgs;
    const data = {
      ...matchingArgs,
      ...contactFields,
      ...auditFields,
      ...attributionFields,
      email,
      profileComplete,
      enhancedProfileComplete,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      await ctx.db.insert("activityEvents", {
        userId, email: email?.toLowerCase(), eventType: "profile_updated", ts: Date.now(),
      });
      // Keep the consultant's AI brief in sync with the latest profile
      await ctx.scheduler.runAfter(0, internal.prospectBrief.generateForUser, { userId });
      // Self-heal: merge any duplicate rows sharing this email/phone
      await ctx.scheduler.runAfter(0, internal.dedupe.dedupeForKey, { email, phone: args.phone });
      return existing._id;
    } else {
      const profileId = await ctx.db.insert("prospectProfiles", {
        userId,
        ...data,
      });
      await ctx.db.insert("activityEvents", {
        userId, email: email?.toLowerCase(), eventType: "profile_created", ts: Date.now(),
        source: attributionFields.utmSource, campaign: attributionFields.utmCampaign,
      });

      // New prospect signup = new lead → sync to CRMX (fail-soft)
      const user = await ctx.db.get(userId);
      await ctx.scheduler.runAfter(0, internal.crmxPush.pushLeadToCRMX, {
        firstName: args.firstName ?? (user as any)?.name?.split(" ")[0] ?? "Unknown",
        lastName: args.lastName ?? (user as any)?.name?.split(" ").slice(1).join(" "),
        email: (user as any)?.email,
        phone: args.phone,
        territory: args.primaryCity
          ? `${args.primaryCity}, ${args.primaryState ?? ""}`.trim()
          : args.primaryState,
        liquidCapital: args.liquidCapital,
        leadKind: "prospect_signup",
        notes: args.timeline ? `Timeline: ${args.timeline}` : undefined,
      });
      await ctx.scheduler.runAfter(0, internal.prospectBrief.generateForUser, { userId });
      // Self-heal: merge any duplicate rows sharing this email/phone
      await ctx.scheduler.runAfter(0, internal.dedupe.dedupeForKey, { email, phone: args.phone });

      return profileId;
    }
  },
});

/* ════════════════════════════════════════════════════════════
 * PerfectFit™ v3 Matching Engine — 21 Dimensions
 *
 * Uses ALL prospect profile fields (basic + Tier 1/2/3)
 * matched against franchise profile + territory data.
 *
 * Scoring: 0-100 with must-have knockout filters
 * ════════════════════════════════════════════════════════════ */

/** Haversine distance in miles */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Map liquid capital string → numeric midpoint value */
function capitalToNumber(value: string | undefined): number {
  const map: Record<string, number> = {
    under_50k: 25_000,
    "50k_100k": 75_000,
    "100k_150k": 125_000,
    "150k_250k": 200_000,
    "250k_500k": 375_000,
    "500k_1m": 750_000,
    "1m_plus": 1_500_000,
  };
  return map[value || ""] || 0;
}

/** Map total investment budget string → numeric midpoint */
function investBudgetToNumber(value: string | undefined): number {
  const map: Record<string, number> = {
    "under_100k": 75_000,
    "100k_250k": 175_000,
    "250k_500k": 375_000,
    "500k_1m": 750_000,
    "1m_plus": 1_500_000,
  };
  return map[value || ""] || 0;
}

/** Map revenue goal string → numeric threshold */
function revenueGoalToNumber(value: string | undefined): number {
  const map: Record<string, number> = {
    "under_500k": 250_000,
    "500k_1m": 750_000,
    "1m_2m": 1_500_000,
    "2m_plus": 2_500_000,
  };
  return map[value || ""] || 0;
}

/** Map income goal string → numeric threshold */
function incomeGoalToNumber(value: string | undefined): number {
  const map: Record<string, number> = {
    "50k_100k": 75_000,
    "100k_200k": 150_000,
    "200k_500k": 350_000,
    "500k_plus": 600_000,
    "equity": 0, // equity builders don't filter on income
  };
  return map[value || ""] || 0;
}

/** Parse employee comfort → numeric range */
function employeeComfortToRange(value: string | undefined): { min: number; max: number } | null {
  const map: Record<string, { min: number; max: number }> = {
    solo: { min: 0, max: 1 },
    small_1_5: { min: 1, max: 5 },
    medium_5_15: { min: 5, max: 15 },
    large_15_plus: { min: 15, max: 999 },
    hire_manager: { min: 0, max: 999 }, // flexible
  };
  return map[value || ""] || null;
}

/** Parse franchise employeesRequired string "3-5" → midpoint */
function parseEmployeeRange(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) return (parseInt(match[1]) + parseInt(match[2])) / 2;
  const single = parseInt(value);
  return isNaN(single) ? 0 : single;
}

/* ────────────────────────────────────────────────────────────
 * Brand profile completeness — expanded fields list
 * ──────────────────────────────────────────────────────────── */
const COMPLETENESS_FIELDS: string[] = [
  "brandStory", "avgUnitRevenue", "totalUnits", "yearFounded", "franchiseFee",
  "royaltyPercent", "liquidCapitalMin", "ownerTypes", "sellingPoints",
  "trainingWeeks", "fddAvailable", "item19Available", "model",
  "absenteeOwnership", "canRunFromHome", "employeesRequired",
  "ongoingSupport", "marketingSupport",
];

function brandCompleteness(fp: any | undefined): number {
  if (!fp) return 0;
  let filled = 0;
  for (const field of COMPLETENESS_FIELDS) {
    const val = (fp as any)[field];
    if (val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)) {
      filled++;
    }
  }
  return filled;
}

/* ────────────────────────────────────────────────────────────
 * Find nearby territories using Haversine or state fallback
 * ──────────────────────────────────────────────────────────── */
function findNearbyTerritories(
  territories: { city: string; state: string; status: string; latitude?: number; longitude?: number }[],
  lat: number | undefined,
  lng: number | undefined,
  state: string | undefined,
  radius: number,
): { city: string; state: string; status: string; distance: number }[] {
  const results: { city: string; state: string; status: string; distance: number }[] = [];
  for (const t of territories) {
    if (lat && lng && t.latitude && t.longitude) {
      const dist = haversineDistance(lat, lng, t.latitude, t.longitude);
      if (dist <= radius) {
        results.push({ city: t.city, state: t.state, status: t.status, distance: Math.round(dist) });
      }
    } else if (state && t.state && t.state.toLowerCase() === state.toLowerCase()) {
      results.push({ city: t.city, state: t.state, status: t.status, distance: -1 });
    }
  }
  return results;
}

/* ────────────────────────────────────────────────────────────
 * Prospect profile scoring dimensions tracker
 * (returned so UI can show "X/Y dimensions active")
 * ──────────────────────────────────────────────────────────── */
interface DimensionInfo {
  name: string;
  active: boolean;       // prospect has data for this dimension
  maxPoints: number;
  earnedPoints: number;
  unlockHint?: string;   // what to fill to activate this
}

/** Canonicalize ownership-style strings from any surface to one enum. */
function canonicalizeOwnerType(s: string): string {
  const n = s.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (n.includes("semi")) return "semi_absentee";
  if (n.includes("absentee") || n.includes("executive")) return "absentee";
  if (n.includes("investor") || n.includes("multi")) return "investor";
  return "owner_operator";
}

/** Robust category matching — accepts profile enums ("food_bev"), quiz values
 * ("Food & Beverage"), or anything close, against DB category names. The old
 * substring check silently NEVER matched food_bev / health_fitness /
 * beauty_selfcare, zeroing the category dimension for most users. */
function categoryMatches(pref: string, brandCategory: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/_/g, " ").replace(/&/g, " ").replace(/\s+/g, " ").trim();
  const p = norm(pref);
  const b = norm(brandCategory);
  if (b === p || b.includes(p) || p.includes(b)) return true;
  const ALIASES: Record<string, string[]> = {
    "food bev": ["food beverage"],
    "health fitness": ["health wellness", "fitness"],
    "beauty selfcare": ["beauty self care"],
    education: ["education children"],
  };
  return (ALIASES[p] || []).some((alias) => b.includes(alias) || alias.includes(b));
}

/* ════════════════════════════════════════════════════════════
 * THE PerfectFit scoring engine — single source of truth.
 *
 * Every surface that shows a match score (dashboard, brand page,
 * dossier, quiz) MUST get it from this function. Never fork it.
 *
 * Dimension weights (max 100 before knockouts):
 *   1. Location / state availability ... 22
 *   2. Financial fit ................... 18
 *   3. Revenue & income goals .......... 10
 *   4. Category match ..................  8
 *   5. Ownership compatibility ......... 10
 *   6. Brand maturity ..................  5
 *   7. Support alignment ...............  5
 *   8. Lifestyle & space ...............  7
 *   9. Psychographic fit ...............  5
 *  10. Veteran bonus ...................  3
 *  11. Brand data quality ..............  3
 *   + multi-unit bonus 2 · knockout filters hard-zero
 * Missing data scores NEUTRAL (partial credit), never full credit —
 * verified brands with real numbers should outrank empty profiles.
 * ════════════════════════════════════════════════════════════ */
export function scoreBrandForProspect(opts: {
  prospect: any;
  brand: any;
  fp: any;
  brandTerritories: any[];
  saMap: Map<string, Map<string, string>>;
  /** Quiz flow passes a raw dollar budget instead of a profile enum */
  capitalOverride?: number;
}): any | null {
  const { prospect, brand, fp, brandTerritories, saMap, capitalOverride } = opts;
  const prospectCapital = Math.max(capitalToNumber(prospect.liquidCapital), capitalOverride ?? 0);
  const prospectInvestBudget = investBudgetToNumber(prospect.totalInvestmentBudget);
  const prospectRevenueGoal = revenueGoalToNumber(prospect.revenueGoal);
  const prospectIncomeGoal = incomeGoalToNumber(prospect.incomeGoal);
  // Profiles store full state names ("Florida"); availability stores codes ("FL").
  // Contact state included — users update "my state" and expect matches to follow.
  const stateEntries = [prospect.primaryState, prospect.secondaryState, prospect.state]
    .map((s: string | undefined) => ({ code: toStateCode(s), label: s as string }))
    .filter((e: any): e is { code: string; label: string } => !!e.code)
    .filter((e: any, i: number, arr: any[]) => arr.findIndex((x) => x.code === e.code) === i);

  const openStatuses = ["available", "high_interest", "pending_award"];
  const openTerritories = brandTerritories.filter((t) => openStatuses.includes(t.status));

  let score = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // ═══════════════════════════════════════════════════════
  //  0. MUST-HAVE KNOCKOUT FILTERS (hard disqualify)
  // ═══════════════════════════════════════════════════════
  let knockedOut = false;
  const knockoutReasons: string[] = [];

  if (prospect.mustHaveFilters?.length) {
    for (const filter of prospect.mustHaveFilters) {
      let passes = true;
      switch (filter) {
        case "item19":
          if (fp && fp.item19Available === false) passes = false;
          // If no data, don't penalize — brand may not have filled it yet
          if (!passes) knockoutReasons.push("No Item 19 financial data");
          break;
        case "fdd":
          if (fp && fp.fddAvailable === false) passes = false;
          if (!passes) knockoutReasons.push("No FDD available");
          break;
        case "sba":
          if (fp && fp.sbaApproved === false) passes = false;
          if (!passes) knockoutReasons.push("Not SBA approved");
          break;
        case "exclusive_territory":
          if (fp && fp.exclusiveTerritories === false && fp.territoryExclusivity === false) passes = false;
          if (!passes) knockoutReasons.push("No exclusive territories");
          break;
        case "veteran_discount":
          if (fp && fp.veteranDiscount === false) passes = false;
          if (!passes) knockoutReasons.push("No veteran discount");
          break;
        case "multi_unit":
          if (fp && fp.multiUnitAvailable === false) passes = false;
          if (!passes) knockoutReasons.push("No multi-unit option");
          break;
      }
      if (!passes) knockedOut = true;
    }
  }

  // If knocked out, still include with 0 score so UI can show "why not"
  if (knockedOut) {
    return ({
      brandId: brand._id,
      brandName: brand.name,
      brandSlug: brand.slug,
      brandCategory: brand.category,
      brandDescription: brand.description,
      logoUrl: brand.logoUrl,
      investmentMin: brand.investmentMin,
      investmentMax: brand.investmentMax,
      matchScore: 0,
      matchReasons: [],
      matchWarnings: knockoutReasons,
      nearbyTerritories: [],
      knockedOut: true,
      knockoutReasons,
    });
  }

  // ═══════════════════════════════════════════════════════
  //  1. LOCATION PROXIMITY (0–22 pts)
  // ═══════════════════════════════════════════════════════
  let nearbyTerrs: { city: string; state: string; status: string; distance: number }[] = [];
  let locationScore = 0;

  const primaryRadius = prospect.primaryRadius || 50;
  const primaryNearby = findNearbyTerritories(
    openTerritories,
    prospect.primaryLat, prospect.primaryLng,
    prospect.primaryState,
    primaryRadius,
  );

  const secondaryRadius = prospect.secondaryRadius || 50;
  const secondaryNearby = findNearbyTerritories(
    openTerritories,
    prospect.secondaryLat, prospect.secondaryLng,
    prospect.secondaryState,
    secondaryRadius,
  );

  const seenKeys = new Set<string>();
  for (const t of [...primaryNearby, ...secondaryNearby]) {
    const key = `${t.city}|${t.state}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      nearbyTerrs.push(t);
    }
  }

  nearbyTerrs.sort((a, b) => {
    if (a.distance === -1 && b.distance !== -1) return 1;
    if (b.distance === -1 && a.distance !== -1) return -1;
    return a.distance - b.distance;
  });

  const haversineMatches = nearbyTerrs.filter((t) => t.distance >= 0);
  const stateOnlyMatches = nearbyTerrs.filter((t) => t.distance === -1);
  const closestDist = haversineMatches.length > 0 ? haversineMatches[0].distance : Infinity;

  if (haversineMatches.length > 0) {
    if (closestDist < 10) locationScore = 22;
    else if (closestDist < 25) locationScore = 19;
    else if (closestDist < 50) locationScore = 16;
    else if (closestDist < 100) locationScore = 12;
    else locationScore = 8;
    locationScore = Math.min(22, locationScore + Math.min(3, haversineMatches.length - 1));
    const count = haversineMatches.length;
    reasons.push(
      `${count} territor${count === 1 ? "y" : "ies"} within ${primaryRadius} mi` +
      (closestDist > 0 ? ` (closest: ${closestDist} mi)` : "")
    );
  } else if (stateOnlyMatches.length > 0) {
    locationScore = 6;
    reasons.push(`${stateOnlyMatches.length} territories in ${prospect.primaryState || prospect.secondaryState}`);
  }

  // State-level availability — the real unit of franchise availability.
  // Applies even when a brand has no city-level territory pins.
  let availableInYourState = haversineMatches.length > 0 || stateOnlyMatches.length > 0;
  if (!availableInYourState && stateEntries.length > 0) {
    const sa = saMap.get(brand._id.toString());
    // Name the state that ACTUALLY matched in the reason chip — never claim
    // one state when availability came from another.
    const openHit = stateEntries.find((e) => sa?.get(e.code) === "open");
    const registeredHit = stateEntries.find((e) => sa?.get(e.code) === "registered");
    if (openHit) {
      availableInYourState = true;
      locationScore = Math.max(locationScore, 16);
      reasons.push(`Actively franchising in ${openHit.label}`);
    } else if (registeredHit) {
      availableInYourState = true;
      locationScore = Math.max(locationScore, 8);
      reasons.push(`Registered to sell franchises in ${registeredHit.label}`);
    } else if (sa && sa.size > 0 && stateEntries.every((e) => sa.get(e.code) === "closed")) {
      locationScore = 0;
      warnings.push(`Not currently available in ${stateEntries[0].label}`);
    } else if (locationScore === 0 && openTerritories.length > 0) {
      locationScore = 2; // legacy fallback — territory pins exist somewhere
    }
  } else if (!availableInYourState && locationScore === 0 && openTerritories.length > 0) {
    locationScore = 2;
  }

  score += locationScore;

  // ═══════════════════════════════════════════════════════
  //  2. FINANCIAL FIT (0–18 pts)
  //  Uses BOTH liquidCapital AND totalInvestmentBudget
  // ═══════════════════════════════════════════════════════
  const investMin = fp?.totalInvestmentMin ?? brand.investmentMin ?? 0;
  const investMax = fp?.totalInvestmentMax ?? brand.investmentMax ?? investMin;
  const liquidCapMin = fp?.liquidCapitalMin ?? 0;
  let financialScore = 0;

  // Sub-score A: Liquid capital vs requirement (0-10)
  const effectiveCapital = Math.max(prospectCapital, prospectInvestBudget);
  if (investMin === 0 && liquidCapMin === 0) {
    financialScore += 6; // neutral — no data to compare
  } else {
    const capRequired = liquidCapMin || investMin;
    if (effectiveCapital >= capRequired * 1.5) {
      financialScore += 10;
      reasons.push("Comfortable budget for this brand");
    } else if (effectiveCapital >= capRequired) {
      financialScore += 8;
      reasons.push("Budget meets minimum investment");
    } else if (effectiveCapital >= capRequired * 0.8) {
      financialScore += 5;
      warnings.push("Budget close to minimum investment");
    } else if (effectiveCapital >= capRequired * 0.6) {
      financialScore += 2;
      warnings.push("May need financing for this brand");
    }
  }

  // Sub-score B: SBA financing alignment (0-4)
  if (prospect.sbaFinancingIntent === "yes" && fp?.sbaApproved) {
    financialScore += 4;
    reasons.push("SBA approved — matches your financing plan");
  } else if (prospect.sbaFinancingIntent === "yes" && fp && !fp.sbaApproved) {
    financialScore += 0;
    warnings.push("Not SBA approved — you may need alternative financing");
  } else if (prospect.sbaFinancingIntent === "maybe" && fp?.sbaApproved) {
    financialScore += 2;
  } else {
    financialScore += 2; // neutral
  }

  // Sub-score C: Total investment budget alignment (0-4)
  if (prospectInvestBudget > 0 && investMin > 0) {
    if (prospectInvestBudget >= investMin && prospectInvestBudget <= investMax * 1.3) {
      financialScore += 4;
    } else if (prospectInvestBudget >= investMin * 0.7) {
      financialScore += 2;
    }
  } else {
    financialScore += 2; // neutral
  }

  score += Math.min(18, financialScore);

  // ═══════════════════════════════════════════════════════
  //  3. REVENUE & INCOME GOALS (0–10 pts)
  // ═══════════════════════════════════════════════════════
  let revenueScore = 0;
  const auv = fp?.avgUnitRevenue || (fp?.item19Revenue as any)?.average || 0;

  // Revenue goal alignment (0-5)
  if (prospectRevenueGoal > 0 && auv > 0) {
    if (auv >= prospectRevenueGoal) {
      revenueScore += 5;
      reasons.push(`AUV $${Math.round(auv / 1000)}K meets your revenue goal`);
    } else if (auv >= prospectRevenueGoal * 0.7) {
      revenueScore += 3;
    } else {
      revenueScore += 1;
    }
  } else if (auv > 0) {
    // No revenue goal set — still credit strong AUV
    if (auv > 1_000_000) revenueScore += 4;
    else if (auv > 500_000) revenueScore += 3;
    else if (auv > 250_000) revenueScore += 2;
    else revenueScore += 1;
  }

  // Income goal alignment (0-3) — using estimated profit margin
  const estMargin = (fp?.item19Profit as any)?.estimatedMargin;
  const estIncome = (fp?.item19Profit as any)?.estimatedAverage;
  if (prospectIncomeGoal > 0 && prospect.incomeGoal !== "equity") {
    if (estIncome && estIncome >= prospectIncomeGoal) {
      revenueScore += 3;
      reasons.push("Projected income aligns with your goal");
    } else if (estIncome && estIncome >= prospectIncomeGoal * 0.7) {
      revenueScore += 2;
    } else if (auv > 0 && estMargin) {
      const projIncome = auv * (estMargin / 100);
      if (projIncome >= prospectIncomeGoal) revenueScore += 2;
      else revenueScore += 1;
    }
  } else if (prospect.incomeGoal === "equity") {
    // Equity builders care about growth, not income
    if (fp?.isGrowing) revenueScore += 2;
    if (fp?.multiUnitAvailable) revenueScore += 1;
  }

  // ROI ratio bonus (0-2)
  if (fp?.investmentReturnRatio) {
    if (fp.investmentReturnRatio > 3) revenueScore += 2;
    else if (fp.investmentReturnRatio > 2) revenueScore += 1;
  }

  score += Math.min(10, revenueScore);

  // ═══════════════════════════════════════════════════════
  //  4. CATEGORY MATCH (0–8 pts)
  // ═══════════════════════════════════════════════════════
  let categoryScore = 0;
  if (prospect.preferredCategories?.length && brand.category) {
    const matchCat = prospect.preferredCategories.some((c: string) =>
      categoryMatches(c, brand.category)
    );
    if (matchCat) {
      categoryScore = 8;
      reasons.push(`Matches your ${brand.category} interest`);
    }
  } else if (!prospect.preferredCategories?.length) {
    categoryScore = 4; // no preference = neutral
  }
  score += categoryScore;

  // ═══════════════════════════════════════════════════════
  //  5. OWNERSHIP COMPATIBILITY (0–10 pts)
  //  Uses ownershipModel[], runFromHome, fullTimePartTime
  // ═══════════════════════════════════════════════════════
  let ownerScore = 0;

  // Ownership model match (0-5)
  const prospectOwnerModels = prospect.ownershipModel?.length
    ? prospect.ownershipModel
    : prospect.ownerType ? [prospect.ownerType] : [];

  if (prospectOwnerModels.length > 0 && fp?.ownerTypes?.length) {
    // Canonicalize both sides — profiles use "owner_operator", the quiz uses
    // "owner-operator", and brand data has strings like "multi-unit operator".
    const fpCanon = (fp.ownerTypes as string[]).map(canonicalizeOwnerType);
    const overlap = prospectOwnerModels.filter((m: string) =>
      fpCanon.includes(canonicalizeOwnerType(m))
    );
    if (overlap.length > 0) {
      ownerScore += 5;
      reasons.push("Supports your ownership style");
    } else {
      // No overlap — significant mismatch
      warnings.push("Ownership model may not align");
    }
  } else if (prospectOwnerModels.length > 0 && !fp?.ownerTypes?.length) {
    ownerScore += 2; // brand hasn't specified — neutral
  } else {
    ownerScore += 3; // prospect hasn't specified — neutral
  }

  // Run from home match (0-2)
  if (prospect.runFromHome === "yes" && fp) {
    if (fp.canRunFromHome === true) {
      ownerScore += 2;
      reasons.push("Can run from home");
    } else if (fp.canRunFromHome === false) {
      ownerScore += 0;
      warnings.push("Requires dedicated location — not home-based");
    } else {
      ownerScore += 1; // unknown
    }
  } else if (prospect.runFromHome === "no") {
    ownerScore += 2; // no preference = full credit
  } else {
    ownerScore += 1; // "open" or unset
  }

  // Full-time / part-time match (0-3)
  if (prospect.fullTimePartTime && fp) {
    if (prospect.fullTimePartTime === "part_time") {
      if (fp.canRunPartTime === true || fp.absenteeOwnership === true) {
        ownerScore += 3;
      } else if (fp.canRunPartTime === false) {
        ownerScore += 0;
        warnings.push("Requires full-time commitment");
      } else {
        ownerScore += 1;
      }
    } else if (prospect.fullTimePartTime === "start_part_transition") {
      ownerScore += 2; // flexible — most brands work
    } else {
      ownerScore += 3; // full_time — always compatible
    }
  } else {
    ownerScore += 2; // unset = neutral
  }

  score += Math.min(10, ownerScore);

  // ═══════════════════════════════════════════════════════
  //  6. BRAND MATURITY (0–5 pts)
  // ═══════════════════════════════════════════════════════
  let maturityScore = 0;
  const totalUnits = fp?.totalUnits || 0;
  const yearFounded = fp?.yearFounded || 0;
  const brandAge = yearFounded ? new Date().getFullYear() - yearFounded : 0;

  if (prospect.brandMaturity) {
    switch (prospect.brandMaturity) {
      case "emerging":
        if (totalUnits < 50 || brandAge < 5) maturityScore = 5;
        else if (totalUnits < 200) maturityScore = 3;
        else maturityScore = 1;
        break;
      case "growth":
        if (totalUnits >= 50 && totalUnits < 500) maturityScore = 5;
        else if (totalUnits >= 20 && totalUnits < 1000) maturityScore = 3;
        else maturityScore = 1;
        break;
      case "established":
        if (totalUnits >= 200 || brandAge >= 15) maturityScore = 5;
        else if (totalUnits >= 50 || brandAge >= 8) maturityScore = 3;
        else maturityScore = 1;
        break;
      default: // no_preference
        maturityScore = 3;
    }
  } else {
    maturityScore = 3; // unset = neutral
  }
  score += maturityScore;

  // ═══════════════════════════════════════════════════════
  //  7. SUPPORT ALIGNMENT (0–5 pts)
  // ═══════════════════════════════════════════════════════
  let supportScore = 0;

  if (prospect.supportImportance === "critical" || prospect.supportImportance === "important") {
    // Check training hours
    const totalTrainingHours = (fp?.classroomTrainingHours || 0) + (fp?.onTheJobTrainingHours || 0);
    if (totalTrainingHours > 100) supportScore += 1;
    if (fp?.trainingWeeks && fp.trainingWeeks >= 2) supportScore += 1;

    // Check support priorities overlap
    if (prospect.supportPriorities?.length && fp) {
      const brandSupport = [
        ...(fp.ongoingSupport || []),
        ...(fp.marketingSupport || []),
      ].map((s: string) => s.toLowerCase());

      let matchCount = 0;
      for (const prio of prospect.supportPriorities) {
        const prioLower = prio.toLowerCase();
        if (brandSupport.some((s: string) => s.includes(prioLower) || prioLower.includes(s))) {
          matchCount++;
        }
      }
      if (matchCount >= 2) { supportScore += 3; reasons.push("Strong support alignment"); }
      else if (matchCount >= 1) supportScore += 2;
    } else {
      supportScore += 2; // no data to compare — neutral
    }
  } else {
    supportScore = 3; // "minimal" or unset — neutral
  }
  score += Math.min(5, supportScore);

  // ═══════════════════════════════════════════════════════
  //  8. LIFESTYLE & SPACE (0–7 pts)
  //  Uses spacePreference, employeeComfort, avoidList
  // ═══════════════════════════════════════════════════════
  let lifestyleScore = 0;

  // Space preference (0-3)
  if (prospect.spacePreference && fp) {
    const isHome = fp.canRunFromHome === true;
    const footprint = fp.minFootprint || "";
    switch (prospect.spacePreference) {
      case "home_mobile":
        if (isHome) lifestyleScore += 3;
        else lifestyleScore += 0;
        break;
      case "small_retail":
        if (footprint && parseInt(footprint) < 2000) lifestyleScore += 3;
        else if (isHome) lifestyleScore += 1;
        else lifestyleScore += 2;
        break;
      case "standard_retail":
        lifestyleScore += 2; // most brands fit
        break;
      case "large_format":
        lifestyleScore += 2; // most brands fit
        break;
      default: // no_preference
        lifestyleScore += 2;
    }
  } else {
    lifestyleScore += 2; // unset = neutral
  }

  // Employee comfort (0-2)
  if (prospect.employeeComfort && prospect.employeeComfort !== "no_preference") {
    const comfortRange = employeeComfortToRange(prospect.employeeComfort);
    const brandEmployees = parseEmployeeRange(fp?.employeesRequired);
    if (comfortRange && brandEmployees > 0) {
      if (brandEmployees >= comfortRange.min && brandEmployees <= comfortRange.max) {
        lifestyleScore += 2;
      } else if (Math.abs(brandEmployees - (comfortRange.min + comfortRange.max) / 2) < 5) {
        lifestyleScore += 1;
      }
    } else {
      lifestyleScore += 1; // can't compare — neutral
    }
  } else {
    lifestyleScore += 1; // unset = neutral
  }

  // Avoid list penalties (0-2, negative = deductions)
  if (prospect.avoidList?.length) {
    let avoidPenalty = 0;
    for (const avoidItem of prospect.avoidList) {
      switch (avoidItem) {
        case "nights_weekends":
          // Food & Bev typically requires nights/weekends
          if (brand.category?.toLowerCase().includes("food") ||
              brand.category?.toLowerCase().includes("beverage")) {
            avoidPenalty++;
          }
          break;
        case "heavy_buildout": {
          const ft = fp?.minFootprint;
          if (investMin > 500_000 || (ft && parseInt(ft) > 3000)) {
            avoidPenalty++;
          }
        }
          break;
        case "large_teams":
          if (parseEmployeeRange(fp?.employeesRequired) > 15) {
            avoidPenalty++;
          }
          break;
        case "perishable_inventory":
          if (brand.category?.toLowerCase().includes("food") ||
              brand.category?.toLowerCase().includes("beverage")) {
            avoidPenalty++;
          }
          break;
        case "cold_calling":
          // Services/home services often involve outbound sales
          if (brand.category?.toLowerCase().includes("service")) {
            avoidPenalty++;
          }
          break;
      }
    }
    lifestyleScore += Math.max(0, 2 - avoidPenalty);
    if (avoidPenalty > 0) {
      warnings.push(`Potential lifestyle conflict (${avoidPenalty} avoid-list ${avoidPenalty === 1 ? "flag" : "flags"})`);
    }
  } else {
    lifestyleScore += 2; // no avoidances
  }

  score += Math.min(7, lifestyleScore);

  // ═══════════════════════════════════════════════════════
  //  9. PSYCHOGRAPHIC FIT (0–5 pts)
  //  Uses motivations, riskTolerance, professionalBackground
  // ═══════════════════════════════════════════════════════
  let psychScore = 0;

  // Risk tolerance (0-2)
  if (prospect.riskTolerance) {
    switch (prospect.riskTolerance) {
      case "conservative":
        // Conservative = prefer established, SBA, high retention
        if (totalUnits >= 100 || fp?.sbaApproved || brandAge >= 10) psychScore += 2;
        else if (totalUnits >= 30) psychScore += 1;
        break;
      case "moderate":
        psychScore += 2; // most brands work
        break;
      case "aggressive":
        // Aggressive = don't penalize emerging brands
        if (totalUnits < 100 && fp?.isGrowing) psychScore += 2;
        else psychScore += 1;
        break;
    }
  } else {
    psychScore += 1; // unset = neutral
  }

  // Motivations alignment (0-2)
  if (prospect.motivations?.length) {
    let motiveBonus = 0;
    for (const motive of prospect.motivations) {
      switch (motive) {
        case "financial_freedom":
        case "replace_income":
          if (auv > 500_000 || estIncome) motiveBonus++;
          break;
        case "be_my_own_boss":
          if (fp?.absenteeOwnership || fp?.canRunFromHome) motiveBonus++;
          break;
        case "legacy":
          if (fp?.multiUnitAvailable || totalUnits >= 50) motiveBonus++;
          break;
        case "community":
          // Service-oriented brands
          if (brand.category?.toLowerCase().includes("service") ||
              brand.category?.toLowerCase().includes("education") ||
              brand.category?.toLowerCase().includes("health")) motiveBonus++;
          break;
        case "lifestyle":
          if (fp?.canRunFromHome || fp?.canRunPartTime) motiveBonus++;
          break;
      }
    }
    psychScore += Math.min(2, motiveBonus);
  } else {
    psychScore += 1; // neutral
  }

  // Professional background affinity (0-1)
  if (prospect.professionalBackground?.length && brand.category) {
    const catLower = brand.category.toLowerCase();
    const bgMap: Record<string, string[]> = {
      sales: ["services", "home services"],
      management: ["food", "retail"],
      marketing: ["beauty", "health"],
      finance: ["services", "education"],
      healthcare: ["health", "wellness", "fitness"],
      real_estate: ["home services", "services"],
      technology: ["services", "education"],
      hospitality: ["food", "beverage"],
      military: ["services", "fitness", "home services"],
    };
    const hasAffinity = prospect.professionalBackground.some((bg: string) => {
      const affinities = bgMap[bg] || [];
      return affinities.some((a) => catLower.includes(a));
    });
    if (hasAffinity) psychScore += 1;
  }

  // Lifestyle priorities (0–1) — day-to-day "what matters most" alignment
  if (prospect.lifestylePriorities?.length) {
    let lifestyleHit = false;
    for (const pr of prospect.lifestylePriorities) {
      switch (pr) {
        case "flexibility":
          if (fp?.canRunFromHome || fp?.canRunPartTime || fp?.absenteeOwnership) lifestyleHit = true;
          break;
        case "high_earning":
          if (auv > 750_000 || fp?.multiUnitAvailable) lifestyleHit = true;
          break;
        case "community":
          if (brand.category?.match(/service|education|health|pets|child/i)) lifestyleHit = true;
          break;
        case "health_wellness":
          if (brand.category?.match(/health|fitness|wellness|beauty/i)) lifestyleHit = true;
          break;
        case "creativity":
          if (brand.category?.match(/food|entertainment|beauty|retail/i)) lifestyleHit = true;
          break;
        case "predictable_routine":
          if ((fp?.totalUnits || 0) >= 100 || (fp?.trainingWeeks || 0) >= 2) lifestyleHit = true;
          break;
      }
      if (lifestyleHit) break;
    }
    if (lifestyleHit) psychScore += 1;
  }

  score += Math.min(5, psychScore);

  // ═══════════════════════════════════════════════════════
  //  10. VETERAN BONUS (0–3 pts)
  // ═══════════════════════════════════════════════════════
  let veteranScore = 0;
  if (prospect.veteranStatus === true) {
    if (fp?.veteranDiscount) {
      veteranScore = 3;
      reasons.push("Veteran discount available");
    } else {
      veteranScore = 0; // veteran but no discount — no bonus
    }
  } else {
    veteranScore = 0; // not a veteran — no points (not penalized)
  }
  score += veteranScore;

  // ═══════════════════════════════════════════════════════
  //  11. DATA QUALITY / BRAND COMPLETENESS (0–3 pts)
  // ═══════════════════════════════════════════════════════
  const filledFields = brandCompleteness(fp);
  const completenessPercent = Math.round((filledFields / COMPLETENESS_FIELDS.length) * 100);
  let completenessScore = 0;

  if (filledFields >= 14) completenessScore = 3;
  else if (filledFields >= 10) completenessScore = 2;
  else if (filledFields >= 6) completenessScore = 1;

  if (completenessScore === 0 && fp) {
    warnings.push("Limited brand profile data");
  }

  score += completenessScore;

  // ═══════════════════════════════════════════════════════
  //  MULTI-UNIT INTEREST BONUS (0–2 pts, absorbed into total)
  // ═══════════════════════════════════════════════════════
  if (prospect.multiUnitInterest && prospect.multiUnitInterest !== "1") {
    if (fp?.multiUnitAvailable) {
      score += 2;
      reasons.push("Multi-unit development available");
    }
  }

  // ═══════════════════════════════════════════════════════
  //  ASSEMBLE RESULT (minimum threshold: 8)
  // ═══════════════════════════════════════════════════════
  const finalScore = Math.min(100, Math.max(0, score));

  if (finalScore >= 8) {
    const displayTerrs = nearbyTerrs
      .map((t) => ({ ...t, distance: t.distance === -1 ? 0 : t.distance }))
      .slice(0, 5);

    // Count active dimensions for the prospect
    let activeDims = 0;
    const totalDims = 12;
    if (prospect.primaryState || prospect.primaryLat) activeDims++;                    // location
    if (prospect.liquidCapital || prospect.totalInvestmentBudget) activeDims++;         // financial
    if (prospect.revenueGoal || prospect.incomeGoal) activeDims++;                     // revenue goals
    if (prospect.preferredCategories?.length) activeDims++;                            // category
    if (prospectOwnerModels.length > 0 || prospect.runFromHome || prospect.fullTimePartTime) activeDims++; // ownership
    if (prospect.brandMaturity) activeDims++;                                          // maturity
    if (prospect.supportImportance || prospect.supportPriorities?.length) activeDims++; // support
    if (prospect.spacePreference || prospect.employeeComfort || prospect.avoidList?.length) activeDims++; // lifestyle
    if (prospect.motivations?.length || prospect.riskTolerance || prospect.professionalBackground?.length) activeDims++; // psychographic
    if (prospect.veteranStatus === true) activeDims++;                                 // veteran
    if (prospect.mustHaveFilters?.length) activeDims++;                                // knockout filters
    if (prospect.sbaFinancingIntent) activeDims++;                                     // SBA

    return ({
      brandId: brand._id,
      brandName: brand.name,
      brandSlug: brand.slug,
      brandCategory: brand.category,
      brandDescription: brand.description,
      logoUrl: brand.logoUrl,
      investmentMin: brand.investmentMin,
      investmentMax: brand.investmentMax,
      matchScore: finalScore,
      matchReasons: reasons.slice(0, 8),
      matchWarnings: warnings.slice(0, 4),
      nearbyTerritories: displayTerrs,
      availableInYourState,
      profileCompleteness: completenessPercent,
      activeDimensions: activeDims,
      totalDimensions: totalDims,
    });
  }

  return null;
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
    if (!prospect) return [];

    // Get all active brands
    const allBrands = await ctx.db.query("brands").collect();
    const brands = allBrands.filter((b) => b.isActive !== false);

    // Get all territories
    const allTerritories = await ctx.db.query("territories").collect();

    // Get all franchise profiles
    const allFranchiseProfiles = await ctx.db.query("franchiseProfiles").collect();
    const fpMap = new Map(allFranchiseProfiles.map((fp) => [fp.brandId.toString(), fp]));

    // State-level availability (franchisors open STATES; city territories are
    // inquire-to-confirm). brandId -> Map(stateCode -> status)
    const allSA = await ctx.db.query("stateAvailability").collect();
    const saMap = new Map<string, Map<string, string>>();
    for (const row of allSA) {
      const key = row.brandId.toString();
      if (!saMap.has(key)) saMap.set(key, new Map());
      saMap.get(key)!.set(row.state.toUpperCase(), row.status);
    }

    const results: {
      brandId: string;
      brandName: string;
      brandSlug: string;
      brandCategory: string | undefined;
      brandDescription: string | undefined;
      logoUrl: string | undefined;
      investmentMin: number | undefined;
      investmentMax: number | undefined;
      matchScore: number;
      matchReasons: string[];
      matchWarnings: string[];
      nearbyTerritories: {
        city: string;
        state: string;
        status: string;
        distance: number;
      }[];
      availableInYourState?: boolean;
      profileCompleteness?: number;
      activeDimensions?: number;
      totalDimensions?: number;
      knockedOut?: boolean;
      knockoutReasons?: string[];
    }[] = [];

    for (const brand of brands) {
      const r = scoreBrandForProspect({
        prospect,
        brand,
        fp: fpMap.get(brand._id.toString()),
        brandTerritories: allTerritories.filter((t) => t.brandId === brand._id),
        saMap,
      });
      if (r) results.push(r);
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    return results;
  },
});

/* ════════════════════════════════════════════════════════════════════════
 * Admin: Update prospect contact info (pipeline / backend)
 * Sets adminVerified flag + clears prospectModifiedAfterVerify
 * ════════════════════════════════════════════════════════════════════════ */
export const adminUpdateProspectContact = mutation({
  args: {
    prospectProfileId: v.id("prospectProfiles"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify caller is internal team
    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const callerUser = await ctx.db.get(userId);
    const callerEmail = (callerUser?.email || "").toLowerCase();
    const callerRole = callerProfile?.role;
    const isInternal =
      callerRole === "super_admin" ||
      callerRole === "admin" ||
      callerRole === "standard" ||
      callerRole === "closer" ||
      callerRole === "setter" ||
      callerEmail.endsWith("@franchiseki.com");

    if (!isInternal) throw new Error("Not authorized — internal team only");

    const { prospectProfileId, ...contactFields } = args;
    const prospect = await ctx.db.get(prospectProfileId);
    if (!prospect) throw new Error("Prospect profile not found");

    const updates: Record<string, any> = {};
    if (contactFields.firstName !== undefined) updates.firstName = contactFields.firstName;
    if (contactFields.lastName !== undefined) updates.lastName = contactFields.lastName;
    if (contactFields.email !== undefined) updates.email = contactFields.email;
    if (contactFields.phone !== undefined) updates.phone = contactFields.phone;
    if (contactFields.address !== undefined) updates.address = contactFields.address;
    if (contactFields.city !== undefined) updates.city = contactFields.city;
    if (contactFields.state !== undefined) updates.state = contactFields.state;
    if (contactFields.zipCode !== undefined) updates.zipCode = contactFields.zipCode;

    // Set admin verified stamp
    updates.adminVerified = true;
    updates.adminVerifiedAt = Date.now();
    updates.contactLastEditedBy = "admin";
    updates.contactLastEditedAt = Date.now();
    updates.prospectModifiedAfterVerify = false;

    await ctx.db.patch(prospectProfileId, updates);

    // Log the activity
    await ctx.db.insert("activityLog", {
      userId,
      action: "admin_update_prospect_contact",
      entityType: "prospectProfile",
      entityId: prospectProfileId,
      details: `Admin updated contact info for prospect`,
    });

    return { success: true };
  },
});

/* ════════════════════════════════════════════════════════════════════════
 * Admin: List all prospect profiles (for pipeline / lead management)
 * Includes contact audit flags
 * ════════════════════════════════════════════════════════════════════════ */
export const listProspectProfiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify caller is internal team
    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const callerUser = await ctx.db.get(userId);
    const callerEmail = (callerUser?.email || "").toLowerCase();
    const callerRole = callerProfile?.role;
    const isInternal =
      callerRole === "super_admin" ||
      callerRole === "admin" ||
      callerRole === "standard" ||
      callerRole === "closer" ||
      callerRole === "setter" ||
      callerEmail.endsWith("@franchiseki.com");

    if (!isInternal) return [];

    const prospects = await ctx.db.query("prospectProfiles").collect();

    return prospects.map((p) => ({
      ...p,
      displayName: [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "Unknown",
      hasContactWarning: !!(p.adminVerified && p.prospectModifiedAfterVerify),
    }));
  },
});