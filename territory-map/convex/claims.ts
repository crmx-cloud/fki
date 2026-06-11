import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Pre-register a franchise claim BEFORE account creation.
 * Called from Step 1 of the /claim flow (no auth required).
 * Creates an inactive brand + claim record so ensureProfile can detect it.
 */
export const createInitialClaim = mutation({
  args: {
    brandName: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    hqAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // No auth required — this runs before account creation

    // Check if claim already exists for this email
    const existingClaim = await ctx.db
      .query("brandClaims")
      .withIndex("by_email", (q) => q.eq("contactEmail", args.contactEmail.toLowerCase()))
      .first();
    if (existingClaim) {
      // Return existing brand ID
      return { brandId: existingClaim.brandId, alreadyClaimed: true };
    }

    // Generate slug
    const baseSlug = args.brandName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    let counter = 0;
    while (true) {
      const existing = await ctx.db
        .query("brands")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create the brand (active immediately so it shows in search/explore)
    const brandId = await ctx.db.insert("brands", {
      name: args.brandName,
      slug,
      description: args.description,
      category: args.category,
      websiteUrl: args.websiteUrl,
      contactEmail: args.contactEmail.toLowerCase(),
      isActive: true,
      isClaimed: true,
    });

    // Create the claim record
    await ctx.db.insert("brandClaims", {
      brandName: args.brandName,
      contactName: args.contactName,
      contactEmail: args.contactEmail.toLowerCase(),
      contactPhone: args.contactPhone,
      status: "pending",
      brandId,
    });

    return { brandId, alreadyClaimed: false };
  },
});

/**
 * Submit a franchise claim after account creation + email verification.
 * Creates the brand (inactive), territories, claim record, and updates user profile.
 */
export const submitClaim = mutation({
  args: {
    brandName: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    territories: v.array(v.object({
      city: v.string(),
      state: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Generate slug from brand name
    const baseSlug = args.brandName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    // Check for duplicate slugs
    let slug = baseSlug;
    let counter = 0;
    while (true) {
      const existing = await ctx.db
        .query("brands")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create the brand (active immediately so it shows in search/explore)
    const brandId = await ctx.db.insert("brands", {
      name: args.brandName,
      slug,
      description: args.description,
      category: args.category,
      websiteUrl: args.websiteUrl,
      contactEmail: args.contactEmail,
      isActive: true,
      isClaimed: true,
      claimedBy: userId,
    });

    // Create territories
    for (const t of args.territories) {
      await ctx.db.insert("territories", {
        brandId,
        city: t.city.trim(),
        state: t.state.trim(),
        status: "available",
      });
    }

    // Create the claim record
    await ctx.db.insert("brandClaims", {
      brandName: args.brandName,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      status: "pending",
      brandId,
    });

    // Update user profile to franchisor with this brand
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      const existingBrandIds = profile.brandIds || [];
      await ctx.db.patch(profile._id, {
        role: "franchisor",
        brandIds: [...existingBrandIds, brandId],
      });
    }

    // Log activity
    try {
      await ctx.db.insert("activityLog", {
        action: "claim_submitted",
        entityType: "brand",
        entityId: brandId as unknown as string,
        userId,
        details: `${args.contactName} claimed ${args.brandName}`,
      });
    } catch {
      // activityLog insert is best-effort
    }

    return { brandId, slug };
  },
});

/**
 * List all pending claims (admin only).
 */
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (profile?.role !== "admin" && profile?.role !== "super_admin") return [];

    return await ctx.db
      .query("brandClaims")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

/**
 * Approve a claim (admin only). Activates the brand.
 */
export const approveClaim = mutation({
  args: { claimId: v.id("brandClaims") },
  handler: async (ctx, { claimId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (profile?.role !== "admin" && profile?.role !== "super_admin") throw new Error("Admin only");

    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");

    await ctx.db.patch(claimId, { status: "approved" });

    // Activate the brand
    if (claim.brandId) {
      await ctx.db.patch(claim.brandId, { isActive: true });
    }

    return { success: true };
  },
});

/**
 * Get the claim for the current user's email (for franchisor dashboard).
 */
export const getMyClaimStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;
    const email = (user.email || "").toLowerCase();

    const claim = await ctx.db
      .query("brandClaims")
      .withIndex("by_email", (q) => q.eq("contactEmail", email))
      .first();

    return claim;
  },
});
