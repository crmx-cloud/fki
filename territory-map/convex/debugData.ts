import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const allUserProfiles = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userProfiles").collect();
  },
});

export const allBrandClaims = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brandClaims").collect();
  },
});

export const allBrands = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brands").collect();
  },
});

export const allUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const allFranchiseProfiles = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("franchiseProfiles").collect();
  },
});

export const allTerritories = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("territories").collect();
  },
});

export const allCrmLeads = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("crmLeads").collect();
  },
});

export const allContacts = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contacts").collect();
  },
});

export const allProspectProfiles = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("prospectProfiles").collect();
  },
});

export const allInvites = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("invites").collect();
  },
});

export const allActivityLog = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("activityLog").collect();
  },
});

export const allContactTags = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contactTags").collect();
  },
});

export const allAppNotifications = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("appNotifications").collect();
  },
});

export const allNotificationDismissals = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notificationDismissals").collect();
  },
});

export const allBrandNotifications = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brandNotifications").collect();
  },
});

export const allContactNotes = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contactNotes").collect();
  },
});

export const allAutoAssignmentRules = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("autoAssignmentRules").collect();
  },
});

export const allRepAssignmentHistory = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("repAssignmentHistory").collect();
  },
});

export const allCategories = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

export const allLeads = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("leads").collect();
  },
});

export const allSavedItems = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("savedItems").collect();
  },
});

export const allAlerts = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("alerts").collect();
  },
});

/**
 * Admin patch for franchise profile enrichment (no auth required).
 * Accepts profileId + a JSON string of fields to patch.
 */
export const adminPatchProfile = internalMutation({
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
export const adminPatchBrand = internalMutation({
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

export const allStateAvailability = internalQuery({
  args: {},
  handler: async (ctx) => await ctx.db.query("stateAvailability").collect(),
});

