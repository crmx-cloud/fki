import { internalAction } from "./_generated/server";
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
