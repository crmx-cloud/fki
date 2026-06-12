import { v } from "convex/values";
import { httpAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Brand Showcase franchisor inquiry intake.
 *
 * The Brand Showcase landing page (separate Vercel project, live at
 * brand-showcase-ten.vercel.app / future brandshowcase.franchiseki.com) posts
 * form submissions to its own /api/submit relay, which forwards them here:
 *   POST /api/brand-showcase-inquiry  (routed in http.ts)
 *
 * The inquiry is stored in brandShowcaseInquiries (platform DB, so the brand
 * profile can later be enriched/claimed) and pushed to CRMX via the shared
 * internal.crmxPush.pushLeadToCRMX action.
 *
 * Abuse protection: requests must carry the shared secret header
 *   X-Showcase-Secret: <BRAND_SHOWCASE_SECRET env var>
 * (same pattern as X-Sync-Secret on /api/crm-sync, but fail-closed). The only
 * legitimate caller is the showcase's serverless relay, which holds the secret
 * in its own Vercel env.
 */

const INTEREST_TAGS: Record<string, string> = {
  "Claim or update our listing": "fki claim listing",
  "Ask about featured placement": "fki featured placement",
  "Ask about broker-led lead support": "fki broker-led lead support",
  "All of the above": "fki all growth options",
};
const PRIMARY_TAG = "franchiseki brand showcase requested";

const REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "brandName",
  "role",
  "category",
  "territories",
  "primaryInterest",
] as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const inquiryHttpHandler = httpAction(async (ctx, request) => {
  const expectedSecret = process.env.BRAND_SHOWCASE_SECRET;
  if (!expectedSecret) {
    console.error("[brandShowcase] BRAND_SHOWCASE_SECRET not set — rejecting inquiry");
    return json({ error: "not_configured" }, 503);
  }
  if (request.headers.get("X-Showcase-Secret") !== expectedSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  let d: Record<string, unknown>;
  try {
    d = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const missing = REQUIRED_FIELDS.filter(
    (k) => typeof d[k] !== "string" || !(d[k] as string).trim()
  );
  if (missing.length) {
    return json({ error: "missing_fields", missing }, 400);
  }
  const oversize = REQUIRED_FIELDS.filter((k) => (d[k] as string).length > 1000);
  if (oversize.length) {
    return json({ error: "fields_too_long", fields: oversize }, 400);
  }
  const email = (d.email as string).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "invalid_email" }, 400);
  }

  const inquiryId = await ctx.runMutation(internal.brandShowcase.recordInquiry, {
    firstName: (d.firstName as string).trim(),
    lastName: (d.lastName as string).trim(),
    email,
    phone: (d.phone as string).trim(),
    brandName: (d.brandName as string).trim(),
    role: (d.role as string).trim(),
    category: (d.category as string).trim(),
    territories: (d.territories as string).trim(),
    primaryInterest: (d.primaryInterest as string).trim(),
    source: typeof d.source === "string" ? d.source : undefined,
    submittedAt: typeof d.submittedAt === "string" ? d.submittedAt : undefined,
  });

  return json({ ok: true, inquiryId });
});

export const recordInquiry = internalMutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    brandName: v.string(),
    role: v.string(),
    category: v.string(),
    territories: v.string(),
    primaryInterest: v.string(),
    source: v.optional(v.string()),
    submittedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Best-effort match to a platform brand so the profile can be
    // enriched/claimed later (~300 brands, full scan is fine).
    const wanted = args.brandName.trim().toLowerCase();
    const brands = await ctx.db.query("brands").collect();
    const matched = brands.find((b) => b.name.trim().toLowerCase() === wanted);

    const inquiryId = await ctx.db.insert("brandShowcaseInquiries", {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      brandName: args.brandName,
      role: args.role,
      category: args.category,
      territories: args.territories,
      primaryInterest: args.primaryInterest,
      source: args.source ?? "brand-showcase",
      submittedAt: args.submittedAt,
      brandId: matched?._id,
      createdAt: Date.now(),
    });

    // Push to CRMX (fail-soft inside the action). Tags: the showcase primary
    // tag + interest tag; default website-lead tags skipped — franchisors must
    // not land in prospect nurture segments.
    const tags = [PRIMARY_TAG];
    const interestTag = INTEREST_TAGS[args.primaryInterest];
    if (interestTag) tags.push(interestTag);
    await ctx.scheduler.runAfter(0, internal.crmxPush.pushLeadToCRMX, {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      brandName: args.brandName,
      leadKind: "brand_showcase",
      skipDefaultTags: true,
      extraTags: tags,
      sourceOverride: "FranchiseKI Brand Showcase",
      notes: [
        `Role/title: ${args.role}`,
        `Category: ${args.category}`,
        `Open/target territories: ${args.territories}`,
        `Primary interest: ${args.primaryInterest}`,
        args.submittedAt ? `Submitted: ${args.submittedAt}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return inquiryId;
  },
});

/** QA helper: remove test inquiries by email (cleanup of test submissions only). */
export const deleteInquiriesByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("brandShowcaseInquiries")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return { deleted: rows.length };
  },
});
