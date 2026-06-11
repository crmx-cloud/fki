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

/* The scoring engine that previously lived here was UI-dead code and a
 * drift hazard (it disagreed with the real engine). THE one engine is
 * scoreBrandForProspect in convex/prospect.ts — never add a second. */
