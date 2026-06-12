import { v } from "convex/values";
import { httpAction, internalMutation, internalQuery } from "./_generated/server";
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

// ───────────────────────── Contact verification (onboarding) ─────────────────────────
// After submitting, the franchisor lands on the showcase /welcome onboarding
// and verifies email + phone with 6-digit codes. Same semantics as the
// platform's verification.ts (hashed code, 10-min TTL, 5 attempts), but keyed
// to the inquiry row since the submitter has no platform account yet.

const KIND = v.union(v.literal("email"), v.literal("phone"));
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

export const getInquiry = internalQuery({
  args: { inquiryId: v.id("brandShowcaseInquiries") },
  handler: async (ctx, args) => ctx.db.get(args.inquiryId),
});

export const storeVerifyCode = internalMutation({
  args: { inquiryId: v.id("brandShowcaseInquiries"), kind: KIND, codeHash: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(
      args.inquiryId,
      args.kind === "email"
        ? {
            emailCodeHash: args.codeHash,
            emailCodeExpiresAt: now + CODE_TTL_MS,
            emailCodeAttempts: 0,
            emailCodeSentAt: now,
          }
        : {
            phoneCodeHash: args.codeHash,
            phoneCodeExpiresAt: now + CODE_TTL_MS,
            phoneCodeAttempts: 0,
            phoneCodeSentAt: now,
          }
    );
    return { ok: true };
  },
});

export const checkVerifyCode = internalMutation({
  args: { inquiryId: v.id("brandShowcaseInquiries"), kind: KIND, codeHash: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.inquiryId);
    if (!row) return { ok: false, error: "Inquiry not found" };
    const isEmail = args.kind === "email";
    const hash = isEmail ? row.emailCodeHash : row.phoneCodeHash;
    const expiresAt = isEmail ? row.emailCodeExpiresAt : row.phoneCodeExpiresAt;
    const attempts = (isEmail ? row.emailCodeAttempts : row.phoneCodeAttempts) ?? 0;

    const clearCode = isEmail
      ? { emailCodeHash: undefined, emailCodeExpiresAt: undefined, emailCodeAttempts: undefined }
      : { phoneCodeHash: undefined, phoneCodeExpiresAt: undefined, phoneCodeAttempts: undefined };

    if (!hash) return { ok: false, error: "No code pending — request a new one" };
    if (!expiresAt || Date.now() > expiresAt) {
      await ctx.db.patch(args.inquiryId, clearCode);
      return { ok: false, error: "Code expired — request a new one" };
    }
    if (attempts >= MAX_ATTEMPTS) {
      await ctx.db.patch(args.inquiryId, clearCode);
      return { ok: false, error: "Too many attempts — request a new one" };
    }
    if (hash !== args.codeHash) {
      await ctx.db.patch(
        args.inquiryId,
        isEmail ? { emailCodeAttempts: attempts + 1 } : { phoneCodeAttempts: attempts + 1 }
      );
      return { ok: false, error: "Incorrect code" };
    }

    await ctx.db.patch(args.inquiryId, {
      ...clearCode,
      ...(isEmail ? { emailVerifiedAt: Date.now() } : { phoneVerifiedAt: Date.now() }),
    });

    const updated = await ctx.db.get(args.inquiryId);
    const bothVerified = Boolean(updated?.emailVerifiedAt && updated?.phoneVerifiedAt);
    if (bothVerified) {
      // Segmentation tag in CRMX — fail-soft, fire and forget
      await ctx.scheduler.runAfter(0, internal.brandShowcaseVerify.tagVerified, {
        inquiryId: args.inquiryId,
      });
    }
    return { ok: true, bothVerified };
  },
});

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function checkSecret(request: Request): Response | null {
  const expectedSecret = process.env.BRAND_SHOWCASE_SECRET;
  if (!expectedSecret) {
    console.error("[brandShowcase] BRAND_SHOWCASE_SECRET not set — rejecting request");
    return json({ error: "not_configured" }, 503);
  }
  if (request.headers.get("X-Showcase-Secret") !== expectedSecret) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}

/** POST /api/brand-showcase-verify/send — { inquiryId, kind } */
export const verifySendHandler = httpAction(async (ctx, request) => {
  const denied = checkSecret(request);
  if (denied) return denied;

  let body: { inquiryId?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!body.inquiryId || (body.kind !== "email" && body.kind !== "phone")) {
    return json({ error: "bad_request" }, 400);
  }

  let inquiry;
  try {
    inquiry = await ctx.runQuery(internal.brandShowcase.getInquiry, {
      inquiryId: body.inquiryId as any,
    });
  } catch {
    return json({ error: "invalid_inquiry_id" }, 400);
  }
  if (!inquiry) return json({ error: "inquiry_not_found" }, 404);

  const isEmail = body.kind === "email";
  if (isEmail ? inquiry.emailVerifiedAt : inquiry.phoneVerifiedAt) {
    return json({ ok: true, alreadyVerified: true });
  }
  const sentAt = isEmail ? inquiry.emailCodeSentAt : inquiry.phoneCodeSentAt;
  if (sentAt && Date.now() - sentAt < RESEND_COOLDOWN_MS) {
    return json({
      ok: false,
      error: "cooldown",
      retryInSeconds: Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - sentAt)) / 1000),
    });
  }

  const result = await ctx.runAction(internal.brandShowcaseVerify.sendCode, {
    inquiryId: body.inquiryId as any,
    kind: body.kind,
  });
  return json(result.sent ? { ok: true } : { ok: false, error: result.reason });
});

/** POST /api/brand-showcase-verify/confirm — { inquiryId, kind, code } */
export const verifyConfirmHandler = httpAction(async (ctx, request) => {
  const denied = checkSecret(request);
  if (denied) return denied;

  let body: { inquiryId?: string; kind?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (
    !body.inquiryId ||
    (body.kind !== "email" && body.kind !== "phone") ||
    typeof body.code !== "string" ||
    !/^\d{6}$/.test(body.code.trim())
  ) {
    return json({ error: "bad_request" }, 400);
  }

  const codeHash = await sha256Hex(body.code.trim());
  try {
    const result = await ctx.runMutation(internal.brandShowcase.checkVerifyCode, {
      inquiryId: body.inquiryId as any,
      kind: body.kind,
      codeHash,
    });
    return json(result);
  } catch {
    return json({ error: "invalid_inquiry_id" }, 400);
  }
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
