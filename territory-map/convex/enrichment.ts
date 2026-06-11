import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/** One-off cleanup: normalize stored video fields (franchisors paste full
 * <iframe> snippets or watch URLs; the player needs a bare embed URL). */
export const normalizeVideoUrls = internalMutation({
  args: {},
  handler: async (ctx) => {
    const norm = (input: string | undefined): string | undefined => {
      if (!input) return undefined;
      let v2 = input.trim();
      if (/<iframe/i.test(v2)) {
        const m = v2.match(/src\s*=\s*["']([^"']+)["']/i);
        if (!m) return undefined;
        v2 = m[1].trim();
      }
      if (v2.startsWith("//")) v2 = "https:" + v2;
      const watch = v2.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,20})/i);
      if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
      const short = v2.match(/youtu\.be\/([\w-]{6,20})/i);
      if (short) return `https://www.youtube.com/embed/${short[1]}`;
      const vimeo = v2.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
      if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
      return /^https?:\/\//i.test(v2) ? v2 : undefined;
    };
    const profiles = await ctx.db.query("franchiseProfiles").collect();
    let fixed = 0;
    for (const fp of profiles) {
      const patch: Record<string, string | undefined> = {};
      const no = norm(fp.overviewVideoUrl);
      const nt = norm(fp.testimonialVideoUrl);
      if (fp.overviewVideoUrl !== undefined && no !== fp.overviewVideoUrl) patch.overviewVideoUrl = no;
      if (fp.testimonialVideoUrl !== undefined && nt !== fp.testimonialVideoUrl) patch.testimonialVideoUrl = nt;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(fp._id, patch);
        fixed++;
      }
    }
    return { ok: true, fixed, scanned: profiles.length };
  },
});

/** QA: create a TEST lead assigned to a user (broker-visibility testing). */
export const createTestLeadAssigned = internalMutation({
  args: { assigneeEmail: v.string(), brandName: v.string(), leadEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u: any) => u.email?.toLowerCase() === args.assigneeEmail.toLowerCase());
    if (!user) return { ok: false, error: "assignee not found" };
    const brand = (await ctx.db.query("brands").collect()).find(
      (b) => b.name.toLowerCase() === args.brandName.toLowerCase()
    );
    if (!brand) return { ok: false, error: "brand not found" };
    const id = await ctx.db.insert("crmLeads", {
      brandId: brand._id,
      firstName: "BROKER TEST",
      lastName: "Lead",
      email: args.leadEmail ?? "broker.test.lead@franchiseki.com",
      stage: "new_lead",
      salesRepId: user._id,
      source: "qa-test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any);
    return { ok: true, leadId: id };
  },
});

/** QA cleanup: hard-delete a CRM lead by id (test-data removal only). */
export const deleteLeadById = internalMutation({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return { ok: false, error: "not found" };
    await ctx.db.delete(args.leadId);
    return { ok: true, deleted: lead.email ?? lead.firstName };
  },
});

/** Batch pipeline: create a brand record if no brand with this slug/name exists. */
export const createBrandIfMissing = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    category: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bySlug = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (bySlug) return { ok: true, brandId: bySlug._id, existed: true };
    const byName = (await ctx.db.query("brands").collect()).find(
      (b) => b.name.toLowerCase().trim() === args.name.toLowerCase().trim()
    );
    if (byName) return { ok: true, brandId: byName._id, existed: true };
    const id = await ctx.db.insert("brands", { ...args, isActive: true });
    return { ok: true, brandId: id, existed: false };
  },
});

/** Sets sourced market-research risk flags on a brand's profile (replaces the array). */
export const setRiskFlags = internalMutation({
  args: {
    brandName: v.string(),
    flags: v.array(
      v.object({
        severity: v.union(v.literal("info"), v.literal("caution"), v.literal("red")),
        title: v.string(),
        detail: v.string(),
        source: v.string(),
        url: v.optional(v.string()),
        year: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const brand = (await ctx.db.query("brands").collect()).find(
      (b) => b.name.toLowerCase().trim() === args.brandName.toLowerCase().trim()
    );
    if (!brand) return { ok: false, error: `brand not found: ${args.brandName}` };
    const fp = await ctx.db
      .query("franchiseProfiles")
      .filter((q) => q.eq(q.field("brandId"), brand._id))
      .first();
    if (!fp) return { ok: false, error: "no profile" };
    await ctx.db.patch(fp._id, { riskFlags: args.flags });
    return { ok: true, count: args.flags.length };
  },
});

/** Sets a user's role by email (QA/admin bootstrap — internal only). */
export const setUserRoleByEmail = internalMutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("super_admin"), v.literal("admin"), v.literal("standard"),
      v.literal("closer"), v.literal("setter"),
      v.literal("broker"), v.literal("brand_admin"),
      v.literal("franchisor"), v.literal("prospect")
    ),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u: any) => u.email?.toLowerCase() === args.email.toLowerCase());
    if (!user) return { ok: false, error: "user not found" };
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (profile) {
      await ctx.db.patch(profile._id, { role: args.role });
      return { ok: true, updated: profile._id };
    }
    const id = await ctx.db.insert("userProfiles", { userId: user._id, role: args.role } as any);
    return { ok: true, created: id };
  },
});

