import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ── Stage definitions ──────────────────────────────────────
export const CRM_STAGES = [
  "new_lead",
  "intro_call",
  "qualified",
  "discovery_day",
  "pending_contract",
  "awarded",
  "lost",
] as const;

const stageValidator = v.union(
  v.literal("new_lead"),
  v.literal("intro_call"),
  v.literal("qualified"),
  v.literal("discovery_day"),
  v.literal("pending_contract"),
  v.literal("awarded"),
  v.literal("lost")
);

// ── Helpers ────────────────────────────────────────────────
async function requireBrandAccess(ctx: any, brandId: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!profile) throw new Error("No profile found");

  const isAdmin = profile.role === "admin" || profile.role === "super_admin";
  const isBrandAdmin = profile.role === "brand_admin";
  const isFranchisor = profile.role === "franchisor";

  if (isAdmin) return { userId, profile, isAdmin: true };

  if ((isBrandAdmin || isFranchisor) && profile.brandIds?.includes(brandId)) {
    return { userId, profile, isAdmin: false };
  }

  throw new Error("Access denied: you don't have access to this brand's CRM");
}

async function requireAnyBrandAccess(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!profile) throw new Error("No profile found");

  const isAdmin = profile.role === "admin" || profile.role === "super_admin";
  return { userId, profile, isAdmin };
}

// ── Queries ────────────────────────────────────────────────

/** List leads for a brand (scoped to user's access) */
export const listLeads = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return [];

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isBroker = profile.role === "broker";
    const hasAccess = isAdmin || isBroker || profile.brandIds?.includes(brandId);
    if (!hasAccess) return [];

    const all = await ctx.db
      .query("crmLeads")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .order("desc")
      .collect();

    let leads = all.filter((l) => !l.deletedAt);
    // Brokers: assigned leads only, regardless of brand
    if (isBroker) leads = leads.filter((l) => l.salesRepId === userId);

    // Role-based field masking: franchisor/brand_admin see limited contact info
    if (profile.role === "franchisor" || profile.role === "brand_admin") {
      return leads.map((l) => ({
        ...l,
        lastName: l.lastName ? l.lastName.charAt(0) : undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
      }));
    }

    return leads;
  },
});

/** Get a single lead (with field masking for brand roles) */
export const getLead = query({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, { leadId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const lead = await ctx.db.get(leadId);
    if (!lead || lead.deletedAt) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    if (!isAdmin && !profile.brandIds?.includes(lead.brandId)) return null;

    // Field masking for brand roles (franchisor/brand_admin see limited info)
    if (profile.role === "franchisor" || profile.role === "brand_admin") {
      return {
        ...lead,
        lastName: lead.lastName ? lead.lastName.charAt(0) : undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
      };
    }

    return lead;
  },
});

/** Stats for a brand's CRM pipeline */
export const getStats = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    if (!isAdmin && !profile.brandIds?.includes(brandId)) return null;

    const allLeads = await ctx.db
      .query("crmLeads")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();
    const leads = allLeads.filter((l) => !l.deletedAt);

    const byStage: Record<string, number> = {};
    for (const s of CRM_STAGES) byStage[s] = 0;
    for (const l of leads) byStage[l.stage] = (byStage[l.stage] || 0) + 1;

    const now = Date.now();
    const last30 = leads.filter((l) => now - l.createdAt < 30 * 86400000).length;
    const last7 = leads.filter((l) => now - l.createdAt < 7 * 86400000).length;

    return {
      total: leads.length,
      byStage,
      last7,
      last30,
      active: leads.filter((l) => l.stage !== "awarded" && l.stage !== "lost").length,
      awarded: byStage.awarded || 0,
      lost: byStage.lost || 0,
    };
  },
});

/** Export all leads for a brand (CSV-ready) */
export const exportLeads = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return [];

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const canExport = isAdmin || profile.permissions?.canExportData;
    if (!canExport && !profile.brandIds?.includes(brandId)) return [];

    const all = await ctx.db
      .query("crmLeads")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .order("desc")
      .collect();
    return all.filter((l) => !l.deletedAt);
  },
});

/** Get notification settings for a brand */
export const getNotificationSettings = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    if (!isAdmin && !profile.brandIds?.includes(brandId)) return null;

    return await ctx.db
      .query("brandNotifications")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .first();
  },
});

