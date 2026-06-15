import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { isAdminRole, isSuperAdminEmail } from "./constants";
import { scoreBrandForProspect } from "./prospect";

/** Compact, human prospect brief synthesized on the fly (read-only — mirrors
 *  prospectBrief.ts so admins see it on the Contacts panel without a lead). */
function buildProspectBrief(p: any, topMatches: { name: string; score: number }[]): string {
  if (!p) return "";
  const CAP: Record<string, string> = { under_50k: "under $50K", "50k_100k": "$50K–$100K", "100k_150k": "$100K–$150K", "150k_250k": "$150K–$250K", "250k_500k": "$250K–$500K", "500k_1m": "$500K–$1M", "1m_plus": "$1M+" };
  const OWN: Record<string, string> = { owner_operator: "an owner-operator", semi_absentee: "a semi-absentee owner", absentee: "an absentee/executive owner", investor: "an investor/multi-unit operator" };
  const TL: Record<string, string> = { asap: "ready to move ASAP", "3_months": "looking to start within 3 months", "6_months": "within 6 months", "12_months": "on a 12-month timeline", exploring: "still exploring" };
  const CAT: Record<string, string> = { food_bev: "Food & Beverage", health_fitness: "Health & Fitness", services: "Services", home_services: "Home Services", education: "Education", beauty_selfcare: "Beauty & Self Care" };
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "This prospect";
  const where = p.primaryCity && p.primaryState ? `${p.primaryCity}, ${p.primaryState}` : p.primaryState || p.state || "their area";
  const parts: string[] = [];
  let intro = `${name} is looking to open a franchise in ${where}`;
  if (p.ownerType && OWN[p.ownerType]) intro += ` as ${OWN[p.ownerType]}`;
  if (p.liquidCapital && CAP[p.liquidCapital]) intro += `, with ${CAP[p.liquidCapital]} in liquid capital`;
  if (p.timeline && TL[p.timeline]) intro += `, and is ${TL[p.timeline]}`;
  parts.push(intro + ".");
  if (p.preferredCategories?.length) parts.push(`Interested industries: ${p.preferredCategories.map((c: string) => CAT[c] || c).join(", ")}.`);
  const extras: string[] = [];
  if (p.veteranStatus === true) extras.push("veteran");
  if (p.sbaFinancingIntent === "yes") extras.push("plans to use SBA financing");
  if (p.runFromHome === "yes") extras.push("wants home-based options");
  if (p.multiUnitInterest && p.multiUnitInterest !== "1") extras.push("open to multi-unit development");
  if (extras.length) parts.push(`Notable: ${extras.join("; ")}.`);
  if (topMatches.length) parts.push(`Top PerfectFit matches: ${topMatches.map((m, i) => `${i + 1}. ${m.name} (${m.score}/100)`).join(" · ")}.`);
  return parts.join(" ");
}

/* ═══════════════════════════════════════════════════════════
 * Contacts — unified person record for anyone outside FKI
 *
 * Every prospect, franchisee, or external person gets one
 * contact record. Leads, prospect profiles, and brands all
 * link back to it via contactId / franchiseeContactId.
 * ═══════════════════════════════════════════════════════════ */

const contactTypeValidator = v.union(
  v.literal("prospect"),
  v.literal("franchisee"),
  v.literal("both")
);

const contactSourceValidator = v.union(
  v.literal("signup"),
  v.literal("quiz"),
  v.literal("manual"),
  v.literal("import"),
  v.literal("claim"),
  v.literal("backfill")
);

// ── Auth helpers ───────────────────────────────────────────

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!profile) throw new Error("No profile");

  const user = await ctx.db.get(userId);
  const email = (user?.email || "").toLowerCase();
  const isSuperAdmin = profile.role === "super_admin" || isSuperAdminEmail(email);

  if (!isSuperAdmin && !isAdminRole(profile.role)) {
    throw new Error("Admin access required");
  }

  return { userId, profile, isSuperAdmin };
}

// ── Queries ───────────────────────────────────────────────

