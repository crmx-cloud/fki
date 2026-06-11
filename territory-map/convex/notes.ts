import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const colorValidator = v.optional(v.union(
  v.literal("yellow"),
  v.literal("blue"),
  v.literal("red"),
  v.literal("green"),
  v.literal("purple")
));

// ── Helpers ────────────────────────────────────────────────

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  return { userId, profile };
}

function canDeleteNote(
  note: any,
  userId: string,
  role: string | undefined
): boolean {
  // Creator can delete their own notes
  if (note.createdBy === userId) return true;
  // Admin and super admin can delete any note
  if (role === "admin" || role === "super_admin") return true;
  return false;
}

// ── Queries ────────────────────────────────────────────────

/** List notes for a contact. Pinned first, then newest. */
export const listByContact = query({
  args: { contactId: v.id("crmLeads") },
  handler: async (ctx, { contactId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const allNotes = await ctx.db
      .query("contactNotes")
      .withIndex("by_contact", (q) => q.eq("contactId", contactId))
      .collect();

    // Enrich with creator info
    const enriched = await Promise.all(
      allNotes.map(async (note) => {
        const creator = await ctx.db.get(note.createdBy);
        const creatorProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", note.createdBy))
          .first();
        return {
          ...note,
          creatorName: creatorProfile
            ? `${creatorProfile.firstName || ""} ${creatorProfile.lastName || ""}`.trim()
            : creator?.name || "Unknown",
          creatorEmail: creator?.email,
        };
      })
    );

    // Sort: pinned first, then by createdAt desc
    return enriched.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

/** Get note count for a contact (for badge display) */
export const countByContact = query({
  args: { contactId: v.id("crmLeads") },
  handler: async (ctx, { contactId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const notes = await ctx.db
      .query("contactNotes")
      .withIndex("by_contact", (q) => q.eq("contactId", contactId))
      .collect();
    return notes.length;
  },
});

// ── Mutations ──────────────────────────────────────────────

/** Create a new note on a contact */
export const create = mutation({
  args: {
    contactId: v.id("crmLeads"),
    content: v.string(),
    richContent: v.optional(v.string()),
    color: colorValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const now = Date.now();

    const noteId = await ctx.db.insert("contactNotes", {
      contactId: args.contactId,
      content: args.content,
      richContent: args.richContent,
      color: args.color || "yellow",
      isPinned: false,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activityLog", {
      userId,
      action: "note_created",
      entityType: "contactNote",
      entityId: noteId,
      details: `Note on contact ${args.contactId}`,
    });

    return noteId;
  },
});

/** Update a note's content or color */
export const update = mutation({
  args: {
    noteId: v.id("contactNotes"),
    content: v.optional(v.string()),
    richContent: v.optional(v.string()),
    color: colorValidator,
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireAuth(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    // Only creator, admin, or super admin can edit
    const isAdminOrSuper = profile?.role === "admin" || profile?.role === "super_admin";
    if (note.createdBy !== userId && !isAdminOrSuper) {
      throw new Error("You can only edit your own notes");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.content !== undefined) updates.content = args.content;
    if (args.richContent !== undefined) updates.richContent = args.richContent;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.noteId, updates);
    return { success: true };
  },
});

/** Toggle pin on a note (max 3 pinned per contact) */
export const togglePin = mutation({
  args: { noteId: v.id("contactNotes") },
  handler: async (ctx, { noteId }) => {
    const { userId } = await requireAuth(ctx);
    const note = await ctx.db.get(noteId);
    if (!note) throw new Error("Note not found");

    if (!note.isPinned) {
      // Check max 3 pinned per contact
      const pinned = await ctx.db
        .query("contactNotes")
        .withIndex("by_contact", (q) => q.eq("contactId", note.contactId))
        .collect();
      const pinnedCount = pinned.filter((n) => n.isPinned).length;
      if (pinnedCount >= 3) {
        throw new Error("Maximum 3 pinned notes per contact. Unpin one first.");
      }
    }

    await ctx.db.patch(noteId, {
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });

    return { success: true, isPinned: !note.isPinned };
  },
});

/** Delete a note */
export const deleteNote = mutation({
  args: { noteId: v.id("contactNotes") },
  handler: async (ctx, { noteId }) => {
    const { userId, profile } = await requireAuth(ctx);
    const note = await ctx.db.get(noteId);
    if (!note) throw new Error("Note not found");

    if (!canDeleteNote(note, userId, profile?.role)) {
      throw new Error("You don't have permission to delete this note");
    }

    await ctx.db.delete(noteId);

    await ctx.db.insert("activityLog", {
      userId,
      action: "note_deleted",
      entityType: "contactNote",
      entityId: noteId,
      details: `Deleted note on contact ${note.contactId}`,
    });

    return { success: true };
  },
});