/** List ALL leads across all brands (admin only) */
export const listAllLeads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return [];

    // Brokers see ONLY leads assigned to them — enforced here, not in the UI.
    if (profile.role === "broker") {
      const mine = await ctx.db
        .query("crmLeads")
        .withIndex("by_sales_rep", (q) => q.eq("salesRepId", userId))
        .order("desc")
        .collect();
      return mine.filter((l) => !l.deletedAt);
    }

    if (profile.role !== "admin" && profile.role !== "super_admin") return [];

    const all = await ctx.db
      .query("crmLeads")
      .order("desc")
      .collect();
    return all.filter((l) => !l.deletedAt);
  },
});

/** Stats across ALL brands (admin only) */
export const getStatsAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) return null;

    const allLeads = await ctx.db.query("crmLeads").collect();
    const leads = allLeads.filter((l) => !l.deletedAt);

    const byStage: Record<string, number> = {};
    for (const s of CRM_STAGES) byStage[s] = 0;
    for (const l of leads) byStage[l.stage] = (byStage[l.stage] || 0) + 1;

    const now = Date.now();
    const last7 = leads.filter((l) => now - l.createdAt < 7 * 86400000).length;
    const last30 = leads.filter((l) => now - l.createdAt < 30 * 86400000).length;

    return {
      total: leads.length,
      byStage,
      last7,
      last30,
      active: leads.filter((l) => l.stage !== "awarded" && l.stage !== "lost").length,
      awarded: byStage.awarded || 0,
      lost: byStage.lost || 0,
    };
  },
});

/** Export ALL leads across all brands (admin only) */
export const exportAllLeads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) return [];

    const all = await ctx.db
      .query("crmLeads")
      .order("desc")
      .collect();
    return all.filter((l) => !l.deletedAt);
  },
});

/** List brands the current user has CRM access to */
export const myBrands = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return [];

    if (profile.role === "admin" || profile.role === "super_admin") {
      return await ctx.db.query("brands").collect();
    }

    if (!profile.brandIds || profile.brandIds.length === 0) return [];

    const brands = await Promise.all(
      profile.brandIds.map((id) => ctx.db.get(id))
    );
    return brands.filter(Boolean);
  },
});

/** Get all associations for a lead - enriched with related object data */
export const getLeadAssociations = query({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, { leadId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const lead = await ctx.db.get(leadId);
    if (!lead || lead.deletedAt) return null;

    // Sales Rep
    let salesRep = null;
    if (lead.salesRepId) {
      const user = await ctx.db.get(lead.salesRepId);
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", lead.salesRepId!))
        .first();
      salesRep = profile ? {
        userId: lead.salesRepId,
        name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        email: user?.email,
        role: profile.role,
      } : null;
    }

    // Setter
    let setter = null;
    if (lead.setterId) {
      const user = await ctx.db.get(lead.setterId);
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", lead.setterId!))
        .first();
      setter = profile ? {
        userId: lead.setterId,
        name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        email: user?.email,
        role: profile.role,
      } : null;
    }

    // Interested brands (hearted / matched)
    const interestedBrands = [];
    if (lead.interestedBrandIds) {
      for (const brandId of lead.interestedBrandIds) {
        const brand = await ctx.db.get(brandId);
        if (brand) interestedBrands.push({ _id: brand._id, name: brand.name, slug: brand.slug, logoUrl: brand.logoUrl });
      }
    }

    // Linked territories
    const territories = [];
    if (lead.territoryIds) {
      for (const tId of lead.territoryIds) {
        const t = await ctx.db.get(tId);
        if (t) {
          const brand = await ctx.db.get(t.brandId);
          territories.push({ _id: t._id, city: t.city, state: t.state, status: t.status, brandName: brand?.name });
        }
      }
    }

    // Tags
    const tags = lead.tags || [];

    // Notes count
    const notes = await ctx.db
      .query("contactNotes")
      .withIndex("by_contact", (q) => q.eq("contactId", leadId))
      .collect();

    // Primary brand
    const primaryBrand = await ctx.db.get(lead.brandId);

    // Linked contact record
    let linkedContact: {
      _id: string;
      type: string;
      status: string;
      adminVerified: boolean;
      firstName: string;
      lastName?: string;
      email: string;
      source: string;
    } | null = null;
    if (lead.contactId) {
      const c = await ctx.db.get(lead.contactId);
      if (c) {
        linkedContact = {
          _id: c._id,
          type: c.type,
          status: c.status,
          adminVerified: c.adminVerified || false,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          source: c.source,
        };
      }
    }

    return {
      salesRep,
      setter,
      interestedBrands,
      territories,
      tags,
      notesCount: notes.length,
      primaryBrand: primaryBrand ? { _id: primaryBrand._id, name: primaryBrand.name, slug: primaryBrand.slug } : null,
      linkedContact,
    };
  },
});