/** List contacts with search, filter, and pagination */
export const listContacts = query({
  args: {
    search: v.optional(v.string()),
    type: v.optional(contactTypeValidator),
    status: v.optional(v.union(v.literal("active"), v.literal("deactivated"))),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { contacts: [], nextCursor: null };

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || (!isAdminRole(profile.role) && profile.role !== "super_admin")) {
      return { contacts: [], nextCursor: null };
    }

    const limit = args.limit || 25;
    let all = await ctx.db.query("contacts").order("desc").collect();

    // Filter by type
    if (args.type) {
      all = all.filter((c) => c.type === args.type || c.type === "both");
    }

    // Filter by status
    if (args.status) {
      all = all.filter((c) => c.status === args.status);
    }

    // Search by name or email
    if (args.search) {
      const q = args.search.toLowerCase();
      all = all.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          (c.lastName || "").toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone || "").includes(q)
      );
    }

    // Simple cursor-based pagination (cursor = skip count)
    const skip = args.cursor ? parseInt(args.cursor, 10) : 0;
    const page = all.slice(skip, skip + limit);
    const nextCursor = skip + limit < all.length ? String(skip + limit) : null;

    return { contacts: page, nextCursor, total: all.length };
  },
});

/** Get a single contact with all linked records */
export const getContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile || (!isAdminRole(profile.role) && profile.role !== "super_admin")) {
      return null;
    }

    const contact = await ctx.db.get(contactId);
    if (!contact) return null;

    // Get linked CRM leads
    const allLeads = await ctx.db.query("crmLeads").collect();
    const linkedLeads = allLeads.filter(
      (l) => !l.deletedAt && (l.contactId === contactId || (contact.email && l.email === contact.email))
    );

    // Enrich leads with brand name
    const leadsWithBrand = await Promise.all(
      linkedLeads.map(async (l) => {
        const brand = await ctx.db.get(l.brandId);
        return { ...l, brandName: brand?.name || "Unknown" };
      })
    );

    // Get linked prospect profile — by userId, falling back to email
    let prospectProfile = contact.userId
      ? await ctx.db
          .query("prospectProfiles")
          .withIndex("by_user", (q) => q.eq("userId", contact.userId))
          .first()
      : null;
    if (!prospectProfile && contact.email) {
      prospectProfile = await ctx.db
        .query("prospectProfiles")
        .withIndex("by_email", (q) => q.eq("email", contact.email!.toLowerCase()))
        .first();
    }

    // Verification status (from the prospect's account, if any)
    let verification = { emailVerified: false, phoneVerified: false };
    const linkUserId = contact.userId ?? prospectProfile?.userId;
    if (linkUserId) {
      const up = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", linkUserId))
        .first();
      verification = { emailVerified: !!up?.emailVerifiedAt, phoneVerified: !!up?.phoneVerifiedAt };
    }

    // Live PerfectFit matches via THE engine (top 6) — so admins see what the
    // system recommended without the prospect having to become a lead.
    let matches: { name: string; slug: string; score: number; reason: string | null }[] = [];
    let brief = "";
    if (prospectProfile) {
      const activeBrands = (await ctx.db.query("brands").collect()).filter((b) => b.isActive !== false);
      const fps = await ctx.db.query("franchiseProfiles").collect();
      const fpMap = new Map(fps.map((f) => [f.brandId.toString(), f]));
      const terrs = await ctx.db.query("territories").collect();
      const saRows = await ctx.db.query("stateAvailability").collect();
      const saMap = new Map<string, Map<string, string>>();
      for (const r of saRows) {
        const k = r.brandId.toString();
        if (!saMap.has(k)) saMap.set(k, new Map());
        saMap.get(k)!.set(r.state.toUpperCase(), r.status);
      }
      const scored: { name: string; slug: string; score: number; reason: string | null }[] = [];
      for (const b of activeBrands) {
        const r = scoreBrandForProspect({
          prospect: prospectProfile, brand: b,
          fp: fpMap.get(b._id.toString()),
          brandTerritories: terrs.filter((t) => t.brandId === b._id),
          saMap,
        });
        if (r && !r.knockedOut) scored.push({ name: b.name, slug: b.slug, score: r.matchScore, reason: r.matchReasons?.[0] ?? null });
      }
      scored.sort((a, b) => b.score - a.score);
      matches = scored.slice(0, 6);
      brief = buildProspectBrief(prospectProfile, matches);
    }

    // Notes on this contact or any linked lead
    const noteContactIds = [contactId, ...linkedLeads.map((l) => l._id)];
    const allNotes = await ctx.db.query("contactNotes").collect();
    const notes = allNotes
      .filter((n) => noteContactIds.some((id) => String(n.contactId) === String(id)))
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt);

    // Get linked brands (as franchisee)
    const allBrands = await ctx.db.query("brands").collect();
    const ownedBrands = allBrands.filter(
      (b) => b.franchiseeContactId === contactId
    );

    // Get user login info
    let loginInfo = null;
    if (contact.userId) {
      const user = await ctx.db.get(contact.userId);
      if (user) {
        loginInfo = {
          userId: user._id,
          email: user.email,
          name: user.name,
        };
      }
    }

    return {
      ...contact,
      leads: leadsWithBrand,
      prospectProfile,
      ownedBrands,
      loginInfo,
      verification,
      matches,
      brief,
      notes,
    };
  },
});

