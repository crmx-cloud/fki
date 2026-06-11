import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Validation ─────────────────────────────────────────────
const TAG_RE = /^[a-z0-9_\-*|]+$/;
const TAG_MAX_LEN = 30;

function validateTagName(raw: string): string {
  const name = raw.trim().toLowerCase();
  if (name.length === 0) throw new Error("Tag name cannot be empty");
  if (name.length > TAG_MAX_LEN)
    throw new Error(`Tag "${name}" exceeds ${TAG_MAX_LEN} characters`);
  if (!TAG_RE.test(name))
    throw new Error(
      `Tag "${name}" contains invalid characters. Only letters, numbers, _ - * | allowed.`
    );
  return name;
}

// ── Auth helper ────────────────────────────────────────────
async function requireTagAccess(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!profile) throw new Error("No profile found");

  const allowed = ["super_admin", "admin", "brand_admin"];
  if (!allowed.includes(profile.role))
    throw new Error("Access denied: insufficient role for tag management");

  return { userId, profile };
}

// ── Queries ────────────────────────────────────────────────

/** List all tags, sorted alphabetically */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const tags = await ctx.db.query("contactTags").collect();
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// ── Mutations ──────────────────────────────────────────────

/** Create a single tag */
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const { userId } = await requireTagAccess(ctx);
    const clean = validateTagName(name);

    // Check for duplicates
    const existing = await ctx.db
      .query("contactTags")
      .withIndex("by_name", (q) => q.eq("name", clean))
      .first();
    if (existing) throw new Error(`Tag "${clean}" already exists`);

    const id = await ctx.db.insert("contactTags", {
      name: clean,
      createdBy: userId,
      createdAt: Date.now(),
    });
    return { id, name: clean };
  },
});

/** Create multiple tags from comma-separated string */
export const createBulk = mutation({
  args: { names: v.string() },
  handler: async (ctx, { names }) => {
    const { userId } = await requireTagAccess(ctx);

    const parts = names.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error("No tag names provided");

    const created: string[] = [];
    const skipped: string[] = [];

    for (const raw of parts) {
      const clean = validateTagName(raw);
      const existing = await ctx.db
        .query("contactTags")
        .withIndex("by_name", (q) => q.eq("name", clean))
        .first();
      if (existing) {
        skipped.push(clean);
        continue;
      }
      await ctx.db.insert("contactTags", {
        name: clean,
        createdBy: userId,
        createdAt: Date.now(),
      });
      created.push(clean);
    }

    return { created, skipped };
  },
});

/** Import tags from CSV content string (one column of tag names) */
export const importFromCsv = mutation({
  args: { csvContent: v.string() },
  handler: async (ctx, { csvContent }) => {
    const { userId } = await requireTagAccess(ctx);

    const lines = csvContent
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const created: string[] = [];
    const skipped: string[] = [];
    const invalid: string[] = [];

    for (const line of lines) {
      // Take first column if CSV has multiple
      const raw = line.split(",")[0].trim().replace(/^["']|["']$/g, "");
      if (!raw) continue;

      try {
        const clean = validateTagName(raw);
        const existing = await ctx.db
          .query("contactTags")
          .withIndex("by_name", (q) => q.eq("name", clean))
          .first();
        if (existing) {
          skipped.push(clean);
        } else {
          await ctx.db.insert("contactTags", {
            name: clean,
            createdBy: userId,
            createdAt: Date.now(),
          });
          created.push(clean);
        }
      } catch {
        invalid.push(raw);
      }
    }

    return { created, skipped, invalid };
  },
});

/** Delete a single tag and remove it from all contacts */
export const deleteTag = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireTagAccess(ctx);
    const clean = name.trim().toLowerCase();

    // Delete the tag record
    const tag = await ctx.db
      .query("contactTags")
      .withIndex("by_name", (q) => q.eq("name", clean))
      .first();
    if (tag) await ctx.db.delete(tag._id);

    // Remove from all contacts that have this tag
    const allLeads = await ctx.db.query("crmLeads").collect();
    for (const lead of allLeads) {
      if (lead.tags && lead.tags.includes(clean)) {
        await ctx.db.patch(lead._id, {
          tags: lead.tags.filter((t: string) => t !== clean),
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true, removed: clean };
  },
});

/** Delete multiple tags at once and remove from all contacts */
export const deleteBulk = mutation({
  args: { names: v.array(v.string()) },
  handler: async (ctx, { names }) => {
    await requireTagAccess(ctx);
    const cleanNames = names.map((n) => n.trim().toLowerCase());

    // Delete tag records
    for (const name of cleanNames) {
      const tag = await ctx.db
        .query("contactTags")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();
      if (tag) await ctx.db.delete(tag._id);
    }

    // Remove from all contacts
    const nameSet = new Set(cleanNames);
    const allLeads = await ctx.db.query("crmLeads").collect();
    for (const lead of allLeads) {
      if (lead.tags && lead.tags.some((t: string) => nameSet.has(t))) {
        await ctx.db.patch(lead._id, {
          tags: lead.tags.filter((t: string) => !nameSet.has(t)),
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true, removed: cleanNames };
  },
});

/** Add tag(s) to selected contact(s) */
export const addToContacts = mutation({
  args: {
    tagNames: v.array(v.string()),
    leadIds: v.array(v.id("crmLeads")),
  },
  handler: async (ctx, { tagNames, leadIds }) => {
    await requireTagAccess(ctx);
    const cleanTags = tagNames.map((t) => t.trim().toLowerCase());

    let updated = 0;
    for (const leadId of leadIds) {
      const lead = await ctx.db.get(leadId);
      if (!lead) continue;

      const existing = new Set(lead.tags || []);
      let changed = false;
      for (const tag of cleanTags) {
        if (!existing.has(tag)) {
          existing.add(tag);
          changed = true;
        }
      }
      if (changed) {
        await ctx.db.patch(leadId, {
          tags: Array.from(existing),
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { success: true, updated };
  },
});

/** Remove tag(s) from selected contact(s) */
export const removeFromContacts = mutation({
  args: {
    tagNames: v.array(v.string()),
    leadIds: v.array(v.id("crmLeads")),
  },
  handler: async (ctx, { tagNames, leadIds }) => {
    await requireTagAccess(ctx);
    const removeSet = new Set(tagNames.map((t) => t.trim().toLowerCase()));

    let updated = 0;
    for (const leadId of leadIds) {
      const lead = await ctx.db.get(leadId);
      if (!lead || !lead.tags) continue;

      const filtered = lead.tags.filter((t: string) => !removeSet.has(t));
      if (filtered.length !== lead.tags.length) {
        await ctx.db.patch(leadId, {
          tags: filtered,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { success: true, updated };
  },
});
