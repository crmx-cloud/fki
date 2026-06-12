import { internalAction, action, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Mirrors site chat into the CRMX/GHL universal Conversations inbox so the
 * team can monitor every prospect↔consultant exchange in ONE place.
 *
 * Mechanics (verified live against the API with the PIT token):
 * - inbound message injection works with type "Live_Chat" — no marketplace
 *   app needed. Outbound injection requires a conversation-provider app,
 *   so consultant/admin replies are mirrored as labeled Live_Chat entries
 *   ("↩ Consultant Name (replied on site): ...") — full visibility, even
 *   though GHL renders them on the contact's side of the thread.
 * - Replying FROM GHL goes out via a real channel (SMS/email) straight to
 *   the prospect — it won't appear in site chat. True two-way needs a GHL
 *   marketplace conversation provider (phase 2).
 *
 * Fail-soft: a GHL hiccup never blocks or delays the site chat itself.
 */

const GHL = "https://services.leadconnectorhq.com";

export const pushToGHL = internalAction({
  args: {
    prospectEmail: v.string(),
    prospectName: v.optional(v.string()),
    senderRole: v.string(), // "prospect" | "consultant" | "admin"
    senderName: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (_ctx, args) => {
    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) return { mirrored: false, reason: "env" };
    const headers = {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
    };

    try {
      // 1) contact (idempotent upsert by email)
      const up = await fetch(`${GHL}/contacts/upsert`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          locationId,
          email: args.prospectEmail,
          firstName: args.prospectName?.split(" ")[0],
          tags: ["fki-site-chat"],
          source: "FranchiseKI Website",
        }),
      });
      const upData = (await up.json().catch(() => ({}))) as any;
      const contactId = upData?.contact?.id;
      if (!contactId) return { mirrored: false, reason: "contact" };

      // 2) find or create the conversation
      let conversationId: string | null = null;
      const search = await fetch(
        `${GHL}/conversations/search?locationId=${locationId}&contactId=${contactId}`,
        { headers }
      );
      const searchData = (await search.json().catch(() => ({}))) as any;
      const existing = (searchData?.conversations ?? [])[0];
      if (existing?.id) conversationId = existing.id;
      if (!conversationId) {
        const created = await fetch(`${GHL}/conversations/`, {
          method: "POST",
          headers,
          body: JSON.stringify({ locationId, contactId }),
        });
        const createdData = (await created.json().catch(() => ({}))) as any;
        conversationId = createdData?.conversation?.id ?? null;
      }
      if (!conversationId) return { mirrored: false, reason: "conversation" };

      // 3) inject as Live_Chat; consultant/admin replies get a clear label
      const message =
        args.senderRole === "prospect"
          ? args.body
          : `↩ ${args.senderName ?? "FranchiseKI team"}${
              args.senderRole === "consultant" ? " (consultant" : " (team"
            }, replied on site): ${args.body}`;
      const res = await fetch(`${GHL}/conversations/messages/inbound`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "Live_Chat", conversationId, message }),
      });
      if (!res.ok) {
        console.error("[chatMirror] inject failed", res.status, (await res.text()).slice(0, 200));
        return { mirrored: false, reason: `http_${res.status}` };
      }
      return { mirrored: true, conversationId };
    } catch (e) {
      console.error("[chatMirror] error", e);
      return { mirrored: false, reason: "exception" };
    }
  },
});

/* ────────────────────────────────────────────────────────────
 * Reverse direction: pull team replies typed in the CRMX inbox
 * into the site chat thread.
 *
 * Rules (v1): only HUMAN-looking outbound SMS/WhatsApp replies are
 * ingested — emails and automated sends (verification codes, campaigns)
 * are excluded so marketing noise never pollutes the chat. Deduped by
 * GHL message id; ingestion inserts directly (never re-mirrors → no loop).
 * Triggered by the Messages page while it's open (initial + 45s poll).
 * ──────────────────────────────────────────────────────────── */