/** Get contact by email (for linking) */
export const getContactByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();
  },
});

// ── Mutations ─────────────────────────────────────────────

/** Admin: create a contact manually */
export const createContact = mutation({
  args: {
    type: contactTypeValidator,
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    source: v.optional(contactSourceValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const now = Date.now();
    const email = args.email.toLowerCase();

    // Check for existing contact with same email
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      throw new Error(`A contact with email ${email} already exists`);
    }

    // Check if there's an auth user with this email
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("providerAccountId"), email))
      .first();

    const contactId = await ctx.db.insert("contacts", {
      type: args.type,
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      phone: args.phone,
      address: args.address,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      userId: authAccount?.userId,
      status: "active",
      source: args.source || "manual",
      adminVerified: true,
      adminVerifiedAt: now,
      contactLastEditedBy: "admin",
      contactLastEditedAt: now,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activityLog", {
      userId,
      action: "contact_created",
      entityType: "contact",
      entityId: contactId,
      details: `Created contact: ${args.firstName} ${args.lastName || ""} (${email})`.trim(),
    });

    return contactId;
  },
});

/** Admin: update a contact's info */
export const updateContact = mutation({
  args: {
    contactId: v.id("contacts"),
    type: v.optional(contactTypeValidator),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const now = Date.now();

    const contact = await ctx.db.get(args.contactId);
    if (!contact) throw new Error("Contact not found");

    const updates: Record<string, any> = {
      adminVerified: true,
      adminVerifiedAt: now,
      contactLastEditedBy: "admin",
      contactLastEditedAt: now,
      prospectModifiedAfterVerify: false,
      updatedAt: now,
    };

    if (args.type !== undefined) updates.type = args.type;
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.email !== undefined) updates.email = args.email.toLowerCase();
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.address !== undefined) updates.address = args.address;
    if (args.city !== undefined) updates.city = args.city;
    if (args.state !== undefined) updates.state = args.state;
    if (args.zipCode !== undefined) updates.zipCode = args.zipCode;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.contactId, updates);

    await ctx.db.insert("activityLog", {
      userId,
      action: "contact_updated",
      entityType: "contact",
      entityId: args.contactId,
      details: `Updated contact: ${args.firstName || contact.firstName} ${args.lastName || contact.lastName || ""}`.trim(),
    });

    return { success: true };
  },
});

/** Admin: deactivate a contact (blocks login) */
export const deactivateContact = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const { userId } = await requireAdmin(ctx);

    const contact = await ctx.db.get(contactId);
    if (!contact) throw new Error("Contact not found");

    await ctx.db.patch(contactId, {
      status: "deactivated",
      updatedAt: Date.now(),
    });

    // Also deactivate their userProfile if they have a login
    if (contact.userId) {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", contact.userId!))
        .first();
      if (userProfile) {
        await ctx.db.patch(userProfile._id, { isActive: false });
      }

      // Invalidate their sessions so they get logged out
      const sessions = await ctx.db
        .query("authSessions")
        .filter((q) => q.eq(q.field("userId"), contact.userId))
        .collect();
      for (const session of sessions) {
        await ctx.db.delete(session._id);
      }
    }

    await ctx.db.insert("activityLog", {
      userId,
      action: "contact_deactivated",
      entityType: "contact",
      entityId: contactId,
      details: `Deactivated contact: ${contact.firstName} ${contact.lastName || ""} (${contact.email})`.trim(),
    });

    return { success: true };
  },
});

/** Admin: reactivate a contact */
export const reactivateContact = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const { userId } = await requireAdmin(ctx);

    const contact = await ctx.db.get(contactId);
    if (!contact) throw new Error("Contact not found");

    await ctx.db.patch(contactId, {
      status: "active",
      updatedAt: Date.now(),
    });

    // Reactivate userProfile
    if (contact.userId) {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", contact.userId!))
        .first();
      if (userProfile) {
        await ctx.db.patch(userProfile._id, { isActive: true });
      }
    }

    await ctx.db.insert("activityLog", {
      userId,
      action: "contact_reactivated",
      entityType: "contact",
      entityId: contactId,
      details: `Reactivated contact: ${contact.firstName} ${contact.lastName || ""} (${contact.email})`.trim(),
    });

    return { success: true };
  },
});

