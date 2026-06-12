# Brand Showcase — Launch Blockers & CRMX Wiring

Hidden franchisor landing page (`brand-showcase/index.html`). Static + one Vercel
serverless function — deploys as its own Vercel project on **showcase.franchiseki.com**
(decided by Brent 2026-06-09). Page ships `noindex, nofollow` (meta + X-Robots-Tag
header in vercel.json) until Brent approves public launch.

## Live preview URL (deployed 2026-06-09)

**https://brand-showcase-ten.vercel.app** — Vercel project `brand-showcase`, scope
`brent-attaway-s-projects` (fki-1 login on this machine). Public but `noindex`
(meta + X-Robots-Tag verified). `/api/submit` live and validating; returns
`crmx-not-configured` warning until `CRMX_WEBHOOK_URL` env var is set.
Redeploy: `npx vercel deploy --prod --yes` from the brand-showcase folder.

## Status — what's resolved

- ✅ Subdomain: **showcase.franchiseki.com** (DNS for franchiseki.com is managed in
  the GHL dashboard, not Cloudflare; go-live is Bennett-gated).
- ✅ Privacy Policy (`privacy.html`) + Terms (`terms.html`) — full documents drafted
  2026-06-09, linked from footer and form consent. **Pending lawyer approval** —
  drafted as complete/plug-and-play (operating name "Franchise KI", Utah governing
  law, contacts privacy@/legal@franchiseki.com). Those two mailboxes must exist or
  forward before launch.
- ✅ Consent / TCPA language — final draft in form (links both policies, STOP
  opt-out, "not a condition of purchase"). Same lawyer pass covers it.
- ✅ Form wiring — serverless relay built (see below); Brent builds the CRMX
  workflow himself.

## Wiring status (2026-06-12)

- Domain **brandshowcase.franchiseki.com** added to the Vercel project (supersedes
  earlier showcase.franchiseki.com choice). Needs ONE Cloudflare record (nameservers
  are Cloudflare, NOT GHL as older notes said): `A brandshowcase → 76.76.21.21`,
  DNS-only/grey cloud recommended.
- Relay updated: primary tag `franchiseki brand showcase requested` + interest tag;
  brand details go to contact note (avoids GHL 422 on unknown custom-field keys).
- ✅ **Convex wiring DONE (2026-06-12, E2E verified):** the relay now forwards to
  the platform's Convex HTTP endpoint
  `https://abundant-lion-457.convex.site/api/brand-showcase-inquiry`
  (`CONVEX_INQUIRY_URL` + `CONVEX_INQUIRY_SECRET` set on this Vercel project;
  secret = `BRAND_SHOWCASE_SECRET` on the Convex prod deployment). Inquiries land
  in the platform `brandShowcaseInquiries` table (auto-matched to a `brands` row
  when the name matches) AND are pushed to CRMX via `pushLeadToCRMX`
  (tags: `franchiseki brand showcase requested` + interest tag; source
  "FranchiseKI Brand Showcase"; prospect website-lead tags deliberately skipped).
  No GHL creds in this project's Vercel env — the earlier authorization blocker
  is moot. Direct-CRMX paths (`CRMX_WEBHOOK_URL`/`CRMX_API_KEY`) remain as
  fallback only.

## Remaining blockers

1. **Lawyer sign-off** on privacy.html, terms.html, and the form consent line.
2. ~~CRMX inbound-webhook URL~~ — superseded by the Convex wiring above
   (`CRMX_WEBHOOK_URL` now optional fallback only).
3. **DNS only** — Vercel project exists and is live; remaining: ONE Cloudflare
   record `A brandshowcase → 76.76.21.21` (see Wiring status above).
4. **Verified platform stats** — 190 / 462 / 404 wired in but HIDDEN per
   anti-hallucination rule; set `data-stats="verified"` on `#proof-grid` to show.
5. **Featured placement + broker-led pricing/eligibility** — optional; page handles
   honestly without specifics.
6. **Real brand testimonials** — optional; none on page (no fake testimonials).
7. **Claim verification system** — promised on page (domain-email verification,
   duplicate-claim checks); build post-launch in territory-map app
   (`ClaimPage`/`brandClaims`).

## CRMX workflow wiring (Brent's steps)

1. In CRMX (app.crmx.app) → **Automation → Workflows → Create Workflow → Start from
   Scratch**.
2. Add trigger: **Inbound Webhook**. Copy the generated webhook URL.
3. Give the URL to Guy (or paste into Vercel → Project → Settings → Environment
   Variables → `CRMX_WEBHOOK_URL`, all environments → redeploy).
4. Back in the workflow, click **"Check for new requests"** on the trigger, then have
   Guy fire a test POST so CRMX captures the sample payload and the fields become
   mappable.
5. Add actions: Create/Update Contact (map firstName, lastName, email, phone) → Add
   Tag(s) from the `tags` array → Create Opportunity in the franchisor pipeline
   (`vUMUWSpK5v217qHsFH5k`) → Internal notification → Confirmation email (FKI
   corporate wrapper: Navy `#0f1f3d` / Gold `#d4a857`).
6. Publish the workflow.

## Form wiring (CRMX) — relay built, needs one env var

The form posts to `/api/submit` (Vercel serverless function `api/submit.js`), which
forwards to CRMX (GHL white-label, location `14RD8KklxR9G4e0Rf7v2` per ghl-skill).
Configure ONE env var on the Vercel project at deploy:

- `CRMX_WEBHOOK_URL` — inbound-webhook trigger URL from a CRMX workflow (preferred:
  workflow controls tags/pipeline/notifications in one place), **or**
- `CRMX_API_KEY` — the GHL Private Integration Token (1Password FKI-Production vault,
  item "GHL Private API Token" — Leo retrieves). Relay then upserts the contact
  directly with tags + custom fields.

Token never goes in the page or repo (ghl-skill red line). If the API-key path is
used, the custom field keys (`franchise_brand_name`, `franchisor_role_title`,
`franchise_category`, `open_target_territories`, `primary_interest`) must exist in
the CRMX location or GHL drops them silently — create them first, or use the
webhook path.

Payload fields: `firstName, lastName, email, phone, brandName, role, category,
territories, primaryInterest, source: "brand-showcase", tags[], submittedAt`.

### Tags
- `FKI - Brand Showcase Inquiry` (always)
- `FKI - Claim Listing` | `FKI - Featured Placement` | `FKI - Broker-Led Lead Support` | `FKI - All Growth Options` (map from `primaryInterest`)

### Custom fields
Franchise brand name · Franchisor role/title · Franchise category · Open/target
territories · Primary interest · FranchiseKI listing status · Featured placement
interest · Broker-led support interest

### Workflow: "Franchise KI Brand Showcase Inquiry"
1. Create/update contact
2. Apply primary tag + interest-specific tag
3. Create opportunity in franchisor/partner pipeline
4. Notify FranchiseKI team
5. Send confirmation email (FKI wrapper: Navy `#0f1f3d` / Gold `#d4a857` — corporate email frame, NOT the page's cyan)
6. Route: listing review / featured placement consultation / broker-led support review

[VERIFY IN CRMX: routing, pipeline, notifications, automations, payment/application flow.]

## Branding decision (RESOLVED 2026-06-09)

The source prompt's "FranchiseKey" spelling was a transcription artifact. Brent
confirmed the brand is **Franchise KI / franchiseki.com** — the page uses
Franchise KI throughout (matches logo asset, nav, footer, disclaimer from
territory-map). Do not reintroduce "FranchiseKey" anywhere.
