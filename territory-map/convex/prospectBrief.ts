import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { scoreBrandForProspect } from "./prospect";

/**
 * AI-generated consultant brief — synthesizes the prospect's profile and
 * their live top-3 PerfectFit matches into ONE pinned note on their CRM
 * lead, so a consultant can hit the ground running without digging.
 *
 * Regenerated (replaced, never duplicated) every time the prospect saves
 * their profile, and created the moment a lead exists for them.
 */

const BRIEF_MARKER = "🤖 AI Profile Brief";

const CAPITAL_LABELS: Record<string, string> = {
  under_50k: "under $50K", "50k_100k": "$50K–$100K", "100k_150k": "$100K–$150K",
  "150k_250k": "$150K–$250K", "250k_500k": "$250K–$500K", "500k_1m": "$500K–$1M", "1m_plus": "$1M+",
};
const OWNER_LABELS: Record<string, string> = {
  owner_operator: "an owner-operator", semi_absentee: "a semi-absentee owner",
  absentee: "an absentee/executive owner", investor: "an investor/multi-unit operator",
};
const TIMELINE_LABELS: Record<string, string> = {
  asap: "ready to move ASAP", "3_months": "looking to start within 3 months",
  "6_months": "looking to start within 6 months", "12_months": "on a 12-month timeline",
  exploring: "still exploring",
};
const CATEGORY_LABELS: Record<string, string> = {
  food_bev: "Food & Beverage", health_fitness: "Health & Fitness", services: "Services",
  home_services: "Home Services", education: "Education", beauty_selfcare: "Beauty & Self Care",
};
const EXPERIENCE_LABELS: Record<string, string> = {
  none: "no prior business experience", some_business: "some business experience",
  franchise_owner: "current/past franchise ownership", multi_unit: "multi-unit operating experience",
};

export const generateForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const prospect = await ctx.db
      .query("prospectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!prospect || !prospect.email) return { ok: false, reason: "no_profile" };

    // Their lead record (most recent, not deleted) — brief lives on the lead
    const leads = await ctx.db.query("crmLeads").collect();
    const lead = leads
      .filter((l) => !l.deletedAt && l.email?.toLowerCase() === prospect.email!.toLowerCase())
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!lead) return { ok: false, reason: "no_lead_yet" };

    // Live top-3 matches via THE engine
    const allBrands = (await ctx.db.query("brands").collect()).filter((b) => b.isActive !== false);
    const allFP = await ctx.db.query("franchiseProfiles").collect();
    const fpMap = new Map(allFP.map((fp) => [fp.brandId.toString(), fp]));
    const allTerr = await ctx.db.query("territories").collect();
    const allSA = await ctx.db.query("stateAvailability").collect();
    const saMap = new Map<string, Map<string, string>>();
    for (const row of allSA) {
      const k = row.brandId.toString();
      if (!saMap.has(k)) saMap.set(k, new Map());
      saMap.get(k)!.set(row.state.toUpperCase(), row.status);
    }
    const scored: { name: string; score: number; reasons: string[] }[] = [];
    for (const brand of allBrands) {
      const r = scoreBrandForProspect({
        prospect,
        brand,
        fp: fpMap.get(brand._id.toString()),
        brandTerritories: allTerr.filter((t) => t.brandId === brand._id),
        saMap,
      });
      if (r && !r.knockedOut) scored.push({ name: brand.name, score: r.matchScore, reasons: r.matchReasons || [] });
    }
    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3);

    // ── Synthesize the brief ──
    const name = [prospect.firstName, prospect.lastName].filter(Boolean).join(" ") || "This prospect";
    const where = prospect.primaryCity && prospect.primaryState
      ? `${prospect.primaryCity}, ${prospect.primaryState}`
      : prospect.primaryState || (prospect as any).state || "their area";
    const parts: string[] = [];

    let intro = `${name} is looking to open a franchise in ${where}`;
    if (prospect.ownerType && OWNER_LABELS[prospect.ownerType]) intro += ` as ${OWNER_LABELS[prospect.ownerType]}`;
    if (prospect.liquidCapital && CAPITAL_LABELS[prospect.liquidCapital])
      intro += `, with ${CAPITAL_LABELS[prospect.liquidCapital]} in liquid capital`;
    if (prospect.timeline && TIMELINE_LABELS[prospect.timeline]) intro += `, and is ${TIMELINE_LABELS[prospect.timeline]}`;
    parts.push(intro + ".");

    if (prospect.preferredCategories?.length) {
      const cats = prospect.preferredCategories.map((c) => CATEGORY_LABELS[c] || c).join(", ");
      parts.push(`Interested industries: ${cats}.`);
    }
    if (prospect.priorExperience && EXPERIENCE_LABELS[prospect.priorExperience]) {
      parts.push(`Background: ${EXPERIENCE_LABELS[prospect.priorExperience]}.`);
    }
    const extras: string[] = [];
    if ((prospect as any).veteranStatus === true) extras.push("veteran (look for incentives)");
    if ((prospect as any).sbaFinancingIntent === "yes") extras.push("plans to use SBA financing");
    if ((prospect as any).runFromHome === "yes") extras.push("wants home-based options");
    if ((prospect as any).multiUnitInterest && (prospect as any).multiUnitInterest !== "1")
      extras.push("open to multi-unit development");
    if ((prospect as any).mustHaveFilters?.length)
      extras.push(`must-haves: ${(prospect as any).mustHaveFilters.join(", ").replace(/_/g, " ")}`);
    if (extras.length) parts.push(`Notable: ${extras.join("; ")}.`);

    if (top3.length) {
      const lines = top3.map(
        (m, i) => `${i + 1}. ${m.name} (${m.score}/100)${m.reasons[0] ? ` — ${m.reasons[0]}` : ""}`
      );
      parts.push(`Current top PerfectFit matches:\n${lines.join("\n")}`);
    }
    parts.push(
      "Suggested opener: they've already seen their matches and due-diligence data — start from their top match and what's holding them back, not from scratch."
    );

    const content = `${BRIEF_MARKER} (auto-updates when they edit their profile)\n\n${parts.join("\n\n")}`;

    // Upsert: exactly ONE pinned brief per lead
    const notes = await ctx.db
      .query("contactNotes")
      .filter((q) => q.eq(q.field("contactId"), lead._id))
      .collect();
    const existing = notes.find((n) => n.content.startsWith(BRIEF_MARKER));
    if (existing) {
      await ctx.db.patch(existing._id, { content, isPinned: true });
      return { ok: true, updated: true };
    }
    const now = Date.now();
    await ctx.db.insert("contactNotes", {
      contactId: lead._id,
      content,
      color: "blue",
      isPinned: true,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, created: true };
  },
});
