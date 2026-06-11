import { v } from "convex/values";
import { mutation, query, httpAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * CRMX/GHL → MapKi Territory Sync
 *
 * Pipeline stage → Territory status mapping:
 *   Financial Review → high_interest
 *   Biz Plan Review → high_interest
 *   Discovery Day → high_interest
 *   FA/Invoice Request Submitted → pending_award
 *   Won (closed-won) → sold
 *   Lost (closed-lost) → removed from map
 *
 * The sync is triggered externally by a Viktor cron script
 * that fetches opportunities from GHL and POSTs mapped data here.
 */

// Stage ID → Territory status mapping
const STAGE_STATUS_MAP: Record<string, string> = {
  // 00-Sales pipeline stages
  "4393a866-48da-4f6e-b21b-b4177e15d894": "high_interest", // Financial Review
  "640fc779-ddfa-4c3f-b6bc-2d846bf86ef4": "high_interest", // Biz Plan Review
  "7625445f-a69c-476c-bc42-a69d9d56d779": "high_interest", // Discovery Day
  "a38349cd-6028-4444-96bd-7115ae4a22f1": "pending_award", // FA/Invoice Request
};

// Valid territory statuses
const VALID_STATUSES = [
  "available",
  "high_interest",
  "pending_award",
  "sold",
  "open",
] as const;

/**
 * Receive sync data from external script (called via HTTP action).
 * Each item: { brandSlug, city, state, status, contactName?, notes?, ghlOpportunityId? }
 */
export const pushSyncData = mutation({
  args: {
    territories: v.array(
      v.object({
        brandSlug: v.string(),
        city: v.string(),
        state: v.string(),
        status: v.string(),
        contactName: v.optional(v.string()),
        notes: v.optional(v.string()),
        ghlOpportunityId: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { territories }) => {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let removed = 0;

    for (const t of territories) {
      // Find the brand by slug
      const brand = await ctx.db
        .query("brands")
        .withIndex("by_slug", (q) => q.eq("slug", t.brandSlug))
        .first();
      if (!brand) {
        skipped++;
        continue;
      }

      // Validate status
      if (!VALID_STATUSES.includes(t.status as any) && t.status !== "remove") {
        skipped++;
        continue;
      }

      // Find existing territory by brand + city + state
      const existingTerritories = await ctx.db
        .query("territories")
        .withIndex("by_brand", (q) => q.eq("brandId", brand._id))
        .collect();

      const existing = existingTerritories.find(
        (et) =>
          et.city.toLowerCase() === t.city.toLowerCase() &&
          et.state.toLowerCase() === t.state.toLowerCase()
      );

      if (t.status === "remove") {
        // Remove territory (lost deal)
        if (existing) {
          await ctx.db.delete(existing._id);
          removed++;
        }
        continue;
      }

      if (existing) {
        // Update existing territory
        const updates: any = { status: t.status };
        if (t.contactName) updates.assignedTo = t.contactName;
        if (t.notes) updates.notes = t.notes;
        if (t.latitude) updates.latitude = t.latitude;
        if (t.longitude) updates.longitude = t.longitude;
        await ctx.db.patch(existing._id, updates);
        updated++;
      } else {
        // Create new territory
        await ctx.db.insert("territories", {
          brandId: brand._id,
          city: t.city,
          state: t.state,
          status: t.status as any,
          assignedTo: t.contactName,
          notes: t.notes
            ? `${t.notes}${t.ghlOpportunityId ? ` | GHL: ${t.ghlOpportunityId}` : ""}`
            : t.ghlOpportunityId
              ? `GHL: ${t.ghlOpportunityId}`
              : undefined,
          latitude: t.latitude,
          longitude: t.longitude,
        });
        created++;
      }
    }

    // Log the sync
    await ctx.db.insert("activityLog", {
      action: "crm_sync",
      entityType: "territory",
      details: `CRM sync: ${created} created, ${updated} updated, ${removed} removed, ${skipped} skipped`,
    });

    return { created, updated, removed, skipped };
  },
});

/**
 * Get last sync timestamp from activity log.
 */
export const getLastSync = query({
  args: {},
  handler: async (ctx) => {
    const lastSync = await ctx.db
      .query("activityLog")
      .order("desc")
      .filter((q) => q.eq(q.field("action"), "crm_sync"))
      .first();
    return lastSync;
  },
});

/**
 * HTTP action handler for receiving sync data.
 * Called by the Viktor cron script.
 */
export const syncHttpHandler = httpAction(async (ctx, request) => {
  // Simple auth check via header
  const authHeader = request.headers.get("X-Sync-Secret");
  const expectedSecret = process.env.SYNC_SECRET;

  if (expectedSecret && authHeader !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const result = await ctx.runMutation(api.crmSync.pushSyncData, {
      territories: body.territories || [],
    });
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Sync failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