// ── Mutations ──────────────────────────────────────────────

/** Create a new CRM lead */
export const createLead = mutation({
  args: {
    brandId: v.id("brands"),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    liquidCapital: v.optional(v.string()),
    mainTerritory: v.optional(v.string()),
    secondTerritory: v.optional(v.string()),
    thirdTerritory: v.optional(v.string()),
    numTerritories: v.optional(v.number()),
    stage: v.optional(stageValidator),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireBrandAccess(ctx, args.brandId);
    const now = Date.now();

    // Auto-link to contact if email provided
    let contactId: any = undefined;
    if (args.email) {
      const contact = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q) => q.eq("email", args.email!.toLowerCase()))
        .first();
      if (contact) {
        contactId = contact._id;
      }
    }

    const leadId = await ctx.db.insert("crmLeads", {
      ...args,
      contactId,
      stage: args.stage || "new_lead",
      source: args.source || "manual",
      createdAt: now,
      updatedAt: now,
    });

    // Auto-create contact if none found
    if (!contactId && args.email) {
      await ctx.scheduler.runAfter(0, internal.contacts.findOrCreateContact, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        type: "prospect",
        source: "manual",
      });
    }

    await ctx.db.insert("activityLog", {
      userId,
      action: "crm_lead_created",
      entityType: "crmLead",
      entityId: leadId,
      details: `Created lead: ${args.firstName} ${args.lastName || ""}`.trim(),
    });

    // Sync to CRMX (GoHighLevel FKI sub-account) — fail-soft
    const crmxBrand = await ctx.db.get(args.brandId);
    await ctx.scheduler.runAfter(0, internal.crmxPush.pushLeadToCRMX, {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      brandName: crmxBrand?.name,
      territory: args.mainTerritory,
      liquidCapital: args.liquidCapital,
      leadKind: "brand_inquiry",
      notes: args.notes,
    });

    // Schedule notification email if enabled
    await ctx.scheduler.runAfter(0, internal.crm.notifyNewLead, {
      leadId,
      brandId: args.brandId,
    });

    // Schedule auto-assignment
    await ctx.scheduler.runAfter(0, internal.autoAssignment.assignNewLead, {
      leadId,
      brandId: args.brandId,
    });

    return leadId;
  },
});

/** Create a CRM lead from a public prospect inquiry (no auth required) */
export const createLeadFromProspect = mutation({
  args: {
    brandId: v.id("brands"),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    liquidCapital: v.optional(v.string()),
    mainTerritory: v.optional(v.string()),
    numTerritories: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Auto-link to contact if email provided
    let contactId: any = undefined;
    if (args.email) {
      const contact = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q) => q.eq("email", args.email!.toLowerCase()))
        .first();
      if (contact) {
        contactId = contact._id;
      }
    }

    const leadId = await ctx.db.insert("crmLeads", {
      ...args,
      contactId,
      stage: "new_lead",
      source: "franchiseki-website",
      createdAt: now,
      updatedAt: now,
    });

    // KPI activity stream: a prospect-initiated lead = consultant request
    await ctx.db.insert("activityEvents", {
      userId: (await getAuthUserId(ctx)) ?? undefined,
      email: args.email?.toLowerCase(),
      eventType: "consultant_requested",
      ts: now,
      brandId: args.brandId,
    });

    // Sync to CRMX (GoHighLevel FKI sub-account) — fail-soft, never blocks the lead
    const inquiryBrand = await ctx.db.get(args.brandId);
    // Generate the consultant AI brief now that a lead exists for this prospect
    const briefUserId = await getAuthUserId(ctx);
    if (briefUserId) {
      await ctx.scheduler.runAfter(0, internal.prospectBrief.generateForUser, { userId: briefUserId });
    }
    await ctx.scheduler.runAfter(0, internal.crmxPush.pushLeadToCRMX, {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      brandName: inquiryBrand?.name,
      territory: args.mainTerritory,
      liquidCapital: args.liquidCapital,
      leadKind: "brand_inquiry",
      notes: args.notes,
    });

    // Auto-create contact if none found (for leads without existing contact)
    if (!contactId && args.email) {
      await ctx.scheduler.runAfter(0, internal.contacts.findOrCreateContact, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        type: "prospect",
        source: "signup",
      });
    }

    // Schedule notification
    await ctx.scheduler.runAfter(0, internal.crm.notifyNewLead, {
      leadId,
      brandId: args.brandId,
    });

    // Schedule auto-assignment
    await ctx.scheduler.runAfter(0, internal.autoAssignment.assignNewLead, {
      leadId,
      brandId: args.brandId,
    });

    return leadId;
  },
});

