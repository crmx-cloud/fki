import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Due Diligence Dossier data.
 *
 * Given up to 3 brand ids (the user's top matches, or an explicit selection
 * via the ?brandIds= queryparam), returns everything the dossier report
 * needs in one round trip:
 *   - the signed-in user's prospect profile (for "why this fits you" rows)
 *   - per brand: the brand doc, its franchiseProfile (verified data,
 *     riskFlags, fieldSources), state availability rows, and territory counts.
 *
 * Auth-gated: returns null when signed out so the page can show the
 * locked upsell panel instead.
 */
export const getDossierData = query({
  args: { brandIds: v.array(v.id("brands")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prospect = await ctx.db
      .query("prospectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const ids = args.brandIds.slice(0, 3);
    const brands = [];

    for (const id of ids) {
      const brand = await ctx.db.get(id);
      if (!brand || brand.isActive === false) continue;

      const profile = await ctx.db
        .query("franchiseProfiles")
        .withIndex("by_brand", (q) => q.eq("brandId", id))
        .first();

      const territories = await ctx.db
        .query("territories")
        .withIndex("by_brand", (q) => q.eq("brandId", id))
        .collect();

      const stateRows = await ctx.db
        .query("stateAvailability")
        .withIndex("by_brand", (q) => q.eq("brandId", id))
        .collect();

      const openStatuses = ["available", "high_interest", "pending_award"];

      brands.push({
        brand,
        profile: profile ?? null,
        territoryCounts: {
          total: territories.length,
          // "open" territory records represent existing operating locations
          operating: territories.filter((t) => t.status === "open").length,
          sold: territories.filter((t) => t.status === "sold").length,
          available: territories.filter((t) => openStatuses.includes(t.status)).length,
        },
        stateAvailability: stateRows.map((r) => ({
          state: r.state,
          status: r.status,
          note: r.note,
        })),
      });
    }

    return {
      prospect: prospect ?? null,
      brands,
      generatedAt: Date.now(),
    };
  },
});
