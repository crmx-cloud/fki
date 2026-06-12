import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  isValidProfile,
  isQualifiedProfile,
  profileCompleteness,
  timelineUnder12Months,
  classifySource,
  brandCompleteness,
  isBrandComplete,
  QUALIFIED_MILESTONES,
  ACTIVE_90D_TARGET,
  ACTIVE_12MO_TARGETS,
  VERIFICATION_STALE_DAYS,
} from "./metricsDefs";

/**
 * KPI / acquisition-readiness dashboard backend.
 *
 * All business definitions live in metricsDefs.ts — this file only
 * aggregates. Queries are admin-gated.
 *
 * SCALE NOTE: aggregation currently collects the relevant tables inside
 * one query, which is right for the current size (hundreds of profiles,
 * hundreds of brands). At ~50K+ profiles move the per-bucket counts to
 * incrementally-maintained counters (or a scheduled rollup table) — the
 * dashboard payload shape can stay identical. Indexes for that future:
 * crmLeads.by_created, activityEvents.by_ts / by_user_ts (already added).
 */

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin"))
    throw new Error("Admin access required");
  return userId;
}

// ── Time bucketing (UTC) ───────────────────────────────────────────────
const HOUR = 3600_000, DAY = 86400_000;
function bucketKey(ts: number, bucket: string): string {
  const d = new Date(ts);
  if (bucket === "hour")
    return `${d.toISOString().slice(0, 13)}:00`;
  if (bucket === "week") {
    const monday = new Date(ts - ((d.getUTCDay() + 6) % 7) * DAY);
    return monday.toISOString().slice(0, 10);
  }
  if (bucket === "month") return d.toISOString().slice(0, 7);
  return d.toISOString().slice(0, 10); // day
}
function bucketKeysBetween(start: number, end: number, bucket: string): string[] {
  const keys: string[] = [];
  const step = bucket === "hour" ? HOUR : DAY;
  for (let t = start; t < end; t += step) {
    const k = bucketKey(t, bucket);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  return keys;
}
const dateStrToMs = (s: string) => new Date(`${s}T00:00:00Z`).getTime();
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// ── Shared core (public gated query + internal QA wrapper) ─────────────
async function computeDashboard(ctx: any, args: { start: number; end: number; bucket: string }) {
  const { start, end, bucket } = args;
  const prevStart = start - (end - start);
  const now = Date.now();

  // Source data (single pass each)
  const prospects = await ctx.db.query("prospectProfiles").collect();
  const userProfiles = await ctx.db.query("userProfiles").collect();
  const upByUser = new Map<string, any>(userProfiles.map((u: any) => [String(u.userId), u]));
  const leads = (await ctx.db.query("crmLeads").collect()).filter((l: any) => !l.deletedAt);
  const brands = (await ctx.db.query("brands").collect()).filter((b: any) => b.isActive !== false);
  const fps = await ctx.db.query("franchiseProfiles").collect();
  const fpMap = new Map<string, any>(fps.map((f: any) => [String(f.brandId), f]));
  const saBrands = new Set(
    (await ctx.db.query("stateAvailability").collect()).map((r: any) => String(r.brandId))
  );
  const spend = await ctx.db.query("marketingSpend").collect();
  const revenue = await ctx.db.query("revenueAttribution").collect();
  const events = await ctx.db
    .query("activityEvents")
    .withIndex("by_ts", (q: any) => q.gt("ts", now - 366 * DAY))
    .collect();

  // ── Per-profile derived facts ──
  const leadByEmail = new Map<string, any>();
  for (const l of leads) {
    if (!l.email) continue;
    const k = l.email.toLowerCase();
    const prev = leadByEmail.get(k);
    if (!prev || l.createdAt < prev.createdAt) leadByEmail.set(k, l); // first request
  }
  const activityByKey = new Map<string, number>(); // email or userId → latest ts
  for (const e of events) {
    for (const k of [e.email, e.userId ? String(e.userId) : null]) {
      if (!k) continue;
      if ((activityByKey.get(k) ?? 0) < e.ts) activityByKey.set(k, e.ts);
    }
  }

  type Fact = {
    createdAt: number; valid: boolean; qualified: boolean; completeness: number;
    source: string; campaign: string | null; lead: any | null; lastActivity: number;
    up: any | null; p: any;
  };
  const facts: Fact[] = prospects.map((p: any) => {
    const up = p.userId ? upByUser.get(String(p.userId)) ?? null : null;
    const lead = p.email ? leadByEmail.get(p.email.toLowerCase()) ?? null : null;
    const lastActivity = Math.max(
      p.email ? activityByKey.get(p.email.toLowerCase()) ?? 0 : 0,
      p.userId ? activityByKey.get(String(p.userId)) ?? 0 : 0,
      p.contactLastEditedAt ?? 0,
      p.lastTouchAt ?? 0
    );
    return {
      createdAt: p._creationTime, valid: isValidProfile(p),
      qualified: isQualifiedProfile(p, up), completeness: profileCompleteness(p),
      source: classifySource(p), campaign: p.utmCampaign ?? null,
      lead, lastActivity, up, p,
    };
  });
  const valid = facts.filter((f) => f.valid);
  const qualified = facts.filter((f) => f.qualified);
  const inRange = (f: Fact) => f.createdAt >= start && f.createdAt < end;
  const inPrev = (f: Fact) => f.createdAt >= prevStart && f.createdAt < start;

  // ── Series ──
  const keys = bucketKeysBetween(start, end, bucket);
  const mkSeries = () => Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
  const profileSeries = mkSeries(), qualifiedSeries = mkSeries();
  const completenessSeries: Record<string, number[]> = Object.fromEntries(keys.map((k) => [k, []]));
  for (const f of valid) {
    if (!inRange(f)) continue;
    const k = bucketKey(f.createdAt, bucket);
    if (k in profileSeries) {
      profileSeries[k]++;
      completenessSeries[k].push(f.completeness);
      if (f.qualified) qualifiedSeries[k]++;
    }
  }
  const spendInWindow = (s: number, e: number) =>
    spend.filter((r: any) => dateStrToMs(r.date) >= s && dateStrToMs(r.date) < e)
      .reduce((a: number, r: any) => a + r.amount, 0);
  const spendSeries = mkSeries();
  for (const r of spend) {
    const ms = dateStrToMs(r.date);
    if (ms >= start && ms < end) {
      const k = bucketKey(ms, bucket);
      if (k in spendSeries) spendSeries[k] += r.amount;
    }
  }
  const series = keys.map((k) => ({
    key: k,
    profiles: profileSeries[k],
    qualified: qualifiedSeries[k],
    spend: spendSeries[k],
    avgCompleteness: completenessSeries[k].length ? Math.round(avg(completenessSeries[k])) : null,
    costPerProfile: profileSeries[k] > 0 ? Math.round(spendSeries[k] / profileSeries[k]) : null,
    costPerQualified: qualifiedSeries[k] > 0 ? Math.round(spendSeries[k] / qualifiedSeries[k]) : null,
  }));

  // ── Monthly growth (lifetime, by calendar month) ──
  const byMonth: Record<string, { profiles: number; qualified: number }> = {};
  for (const f of valid) {
    const k = bucketKey(f.createdAt, "month");
    byMonth[k] ??= { profiles: 0, qualified: 0 };
    byMonth[k].profiles++;
    if (f.qualified) byMonth[k].qualified++;
  }
  const monthKeys = Object.keys(byMonth).sort();
  const monthly = monthKeys.map((k) => ({ key: k, ...byMonth[k] }));
  const thisMonthKey = bucketKey(now, "month");
  const lastMonthKey = bucketKey(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth() - 1, 15), "month");
  const momGrowth = (() => {
    const cur = byMonth[thisMonthKey]?.profiles ?? 0;
    const prev = byMonth[lastMonthKey]?.profiles ?? 0;
    return prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;
  })();

  // ── Quality (over ALL valid profiles — labeled lifetime in UI) ──
  const q = {
    emailVerified: valid.filter((f) => !!f.up?.emailVerifiedAt).length,
    phoneVerified: valid.filter((f) => !!f.up?.phoneVerifiedAt).length,
    bothVerified: valid.filter((f) => !!f.up?.emailVerifiedAt && !!f.up?.phoneVerifiedAt).length,
    investment: valid.filter((f) => !!f.p.liquidCapital).length,
    timeline: valid.filter((f) => !!f.p.timeline).length,
    timelineUnder12: valid.filter((f) => timelineUnder12Months(f.p.timeline)).length,
    location: valid.filter((f) => !!(f.p.primaryCity && f.p.primaryState)).length,
    category: valid.filter((f) => (f.p.preferredCategories?.length ?? 0) > 0).length,
    funding: valid.filter((f) => !!f.p.totalInvestmentBudget || !!f.p.sbaFinancingIntent).length,
    sourceAttributed: valid.filter((f) => f.source !== "unknown" && f.source !== "direct").length,
    optIn: valid.length, // account creation = consent today; explicit opt-in field is a TODO
    qualified: qualified.length,
  };

  // ── Consultant intent ──
  const withLead = valid.filter((f) => f.lead);
  const qualWithLead = qualified.filter((f) => f.lead);
  const deltas = withLead
    .map((f) => f.lead.createdAt - f.createdAt)
    .filter((d) => d >= 0);
  const leadInRange = leads.filter((l: any) => l.createdAt >= start && l.createdAt < end);
  const leadInPrev = leads.filter((l: any) => l.createdAt >= prevStart && l.createdAt < start);
  const consultantIntent = {
    totalRequests: leads.length,
    requestsInRange: leadInRange.length,
    requestsInPrev: leadInPrev.length,
    pctProfilesRequesting: pct(withLead.length, valid.length),
    pctQualifiedRequesting: pct(qualWithLead.length, qualified.length),
    avgHoursToRequest: deltas.length ? Math.round(avg(deltas) / HOUR * 10) / 10 : null,
    medianHoursToRequest: deltas.length ? Math.round(median(deltas) / HOUR * 10) / 10 : null,
    sameDayRate: pct(deltas.filter((d) => d < DAY).length, deltas.length),
    within7dRate: pct(deltas.filter((d) => d < 7 * DAY).length, deltas.length),
    within30dRate: pct(deltas.filter((d) => d < 30 * DAY).length, deltas.length),
  };

  // ── Funnel ──
  const funnel = [
    { stage: "Profile created", count: facts.length, configured: true },
    { stage: "Valid profile", count: valid.length, configured: true },
    { stage: "Qualified profile", count: qualified.length, configured: true },
    { stage: "Consultant request", count: withLead.length, configured: true },
    { stage: "Booked appointment", count: null, configured: false },
    { stage: "Brand introduction", count: null, configured: false },
    {
      stage: "Awarded franchise",
      count: withLead.filter((f) => f.lead.stage === "awarded").length,
      configured: true,
    },
  ];

  // ── Spend / cost ──
  const spendRange = spendInWindow(start, end);
  const spendPrev = spendInWindow(prevStart, start);
  const profilesRange = valid.filter(inRange).length;
  const qualifiedRange = qualified.filter(inRange).length;
  const cost = {
    spendInRange: spendRange,
    spendInPrev: spendPrev,
    spendLifetime: spend.reduce((a: number, r: any) => a + r.amount, 0),
    costPerProfile: profilesRange > 0 ? Math.round((spendRange / profilesRange) * 100) / 100 : null,
    costPerQualified: qualifiedRange > 0 ? Math.round((spendRange / qualifiedRange) * 100) / 100 : null,
  };

  // ── Revenue ──
  const revInWindow = (s: number, e: number) =>
    revenue.filter((r: any) => dateStrToMs(r.revenueDate) >= s && dateStrToMs(r.revenueDate) < e)
      .reduce((a: number, r: any) => a + r.amount, 0);
  const revRange = revInWindow(start, end);
  const rev = {
    totalLifetime: revenue.reduce((a: number, r: any) => a + r.amount, 0),
    inRange: revRange,
    inPrev: revInWindow(prevStart, start),
    entries: revenue.length,
    perProfile: profilesRange > 0 ? Math.round((revRange / profilesRange) * 100) / 100 : null,
    perQualified: qualifiedRange > 0 ? Math.round((revRange / qualifiedRange) * 100) / 100 : null,
    perConsultantRequest:
      leadInRange.length > 0 ? Math.round((revRange / leadInRange.length) * 100) / 100 : null,
  };

  // ── Source performance ──
  const revBySource = new Map<string, number>();
  for (const r of revenue) {
    if (!r.source) continue;
    revBySource.set(r.source, (revBySource.get(r.source) ?? 0) + r.amount);
  }
  const spendBySource = new Map<string, number>();
  for (const r of spend) spendBySource.set(r.source, (spendBySource.get(r.source) ?? 0) + r.amount);
  const srcMap = new Map<string, Fact[]>();
  for (const f of valid) {
    if (!srcMap.has(f.source)) srcMap.set(f.source, []);
    srcMap.get(f.source)!.push(f);
  }
  const sources = [...srcMap.entries()]
    .map(([source, fs]) => {
      const qd = fs.filter((f) => f.qualified).length;
      const sp = spendBySource.get(source) ?? 0;
      const rv = revBySource.get(source) ?? 0;
      const req = fs.filter((f) => f.lead).length;
      return {
        source,
        profiles: fs.length,
        qualified: qd,
        qualificationRate: pct(qd, fs.length),
        spend: sp,
        costPerProfile: fs.length && sp ? Math.round((sp / fs.length) * 100) / 100 : null,
        costPerQualified: qd && sp ? Math.round((sp / qd) * 100) / 100 : null,
        consultantRequests: req,
        requestRate: pct(req, fs.length),
        avgCompleteness: Math.round(avg(fs.map((f) => f.completeness))),
        revenue: rv,
        revenuePerQualified: qd && rv ? Math.round((rv / qd) * 100) / 100 : null,
      };
    })
    .sort((a, b) => b.profiles - a.profiles);

  // ── Completeness stats ──
  const completenessVals = valid.map((f) => f.completeness);
  const completeness = {
    avg: Math.round(avg(completenessVals)),
    above80: completenessVals.filter((c) => c >= 80).length,
    below50: completenessVals.filter((c) => c < 50).length,
  };

  // ── Acquisition readiness ──
  const active90 = qualified.filter((f) => f.lastActivity > now - 90 * DAY).length;
  const active365 = qualified.filter((f) => f.lastActivity > now - 365 * DAY).length;
  const monthsWithData = monthly.filter((m) => m.profiles > 0);
  const readiness = {
    totalQualified: qualified.length,
    activeQualified90d: active90,
    activeQualified12mo: active365,
    avgQualifiedPerMonth: monthsWithData.length
      ? Math.round(avg(monthsWithData.map((m) => m.qualified)) * 10) / 10
      : 0,
    avgProfilesPerMonth: monthsWithData.length
      ? Math.round(avg(monthsWithData.map((m) => m.profiles)) * 10) / 10
      : 0,
    milestones: QUALIFIED_MILESTONES,
    active90Target: ACTIVE_90D_TARGET,
    active12moTargets: ACTIVE_12MO_TARGETS,
  };

  // ── Brand data KPIs ──
  const brandFacts = brands.map((b: any) => {
    const fp = fpMap.get(String(b._id));
    const c = brandCompleteness(b, fp, saBrands.has(String(b._id)));
    return { b, fp, ...c, complete: isBrandComplete(c) };
  });
  const staleMs = now - VERIFICATION_STALE_DAYS * DAY;
  const brandKpis = {
    total: brands.length,
    complete: brandFacts.filter((x: any) => x.complete).length,
    avgCompleteness: Math.round(avg(brandFacts.map((x: any) => x.score))),
    missingInvestment: brandFacts.filter((x: any) => x.missingCritical.includes("investment")).length,
    missingFees: brandFacts.filter((x: any) => x.missingCritical.includes("franchiseFee") || x.missingCritical.includes("royalty")).length,
    missingTerritory: brandFacts.filter((x: any) => x.missingCritical.includes("stateAvailability")).length,
    missingSourceVerification: brandFacts.filter((x: any) => x.missingCritical.includes("sourceVerified")).length,
    outdatedVerification: brandFacts.filter(
      (x: any) => x.fp?.dataVerifiedAt && new Date(`${x.fp.dataVerifiedAt}T00:00:00Z`).getTime() < staleMs
    ).length,
    withRiskFlags: brandFacts.filter((x: any) => (x.fp?.riskFlags?.length ?? 0) > 0).length,
    withItem19: brandFacts.filter((x: any) => x.fp?.item19Available === true).length,
    withVerifiedSource: brandFacts.filter((x: any) => (x.fp?.verifiedFieldCount ?? 0) > 0).length,
  };

  return {
    generatedAt: now,
    lifetime: {
      profilesAll: facts.length,
      validProfiles: valid.length,
      qualifiedProfiles: qualified.length,
      brands: brands.length,
      brandsComplete: brandKpis.complete,
      consultantRequests: leads.length,
    },
    period: {
      profiles: profilesRange,
      profilesPrev: valid.filter(inPrev).length,
      qualified: qualifiedRange,
      qualifiedPrev: qualified.filter(inPrev).length,
      profilesAllCreated: facts.filter(inRange).length,
    },
    series,
    monthly,
    momGrowth,
    thisMonth: byMonth[thisMonthKey] ?? { profiles: 0, qualified: 0 },
    quality: { counts: q, denominator: valid.length },
    completeness,
    consultantIntent,
    funnel,
    cost,
    revenue: rev,
    sources,
    readiness,
    brandKpis,
  };
}