/** Update a lead */
export const updateLead = mutation({
  args: {
    leadId: v.id("crmLeads"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    liquidCapital: v.optional(v.string()),
    mainTerritory: v.optional(v.string()),
    secondTerritory: v.optional(v.string()),
    thirdTerritory: v.optional(v.string()),
    numTerritories: v.optional(v.number()),
    stage: v.optional(stageValidator),
    notes: v.optional(v.string()),
    salesRepId: v.optional(v.id("users")),
    setterId: v.optional(v.id("users")),
    interestedBrandIds: v.optional(v.array(v.id("brands"))),
    territoryIds: v.optional(v.array(v.id("territories"))),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");

    // Broker path: only their assigned leads, only stage + notes — no
    // contact-data edits, no reassignment. Everyone else: brand access.
    const authUserId = await getAuthUserId(ctx);
    const authProfile = authUserId
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", authUserId))
          .first()
      : null;
    let userId: any;
    if (authProfile?.role === "broker") {
      if (lead.salesRepId !== authUserId) throw new Error("Access denied: lead not assigned to you");
      const allowedKeys = new Set(["leadId", "stage", "notes"]);
      for (const k of Object.keys(args)) {
        if (!allowedKeys.has(k) && (args as any)[k] !== undefined) {
          throw new Error("Access denied: brokers can only update stage and notes");
        }
      }
      userId = authUserId;
    } else {
      ({ userId } = await requireBrandAccess(ctx, lead.brandId));
    }

    const { leadId, ...updates } = args;
    const filtered: any = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) filtered[k] = val;
    }

    await ctx.db.patch(args.leadId, filtered);

    // Log stage changes specifically
    if (args.stage && args.stage !== lead.stage) {
      await ctx.db.insert("activityLog", {
        userId,
        action: "crm_stage_changed",
        entityType: "crmLead",
        entityId: args.leadId,
        details: `${lead.firstName} ${lead.lastName || ""}: ${lead.stage} → ${args.stage}`,
      });
    }

    // Log rep/setter assignment changes
    if (args.salesRepId !== undefined && args.salesRepId !== lead.salesRepId) {
      await ctx.db.insert("repAssignmentHistory", {
        leadId: args.leadId,
        field: "salesRep",
        fromUserId: lead.salesRepId,
        toUserId: args.salesRepId,
        changedBy: userId,
        changedAt: Date.now(),
      });
    }
    if (args.setterId !== undefined && args.setterId !== lead.setterId) {
      await ctx.db.insert("repAssignmentHistory", {
        leadId: args.leadId,
        field: "setter",
        fromUserId: lead.setterId,
        toUserId: args.setterId,
        changedBy: userId,
        changedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/** Delete a lead */
export const deleteLead = mutation({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) throw new Error("Lead not found");

    await requireBrandAccess(ctx, lead.brandId);
    await ctx.db.delete(leadId);
    return { success: true };
  },
});

/** Update notification settings for a brand */
export const updateNotificationSettings = mutation({
  args: {
    brandId: v.id("brands"),
    emailsEnabled: v.boolean(),
    notifyEmails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireBrandAccess(ctx, args.brandId);

    // Validate: max 5 emails
    if (args.notifyEmails.length > 5) {
      throw new Error("Maximum 5 notification emails allowed");
    }

    // Clean + validate emails
    const cleaned = args.notifyEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));

    const existing = await ctx.db
      .query("brandNotifications")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        emailsEnabled: args.emailsEnabled,
        notifyEmails: cleaned,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("brandNotifications", {
        brandId: args.brandId,
        emailsEnabled: args.emailsEnabled,
        notifyEmails: cleaned,
        updatedBy: userId,
      });
    }

    return { success: true };
  },
});

