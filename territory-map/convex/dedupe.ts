import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Prospect-profile dedupe + merge.
 *
 * Duplicate detection: same email (case-insensitive) always; same phone
 * (normalized to digits, leading US "1" stripped) when both rows have one.
 *
 * Merge policy ("no data lost, newest wins"):
 * - The OLDEST row survives — it keeps the original creation date and _id.
 * - Every field is folded across the cluster in recency order (a row's
 *   recency = its last edit timestamp, falling back to creation), so the
 *   newest non-empty value of each field wins, but values only present on
 *   older rows are preserved.
 * - Exception: first-touch attribution (utm fields, referrer, landingPage,
 *   firstTouchAt) keeps the EARLIEST capture — that's the true source.
 * - userId: never stolen — only filled if the keeper lacks one.
 * - revenueAttribution rows pointing at deleted dupes are repointed.
 *
 * Triggers: scheduled automatically after each profile save (scoped to that
 * email/phone), and runnable table-wide via `npx convex run
 * dedupe:dedupeAll` for maintenance/backfill.
 */

const FIRST_TOUCH_FIELDS = [
  "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm",
  "referrer", "landingPage", "firstTouchAt",
] as const;

function normPhone(p: string | undefined | null): string | null {
  if (!p) return null;
  let d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.length >= 7 ? d : null;
}

const isEmpty = (val: unknown) =>
  val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);

const recency = (row: any) =>
  Math.max(row.contactLastEditedAt ?? 0, row.lastTouchAt ?? 0, row._creationTime);

async function mergeCluster(ctx: any, rows: any[]): Promise<{ keeperId: string; deleted: number }> {
  const sorted = [...rows].sort((a, b) => a._creationTime - b._creationTime);
  const keeper = sorted[0];

  // Fold fields oldest→newest so the newest non-empty value of each field wins
  const byRecency = [...rows].sort((a, b) => recency(a) - recency(b));
  const patch: Record<string, any> = {};
  for (const row of byRecency) {
    for (const [k, val] of Object.entries(row)) {
      if (k === "_id" || k === "_creationTime" || k === "userId") continue;
      if (!isEmpty(val)) patch[k] = val;
    }
  }
  // First touch: earliest capture wins
  const withTouch = [...rows].filter((r) => r.firstTouchAt).sort((a, b) => a.firstTouchAt - b.firstTouchAt)[0];
  if (withTouch) for (const f of FIRST_TOUCH_FIELDS) {
    if (!isEmpty(withTouch[f])) patch[f] = withTouch[f];
    else delete patch[f];
  }
  // userId: the same person can have two auth accounts (double signup).
  // Prefer the account that completed verification (its userProfile holds
  // emailVerifiedAt/phoneVerifiedAt — losing it would un-qualify the
  // profile), then fall back to the most recently active row's account.
  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  if (userIds.length <= 1) {
    patch.userId = userIds[0] ?? undefined;
  } else {
    let best: any = null;
    let bestScore = -1;
    for (const r of [...rows].sort((a, b) => recency(a) - recency(b))) {
      if (!r.userId) continue;
      const up = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q: any) => q.eq("userId", r.userId))
        .first();
      const score = (up?.emailVerifiedAt ? 2 : 0) + (up?.phoneVerifiedAt ? 1 : 0);
      if (score >= bestScore) {
        bestScore = score;
        best = r.userId;
      }
    }
    patch.userId = best ?? undefined;
  }

  await ctx.db.patch(keeper._id, patch);

  let deleted = 0;
  for (const row of sorted.slice(1)) {
    // Repoint revenue attribution before deleting
    const revs = await ctx.db
      .query("revenueAttribution")
      .filter((q: any) => q.eq(q.field("prospectProfileId"), row._id))
      .collect();
    for (const r of revs) await ctx.db.patch(r._id, { prospectProfileId: keeper._id });
    await ctx.db.delete(row._id);
    deleted++;
  }
  return { keeperId: String(keeper._id), deleted };
}

/** Build duplicate clusters (shared email, or shared phone) via union-find. */
function buildClusters(rows: any[]): any[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  for (const r of rows) parent.set(String(r._id), String(r._id));

  const byEmail = new Map<string, string>();
  const byPhone = new Map<string, string>();
  for (const r of rows) {
    const id = String(r._id);
    const email = r.email?.toLowerCase();
    if (email) {
      if (byEmail.has(email)) union(id, byEmail.get(email)!);
      else byEmail.set(email, id);
    }
    const phone = normPhone(r.phone);
    if (phone) {
      if (byPhone.has(phone)) union(id, byPhone.get(phone)!);
      else byPhone.set(phone, id);
    }
  }
  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const root = find(String(r._id));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(r);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

/** Full-table dedupe — maintenance/backfill. */
export const dedupeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("prospectProfiles").collect();
    const clusters = buildClusters(rows);
    let merged = 0, deleted = 0;
    for (const cluster of clusters) {
      const r = await mergeCluster(ctx, cluster);
      merged++;
      deleted += r.deleted;
    }
    return { scanned: rows.length, clusters: merged, deleted };
  },
});

/**
 * Repair: when one person has two auth accounts (double signup), profiles
 * can point at the unverified one. Relink each profile to the verified
 * account for its email. Idempotent — safe to re-run.
 */
export const relinkVerifiedAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const userProfiles = await ctx.db.query("userProfiles").collect();
    const upByUser = new Map(userProfiles.map((u: any) => [String(u.userId), u]));
    const score = (uid: any) => {
      const up = upByUser.get(String(uid));
      return ((up as any)?.emailVerifiedAt ? 2 : 0) + ((up as any)?.phoneVerifiedAt ? 1 : 0);
    };
    const usersByEmail = new Map<string, any[]>();
    for (const u of users) {
      const e = (u as any).email?.toLowerCase();
      if (!e) continue;
      if (!usersByEmail.has(e)) usersByEmail.set(e, []);
      usersByEmail.get(e)!.push(u);
    }
    let relinked = 0;
    for (const p of await ctx.db.query("prospectProfiles").collect()) {
      if (!p.email) continue;
      const candidates = usersByEmail.get(p.email.toLowerCase()) ?? [];
      if (candidates.length < 2 && p.userId) continue;
      const best = [...candidates].sort((a, b) => score(b._id) - score(a._id))[0];
      if (best && score(best._id) > (p.userId ? score(p.userId) : -1)) {
        await ctx.db.patch(p._id, { userId: best._id });
        relinked++;
      }
    }
    return { relinked };
  },
});

/** Scoped self-heal — scheduled after each profile save. */
export const dedupeForKey = internalMutation({
  args: { email: v.optional(v.string()), phone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = args.email?.toLowerCase();
    const phone = normPhone(args.phone);
    if (!email && !phone) return { deleted: 0 };
    const rows = (await ctx.db.query("prospectProfiles").collect()).filter(
      (r: any) =>
        (email && r.email?.toLowerCase() === email) ||
        (phone && normPhone(r.phone) === phone)
    );
    if (rows.length < 2) return { deleted: 0 };
    const r = await mergeCluster(ctx, rows);
    return { deleted: r.deleted };
  },
});