export const pullFromGHL = action({
  args: { prospectUserId: v.optional(v.id("users")) },
  handler: async (ctx, args): Promise<{ ingested: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ingested: 0 };
    const access: { threadKey: string; email: string } | null = await ctx.runQuery(
      internal.chatMirror.resolveThread,
      { callerId: userId, prospectUserId: args.prospectUserId }
    );
    if (!access) return { ingested: 0 };

    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) return { ingested: 0 };
    const headers = { Authorization: `Bearer ${token}`, Version: "2021-07-28" };

    try {
      // contact → conversation → recent messages
      const cRes = await fetch(
        `${GHL}/contacts/?locationId=${locationId}&query=${encodeURIComponent(access.email)}`,
        { headers }
      );
      const cData = (await cRes.json().catch(() => ({}))) as any;
      const contact = (cData?.contacts ?? []).find(
        (c: any) => c.email?.toLowerCase() === access.email.toLowerCase()
      );
      if (!contact?.id) return { ingested: 0 };
      const sRes = await fetch(
        `${GHL}/conversations/search?locationId=${locationId}&contactId=${contact.id}`,
        { headers }
      );
      const sData = (await sRes.json().catch(() => ({}))) as any;
      const conv = (sData?.conversations ?? [])[0];
      if (!conv?.id) return { ingested: 0 };
      const mRes = await fetch(`${GHL}/conversations/${conv.id}/messages?limit=50`, { headers });
      const mData = (await mRes.json().catch(() => ({}))) as any;
      const msgs: any[] = mData?.messages?.messages ?? [];

      const cutoff = Date.now() - 7 * 24 * 3600_000;
      const candidates = msgs
        .filter((m) => m.direction === "outbound")
        .filter((m) => ["TYPE_SMS", "TYPE_WHATSAPP"].includes(m.messageType))
        .filter((m) => m.body && !/verification code/i.test(m.body))
        .filter((m) => new Date(m.dateAdded).getTime() > cutoff)
        .map((m) => ({
          ghlMessageId: String(m.id),
          body: String(m.body).slice(0, 2000),
          ts: new Date(m.dateAdded).getTime(),
        }));
      if (!candidates.length) return { ingested: 0 };

      const ingested: number = await ctx.runMutation(internal.chatMirror.ingestReplies, {
        prospectUserId: access.threadKey as any,
        replies: candidates,
      });
      return { ingested };
    } catch (e) {
      console.error("[chatMirror] pull error", e);
      return { ingested: 0 };
    }
  },
});

/** Access resolution for pullFromGHL (mirrors chat.ts thread rules). */
export const resolveThread = internalQuery({
  args: { callerId: v.id("users"), prospectUserId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.callerId))
      .first();
    const role = profile?.role ?? "prospect";
    let threadKey = args.callerId;
    if (["broker", "admin", "super_admin"].includes(role)) {
      if (!args.prospectUserId) return null;
      threadKey = args.prospectUserId;
      if (role === "broker") {
        const prospectUser = await ctx.db.get(threadKey);
        const email = (prospectUser as any)?.email?.toLowerCase();
        if (!email) return null;
        const leads = await ctx.db.query("crmLeads").collect();
        const ok = leads.some(
          (l: any) =>
            !l.deletedAt && l.email?.toLowerCase() === email && String(l.salesRepId) === String(args.callerId)
        );
        if (!ok) return null;
      }
    } else if (args.prospectUserId && String(args.prospectUserId) !== String(args.callerId)) {
      return null;
    }
    const user = await ctx.db.get(threadKey);
    const email = (user as any)?.email;
    if (!email) return null;
    return { threadKey: String(threadKey), email };
  },
});

/** Insert pulled replies (deduped by ghlMessageId); no re-mirroring. */
export const ingestReplies = internalMutation({
  args: {
    prospectUserId: v.id("users"),
    replies: v.array(
      v.object({ ghlMessageId: v.string(), body: v.string(), ts: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chatMessages")
      .withIndex("by_prospect", (q) => q.eq("prospectUserId", args.prospectUserId))
      .collect();
    const seen = new Set(existing.map((m: any) => m.ghlMessageId).filter(Boolean));
    let n = 0;
    for (const r of args.replies) {
      if (seen.has(r.ghlMessageId)) continue;
      await ctx.db.insert("chatMessages", {
        prospectUserId: args.prospectUserId,
        senderId: args.prospectUserId, // no site account for the CRMX sender; thread owner as placeholder
        senderRole: "admin",
        senderName: "FranchiseKI team · via text",
        body: r.body,
        ts: r.ts,
        readByProspect: false,
        readByTeam: true,
        ghlMessageId: r.ghlMessageId,
      });
      n++;
    }
    return n;
  },
});

/** Ops cleanup: remove a previously ingested CRMX reply from site chat. */
export const qaDeleteIngested = internalMutation({
  args: { ghlMessageId: v.string() },
  handler: async (ctx, { ghlMessageId }) => {
    const rows = (await ctx.db.query("chatMessages").collect()).filter(
      (m: any) => m.ghlMessageId === ghlMessageId
    );
    for (const r of rows) await ctx.db.delete(r._id);
    return { deleted: rows.length };
  },
});