// ── Bulk Operations ────────────────────────────────────────

/** Bulk update stage for multiple leads */
export const bulkUpdateStage = mutation({
  args: {
    leadIds: v.array(v.id("crmLeads")),
    stage: stageValidator,
  },
  handler: async (ctx, { leadIds, stage }) => {
    const { userId, profile } = await requireAnyBrandAccess(ctx);
    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const now = Date.now();
    let updated = 0;

    for (const id of leadIds) {
      const lead = await ctx.db.get(id);
      if (!lead || lead.deletedAt) continue;
      if (!isAdmin && !profile.brandIds?.includes(lead.brandId)) continue;

      const oldStage = lead.stage;
      await ctx.db.patch(id, { stage, updatedAt: now });
      updated++;

      if (oldStage !== stage) {
        await ctx.db.insert("activityLog", {
          userId,
          action: "crm_stage_changed",
          entityType: "crmLead",
          entityId: id,
          details: `Bulk: ${lead.firstName} ${lead.lastName || ""}: ${oldStage} → ${stage}`,
        });
      }
    }
    return { success: true, updated };
  },
});

/** Bulk move leads to a different brand */
export const bulkUpdateBrand = mutation({
  args: {
    leadIds: v.array(v.id("crmLeads")),
    brandId: v.id("brands"),
  },
  handler: async (ctx, { leadIds, brandId }) => {
    const { userId, profile } = await requireAnyBrandAccess(ctx);
    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    if (!isAdmin) throw new Error("Only admins can move leads between brands");

    const brand = await ctx.db.get(brandId);
    if (!brand) throw new Error("Target brand not found");

    const now = Date.now();
    let updated = 0;

    for (const id of leadIds) {
      const lead = await ctx.db.get(id);
      if (!lead || lead.deletedAt) continue;

      await ctx.db.patch(id, { brandId, updatedAt: now });
      updated++;

      await ctx.db.insert("activityLog", {
        userId,
        action: "crm_brand_changed",
        entityType: "crmLead",
        entityId: id,
        details: `Moved ${lead.firstName} to ${brand.name}`,
      });
    }
    return { success: true, updated };
  },
});

/** Bulk update interested territories */
export const bulkUpdateTerritories = mutation({
  args: {
    leadIds: v.array(v.id("crmLeads")),
    interestedTerritories: v.array(v.string()),
  },
  handler: async (ctx, { leadIds, interestedTerritories }) => {
    const { profile } = await requireAnyBrandAccess(ctx);
    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const now = Date.now();
    let updated = 0;

    for (const id of leadIds) {
      const lead = await ctx.db.get(id);
      if (!lead || lead.deletedAt) continue;
      if (!isAdmin && !profile.brandIds?.includes(lead.brandId)) continue;

      await ctx.db.patch(id, { interestedTerritories, updatedAt: now });
      updated++;
    }
    return { success: true, updated };
  },
});

/** Bulk add tags to multiple leads */
export const bulkAddTags = mutation({
  args: {
    leadIds: v.array(v.id("crmLeads")),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { leadIds, tags }) => {
    const { profile } = await requireAnyBrandAccess(ctx);
    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const cleanTags = tags.map((t) => t.trim().toLowerCase());
    const now = Date.now();
    let updated = 0;

    for (const id of leadIds) {
      const lead = await ctx.db.get(id);
      if (!lead || lead.deletedAt) continue;
      if (!isAdmin && !profile.brandIds?.includes(lead.brandId)) continue;

      const existing = new Set(lead.tags || []);
      let changed = false;
      for (const tag of cleanTags) {
        if (!existing.has(tag)) { existing.add(tag); changed = true; }
      }
      if (changed) {
        await ctx.db.patch(id, { tags: Array.from(existing), updatedAt: now });
        updated++;
      }
    }
    return { success: true, updated };
  },
});

