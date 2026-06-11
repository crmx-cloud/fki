import { httpAction } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Internal mutation to batch-insert territories
export const insertBatch = internalMutation({
  args: {
    brandId: v.string(),
    territories: v.array(v.object({
      city: v.string(),
      state: v.string(),
      status: v.string(),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { brandId, territories }) => {
    let inserted = 0;
    for (const t of territories) {
      await ctx.db.insert("territories", {
        brandId: brandId as any,
        city: t.city,
        state: t.state,
        status: t.status as any,
        latitude: t.latitude,
        longitude: t.longitude,
      });
      inserted++;
    }
    return inserted;
  },
});

// HTTP endpoint for sync
export const syncHandler = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    if (body.secret !== "mapki-sync-2026") {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }

    const { brandId, territories } = body;
    if (!brandId || !territories || !Array.isArray(territories)) {
      return new Response(JSON.stringify({ error: "missing brandId or territories" }), { status: 400 });
    }

    // Batch in chunks of 50
    let total = 0;
    for (let i = 0; i < territories.length; i += 50) {
      const chunk = territories.slice(i, i + 50);
      const inserted = await ctx.runMutation(internal.syncTerritories.insertBatch, {
        brandId,
        territories: chunk,
      });
      total += (inserted as number);
    }

    return new Response(JSON.stringify({ ok: true, inserted: total }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