const dashArgs = { start: v.number(), end: v.number(), bucket: v.string() };

export const dashboard = query({
  args: dashArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await computeDashboard(ctx, args);
  },
});

/** QA wrapper — lets ops validate numbers via `npx convex run` (no auth ctx). */
export const dashboardDebug = internalQuery({
  args: dashArgs,
  handler: async (ctx, args) => computeDashboard(ctx, args),
});

// ── Drill-down: profiles table ─────────────────────────────────────────
export const profilesTable = query({
  args: { start: v.optional(v.number()), end: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const prospects = await ctx.db.query("prospectProfiles").collect();
    const userProfiles = await ctx.db.query("userProfiles").collect();
    const upByUser = new Map<string, any>(userProfiles.map((u: any) => [String(u.userId), u]));
    const leads = (await ctx.db.query("crmLeads").collect()).filter((l: any) => !l.deletedAt);
    const leadByEmail = new Map<string, any>();
    for (const l of leads) {
      if (!l.email) continue;
      const k = l.email.toLowerCase();
      if (!leadByEmail.has(k) || l.createdAt < leadByEmail.get(k).createdAt) leadByEmail.set(k, l);
    }
    const revenue = await ctx.db.query("revenueAttribution").collect();
    const revByEmail = new Map<string, number>();
    for (const r of revenue) {
      if (!r.profileEmail) continue;
      const k = r.profileEmail.toLowerCase();
      revByEmail.set(k, (revByEmail.get(k) ?? 0) + r.amount);
    }
    return prospects
      .filter((p: any) => isValidProfile(p))
      .filter((p: any) =>
        args.start ? p._creationTime >= args.start && p._creationTime < (args.end ?? Infinity) : true
      )
      .sort((a: any, b: any) => b._creationTime - a._creationTime)
      .slice(0, 1000)
      .map((p: any) => {
        const up = p.userId ? upByUser.get(String(p.userId)) ?? null : null;
        const lead = p.email ? leadByEmail.get(p.email.toLowerCase()) ?? null : null;
        return {
          id: p._id,
          name: [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email,
          createdAt: p._creationTime,
          qualified: isQualifiedProfile(p, up),
          completeness: profileCompleteness(p),
          emailVerified: !!up?.emailVerifiedAt,
          phoneVerified: !!up?.phoneVerifiedAt,
          investment: p.liquidCapital ?? null,
          timeline: p.timeline ?? null,
          timelineUnder12: timelineUnder12Months(p.timeline),
          categories: p.preferredCategories ?? [],
          location: p.primaryCity && p.primaryState ? `${p.primaryCity}, ${p.primaryState}` : null,
          source: classifySource(p),
          campaign: p.utmCampaign ?? null,
          consultantRequested: !!lead,
          hoursToRequest:
            lead && lead.createdAt >= p._creationTime
              ? Math.round(((lead.createdAt - p._creationTime) / HOUR) * 10) / 10
              : null,
          revenue: p.email ? revByEmail.get(p.email.toLowerCase()) ?? 0 : 0,
          lastActivity: Math.max(p.contactLastEditedAt ?? 0, p.lastTouchAt ?? 0) || null,
        };
      });
  },
});

// ── Drill-down: brand completeness table ───────────────────────────────
export const brandsTable = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const brands = (await ctx.db.query("brands").collect()).filter((b: any) => b.isActive !== false);
    const fps = await ctx.db.query("franchiseProfiles").collect();
    const fpMap = new Map<string, any>(fps.map((f: any) => [String(f.brandId), f]));
    const saBrands = new Set(
      (await ctx.db.query("stateAvailability").collect()).map((r: any) => String(r.brandId))
    );
    return brands
      .map((b: any) => {
        const fp = fpMap.get(String(b._id));
        const c = brandCompleteness(b, fp, saBrands.has(String(b._id)));
        return {
          id: b._id,
          name: b.name,
          slug: b.slug,
          category: b.category ?? null,
          score: c.score,
          missingCritical: c.missingCritical,
          sourceVerified: (fp?.verifiedFieldCount ?? 0) > 0,
          verifiedFieldCount: fp?.verifiedFieldCount ?? 0,
          lastVerified: fp?.dataVerifiedAt ?? null,
          investmentMin: b.investmentMin ?? fp?.totalInvestmentMin ?? null,
          investmentMax: b.investmentMax ?? fp?.totalInvestmentMax ?? null,
          royaltyPercent: b.royaltyPercent ?? fp?.royaltyPercent ?? null,
          marketingFee: fp?.brandFundPercent ?? null,
          item19: fp?.item19Available ?? null,
          riskFlags: fp?.riskFlags?.length ?? 0,
        };
      })
      .sort((a: any, b: any) => a.score - b.score);
  },
});

