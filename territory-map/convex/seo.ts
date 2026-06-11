import { query } from "./_generated/server";

/**
 * Public, unauthenticated read used by scripts/generate-seo.mjs at build time
 * to prerender crawlable brand pages, sitemap.xml, and llms.txt.
 *
 * ONLY public-safe fields: everything returned here already appears on the
 * public brand profile pages. No users, leads, contacts, or internal notes.
 */
export const publicSiteData = query({
  args: {},
  handler: async (ctx) => {
    const brands = (await ctx.db.query("brands").collect())
      .filter((b) => b.isActive !== false)
      .map((b) => ({
        _id: b._id,
        name: b.name,
        slug: b.slug,
        category: b.category,
        description: b.description,
        websiteUrl: b.websiteUrl,
        logoUrl: b.logoUrl,
        investmentMin: b.investmentMin,
        investmentMax: b.investmentMax,
        franchiseFee: b.franchiseFee,
        royaltyPercent: b.royaltyPercent,
      }));
    const brandIds = new Set(brands.map((b) => b._id.toString()));

    const profiles = (await ctx.db.query("franchiseProfiles").collect())
      .filter((fp) => brandIds.has(fp.brandId.toString()))
      .map((fp) => ({
        brandId: fp.brandId,
        avgUnitRevenue: fp.avgUnitRevenue,
        totalUnits: fp.totalUnits,
        yearFounded: fp.yearFounded,
        yearFranchising: fp.yearFranchising,
        liquidCapitalMin: fp.liquidCapitalMin,
        dataVerifiedAt: fp.dataVerifiedAt,
        verifiedFieldCount: fp.verifiedFieldCount,
        riskFlags: (fp.riskFlags ?? []).map((f) => ({
          severity: f.severity,
          title: f.title,
          source: f.source,
        })),
      }));

    // Record keyed by brandId (arrays max 50 entries — Convex caps returned
    // arrays at 8192 elements, and there are ~10K stateAvailability rows).
    const openStatesByBrand: Record<string, string[]> = {};
    for (const r of await ctx.db.query("stateAvailability").collect()) {
      if (r.status !== "open") continue;
      const k = r.brandId.toString();
      if (!brandIds.has(k)) continue;
      (openStatesByBrand[k] ??= []).push(r.state);
    }

    return { brands, profiles, openStatesByBrand };
  },
});
