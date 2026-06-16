/**
 * ═══════════════════════════════════════════════════════════════════════
 * CENTRAL METRIC DEFINITIONS — the single source of truth for every
 * business definition on the KPI / acquisition-readiness dashboard.
 * Change the business logic HERE, never inline in queries or UI.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * VALID PROFILE      — a prospectProfile with an email address. (Business
 *                      language is "profiles" even though auth lives in
 *                      `users`; prospectProfiles is the buyer-profile table.)
 * QUALIFIED PROFILE  — a valid profile that ALSO has: verified email,
 *                      a phone number (verified phone when available),
 *                      investment range (liquidCapital), timeline,
 *                      geography (primary city+state), and at least one
 *                      franchise category. Consent: account creation +
 *                      saved profile is treated as opt-in today — an
 *                      explicit consent checkbox is a TODO (see docs).
 * ACTIVE PROFILE     — a valid profile with ≥1 activityEvent (or a profile
 *                      edit) inside the activity window. Events older than
 *                      the activityEvents table only exist as profile
 *                      timestamps, so early "active" counts are floors.
 * CONSULTANT REQUEST — a non-deleted crmLead whose email matches the
 *                      profile (leads are created when a prospect submits
 *                      "I'm Interested" / requests consultant help).
 * COST PER PROFILE   — Σ marketingSpend(range) / valid profiles created(range).
 * COST PER QUALIFIED — Σ marketingSpend(range) / qualified profiles created(range).
 * REVENUE PER QUALIFIED — Σ revenueAttribution(range) / qualified created(range).
 * PROFILE COMPLETENESS — % of the 24 matching fields answered (5 basics +
 *                      19 enhancements) — identical to the bar the prospect
 *                      sees on /my-profile. Keep the two lists in sync.
 * BRAND COMPLETENESS — weighted % of the critical brand data points below.
 * SOURCE ATTRIBUTION — profile.utmSource (first touch) → normalized bucket;
 *                      falls back to referrer classification, else "unknown".
 * DATE RANGE LOGIC   — [start, end) in ms epoch; "previous period" is the
 *                      same-length window immediately before start.
 */