// ── Marketing spend CRUD (admin-managed; ads sync later) ───────────────
export const listSpend = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await ctx.db.query("marketingSpend").collect()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  },
});

export const addSpend = mutation({
  args: {
    date: v.string(),
    source: v.string(),
    campaign: v.optional(v.string()),
    amount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("marketingSpend", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateSpend = mutation({
  args: {
    id: v.id("marketingSpend"),
    date: v.optional(v.string()),
    source: v.optional(v.string()),
    campaign: v.optional(v.string()),
    amount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const removeSpend = mutation({
  args: { id: v.id("marketingSpend") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

// ── Profile typeahead (revenue attribution form) ───────────────────────
// Matches first name, last name, email, or phone — substring, case-insensitive.
async function searchProfilesCore(ctx: any, q: string) {
  const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const digits = needle.replace(/\D/g, "");
    const prospects = await ctx.db.query("prospectProfiles").collect();
    const seen = new Set<string>(); // dedupe — multiple profile rows can share an email
    return prospects
      .filter((p: any) => {
        if (p.email && seen.has(p.email.toLowerCase())) return false;
        if (p.email) seen.add(p.email.toLowerCase());
        return true;
      })
      .filter((p: any) => {
        if (!p.email) return false; // email is the attribution join key
        const hay = [p.firstName, p.lastName, `${p.firstName ?? ""} ${p.lastName ?? ""}`, p.email]
          .filter(Boolean)
          .map((s: string) => s.toLowerCase());
        if (hay.some((s: string) => s.includes(needle))) return true;
        const phoneDigits = (p.phone ?? "").replace(/\D/g, "");
        return digits.length >= 3 && phoneDigits.includes(digits);
      })
      .slice(0, 8)
      .map((p: any) => ({
        email: p.email,
        name: [p.firstName, p.lastName].filter(Boolean).join(" ") || null,
        phone: p.phone ?? null,
        location: p.primaryCity && p.primaryState ? `${p.primaryCity}, ${p.primaryState}` : p.primaryState ?? null,
      }));
}

export const searchProfiles = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    await requireAdmin(ctx);
    return await searchProfilesCore(ctx, q);
  },
});

/** QA wrapper — `npx convex run adminMetrics:searchProfilesDebug '{"q":"..."}'` */
export const searchProfilesDebug = internalQuery({
  args: { q: v.string() },
  handler: async (ctx, { q }) => searchProfilesCore(ctx, q),
});

// ── Revenue attribution CRUD (manual now; GHL tag/stage sync later) ────
export const listRevenue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await ctx.db.query("revenueAttribution").collect()).sort((a, b) =>
      b.revenueDate.localeCompare(a.revenueDate)
    );
  },
});

export const addRevenue = mutation({
  args: {
    profileEmail: v.optional(v.string()),
    ghlContactId: v.optional(v.string()),
    amount: v.number(),
    revenueDate: v.string(),
    source: v.optional(v.string()),
    campaign: v.optional(v.string()),
    pipelineStage: v.optional(v.string()),
    triggerTag: v.optional(v.string()),
    brandId: v.optional(v.id("brands")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const email = args.profileEmail?.toLowerCase();
    const prospect = email
      ? await ctx.db
          .query("prospectProfiles")
          .withIndex("by_email", (q: any) => q.eq("email", email))
          .first()
      : null;
    const id = await ctx.db.insert("revenueAttribution", {
      ...args,
      profileEmail: email,
      prospectProfileId: prospect?._id,
      createdAt: now,
      updatedAt: now,
    });
    if (email)
      await ctx.db.insert("activityEvents", {
        email, eventType: "revenue_attributed", ts: now,
        metadata: JSON.stringify({ amount: args.amount }),
      });
    return id;
  },
});

export const removeRevenue = mutation({
  args: { id: v.id("revenueAttribution") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
