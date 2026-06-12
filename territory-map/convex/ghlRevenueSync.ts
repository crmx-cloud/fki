import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Revenue attribution sync from CRMX/GHL — pulls opportunities and books
 * their monetary value into `revenueAttribution`, joined to profiles by
 * contact email. CONFIG-DRIVEN, not hard-coded: filter by pipeline,
 * status, and/or tag at call time from the KPI dashboard. Re-running is
 * safe — rows are deduped by GHL opportunity id.
 */

const GHL = "https://services.leadconnectorhq.com";

export const checkAdmin = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return !!profile && (profile.role === "admin" || profile.role === "super_admin");
  },
});

export const upsertBatch = internalMutation({
  args: {
    rows: v.array(
      v.object({
        ghlOpportunityId: v.string(),
        ghlContactId: v.optional(v.string()),
        profileEmail: v.optional(v.string()),
        amount: v.number(),
        revenueDate: v.string(),
        pipelineStage: v.optional(v.string()),
        triggerTag: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { rows }) => {
    let inserted = 0, skipped = 0;
    const existing = new Set(
      (await ctx.db.query("revenueAttribution").collect())
        .map((r: any) => r.ghlOpportunityId)
        .filter(Boolean)
    );
    for (const row of rows) {
      if (existing.has(row.ghlOpportunityId)) { skipped++; continue; }
      const email = row.profileEmail?.toLowerCase();
      const prospect = email
        ? await ctx.db
            .query("prospectProfiles")
            .withIndex("by_email", (q: any) => q.eq("email", email))
            .first()
        : null;
      const now = Date.now();
      await ctx.db.insert("revenueAttribution", {
        ...row,
        profileEmail: email,
        prospectProfileId: prospect?._id,
        source: "ghl_sync",
        createdAt: now,
        updatedAt: now,
      });
      if (email)
        await ctx.db.insert("activityEvents", {
          email, eventType: "revenue_attributed", ts: now,
          metadata: JSON.stringify({ amount: row.amount, via: "ghl_sync" }),
        });
      inserted++;
    }
    return { inserted, skipped };
  },
});

export const syncRevenue = action({
  args: {
    pipelineId: v.optional(v.string()),   // blank = all pipelines
    status: v.optional(v.string()),       // default "won"
    tag: v.optional(v.string()),          // only opportunities whose contact has this tag
  },
  handler: async (ctx, args): Promise<{ ok: boolean; inserted?: number; skipped?: number; scanned?: number; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, error: "Not signed in" };
    const isAdmin: boolean = await ctx.runQuery(internal.ghlRevenueSync.checkAdmin, { userId });
    if (!isAdmin) return { ok: false, error: "Admin only" };

    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) return { ok: false, error: "GHL env vars missing" };

    const headers = {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      Accept: "application/json",
    };
    const status = args.status || "won";

    const rows: any[] = [];
    let page = 1, scanned = 0;
    while (page <= 20) {
      const params = new URLSearchParams({
        location_id: locationId,
        limit: "100",
        page: String(page),
      });
      if (status !== "all") params.set("status", status);
      if (args.pipelineId) params.set("pipeline_id", args.pipelineId);
      const res = await fetch(`${GHL}/opportunities/search?${params}`, { headers });
      if (!res.ok) {
        const err = await res.text();
        return { ok: false, error: `GHL ${res.status}: ${err.slice(0, 160)}` };
      }
      const data = (await res.json()) as any;
      const opps: any[] = data.opportunities ?? [];
      scanned += opps.length;
      for (const o of opps) {
        const amount = Number(o.monetaryValue ?? 0);
        if (!amount || amount <= 0) continue;
        const contactTags: string[] = (o.contact?.tags ?? []).map((t: string) => t.toLowerCase());
        if (args.tag && !contactTags.includes(args.tag.toLowerCase())) continue;
        const when = o.lastStatusChangeAt || o.updatedAt || o.dateAdded || new Date().toISOString();
        rows.push({
          ghlOpportunityId: String(o.id),
          ghlContactId: o.contact?.id ? String(o.contact.id) : undefined,
          profileEmail: o.contact?.email || undefined,
          amount,
          revenueDate: String(when).slice(0, 10),
          pipelineStage: o.pipelineStageId ? String(o.pipelineStageId) : undefined,
          triggerTag: args.tag,
          notes: o.name ? `GHL opportunity: ${String(o.name).slice(0, 120)}` : undefined,
        });
      }
      if (opps.length < 100) break;
      page++;
    }

    const result: { inserted: number; skipped: number } = await ctx.runMutation(
      internal.ghlRevenueSync.upsertBatch,
      { rows }
    );
    return { ok: true, scanned, ...result };
  },
});