/** Bulk remove tags from multiple leads */
export const bulkRemoveTags = mutation({
  args: {
    leadIds: v.array(v.id("crmLeads")),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { leadIds, tags }) => {
    const { profile } = await requireAnyBrandAccess(ctx);
    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const removeSet = new Set(tags.map((t) => t.trim().toLowerCase()));
    const now = Date.now();
    let updated = 0;

    for (const id of leadIds) {
      const lead = await ctx.db.get(id);
      if (!lead || lead.deletedAt) continue;
      if (!isAdmin && !profile.brandIds?.includes(lead.brandId)) continue;
      if (!lead.tags) continue;

      const filtered = lead.tags.filter((t: string) => !removeSet.has(t));
      if (filtered.length !== lead.tags.length) {
        await ctx.db.patch(id, { tags: filtered, updatedAt: now });
        updated++;
      }
    }
    return { success: true, updated };
  },
});

/** Bulk soft-delete multiple leads */
export const bulkDelete = mutation({
  args: { leadIds: v.array(v.id("crmLeads")) },
  handler: async (ctx, { leadIds }) => {
    const { userId, profile } = await requireAnyBrandAccess(ctx);
    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const now = Date.now();
    let deleted = 0;

    for (const id of leadIds) {
      const lead = await ctx.db.get(id);
      if (!lead || lead.deletedAt) continue;
      if (!isAdmin && !profile.brandIds?.includes(lead.brandId)) continue;

      await ctx.db.patch(id, { deletedAt: now, deletedBy: userId, updatedAt: now });
      deleted++;
    }

    await ctx.db.insert("activityLog", {
      userId,
      action: "crm_bulk_delete",
      entityType: "crmLead",
      details: `Bulk soft-deleted ${deleted} leads`,
    });

    return { success: true, deleted };
  },
});

// ── Soft Delete ────────────────────────────────────────────

/** Link a lead to a contact — auto-match by email or explicit ID */
export const linkLeadToContact = mutation({
  args: {
    leadId: v.id("crmLeads"),
    contactId: v.optional(v.id("contacts")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");

    let contactId = args.contactId;

    // Auto-match by email if no contactId provided
    if (!contactId && lead.email) {
      const contact = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q) => q.eq("email", lead.email!.toLowerCase()))
        .first();
      if (contact) {
        contactId = contact._id;
      }
    }

    // Create a new contact from lead data if no match found
    if (!contactId) {
      contactId = await ctx.db.insert("contacts", {
        type: "prospect",
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: (lead.email || "").toLowerCase(),
        phone: lead.phone,
        address: lead.address,
        status: "active",
        source: "backfill",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.leadId, { contactId, updatedAt: Date.now() });

    return { contactId };
  },
});

/** Soft delete a single lead */
export const softDelete = mutation({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) throw new Error("Lead not found");
    if (lead.deletedAt) throw new Error("Lead already deleted");

    const { userId } = await requireBrandAccess(ctx, lead.brandId);
    const now = Date.now();

    await ctx.db.patch(leadId, { deletedAt: now, deletedBy: userId, updatedAt: now });

    await ctx.db.insert("activityLog", {
      userId,
      action: "crm_lead_soft_deleted",
      entityType: "crmLead",
      entityId: leadId,
      details: `Soft-deleted: ${lead.firstName} ${lead.lastName || ""}`,
    });

    return { success: true };
  },
});

/** Restore a soft-deleted lead (super_admin only) */
export const restoreLead = mutation({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, { leadId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || profile.role !== "super_admin")
      throw new Error("Only super_admin can restore deleted leads");

    const lead = await ctx.db.get(leadId);
    if (!lead) throw new Error("Lead not found");
    if (!lead.deletedAt) throw new Error("Lead is not deleted");

    await ctx.db.patch(leadId, {
      deletedAt: undefined,
      deletedBy: undefined,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      userId,
      action: "crm_lead_restored",
      entityType: "crmLead",
      entityId: leadId,
      details: `Restored: ${lead.firstName} ${lead.lastName || ""}`,
    });

    return { success: true };
  },
});