// ── Activity event vocabulary ──────────────────────────────────────────
export const EVENT_TYPES = [
  "profile_created",
  "profile_updated",
  "email_verified",
  "phone_verified",
  "brand_viewed",
  "brand_compared",
  "dossier_requested",
  "consultant_requested",
  "consultant_appointment_booked", // not wired yet (no booking flow)
  "brand_intro_requested",         // not wired yet
  "brand_intro_completed",         // not wired yet
  "funding_info_submitted",        // not wired yet
  "revenue_attributed",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// ── Acquisition-readiness milestones (configurable) ────────────────────
export const QUALIFIED_MILESTONES = [25_000, 50_000, 100_000, 250_000];
export const ACTIVE_90D_TARGET = 10_000;
export const ACTIVE_12MO_TARGETS = [50_000, 75_000];

// Minimal field shapes — schemas are looser than these, we only touch
// the fields named here.
type AnyDoc = Record<string, any>;

// ── Valid / qualified profile ──────────────────────────────────────────
export function isValidProfile(p: AnyDoc): boolean {
  return !!p.email && !isInternalAccount(p);
}

/**
 * Internal / test accounts that must NOT count as real prospects in KPIs:
 * the @franchiseki.com team, @test.local, and qa/test/demo-named addresses.
 * Keeps acquisition metrics honest (mirrors the social-proof feed filter).
 */
export function isInternalAccount(p: AnyDoc): boolean {
  const e = (p.email ?? "").toLowerCase();
  if (!e) return false;
  const f = (p.firstName ?? "").toLowerCase();
  return (
    e.endsWith("@franchiseki.com") ||
    e.endsWith("@test.local") ||
    /(^|[._-])(qa|test|demo)([._-]|@|$)/.test(e) ||
    ["qa", "test", "demo", "chatqa", "launch"].includes(f) ||
    f.includes("test")
  );
}

export function isQualifiedProfile(p: AnyDoc, userProfile?: AnyDoc | null): boolean {
  if (!isValidProfile(p)) return false;
  const emailVerified = !!userProfile?.emailVerifiedAt;
  const phoneOk = userProfile?.phoneVerifiedAt ? true : !!p.phone; // verified phone preferred, valid phone accepted
  return (
    emailVerified &&
    phoneOk &&
    !!p.liquidCapital &&
    !!p.timeline &&
    !!(p.primaryCity && p.primaryState) &&
    (p.preferredCategories?.length ?? 0) > 0
    // consent: account creation + saved profile (explicit opt-in field TODO)
  );
}

// ── Profile completeness (mirror of ProspectProfilePage checks) ────────
export function profileCompleteness(p: AnyDoc): number {
  const checks = [
    // basics (5)
    !!p.liquidCapital,
    !!p.ownerType,
    (p.preferredCategories?.length ?? 0) > 0,
    !!(p.primaryCity && p.primaryState),
    !!p.timeline,
    // enhancements (19)
    !!p.totalInvestmentBudget,
    !!p.sbaFinancingIntent,
    (p.ownershipModel?.length ?? 0) > 0,
    !!p.runFromHome,
    !!p.fullTimePartTime,
    !!p.multiUnitInterest,
    p.veteranStatus !== undefined,
    !!p.revenueGoal,
    !!p.incomeGoal,
    (p.mustHaveFilters?.length ?? 0) > 0,
    !!p.brandMaturity,
    !!p.supportImportance,
    !!p.employeeComfort,
    !!p.spacePreference,
    (p.motivations?.length ?? 0) > 0,
    !!p.riskTolerance,
    (p.professionalBackground?.length ?? 0) > 0,
    (p.lifestylePriorities?.length ?? 0) > 0,
    (p.avoidList?.length ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ── Timeline under 12 months ───────────────────────────────────────────
export function timelineUnder12Months(timeline?: string): boolean {
  return timeline === "asap" || timeline === "3_months" || timeline === "6_months" || timeline === "12_months";
}

// ── Source attribution ─────────────────────────────────────────────────
export const SOURCE_BUCKETS = [
  "organic_search", "paid_ads", "social", "referral", "direct", "email", "partner", "unknown",
] as const;

export function classifySource(p: AnyDoc): string {
  const src = (p.utmSource || "").toLowerCase();
  const medium = (p.utmMedium || "").toLowerCase();
  if (medium.includes("cpc") || medium.includes("paid") || ["google_ads", "googleads", "fb_ads", "meta"].includes(src))
    return "paid_ads";
  if (["facebook", "instagram", "linkedin", "tiktok", "x", "twitter", "youtube"].includes(src)) return "social";
  if (medium === "email" || src === "email" || src === "newsletter") return "email";
  if (src === "partner" || medium === "partner") return "partner";
  if (src) return src; // keep custom utm_source values as their own row
  const ref = (p.referrer || "").toLowerCase();
  if (!ref) return p.firstTouchAt ? "direct" : "unknown";
  if (/google\.|bing\.|duckduckgo|yahoo\./.test(ref)) return "organic_search";
  if (/facebook|instagram|linkedin|tiktok|twitter|x\.com|youtube|reddit/.test(ref)) return "social";
  return "referral";
}

// ── Brand completeness ─────────────────────────────────────────────────
// Critical fields (weight 2) gate "complete data"; standard fields weight 1.
// brand = brands row, fp = franchiseProfiles row (may be undefined).
export const BRAND_CRITICAL_FIELDS = [
  "investment", "franchiseFee", "royalty", "category", "description",
  "totalUnits", "yearFounded", "stateAvailability", "riskFlags", "sourceVerified",
];

export function brandCompleteness(
  brand: AnyDoc,
  fp: AnyDoc | undefined,
  hasStateAvailability: boolean
): { score: number; missingCritical: string[] } {
  const f = fp ?? {};
  const critical: [string, boolean][] = [
    ["investment", brand.investmentMin != null || f.totalInvestmentMin != null],
    ["franchiseFee", brand.franchiseFee != null || f.franchiseFee != null],
    ["royalty", brand.royaltyPercent != null || f.royaltyPercent != null],
    ["category", !!brand.category],
    ["description", !!brand.description],
    ["totalUnits", f.totalUnits != null],
    ["yearFounded", f.yearFounded != null],
    ["stateAvailability", hasStateAvailability],
    ["riskFlags", (f.riskFlags?.length ?? 0) > 0],
    ["sourceVerified", (f.verifiedFieldCount ?? 0) > 0],
  ];
  const standard: boolean[] = [
    !!brand.logoUrl,
    !!brand.websiteUrl,
    f.yearFranchising != null,
    f.liquidCapitalMin != null,
    f.netWorthMin != null,
    f.avgUnitRevenue != null || f.item19Revenue != null,
    f.item19Available != null,
    f.fddAvailable != null,
    f.trainingWeeks != null || f.classroomTrainingHours != null,
    f.absenteeOwnership != null || (f.ownerTypes?.length ?? 0) > 0,
    f.canRunFromHome != null,
    f.employeesRequired != null,
    f.exclusiveTerritories != null || !!f.territoryExclusivity,
    f.termOfAgreement != null,
    !!f.parentCompany,
    f.veteranDiscount != null,
    f.sbaApproved != null,
    !!f.brandStory || !!f.positioning,
    (f.faqs?.length ?? 0) > 0,
    f.item20 != null,
    f.activeLawsuits != null,
    !!f.fddYear,
    f.brandFundPercent != null || !!f.marketingFees,
    f.multiUnitAvailable != null,
    (f.sellingPoints?.length ?? 0) > 0 || (f.idealPartner?.length ?? 0) > 0,
  ];
  const critDone = critical.filter(([, ok]) => ok).length;
  const stdDone = standard.filter(Boolean).length;
  const score = Math.round(
    ((critDone * 2 + stdDone) / (critical.length * 2 + standard.length)) * 100
  );
  return { score, missingCritical: critical.filter(([, ok]) => !ok).map(([k]) => k) };
}

/** "Complete/enriched" brand = all critical fields present (score gate). */
export function isBrandComplete(c: { missingCritical: string[] }): boolean {
  return c.missingCritical.length === 0;
}

/** Verification older than this is "outdated" on the dashboard. */
export const VERIFICATION_STALE_DAYS = 365;