/** Admin: delete a contact + their login entirely */
export const deleteContact = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const { userId, isSuperAdmin } = await requireAdmin(ctx);
    if (!isSuperAdmin) throw new Error("Only super admins can delete contacts");

    const contact = await ctx.db.get(contactId);
    if (!contact) throw new Error("Contact not found");

    // Unlink from CRM leads (don't delete leads, just unlink)
    const allLeads = await ctx.db.query("crmLeads").collect();
    for (const lead of allLeads) {
      if (lead.contactId === contactId) {
        await ctx.db.patch(lead._id, { contactId: undefined });
      }
    }

    // Unlink from prospect profiles
    const allProspectProfiles = await ctx.db.query("prospectProfiles").collect();
    for (const pp of allProspectProfiles) {
      if (pp.contactId === contactId) {
        await ctx.db.patch(pp._id, { contactId: undefined });
      }
    }

    // Unlink from brands
    const allBrands = await ctx.db.query("brands").collect();
    for (const brand of allBrands) {
      if (brand.franchiseeContactId === contactId) {
        await ctx.db.patch(brand._id, { franchiseeContactId: undefined });
      }
    }

    // Delete auth data if they have a login
    if (contact.userId) {
      // Delete userProfile
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", contact.userId!))
        .first();
      if (userProfile) await ctx.db.delete(userProfile._id);

      // Delete prospect profile
      const prospectProfile = await ctx.db
        .query("prospectProfiles")
        .withIndex("by_user", (q) => q.eq("userId", contact.userId!))
        .first();
      if (prospectProfile) await ctx.db.delete(prospectProfile._id);

      // Delete auth accounts + sessions
      const authAccounts = await ctx.db
        .query("authAccounts")
        .filter((q) => q.eq(q.field("userId"), contact.userId))
        .collect();
      for (const acct of authAccounts) await ctx.db.delete(acct._id);

      const authSessions = await ctx.db
        .query("authSessions")
        .filter((q) => q.eq(q.field("userId"), contact.userId))
        .collect();
      for (const sess of authSessions) await ctx.db.delete(sess._id);
    }

    // Delete the contact record
    await ctx.db.delete(contactId);

    await ctx.db.insert("activityLog", {
      userId,
      action: "contact_deleted",
      entityType: "contact",
      entityId: contactId,
      details: `Deleted contact: ${contact.firstName} ${contact.lastName || ""} (${contact.email})`.trim(),
    });

    return { success: true };
  },
});

// ── Auto-creation helpers (called from other modules) ─────

/**
 * Find or create a contact record for a given email.
 * Called during signup, quiz, lead creation, etc.
 */
export const findOrCreateContact = internalMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    address: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    type: v.optional(contactTypeValidator),
    source: v.optional(contactSourceValidator),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const now = Date.now();

    // Check for existing contact
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      // Link userId if not already linked and we have one
      const updates: Record<string, any> = { updatedAt: now };
      if (args.userId && !existing.userId) updates.userId = args.userId;
      // Backfill contact details the profile now has but the contact lacks
      // (e.g. a phone/location entered after the contact was first created).
      if (args.phone && !existing.phone) updates.phone = args.phone;
      if (args.lastName && !existing.lastName) updates.lastName = args.lastName;
      if (args.city && !existing.city) updates.city = args.city;
      if (args.state && !existing.state) updates.state = args.state;
      if (args.zipCode && !existing.zipCode) updates.zipCode = args.zipCode;
      if (args.address && !existing.address) updates.address = args.address;
      // Upgrade type if needed (prospect → both when they also become franchisee)
      if (args.type === "franchisee" && existing.type === "prospect") {
        updates.type = "both";
      } else if (args.type === "prospect" && existing.type === "franchisee") {
        updates.type = "both";
      }
      if (Object.keys(updates).length > 1) {
        await ctx.db.patch(existing._id, updates);
      }
      return existing._id;
    }

    // Create new contact
    const contactId = await ctx.db.insert("contacts", {
      type: args.type || "prospect",
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      phone: args.phone,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      address: args.address,
      userId: args.userId,
      status: "active",
      source: args.source || "signup",
      createdAt: now,
      updatedAt: now,
    });

    return contactId;
  },
});

/** One-time/idempotent repair: backfill contact phone/name/location from the
 *  matching prospect profile (fixes contacts created before the profile had
 *  a phone — e.g. Joe Henderson). Safe to re-run. */
