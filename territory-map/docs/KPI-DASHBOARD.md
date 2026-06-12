# KPI / Acquisition-Readiness Dashboard

Route: `/kpis` (sidebar → "Company KPIs", admin + super_admin only).
Built 2026-06-12. Business objective: show at a glance whether FranchiseKI is
building an enriched, opted-in franchise-buyer database valuable enough to sell.

## Architecture

| Piece | File |
|---|---|
| **Metric definitions (single source of truth)** | `convex/metricsDefs.ts` |
| Aggregation queries (admin-gated) | `convex/adminMetrics.ts` |
| Activity/intent event stream | `convex/activity.ts` + `activityEvents` table |
| Marketing spend (manual entry) | `marketingSpend` table + CRUD in adminMetrics |
| Revenue attribution (manual now, GHL later) | `revenueAttribution` table + CRUD |
| UTM/referrer capture | `src/lib/attribution.ts` (first touch, localStorage) → `prospect.saveProfile` |
| Date-range presets | `src/lib/dateRanges.ts` |
| Dashboard UI | `src/pages/AdminKpiPage.tsx` |

**Change business logic in `metricsDefs.ts` only** — qualification rule,
completeness weights, milestones, source classification all live there.

## Definitions (summary — authoritative text in metricsDefs.ts)

- **Valid profile** — prospectProfile with an email. ("Profiles" = business
  language; auth accounts live in `users`/`userProfiles`.)
- **Qualified profile** — valid + verified email + phone (verified preferred,
  present accepted) + investment range + timeline + geography + ≥1 category.
  Consent = account creation today; explicit opt-in checkbox is a **TODO**.
- **Active profile** — ≥1 activityEvent (or profile edit) in the window.
  Event types: profile_created/updated, email/phone_verified, brand_viewed,
  brand_compared, dossier_requested, consultant_requested, revenue_attributed.
  (appointment_booked / brand_intro_* / funding_info_submitted reserved, shown
  as "not configured yet" in the funnel.)
- **Consultant request** — first non-deleted crmLead matching the profile's
  email (created via "I'm Interested" → `crm.createLeadFromProspect`).
- **Cost per (qualified) profile** — Σ marketingSpend in range ÷ (qualified)
  profiles created in range.
- **Profile completeness** — % of the same 24 fields the prospect sees on
  /my-profile (5 basics + 19 enhancements). Keep both lists in sync.
- **Brand completeness** — weighted score: 10 critical fields (×2: investment,
  fees, royalty, category, description, units, founded, state availability,
  risk flags, source verification) + 25 standard fields. "Complete/enriched" =
  zero missing critical fields.
- **Date ranges** — [start, end) local time; comparison = same-length window
  immediately prior. Chart buckets: ≤2 days→hourly, ≤62→daily, ≤200→weekly,
  else monthly.

## Brand data audit (Brent's "23–25 data points" assumption)

The model already held **~95 fields** before this work (Item 7 breakdown,
Item 19 revenue/profit, Item 20 unit movements, litigation, training hours,
territory, fees, leadership, social, videos…). This pass added **31 more**
(all optional/additive, zero migration risk): subcategory, businessModelType,
mobileBased, internationalAvailability, franchiseDevContact, netWorthMin,
financingOffered, thirdPartyFinancing, renewalTermYears, renewalFee,
transferFee, exitRestrictions, nonCompeteTerms, supplierRestrictions,
requiredPurchases, nationalAccounts, grandOpeningSupport, callCenterSupport,
siteSelectionSupport, realEstateSupport, rampUpNotes, bankruptcyDisclosed,
franchisorFinancialsAvailable, franchisorRevenue, franchisorNetIncome,
customerAcquisitionModel, primaryMarketingChannels, seasonalityNotes,
regulatoryNotes, riskLevel — putting the target model at ~125 points,
comfortably past the 75–80 goal.

Not separately modeled (future): multi-year unit growth (item20 stores one
reportingYear; add an array for 3yr/5yr trends), nonRenewals/reacquisitions
(extend item20 object), franchisee turnover rate (derivable once multi-year
data exists), break-even estimate (needs sourced data; use dataNotes until
then). Enrichment prompts should start populating the new fields on the next
research batch.

## Revenue attribution (GHL)

`revenueAttribution` rows carry ghlContactId, pipelineStage, and triggerTag so
a future sync can map **any** tag/stage/custom-field rule — not hard-coded to
one tag. Manual entry works today via "Attribute revenue" on the dashboard.
Future sync sketch: scheduled action pulls GHL contacts by configurable tag →
upserts rows keyed on ghlContactId → joins to profiles by email.

## How to test

1. Log in as admin/super admin → sidebar "Company KPIs" → `/kpis`.
2. Change the date filter (all 13 presets + custom) — period cards, charts,
   and comparisons re-query reactively.
3. "Manage spend" → add a row (e.g. today / paid_ads / $500) → Cost per
   profile cards populate.
4. "Attribute revenue" → add a row with a real profile email → Revenue cards
   + profile drill-down Revenue column populate.
5. Drill-down tables: Profiles / Brands / Sources, each with CSV export.
6. Backend numbers without UI: `npx convex run adminMetrics:dashboardDebug
   '{"start": <ms>, "end": <ms>, "bucket": "day"}'`.
7. Visit the site with `?utm_source=test&utm_medium=cpc`, sign up, save a
   profile → Source Performance shows the new source.

No new env vars. No seed data (real data only). All schema changes additive —
nothing destroyed or renamed.

## Scale plan

Aggregation currently collects tables server-side per query — correct at
hundreds of profiles / 300 brands. At ~50K+ profiles, move per-bucket counts
to a scheduled rollup table; the dashboard payload shape (and the UI) can stay
identical. Supporting indexes already exist: `crmLeads.by_created`,
`activityEvents.by_ts` / `by_user_ts`, `marketingSpend.by_date`,
`revenueAttribution.by_date` / `by_email`.