/** List all soft-deleted leads (super_admin only, within 6 months) */
export const listDeletedLeads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || profile.role !== "super_admin") return [];

    const sixMonthsAgo = Date.now() - 180 * 86400000;
    const all = await ctx.db.query("crmLeads").collect();

    return all.filter(
      (l) => l.deletedAt && l.deletedAt > sixMonthsAgo
    );
  },
});

/** Permanently delete a lead (super_admin only) */
export const permanentlyDelete = mutation({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, { leadId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || profile.role !== "super_admin")
      throw new Error("Only super_admin can permanently delete leads");

    const lead = await ctx.db.get(leadId);
    if (!lead) throw new Error("Lead not found");

    await ctx.db.delete(leadId);

    await ctx.db.insert("activityLog", {
      userId,
      action: "crm_lead_permanent_delete",
      entityType: "crmLead",
      details: `Permanently deleted: ${lead.firstName} ${lead.lastName || ""}`,
    });

    return { success: true };
  },
});

// ── Merge ──────────────────────────────────────────────────

/** Merge two contacts — secondary gets soft-deleted */
export const mergeContacts = mutation({
  args: {
    primaryId: v.id("crmLeads"),
    secondaryId: v.id("crmLeads"),
    resolvedFields: v.object({
      firstName: v.optional(v.literal("secondary")),
      lastName: v.optional(v.literal("secondary")),
      email: v.optional(v.literal("secondary")),
      phone: v.optional(v.literal("secondary")),
      address: v.optional(v.literal("secondary")),
      liquidCapital: v.optional(v.literal("secondary")),
      mainTerritory: v.optional(v.literal("secondary")),
      secondTerritory: v.optional(v.literal("secondary")),
      thirdTerritory: v.optional(v.literal("secondary")),
      notes: v.optional(v.literal("secondary")),
      stage: v.optional(v.literal("secondary")),
    }),
  },
  handler: async (ctx, { primaryId, secondaryId, resolvedFields }) => {
    const { userId } = await requireAnyBrandAccess(ctx);
    const primary = await ctx.db.get(primaryId);
    const secondary = await ctx.db.get(secondaryId);
    if (!primary || !secondary) throw new Error("One or both leads not found");
    if (primary.deletedAt || secondary.deletedAt)
      throw new Error("Cannot merge deleted leads");

    // Build merged data — start with primary, override with secondary where specified
    const updates: any = { updatedAt: Date.now() };
    const fieldKeys = [
      "firstName", "lastName", "email", "phone", "address",
      "liquidCapital", "mainTerritory", "secondTerritory", "thirdTerritory",
      "notes", "stage",
    ] as const;

    for (const key of fieldKeys) {
      if (resolvedFields[key] === "secondary") {
        updates[key] = (secondary as any)[key];
      }
    }

    // Merge tags (union)
    const mergedTags = Array.from(
      new Set([...(primary.tags || []), ...(secondary.tags || [])])
    );
    updates.tags = mergedTags;

    // Merge interested territories (union)
    const mergedTerritories = Array.from(
      new Set([
        ...(primary.interestedTerritories || []),
        ...(secondary.interestedTerritories || []),
      ])
    );
    updates.interestedTerritories = mergedTerritories;

    // Apply to primary
    await ctx.db.patch(primaryId, updates);

    // Soft-delete secondary
    const now = Date.now();
    await ctx.db.patch(secondaryId, {
      deletedAt: now,
      deletedBy: userId,
      updatedAt: now,
    });

    await ctx.db.insert("activityLog", {
      userId,
      action: "crm_contacts_merged",
      entityType: "crmLead",
      entityId: primaryId,
      details: `Merged ${secondary.firstName} ${secondary.lastName || ""} into ${primary.firstName} ${primary.lastName || ""}`,
    });

    return { success: true, primaryId };
  },
});

// ── Export with Field Selection ─────────────────────────────

