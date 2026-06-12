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

/**
 * Public "Top Lists" pages — OUR OWN transparent methodology (unit counts,
 * investment levels, data-verification depth from sourced data). No
 * third-party ranking logic. Used by /lists pages and the static
 * prerenderer; brand data here is already public on brand pages.
 */
export const listPages = query({
  args: {},
  handler: async (ctx) => {
    const brands = (await ctx.db.query("brands").collect()).filter((b) => b.isActive !== false);
    const fps = await ctx.db.query("franchiseProfiles").collect();
    const fpMap = new Map(fps.map((f) => [f.brandId.toString(), f]));
    const row = (b: any) => {
      const f: any = fpMap.get(b._id.toString()) ?? {};
      return {
        name: b.name, slug: b.slug, category: b.category ?? null,
        investmentMin: b.investmentMin ?? f.totalInvestmentMin ?? null,
        investmentMax: b.investmentMax ?? f.totalInvestmentMax ?? null,
        franchiseFee: b.franchiseFee ?? f.franchiseFee ?? null,
        totalUnits: f.totalUnits ?? null,
        item19: f.item19Available === true,
        veteranDiscount: f.veteranDiscount === true,
        verifiedFieldCount: f.verifiedFieldCount ?? 0,
      };
    };
    const all = brands.map(row);
    const byUnits = [...all].filter((r) => r.totalUnits).sort((a, b) => (b.totalUnits! - a.totalUnits!));
    const cat = (needle: string) =>
      byUnits.filter((r) => r.category?.toLowerCase().includes(needle)).slice(0, 25);

    const lists = [
      {
        slug: "largest-franchises",
        title: "100 Largest Franchises by Unit Count",
        description: "The biggest franchise systems in our database, ranked by total operating units.",
        methodology: "Ranked by total units (franchised + company-owned) from sourced FDD and franchisor disclosures in the FranchiseKI database. Updated as data is re-verified.",
        rows: byUnits.slice(0, 100),
      },
      {
        slug: "low-cost-franchises",
        title: "Top 50 Low-Cost Franchises",
        description: "Verified franchises with the lowest minimum total investment.",
        methodology: "Ranked by minimum estimated total investment (FDD Item 7) ascending. Only brands with sourced investment data are included.",
        rows: [...all].filter((r) => r.investmentMin).sort((a, b) => a.investmentMin! - b.investmentMin!).slice(0, 50),
      },
      {
        slug: "most-transparent-franchises",
        title: "Top 50 Most Transparent Franchises",
        description: "Brands that publish an Item 19 financial performance representation, ranked by data depth.",
        methodology: "Brands disclosing an FDD Item 19 financial performance representation, ranked by the number of independently verified data points on their FranchiseKI profile.",
        rows: [...all].filter((r) => r.item19).sort((a, b) => b.verifiedFieldCount - a.verifiedFieldCount).slice(0, 50),
      },
      {
        slug: "veteran-friendly-franchises",
        title: "Top Veteran-Friendly Franchises",
        description: "Franchises offering documented veteran incentives, ranked by system size.",
        methodology: "Brands with a sourced veteran discount or incentive, ranked by total units.",
        rows: byUnits.filter((r) => r.veteranDiscount).slice(0, 50),
      },
      {
        slug: "food-beverage-franchises",
        title: "Top 25 Food & Beverage Franchises",
        description: "The largest food and beverage franchise systems in our database.",
        methodology: "Food & beverage brands ranked by total units from sourced disclosures.",
        rows: cat("food"),
      },
      {
        slug: "home-services-franchises",
        title: "Top 25 Home Services Franchises",
        description: "The largest home-services franchise systems in our database.",
        methodology: "Home-services brands ranked by total units from sourced disclosures.",
        rows: cat("home"),
      },
      {
        slug: "health-fitness-franchises",
        title: "Top 25 Health & Fitness Franchises",
        description: "The largest health, wellness, and fitness franchise systems in our database.",
        methodology: "Health/wellness/fitness brands ranked by total units from sourced disclosures.",
        rows: [...byUnits.filter((r) => /health|fitness|wellness/i.test(r.category ?? "")).slice(0, 25)],
      },
    ];
    return lists.map((l) => ({ ...l, rows: l.rows.map((r, i) => ({ rank: i + 1, ...r })) }));
  },
});
