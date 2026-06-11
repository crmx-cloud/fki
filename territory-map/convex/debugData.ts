import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const allUserProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userProfiles").collect();
  },
});

export const allBrandClaims = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brandClaims").collect();
  },
});

export const allBrands = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brands").collect();
  },
});

export const allUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const allFranchiseProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("franchiseProfiles").collect();
  },
});

export const allTerritories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("territories").collect();
  },
});

export const allCrmLeads = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("crmLeads").collect();
  },
});

export const allContacts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contacts").collect();
  },
});

export const allProspectProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("prospectProfiles").collect();
  },
});

export const allInvites = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("invites").collect();
  },
});

export const allActivityLog = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("activityLog").collect();
  },
});

export const allContactTags = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contactTags").collect();
  },
});

export const allAppNotifications = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("appNotifications").collect();
  },
});

export const allNotificationDismissals = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notificationDismissals").collect();
  },
});

export const allBrandNotifications = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brandNotifications").collect();
  },
});

export const allContactNotes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contactNotes").collect();
  },
});

export const allAutoAssignmentRules = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("autoAssignmentRules").collect();
  },
});

export const allRepAssignmentHistory = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("repAssignmentHistory").collect();
  },
});

export const allCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

export const allLeads = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("leads").collect();
  },
});

export const allSavedItems = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("savedItems").collect();
  },
});

export const allAlerts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("alerts").collect();
  },
});

/**
 * Admin patch for franchise profile enrichment (no auth required).
 * Accepts profileId + a JSON string of fields to patch.
 */
export const adminPatchProfile = mutation({
  args: {
    profileId: v.id("franchiseProfiles"),
    fields: v.string(), // JSON-encoded patch object
  },
  handler: async (ctx, { profileId, fields }) => {
    const patch = JSON.parse(fields);
    await ctx.db.patch(profileId, patch);
    return { success: true, fieldsPatched: Object.keys(patch).length };
  },
});

/**
 * Admin patch for brand record (no auth required).
 */
export const adminPatchBrand = mutation({
  args: {
    brandId: v.id("brands"),
    fields: v.string(),
  },
  handler: async (ctx, { brandId, fields }) => {
    const patch = JSON.parse(fields);
    await ctx.db.patch(brandId, patch);
    return { success: true, fieldsPatched: Object.keys(patch).length };
  },
});

export const allStateAvailability = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("stateAvailability").collect(),
});

