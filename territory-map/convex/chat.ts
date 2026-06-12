import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * User ↔ consultant chat. Thread key = prospect userId; the thread belongs
 * to the USER and persists across consultant reassignment. Access:
 *  - prospect: own thread only
 *  - consultant (broker): threads of prospects whose CRM lead is assigned
 *    to them (lead.salesRepId === consultant)
 *  - admin/super_admin: all threads
 * Convex reactivity = real-time delivery with zero extra infra.
 */

async function getRole(ctx: any, userId: any): Promise<string | null> {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  return profile?.role ?? null;
}

/** Can `userId` (team member) access the thread of `prospectUserId`? */
async function canAccessThread(ctx: any, userId: any, role: string, prospectUserId: any): Promise<boolean> {
  if (role === "admin" || role === "super_admin") return true;
  if (role !== "broker") return false;
  const prospectUser = await ctx.db.get(prospectUserId);
  const email = prospectUser?.email?.toLowerCase();
  if (!email) return false;
  const leads = await ctx.db.query("crmLeads").collect();
  return leads.some(
    (l: any) => !l.deletedAt && l.email?.toLowerCase() === email && String(l.salesRepId) === String(userId)
  );
}

export const send = mutation({
  args: { body: v.string(), prospectUserId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const body = args.body.trim().slice(0, 2000);
    if (!body) return;
    const role = (await getRole(ctx, userId)) ?? "prospect";
    const user = await ctx.db.get(userId);
    const senderName = (user as any)?.name || (user as any)?.email || "User";

    let prospectUserId = userId; // prospects write to their own thread
    let senderRole = "prospect";
    if (role === "broker" || role === "admin" || role === "super_admin") {
      if (!args.prospectUserId) throw new Error("prospectUserId required");
      if (!(await canAccessThread(ctx, userId, role, args.prospectUserId)))
        throw new Error("No access to this conversation");
      prospectUserId = args.prospectUserId;
      senderRole = role === "broker" ? "consultant" : "admin";
    } else if (args.prospectUserId && String(args.prospectUserId) !== String(userId)) {
      throw new Error("No access");
    }

    await ctx.db.insert("chatMessages", {
      prospectUserId,
      senderId: userId,
      senderRole,
      senderName,
      body,
      ts: Date.now(),
      readByProspect: senderRole === "prospect",
      readByTeam: senderRole !== "prospect",
    });
  },
});

/** The signed-in prospect's own thread. */
export const myThread = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_prospect", (q) => q.eq("prospectUserId", userId))
      .collect();
  },
});

/** A specific thread, for consultants/admins with access. */
export const thread = query({
  args: { prospectUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const role = await getRole(ctx, userId);
    if (!role || !(await canAccessThread(ctx, userId, role, args.prospectUserId))) return null;
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_prospect", (q) => q.eq("prospectUserId", args.prospectUserId))
      .collect();
  },
});

/** Thread list for the team side (admin: all; consultant: assigned only). */
export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const role = await getRole(ctx, userId);
    if (!role || !["admin", "super_admin", "broker"].includes(role)) return null;

    const all = await ctx.db.query("chatMessages").collect();
    const byThread = new Map<string, any[]>();
    for (const m of all) {
      const k = String(m.prospectUserId);
      if (!byThread.has(k)) byThread.set(k, []);
      byThread.get(k)!.push(m);
    }
    const threads: any[] = [];
    for (const [k, msgs] of byThread) {
      const prospectUserId = msgs[0].prospectUserId;
      if (role === "broker" && !(await canAccessThread(ctx, userId, role, prospectUserId))) continue;
      msgs.sort((a, b) => a.ts - b.ts);
      const last = msgs[msgs.length - 1];
      const prospectUser = await ctx.db.get(prospectUserId);
      threads.push({
        prospectUserId,
        prospectName: (prospectUser as any)?.name || (prospectUser as any)?.email || "Prospect",
        lastBody: last.body,
        lastTs: last.ts,
        lastFrom: last.senderRole,
        unread: msgs.filter((m) => !m.readByTeam).length,
      });
    }
    return threads.sort((a, b) => b.lastTs - a.lastTs);
  },
});

/** Unread badge for the sidebar (role-aware). */
export const myUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const role = (await getRole(ctx, userId)) ?? "prospect";
    if (role === "prospect") {
      const msgs = await ctx.db
        .query("chatMessages")
        .withIndex("by_prospect", (q) => q.eq("prospectUserId", userId))
        .collect();
      return msgs.filter((m) => !m.readByProspect).length;
    }
    if (["admin", "super_admin", "broker"].includes(role)) {
      const all = await ctx.db.query("chatMessages").collect();
      let n = 0;
      const checked = new Map<string, boolean>();
      for (const m of all) {
        if (m.readByTeam) continue;
        const k = String(m.prospectUserId);
        if (!checked.has(k)) checked.set(k, await canAccessThread(ctx, userId, role, m.prospectUserId));
        if (checked.get(k)) n++;
      }
      return n;
    }
    return 0;
  },
});

/** Mark a thread read for my side. */
export const markRead = mutation({
  args: { prospectUserId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const role = (await getRole(ctx, userId)) ?? "prospect";
    const threadKey = role === "prospect" ? userId : args.prospectUserId;
    if (!threadKey) return;
    if (role !== "prospect" && !(await canAccessThread(ctx, userId, role, threadKey))) return;
    const msgs = await ctx.db
      .query("chatMessages")
      .withIndex("by_prospect", (q) => q.eq("prospectUserId", threadKey))
      .collect();
    for (const m of msgs) {
      if (role === "prospect" && !m.readByProspect) await ctx.db.patch(m._id, { readByProspect: true });
      if (role !== "prospect" && !m.readByTeam) await ctx.db.patch(m._id, { readByTeam: true });
    }
  },
});