/** Export leads with field selection */
export const exportWithFields = query({
  args: {
    brandId: v.optional(v.id("brands")),
    fields: v.array(v.string()),
  },
  handler: async (ctx, { brandId, fields }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return [];

    const isSuperAdmin = profile.role === "super_admin";
    if (!isSuperAdmin) throw new Error("Only super_admin can export leads");

    let leads;
    if (brandId) {
      const all = await ctx.db
        .query("crmLeads")
        .withIndex("by_brand", (q) => q.eq("brandId", brandId))
        .order("desc")
        .collect();
      leads = all.filter((l) => !l.deletedAt);
    } else {
      const all = await ctx.db.query("crmLeads").order("desc").collect();
      leads = all.filter((l) => !l.deletedAt);
    }

    // Project only requested fields
    const fieldSet = new Set(fields);
    return leads.map((lead) => {
      const projected: Record<string, any> = { _id: lead._id };
      for (const key of fieldSet) {
        if (key in lead) {
          projected[key] = (lead as any)[key];
        }
      }
      return projected;
    });
  },
});

// ── Internal: Notification Dispatch ────────────────────────
export const notifyNewLead = internalMutation({
  args: {
    leadId: v.id("crmLeads"),
    brandId: v.id("brands"),
  },
  handler: async (ctx, { leadId, brandId }) => {
    // Check if notifications are enabled
    const settings = await ctx.db
      .query("brandNotifications")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .first();

    if (!settings || !settings.emailsEnabled || settings.notifyEmails.length === 0) {
      return; // Notifications not configured
    }

    const lead = await ctx.db.get(leadId);
    if (!lead) return;

    const brand = await ctx.db.get(brandId);
    if (!brand) return;

    // Log the notification (actual email sending hooks in later)
    await ctx.db.insert("activityLog", {
      action: "notification_queued",
      entityType: "crmLead",
      entityId: leadId,
      details: `New lead notification for ${brand.name}: ${lead.firstName} ${lead.lastName || ""} → ${settings.notifyEmails.join(", ")}`,
    });
  },
});

/** Get assignment history for a lead */
export const getAssignmentHistory = query({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, { leadId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const history = await ctx.db
      .query("repAssignmentHistory")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .collect();

    // Enrich with user names
    const enriched = await Promise.all(
      history.map(async (h) => {
        let fromName = null;
        let toName = null;
        let changedByName = null;

        if (h.fromUserId) {
          const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", h.fromUserId!))
            .first();
          fromName = profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "Unknown";
        }
        if (h.toUserId) {
          const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", h.toUserId!))
            .first();
          toName = profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "Unknown";
        }
        const changerProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", h.changedBy))
          .first();
        changedByName = changerProfile ? `${changerProfile.firstName || ""} ${changerProfile.lastName || ""}`.trim() : "Unknown";

        return {
          ...h,
          fromName,
          toName,
          changedByName,
        };
      })
    );

    return enriched.sort((a, b) => b.changedAt - a.changedAt);
  },
});

/** Get rep stats — active leads, close rate, set rate */
export const getRepStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId: targetUserId }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) return null;

    // Get all leads where this user is sales rep
    const repLeads = await ctx.db
      .query("crmLeads")
      .withIndex("by_sales_rep", (q) => q.eq("salesRepId", targetUserId))
      .collect();
    const activeRepLeads = repLeads.filter((l) => !l.deletedAt);

    // Get all leads where this user is setter
    const setterLeads = await ctx.db
      .query("crmLeads")
      .withIndex("by_setter", (q) => q.eq("setterId", targetUserId))
      .collect();
    const activeSetterLeads = setterLeads.filter((l) => !l.deletedAt);

    const closedWon = activeRepLeads.filter((l) => l.stage === "awarded").length;
    const closedLost = activeRepLeads.filter((l) => l.stage === "lost").length;
    const totalClosed = closedWon + closedLost;
    const closeRate = totalClosed > 0 ? Math.round((closedWon / totalClosed) * 100) : 0;

    const setWon = activeSetterLeads.filter((l) =>
      ["intro_call", "qualified", "discovery_day", "pending_contract", "awarded"].includes(l.stage)
    ).length;
    const setRate = activeSetterLeads.length > 0 ? Math.round((setWon / activeSetterLeads.length) * 100) : 0;

    return {
      activeLeads: activeRepLeads.length,
      setLeads: activeSetterLeads.length,
      closeRate,
      setRate,
      closedWon,
      closedLost,
    };
  },
});
