import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ADMIN_EMAIL_DOMAIN } from "./constants";

/* ═══════════════════════════════════════════════════════════
 * Role Hierarchy:
 *   super_admin > admin > standard > brand_admin > franchisor > prospect
 *
 * Super Admins (Brent, Bennett, Madison):
 *   - Full control on all entities
 *   - Cannot delete each other
 *
 * Admins:
 *   - Manage users (except super admins)
 *   - Manage brands (no delete), leads, territories
 *
 * Standard Users:
 *   - Create + edit brands, leads, territories (no delete/export)
 *
 * Only @franchiseki.com emails can be internal team roles.
 * ═══════════════════════════════════════════════════════════ */

const SUPER_ADMIN_EMAILS = [
  "brent@franchiseki.com",
  "madison@franchiseki.com",
  "bennett@franchiseki.com",
];

type InternalRole = "super_admin" | "admin" | "standard" | "closer" | "setter";
type ExternalRole = "brand_admin" | "franchisor" | "prospect" | "broker";
type Role = InternalRole | ExternalRole;

const INTERNAL_ROLES: Role[] = ["super_admin", "admin", "standard", "closer", "setter"];

const permissionsValidator = v.optional(v.object({
  canEditTerritories: v.optional(v.boolean()),
  canManageBrand: v.optional(v.boolean()),
  canViewContacts: v.optional(v.boolean()),
  canExportData: v.optional(v.boolean()),
  canInviteUsers: v.optional(v.boolean()),
  leadVisibility: v.optional(v.union(
    v.literal("own_only"),
    v.literal("all"),
    v.literal("team")
  )),
  canCreateContacts: v.optional(v.boolean()),
  canEditContacts: v.optional(v.boolean()),
  canDeleteContacts: v.optional(v.boolean()),
  canManageCustomFields: v.optional(v.boolean()),
}));

const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("admin"),
  v.literal("standard"),
  v.literal("closer"),
  v.literal("setter"),
  v.literal("broker"),
  v.literal("brand_admin"),
  v.literal("franchisor"),
  v.literal("prospect")
);

/* ── Permission helpers ── */
function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

function isFranchiseKiEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ADMIN_EMAIL_DOMAIN}`);
}

/** Check if a role has at least "internal team" access */
function isInternalTeamRole(role: string | undefined): boolean {
  return role === "super_admin" || role === "admin" || role === "standard" || role === "closer" || role === "setter";
}

/** Full permission matrix by role */
function getPermissionsForRole(role: string, isSuperAdmin: boolean) {
  if (role === "super_admin" || isSuperAdmin) {
    return {
      // Users
      canManageUsers: true, canDeleteUsers: true, canToggleUsers: true,
      // Brands
      canCreateBrands: true, canEditBrands: true, canDeleteBrands: true, canExportBrands: true,
      // Leads
      canCreateLeads: true, canEditLeads: true, canDeleteLeads: true, canExportLeads: true,
      // Territories
      canEditTerritories: true, canDeleteTerritories: true, canExportTerritories: true,
      // Users admin
      canInviteUsers: true, canViewContacts: true, canManageBrand: true,
    };
  }
  if (role === "admin") {
    return {
      canManageUsers: true, canDeleteUsers: false, canToggleUsers: true,
      canCreateBrands: true, canEditBrands: true, canDeleteBrands: false, canExportBrands: false,
      canCreateLeads: true, canEditLeads: true, canDeleteLeads: true, canExportLeads: false,
      canEditTerritories: true, canDeleteTerritories: true, canExportTerritories: false,
      canInviteUsers: true, canViewContacts: true, canManageBrand: true,
    };
  }
  if (role === "standard") {
    return {
      canManageUsers: false, canDeleteUsers: false, canToggleUsers: false,
      canCreateBrands: true, canEditBrands: true, canDeleteBrands: false, canExportBrands: false,
      canCreateLeads: true, canEditLeads: true, canDeleteLeads: false, canExportLeads: false,
      canEditTerritories: true, canDeleteTerritories: false, canExportTerritories: false,
      canInviteUsers: false, canViewContacts: false, canManageBrand: true,
    };
  }
  if (role === "closer") {
    return {
      canManageUsers: false, canDeleteUsers: false, canToggleUsers: false,
      canCreateBrands: false, canEditBrands: false, canDeleteBrands: false, canExportBrands: false,
      canCreateLeads: true, canEditLeads: true, canDeleteLeads: false, canExportLeads: false,
      canEditTerritories: false, canDeleteTerritories: false, canExportTerritories: false,
      canInviteUsers: false, canViewContacts: true, canManageBrand: false,
    };
  }
  if (role === "broker") {
    // Vetted external brokers: ONLY their assigned leads, read-only tags,
    // no exports, no creation, no user/brand management. Enforced server-side
    // in crm.ts — this matrix is the UI contract.
    return {
      canManageUsers: false, canDeleteUsers: false, canToggleUsers: false,
      canCreateBrands: false, canEditBrands: false, canDeleteBrands: false, canExportBrands: false,
      canCreateLeads: false, canEditLeads: true, canDeleteLeads: false, canExportLeads: false,
      canEditTerritories: false, canDeleteTerritories: false, canExportTerritories: false,
      canInviteUsers: false, canViewContacts: true, canManageBrand: false,
    };
  }
  if (role === "setter") {
    return {
      canManageUsers: false, canDeleteUsers: false, canToggleUsers: false,
      canCreateBrands: false, canEditBrands: false, canDeleteBrands: false, canExportBrands: false,
      canCreateLeads: true, canEditLeads: true, canDeleteLeads: false, canExportLeads: false,
      canEditTerritories: false, canDeleteTerritories: false, canExportTerritories: false,
      canInviteUsers: false, canViewContacts: true, canManageBrand: false,
    };
  }
  // brand_admin, franchisor, prospect
  return {
    canManageUsers: false, canDeleteUsers: false, canToggleUsers: false,
    canCreateBrands: false, canEditBrands: role === "brand_admin", canDeleteBrands: false, canExportBrands: false,
    canCreateLeads: role === "franchisor" || role === "brand_admin", canEditLeads: role === "franchisor" || role === "brand_admin", canDeleteLeads: false, canExportLeads: false,
    canEditTerritories: role === "brand_admin", canDeleteTerritories: false, canExportTerritories: false,
    canInviteUsers: false, canViewContacts: role === "brand_admin", canManageBrand: role === "brand_admin",
  };
}

/**
 * Ensures a userProfile exists for the current user.
 * Auto-assigns super_admin for the 3 designated emails,
 * admin for other @franchiseki.com, else prospect.
 */
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const user = await ctx.db.get(userId);
    if (!user) return null;
    const email = (user.email || "").toLowerCase();

    // If profile exists, upgrade super admins if needed (migration)
    if (existing) {
      if (isSuperAdminEmail(email) && existing.role !== "super_admin") {
        await ctx.db.patch(existing._id, { role: "super_admin" });
        return { ...existing, role: "super_admin" };
      }
      return existing;
    }

    const isFKI = isFranchiseKiEmail(email);

    // Check for pending invite
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    // Check for pending brand claim
    const brandClaim = await ctx.db
      .query("brandClaims")
      .withIndex("by_email", (q) => q.eq("contactEmail", email))
      .first();

    // Determine role
    let role: Role = "prospect";
    let brandIds: any[] | undefined = undefined;
    let permissions: any | undefined = undefined;

    // SECURITY: an @franchiseki.com address alone must NOT grant admin —
    // email verification is currently disabled, so the domain is spoofable.
    // Team members get internal roles via invites or setUserRoleByEmail.
    if (isSuperAdminEmail(email)) {
      role = "super_admin";
    } else if (invite) {
      role = invite.role as Role;
      brandIds = invite.brandIds;
      permissions = invite.permissions;
      await ctx.db.patch(invite._id, { status: "accepted", acceptedAt: Date.now() });
    } else if (brandClaim) {
      role = "franchisor";
      if (brandClaim.brandId) brandIds = [brandClaim.brandId];
    }
    const invitePhone = invite?.phone;
    const inviteFirstName = (invite as any)?.firstName;

    const nameParts = user.name?.split(" ") || [];
    const firstName = inviteFirstName || nameParts[0] || email.split("@")[0];
    const lastName = nameParts.slice(1).join(" ") || undefined;

    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      role,
      firstName,
      lastName,
      phone: invitePhone,
      brandIds,
      permissions,
      isActive: true,
    });

    // Auto-create/link contact record for non-FKI users
    if (!isFKI && email) {
      const contactType = brandClaim ? "franchisee" : "prospect";
      const contactSource = brandClaim ? "claim" : "signup";
      await ctx.scheduler.runAfter(0, internal.contacts.findOrCreateContact, {
        email,
        firstName,
        lastName,
        userId,
        type: contactType as "prospect" | "franchisee",
        source: contactSource as "signup" | "claim",
      });
    }

    return await ctx.db.get(profileId);
  },
});

/**
 * Get the current user's profile + computed permissions.
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const user = await ctx.db.get(userId);
    const email = (user?.email || "").toLowerCase();

    const role = profile?.role || "prospect";
    const isSuperAdmin = role === "super_admin" || isSuperAdminEmail(email);
    const isAdmin = role === "admin" || isSuperAdmin;
    const isBrandAdmin = role === "brand_admin";
    const isStandard = role === "standard";
    const isInternal = isInternalTeamRole(role) || isSuperAdmin;
    const isFranchisor = role === "franchisor";

    const perms = getPermissionsForRole(role, isSuperAdmin);

    return {
      user,
      profile,
      isAdmin,
      isBrandAdmin,
      isAnyAdmin: isAdmin || isBrandAdmin,
      isSuperAdmin,
      isStandard,
      isInternal,
      isFranchisor,
      brandIds: profile?.brandIds || [],
      permissions: perms,
      role,
    };
  },
});

/**
 * List all user profiles (internal team only — super_admin sees all, admin sees non-super).
 */
export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const callerRole = callerProfile?.role;
    const callerEmail = (await ctx.db.get(userId))?.email || "";
    const callerIsSuperAdmin = callerRole === "super_admin" || isSuperAdminEmail(callerEmail);

    // Only super_admin and admin can list profiles
    if (!callerIsSuperAdmin && callerRole !== "admin") return [];

    const profiles = await ctx.db.query("userProfiles").collect();

    const results = await Promise.all(
      profiles.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        const email = (user?.email || "").toLowerCase();
        return {
          ...p,
          email: user?.email,
          name: user?.name,
          _isSuperAdmin: p.role === "super_admin" || isSuperAdminEmail(email),
        };
      })
    );

    // Admins can't see super admin profiles (but super admins see everything)
    if (!callerIsSuperAdmin) {
      return results.filter((p) => !p._isSuperAdmin);
    }

    return results;
  },
});

/**
 * Update a user's role, brand access, and permissions.
 * Super admins: can update anyone except other super admins' roles.
 * Admins: can update non-super-admin, non-admin users.
 */
export const updateProfile = mutation({
  args: {
    profileId: v.id("userProfiles"),
    role: roleValidator,
    brandIds: v.optional(v.array(v.id("brands"))),
    permissions: permissionsValidator,
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    managedUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const callerUser = await ctx.db.get(userId);
    const callerEmail = (callerUser?.email || "").toLowerCase();
    const callerIsSuperAdmin = callerProfile?.role === "super_admin" || isSuperAdminEmail(callerEmail);

    // Must be at least admin
    if (!callerIsSuperAdmin && callerProfile?.role !== "admin") {
      throw new Error("Not authorized");
    }

    const target = await ctx.db.get(args.profileId);
    if (!target) throw new Error("Profile not found");

    const targetUser = await ctx.db.get(target.userId);
    const targetEmail = (targetUser?.email || "").toLowerCase();
    const targetIsSuperAdmin = target.role === "super_admin" || isSuperAdminEmail(targetEmail);

    // Super admins cannot delete/downgrade each other
    if (targetIsSuperAdmin && callerIsSuperAdmin) {
      if (args.role !== "super_admin") {
        throw new Error("Cannot change role of a fellow super admin");
      }
    }

    // Admins cannot touch super admins
    if (targetIsSuperAdmin && !callerIsSuperAdmin) {
      throw new Error("Admins cannot modify super admin accounts");
    }

    // Admins cannot promote to super_admin
    if (!callerIsSuperAdmin && args.role === "super_admin") {
      throw new Error("Only super admins can assign the super_admin role");
    }

    const updates: any = { role: args.role };
    if (args.brandIds !== undefined) updates.brandIds = args.brandIds;
    if (args.permissions !== undefined) updates.permissions = args.permissions;
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.managedUserIds !== undefined) updates.managedUserIds = args.managedUserIds;

    await ctx.db.patch(args.profileId, updates);

    await ctx.db.insert("activityLog", {
      userId,
      action: "update_profile",
      entityType: "userProfile",
      entityId: args.profileId,
      details: `Updated role to ${args.role}${args.isActive === false ? " (deactivated)" : ""}`,
    });

    return { success: true };
  },
});

/**
 * Delete a user profile + auth accounts (super_admin only).
 * Cannot delete fellow super admins.
 */
export const deleteProfile = mutation({
  args: { profileId: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerUser = await ctx.db.get(userId);
    const callerEmail = (callerUser?.email || "").toLowerCase();
    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const callerIsSuperAdmin = callerProfile?.role === "super_admin" || isSuperAdminEmail(callerEmail);

    if (!callerIsSuperAdmin) throw new Error("Only super admins can delete users");

    const target = await ctx.db.get(args.profileId);
    if (!target) throw new Error("Profile not found");

    const targetUser = await ctx.db.get(target.userId);
    const targetEmail = (targetUser?.email || "").toLowerCase();

    if (isSuperAdminEmail(targetEmail)) {
      throw new Error("Cannot delete a fellow super admin");
    }

    // Delete profile
    await ctx.db.delete(args.profileId);

    // Delete auth accounts + sessions
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), target.userId))
      .collect();
    for (const acct of authAccounts) await ctx.db.delete(acct._id);

    const authSessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), target.userId))
      .collect();
    for (const sess of authSessions) await ctx.db.delete(sess._id);

    await ctx.db.insert("activityLog", {
      userId,
      action: "delete_user",
      details: `Deleted user ${targetEmail}`,
    });

    return { success: true };
  },
});

/**
 * Create a brand team invite.
 */
export const createInvite = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: roleValidator,
    brandIds: v.optional(v.array(v.id("brands"))),
    permissions: permissionsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const callerUser = await ctx.db.get(userId);
    const callerEmail = (callerUser?.email || "").toLowerCase();
    const callerIsSuperAdmin = callerProfile?.role === "super_admin" || isSuperAdminEmail(callerEmail);

    // Must be at least admin to invite
    if (!callerIsSuperAdmin && callerProfile?.role !== "admin" && callerProfile?.role !== "brand_admin") {
      throw new Error("Not authorized to invite users");
    }

    // Only super admins can create super_admin invites
    if (args.role === "super_admin" && !callerIsSuperAdmin) {
      throw new Error("Only super admins can invite super admins");
    }

    // Brand admins can only invite to their own brands
    if (callerProfile?.role === "brand_admin") {
      const myBrandIds = callerProfile.brandIds || [];
      if (args.brandIds?.some((b: any) => !myBrandIds.includes(b))) {
        throw new Error("Cannot invite to brands you don't manage");
      }
      if (args.role === "admin" || args.role === "super_admin" || args.role === "standard") {
        throw new Error("Brand admins cannot create internal team invites");
      }
    }

    // Only @franchiseki.com emails for internal roles
    if (["super_admin", "admin", "standard"].includes(args.role)) {
      if (!args.email.toLowerCase().endsWith(`@${ADMIN_EMAIL_DOMAIN}`)) {
        throw new Error(`Internal team roles require @${ADMIN_EMAIL_DOMAIN} email`);
      }
    }

    // Check for existing pending invite
    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (existingInvite) {
      await ctx.db.patch(existingInvite._id, {
        role: args.role,
        brandIds: args.brandIds,
        permissions: args.permissions,
      });
      return { success: true, updated: true };
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("providerAccountId"), args.email.toLowerCase()))
      .first();

    if (existingUser) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", existingUser.userId))
        .first();
      if (profile) {
        await ctx.db.patch(profile._id, {
          role: args.role,
          brandIds: args.brandIds,
          permissions: args.permissions,
        });
        return { success: true, existingUser: true };
      }
    }

    await ctx.db.insert("invites", {
      email: args.email.toLowerCase(),
      firstName: args.firstName,
      phone: args.phone,
      role: args.role,
      brandIds: args.brandIds,
      permissions: args.permissions,
      invitedBy: userId,
      status: "pending",
    });

    await ctx.db.insert("activityLog", {
      userId,
      action: "invite_user",
      details: `Invited ${args.email} as ${args.role}`,
    });

    // Send the invite email through CRMX (fail-soft — invite still works
    // via signup even if the email send hiccups)
    await ctx.scheduler.runAfter(0, internal.verificationSend.sendInviteEmail, {
      email: args.email.toLowerCase(),
      firstName: args.firstName || "there",
      role: args.role,
    });

    return { success: true };
  },
});

/**
 * List all invites (admin+ only).
 */
export const listInvites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!isInternalTeamRole(callerProfile?.role) && callerProfile?.role !== "brand_admin") return [];

    return await ctx.db.query("invites").order("desc").collect();
  },
});

/**
 * Revoke an invite.
 */
export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!isInternalTeamRole(callerProfile?.role) && callerProfile?.role !== "brand_admin")
      throw new Error("Not authorized");

    await ctx.db.patch(args.inviteId, { status: "revoked" });
    return { success: true };
  },
});

/**
 * Self-service profile update — any logged-in user can edit their own name & phone.
 * Also keeps the linked contacts record in sync.
 */
export const updateMyProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found");

    // Build patch for userProfiles
    const profilePatch: Record<string, string | undefined> = {};
    if (args.firstName !== undefined) profilePatch.firstName = args.firstName.trim();
    if (args.lastName !== undefined) profilePatch.lastName = args.lastName.trim();
    if (args.phone !== undefined) profilePatch.phone = args.phone.trim() || undefined;

    if (Object.keys(profilePatch).length > 0) {
      await ctx.db.patch(profile._id, profilePatch);
    }

    // Also update the auth user name so it shows everywhere
    if (args.firstName !== undefined || args.lastName !== undefined) {
      const first = args.firstName !== undefined ? args.firstName.trim() : (profile.firstName || "");
      const last = args.lastName !== undefined ? args.lastName.trim() : (profile.lastName || "");
      const fullName = [first, last].filter(Boolean).join(" ");
      if (fullName) {
        await ctx.db.patch(userId, { name: fullName });
      }
    }

    // Keep linked contacts record in sync
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (contact) {
      const contactPatch: Record<string, string | undefined> = {};
      if (args.firstName !== undefined) contactPatch.firstName = args.firstName.trim();
      if (args.lastName !== undefined) contactPatch.lastName = args.lastName.trim();
      if (args.phone !== undefined) contactPatch.phone = args.phone.trim() || undefined;
      if (Object.keys(contactPatch).length > 0) {
        await ctx.db.patch(contact._id, { ...contactPatch, updatedAt: Date.now() });
      }
    }

    return { success: true };
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    const authSessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const session of authSessions) {
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(userId);
    return { success: true };
  },
});