export const backfillContactsFromProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("contacts").collect();
    const profiles = await ctx.db.query("prospectProfiles").collect();
    const byUser = new Map<string, any>();
    const byEmail = new Map<string, any>();
    for (const p of profiles) {
      if (p.userId) byUser.set(String(p.userId), p);
      if (p.email) byEmail.set(p.email.toLowerCase(), p);
    }
    let fixed = 0;
    for (const c of contacts) {
      const p = (c.userId && byUser.get(String(c.userId))) || (c.email && byEmail.get(c.email.toLowerCase()));
      if (!p) continue;
      const patch: Record<string, any> = {};
      if (!c.phone && p.phone) patch.phone = p.phone;
      if (!c.lastName && p.lastName) patch.lastName = p.lastName;
      if (!c.city && p.city) patch.city = p.city;
      if (!c.state && p.state) patch.state = p.state;
      if (!c.zipCode && p.zipCode) patch.zipCode = p.zipCode;
      if (!c.address && p.address) patch.address = p.address;
      if (Object.keys(patch).length) {
        patch.updatedAt = Date.now();
        await ctx.db.patch(c._id, patch);
        fixed++;
      }
    }
    return { scanned: contacts.length, fixed };
  },
});

/**
 * Link an existing contact to a userId after signup.
 * Called from ensureProfile when a user signs up with an email
 * that already has a contact record (e.g. from manual lead creation).
 */
export const linkContactToUser = internalMutation({
  args: {
    email: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { email, userId }) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();

    if (contact && !contact.userId) {
      await ctx.db.patch(contact._id, {
        userId,
        updatedAt: Date.now(),
      });
      return contact._id;
    }

    return contact?._id || null;
  },
});

/** Backfill: create contact records for existing data */
export const backfillContacts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    let linked = 0;

    // 1. Create contacts from prospectProfiles
    const prospectProfiles = await ctx.db.query("prospectProfiles").collect();
    for (const pp of prospectProfiles) {
      if (pp.contactId) continue; // already linked

      const email = pp.email?.toLowerCase();
      if (!email) continue;

      // Find or create contact
      let contact = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (!contact) {
        const contactId = await ctx.db.insert("contacts", {
          type: "prospect" as const,
          firstName: pp.firstName || email.split("@")[0],
          lastName: pp.lastName,
          email,
          phone: pp.phone,
          address: pp.address,
          city: pp.city,
          state: pp.state,
          zipCode: pp.zipCode,
          userId: pp.userId,
          status: "active" as const,
          source: "backfill" as const,
          createdAt: now,
          updatedAt: now,
        });
        contact = await ctx.db.get(contactId);
        created++;
      }

      // Link
      if (contact) {
        await ctx.db.patch(pp._id, { contactId: contact._id });
        linked++;
      }
    }

    // 2. Create contacts from CRM leads (that don't have a matching contact)
    const crmLeads = await ctx.db.query("crmLeads").collect();
    for (const lead of crmLeads) {
      if (lead.contactId) continue; // already linked
      if (lead.deletedAt) continue; // skip deleted

      const email = lead.email?.toLowerCase();
      if (!email) continue;

      let contact = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (!contact) {
        const contactId = await ctx.db.insert("contacts", {
          type: "prospect" as const,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email,
          phone: lead.phone,
          address: lead.address,
          userId: undefined,
          status: "active" as const,
          source: "backfill" as const,
          createdAt: now,
          updatedAt: now,
        });
        contact = await ctx.db.get(contactId);
        created++;
      }

      if (contact) {
        await ctx.db.patch(lead._id, { contactId: contact._id });
        linked++;
      }
    }

    // 3. Create contacts from brand claims
    const brandClaims = await ctx.db.query("brandClaims").collect();
    for (const claim of brandClaims) {
      const email = claim.contactEmail?.toLowerCase();
      if (!email) continue;

      let contact = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (!contact) {
        const nameParts = claim.contactName.split(" ");
        const contactId = await ctx.db.insert("contacts", {
          type: "franchisee" as const,
          firstName: nameParts[0] || email.split("@")[0],
          lastName: nameParts.slice(1).join(" ") || undefined,
          email,
          phone: claim.contactPhone,
          userId: undefined,
          status: "active" as const,
          source: "backfill" as const,
          createdAt: now,
          updatedAt: now,
        });
        contact = await ctx.db.get(contactId);
        created++;
      } else if (contact.type === "prospect") {
        // Upgrade to "both" if they were a prospect who also claimed a brand
        await ctx.db.patch(contact._id, { type: "both", updatedAt: now });
      }

      // Link brand if claim was approved and has a brandId
      if (contact && claim.brandId && claim.status === "approved") {
        const brand = await ctx.db.get(claim.brandId);
        if (brand && !brand.franchiseeContactId) {
          await ctx.db.patch(brand._id, { franchiseeContactId: contact._id });
        }
      }
    }

    return { created, linked };
  },
});