/** Deactivates a brand (test/demo data cleanup) — hides it from public surfaces. */
export const setBrandActive = internalMutation({
  args: { brandName: v.string(), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const brand = (await ctx.db.query("brands").collect()).find(
      (b) => b.name.toLowerCase().trim() === args.brandName.toLowerCase().trim()
    );
    if (!brand) return { ok: false, error: `brand not found: ${args.brandName}` };
    await ctx.db.patch(brand._id, { isActive: args.isActive });
    return { ok: true, name: brand.name, isActive: args.isActive };
  },
});

/** Sets a brand's logoUrl without touching anything else (logo re-hosting). */
export const setBrandLogo = internalMutation({
  args: { brandName: v.string(), logoUrl: v.string() },
  handler: async (ctx, args) => {
    const brand = (await ctx.db.query("brands").collect()).find(
      (b) => b.name.toLowerCase().trim() === args.brandName.toLowerCase().trim()
    );
    if (!brand) return { ok: false, error: `brand not found: ${args.brandName}` };
    await ctx.db.patch(brand._id, { logoUrl: args.logoUrl });
    return { ok: true, brandId: brand._id };
  },
});

/**
 * Removes demo/unverified data from a brand (Bennett/Brent-approved cleanups):
 * - deleteTerritories: wipes all territory records for the brand (used when
 *   territory data was fabricated demo content).
 * - clearFields: list of franchiseProfile field names to remove (e.g. an
 *   unverified franchiseRanking).
 */
export const cleanupBrandData = internalMutation({
  args: {
    brandName: v.string(),
    deleteTerritories: v.optional(v.boolean()),
    clearProfileFields: v.optional(v.array(v.string())),
    appendDataNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const brand = (await ctx.db.query("brands").collect()).find(
      (b) => b.name.toLowerCase().trim() === args.brandName.toLowerCase().trim()
    );
    if (!brand) return { ok: false, error: `brand not found: ${args.brandName}` };

    let territoriesDeleted = 0;
    if (args.deleteTerritories) {
      const terrs = await ctx.db
        .query("territories")
        .withIndex("by_brand", (q) => q.eq("brandId", brand._id))
        .collect();
      for (const t of terrs) {
        await ctx.db.delete(t._id);
        territoriesDeleted++;
      }
    }

    let fieldsCleared: string[] = [];
    if (args.clearProfileFields?.length) {
      const fp = await ctx.db
        .query("franchiseProfiles")
        .filter((q) => q.eq(q.field("brandId"), brand._id))
        .first();
      if (fp) {
        const patch: Record<string, undefined | string> = {};
        for (const f of args.clearProfileFields) patch[f] = undefined;
        if (args.appendDataNote) {
          patch.dataNotes = `${(fp as any).dataNotes ?? ""}\n${args.appendDataNote}`.trim();
        }
        await ctx.db.patch(fp._id, patch);
        fieldsCleared = args.clearProfileFields;
      }
    }
    return { ok: true, territoriesDeleted, fieldsCleared };
  },
});

/**
 * Applies researched, source-cited data to a brand's franchiseProfile.
 * Used by the enrichment pipeline (Guy). Every field set here MUST carry
 * a corresponding entry in fieldSources — unverified fields are skipped
 * upstream and remain empty by design.
 */
export const applyEnrichment = internalMutation({
  args: {
    brandName: v.string(),
    profileFields: v.any(), // validated against schema on patch
    fieldSources: v.record(
      v.string(),
      v.object({
        source: v.string(),
        url: v.optional(v.string()),
        year: v.optional(v.number()),
        confidence: v.optional(
          v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
        ),
      })
    ),
    brandFields: v.optional(v.any()), // investmentMin/Max, franchiseFee, royaltyPercent on brands table
    dataNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const brand = (await ctx.db.query("brands").collect()).find(
      (b) => b.name.toLowerCase().trim() === args.brandName.toLowerCase().trim()
    );
    if (!brand) return { ok: false, error: `brand not found: ${args.brandName}` };

    if (args.brandFields && Object.keys(args.brandFields).length > 0) {
      await ctx.db.patch(brand._id, args.brandFields);
    }

    const fp = await ctx.db
      .query("franchiseProfiles")
      .filter((q) => q.eq(q.field("brandId"), brand._id))
      .first();

    const patch = {
      ...args.profileFields,
      fieldSources: args.fieldSources,
      dataVerifiedAt: new Date().toISOString().slice(0, 10),
      verifiedFieldCount: Object.keys(args.fieldSources).length,
      ...(args.dataNotes ? { dataNotes: args.dataNotes } : {}),
    };

    if (fp) {
      await ctx.db.patch(fp._id, patch);
      return { ok: true, brandId: brand._id, profileId: fp._id, fields: Object.keys(patch).length };
    } else {
      const id = await ctx.db.insert("franchiseProfiles", { brandId: brand._id, ...patch });
      return { ok: true, brandId: brand._id, profileId: id, created: true };
    }
  },
});
