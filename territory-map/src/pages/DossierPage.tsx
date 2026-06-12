import { useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { DueDiligenceDisclaimer } from "@/components/DueDiligenceDisclaimer";
import { STATE_ABBREVS } from "@/lib/us-states-geo";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CircleHelp,
  FileText,
  Info,
  Lock,
  MapPin,
  Minus,
  Printer,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════
 * Helpers — formatting + prospect bucket → number maps
 * (kept in sync with convex/prospect.ts)
 * ════════════════════════════════════════════════════════════ */

function fmtMoney(v?: number | null): string {
  if (v === undefined || v === null || isNaN(v)) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

const CAPITAL_MIDPOINT: Record<string, number> = {
  under_50k: 25_000,
  "50k_100k": 75_000,
  "100k_150k": 125_000,
  "150k_250k": 200_000,
  "250k_500k": 375_000,
  "500k_1m": 750_000,
  "1m_plus": 1_500_000,
};

const CAPITAL_LABEL: Record<string, string> = {
  under_50k: "Under $50K",
  "50k_100k": "$50K–$100K",
  "100k_150k": "$100K–$150K",
  "150k_250k": "$150K–$250K",
  "250k_500k": "$250K–$500K",
  "500k_1m": "$500K–$1M",
  "1m_plus": "$1M+",
};

const INVEST_BUDGET_MIDPOINT: Record<string, number> = {
  under_100k: 75_000,
  "100k_250k": 175_000,
  "250k_500k": 375_000,
  "500k_1m": 750_000,
  "1m_plus": 1_500_000,
};

const OWNER_TYPE_LABEL: Record<string, string> = {
  owner_operator: "Owner/Operator",
  semi_absentee: "Semi-Absentee",
  absentee: "Absentee/Executive",
  investor: "Investor/Multi-Unit",
};

/* ── Risk-flag severity styling — same visual language as the SWOT tab ── */
const RISK_STYLES: Record<
  "red" | "caution" | "info",
  { card: string; iconColor: string; chip: string; chipLabel: string; title: string; detail: string }
> = {
  red: {
    card: "bg-rose-50 border-rose-200",
    iconColor: "text-rose-600",
    chip: "bg-rose-600 text-white",
    chipLabel: "RED FLAG",
    title: "text-rose-900",
    detail: "text-rose-800/80",
  },
  caution: {
    card: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    chip: "bg-amber-500 text-white",
    chipLabel: "CAUTION",
    title: "text-amber-900",
    detail: "text-amber-800/80",
  },
  info: {
    card: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-400",
    chip: "bg-slate-200 text-slate-600",
    chipLabel: "INFO",
    title: "text-slate-700",
    detail: "text-slate-500",
  },
};

type FitStatus = "pass" | "warn" | "fail" | "unknown";

const FIT_ICON: Record<FitStatus, { icon: typeof Check; cls: string; bg: string }> = {
  pass: { icon: Check, cls: "text-emerald-600", bg: "bg-emerald-100" },
  warn: { icon: AlertTriangle, cls: "text-amber-600", bg: "bg-amber-100" },
  fail: { icon: X, cls: "text-rose-600", bg: "bg-rose-100" },
  unknown: { icon: Minus, cls: "text-slate-400", bg: "bg-slate-100" },
};

function FitRow({ status, label, detail }: { status: FitStatus; label: string; detail: string }) {
  const s = FIT_ICON[status];
  const Icon = s.icon;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className={`w-6 h-6 rounded-full ${s.bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${s.cls}`} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

function MoneyRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <span className="text-sm text-slate-600">{label}</span>
        {sub && <p className="text-[11px] text-slate-400 leading-snug">{sub}</p>}
      </div>
      <span className={`text-sm font-bold tabular-nums shrink-0 ${value === "Not yet verified" ? "font-medium text-slate-400 italic" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-3">
      {children}
    </h3>
  );
}

/* ── Source tag for figures with provenance ── */
function SourceTag({ source }: { source?: { source: string; url?: string; year?: number } }) {
  if (!source) return null;
  let label = source.source;
  try {
    const u = new URL(/^https?:\/\//i.test(label) ? label : `https://${label}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host.includes(".") && !host.includes(" ")) label = host;
  } catch { /* keep raw label */ }
  const href = source.url ?? undefined;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
      <ShieldCheck className="w-3 h-3 text-emerald-600" />
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-700">
          {label}
        </a>
      ) : (
        label
      )}
      {source.year ? ` · ${source.year}` : ""}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
 * 10 questions builder — static pool with data-gap swaps
 * ════════════════════════════════════════════════════════════ */

const BASE_QUESTIONS = [
  "How many franchisees left the system in the last 3 years, and may I speak with some who did?",
  "What does the median unit do in revenue — not just the average — and how many units are in that sample?",
  "How long does a typical new unit take to reach break-even, and what did the slowest quartile look like?",
  "How much of the Item 7 build-out estimate reflects openings from the last 12 months?",
  "What support do I actually get in my first 90 days — names, roles, and hours, not adjectives?",
  "Which current franchisees would you prefer I not talk to, and why?",
  "What changes to the royalty structure, required technology stack, or vendors are planned in the next 2 years?",
  "If I want to sell the business in 5 years, what transfer fees and approval conditions apply?",
  "How are marketing/brand-fund dollars spent, and what reporting do franchisees get on that spend?",
  "What percentage of franchisees would buy the franchise again if they could decide today — and how do you know?",
];

function buildQuestions(profile: any): { q: string; dynamic: boolean }[] {
  const dynamic: string[] = [];

  if (profile?.item19Available !== true) {
    dynamic.push(
      "Why does your FDD not include a financial performance representation (Item 19) — and without one, how do you expect candidates to validate unit economics?"
    );
  }
  const flags = (profile?.riskFlags ?? []) as { severity: string; title: string }[];
  const firstSerious = flags.find((f) => f.severity === "red") ?? flags[0];
  if (firstSerious) {
    dynamic.push(
      `Public records flag: “${firstSerious.title}.” What has changed since then, and what is the current status?`
    );
  }
  if (profile?.exclusiveTerritories === false || profile?.territoryExclusivity === false) {
    dynamic.push(
      "Your FDD indicates no exclusive territory protection. How do you prevent new units from cannibalizing existing franchisees?"
    );
  }
  if (profile?.royaltyPercent === undefined && profile?.franchiseFee === undefined) {
    dynamic.push(
      "Walk me through every fee I will pay in year one and year three — initial fee, royalty, brand fund, technology, and any required vendor markups."
    );
  }

  const out = dynamic.slice(0, 3).map((q) => ({ q, dynamic: true }));
  for (const q of BASE_QUESTIONS) {
    if (out.length >= 10) break;
    out.push({ q, dynamic: false });
  }
  return out;
}

/* ════════════════════════════════════════════════════════════
 * Per-brand report section
 * ════════════════════════════════════════════════════════════ */

function BrandDossier({
  entry,
  prospect,
  matchInfo,
  index,
}: {
  entry: {
    brand: any;
    profile: any;
    territoryCounts: { total: number; operating: number; sold: number; available: number };
    stateAvailability: { state: string; status: string; note?: string }[];
  };
  prospect: any;
  matchInfo?: { matchScore: number; matchReasons: string[] };
  index: number;
}) {
  const { brand, profile, territoryCounts, stateAvailability } = entry;
  const fs = (profile?.fieldSources ?? {}) as Record<string, { source: string; url?: string; year?: number }>;

  /* ── Fit analysis ── */
  const investMin = profile?.totalInvestmentMin ?? brand.investmentMin;
  const investMax = profile?.totalInvestmentMax ?? brand.investmentMax;
  const capitalMid = CAPITAL_MIDPOINT[prospect?.liquidCapital ?? ""] ?? 0;
  const budgetMid = INVEST_BUDGET_MIDPOINT[prospect?.totalInvestmentBudget ?? ""] ?? 0;
  const effectiveBudget = Math.max(capitalMid, budgetMid);
  const capitalLabel = CAPITAL_LABEL[prospect?.liquidCapital ?? ""] ?? null;

  let budgetStatus: FitStatus = "unknown";
  let budgetDetail = "We don't have verified investment data for this brand yet, or your budget isn't set in your profile.";
  if (effectiveBudget > 0 && investMin) {
    if (effectiveBudget >= investMin) {
      budgetStatus = "pass";
      budgetDetail = `Your stated budget (${capitalLabel ?? fmtMoney(effectiveBudget)}) covers the minimum investment of ${fmtMoney(investMin)}${investMax ? ` (range up to ${fmtMoney(investMax)})` : ""}.`;
    } else if (effectiveBudget >= investMin * 0.8) {
      budgetStatus = "warn";
      budgetDetail = `Your budget is close to — but under — the ${fmtMoney(investMin)} minimum. Financing (SBA or franchisor programs) would likely be required.`;
    } else {
      budgetStatus = "fail";
      budgetDetail = `Minimum investment of ${fmtMoney(investMin)} is meaningfully above your stated budget (${capitalLabel ?? fmtMoney(effectiveBudget)}).`;
    }
  }

  // Profiles store full state names ("New Jersey") while stateAvailability
  // uses 2-letter codes ("NJ") — normalize before matching.
  const rawState = (prospect?.primaryState ?? "").trim();
  const prospectStateCode = (
    rawState.length === 2 ? rawState : STATE_ABBREVS[rawState] ?? rawState
  ).toUpperCase();
  const prospectState = rawState.toUpperCase();
  const stateRow = stateAvailability.find(
    (r) => r.state.toUpperCase() === prospectStateCode
  );
  let stateStatus: FitStatus = "unknown";
  let stateDetail = prospectState
    ? `No verified state-by-state availability data for ${prospectState} yet — confirm directly with the franchisor.`
    : "Add a target state to your profile to check availability.";
  if (stateRow) {
    if (stateRow.status === "open") {
      stateStatus = "pass";
      stateDetail = `${brand.name} is actively selling franchises in ${prospectState}.`;
    } else if (stateRow.status === "registered") {
      stateStatus = "warn";
      stateDetail = `Registered to sell in ${prospectState}, but it isn't a current expansion focus. Worth asking how serious they are about your market.`;
    } else {
      stateStatus = "fail";
      stateDetail = `Verified as NOT currently available in ${prospectState}.`;
    }
  }

  let categoryStatus: FitStatus = "unknown";
  let categoryDetail = "No category preference set in your profile.";
  if (prospect?.preferredCategories?.length && brand.category) {
    const brandCat = brand.category.toLowerCase().replace(/[& ]+/g, "_");
    const matched = prospect.preferredCategories.some(
      (c: string) => brandCat.includes(c.toLowerCase()) || c.toLowerCase().includes(brandCat)
    );
    categoryStatus = matched ? "pass" : "fail";
    categoryDetail = matched
      ? `${brand.category} matches the industries you selected.`
      : `${brand.category} is outside the industries you selected — not necessarily bad, but know why you're looking at it.`;
  } else if (brand.category) {
    categoryDetail = `Brand category: ${brand.category}. No category preference set in your profile.`;
  }

  const prospectModels: string[] = prospect?.ownershipModel?.length
    ? prospect.ownershipModel
    : prospect?.ownerType
      ? [prospect.ownerType]
      : [];
  let ownerStatus: FitStatus = "unknown";
  let ownerDetail = "No ownership-model preference set in your profile.";
  if (prospectModels.length > 0 && !prospectModels.includes("open_to_all")) {
    if (profile?.ownerTypes?.length) {
      const overlap = prospectModels.filter((m) => profile.ownerTypes.includes(m));
      ownerStatus = overlap.length > 0 ? "pass" : "fail";
      ownerDetail =
        overlap.length > 0
          ? `Supports your preferred model${overlap.length > 1 ? "s" : ""}: ${overlap.map((m) => OWNER_TYPE_LABEL[m] ?? m).join(", ")}.`
          : `Brand's supported models (${profile.ownerTypes.map((m: string) => OWNER_TYPE_LABEL[m] ?? m).join(", ")}) don't include your preference (${prospectModels.map((m) => OWNER_TYPE_LABEL[m] ?? m).join(", ")}).`;
    } else {
      ownerDetail = "Brand hasn't published which ownership models it supports — ask directly.";
    }
  }

  /* ── Money math ── */
  const auv = profile?.avgUnitRevenue;
  const investMid = investMin && investMax ? (investMin + investMax) / 2 : investMin ?? null;
  const grossRatio = auv && investMid ? auv / investMid : null;

  const riskFlags = useMemo(() => {
    const list = [...((profile?.riskFlags ?? []) as any[])];
    const order: Record<string, number> = { red: 0, caution: 1, info: 2 };
    list.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
    return list;
  }, [profile]);

  const questions = useMemo(() => buildQuestions(profile), [profile]);

  const verifiedCount = profile?.verifiedFieldCount ?? 0;
  const verifiedAt = profile?.dataVerifiedAt;

  return (
    <section className={`dossier-brand bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${index > 0 ? "dossier-page-break" : ""}`}>
      {/* ── a. Header ── */}
      <div className="dossier-section px-6 sm:px-8 py-6 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0" />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                style={{ backgroundColor: brand.color || "#0f172a" }}
              >
                {brand.name?.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-400">
                Brand {index + 1} of your dossier
              </p>
              <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{brand.name}</h2>
              <p className="text-sm text-slate-500">
                {brand.category ?? "Category not listed"}
                {matchInfo && (
                  <span className="ml-2 inline-flex items-center gap-1 text-cyan-700 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    {matchInfo.matchScore}/100 PerfectFit score
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Verification seal */}
          {verifiedCount > 0 ? (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 shrink-0">
              <BadgeCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-800">{verifiedCount} data points independently verified</p>
                <p className="text-[10px] text-emerald-700/70">
                  {verifiedAt ? `Last verified ${verifiedAt}` : "Verification date not recorded"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 shrink-0">
              <Info className="w-5 h-5 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500 max-w-[200px]">
                This brand's data has not yet been independently verified by Franchise KI.
              </p>
            </div>
          )}
        </div>
        {matchInfo && matchInfo.matchReasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {matchInfo.matchReasons.slice(0, 4).map((r, i) => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 sm:px-8 py-6 space-y-8">
        {/* ── b. Why this fits you ── */}
        <div className="dossier-section">
          <SectionTitle>Why this fits you (and where it doesn't)</SectionTitle>
          <div className="rounded-xl border border-slate-200 px-4">
            <FitRow status={budgetStatus} label="Budget vs. investment range" detail={budgetDetail} />
            <FitRow status={stateStatus} label={`Availability in ${prospectState || "your state"}`} detail={stateDetail} />
            <FitRow status={categoryStatus} label="Industry match" detail={categoryDetail} />
            <FitRow status={ownerStatus} label="Ownership model" detail={ownerDetail} />
          </div>
        </div>

        {/* ── c. The money math ── */}
        <div className="dossier-section">
          <SectionTitle>The money math</SectionTitle>
          <div className="rounded-xl border border-slate-200 px-4 py-1">
            <MoneyRow
              label="Total initial investment"
              value={investMin ? `${fmtMoney(investMin)} – ${fmtMoney(investMax ?? investMin)}` : "Not yet verified"}
            />
            <MoneyRow
              label="Initial franchise fee"
              value={profile?.franchiseFee ?? brand.franchiseFee ? fmtMoney(profile?.franchiseFee ?? brand.franchiseFee) : "Not yet verified"}
            />
            <MoneyRow
              label="Ongoing royalty"
              value={(profile?.royaltyPercent ?? brand.royaltyPercent) !== undefined ? `${profile?.royaltyPercent ?? brand.royaltyPercent}% of gross sales` : "Not yet verified"}
            />
            <MoneyRow
              label="Brand / marketing fund"
              value={profile?.brandFundPercent !== undefined ? `${profile.brandFundPercent}% of gross sales` : "Not yet verified"}
            />
            <MoneyRow
              label="Liquid capital required"
              value={profile?.liquidCapitalMin ? fmtMoney(profile.liquidCapitalMin) : "Not yet verified"}
            />
            {auv ? (
              <div className="py-2.5 border-b border-slate-100 last:border-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-slate-600">Average unit revenue (AUV)</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">{fmtMoney(auv)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <SourceTag source={fs.avgUnitRevenue} />
                  {!fs.avgUnitRevenue && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      Source not yet verified
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Averages skew high — top units pull the number up. Plan conservatively: assume your first
                  unit performs below this figure until the franchisor's Item 19 proves otherwise.
                </p>
              </div>
            ) : (
              <MoneyRow
                label="Average unit revenue (AUV)"
                value="Not yet verified"
                sub="No sourced revenue figure on file — ask for the full Item 19."
              />
            )}
          </div>

          {grossRatio !== null && (
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3">
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums shrink-0">
                {grossRatio.toFixed(1)}x
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">Gross revenue vs. investment ratio.</span>{" "}
                Reported AUV ({fmtMoney(auv)}) divided by midpoint investment ({fmtMoney(investMid)}). This is a{" "}
                <span className="font-semibold">crude top-line indicator only — it is NOT profit</span> and ignores
                margins, royalties, debt service, and ramp-up time. Use it to compare brands, never to project income.
              </p>
            </div>
          )}
        </div>

        {/* ── d. Risk flags & data caveats ── */}
        <div className="dossier-section">
          <SectionTitle>Risk flags &amp; data caveats</SectionTitle>
          {riskFlags.length > 0 ? (
            <div className="space-y-2.5">
              {riskFlags.map((flag, i) => {
                const s = RISK_STYLES[(flag.severity as "red" | "caution" | "info") ?? "info"];
                const Icon = flag.severity === "info" ? Info : AlertTriangle;
                return (
                  <div key={i} className={`rounded-xl border p-3.5 ${s.card}`}>
                    <div className="flex items-start gap-2.5">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.iconColor}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold leading-snug ${s.title}`}>{flag.title}</span>
                          <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${s.chip}`}>
                            {s.chipLabel}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${s.detail}`}>{flag.detail}</p>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Source:{" "}
                          {flag.url ? (
                            <a href={flag.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-600">
                              {flag.source}
                            </a>
                          ) : (
                            flag.source
                          )}
                          {flag.year ? ` · ${flag.year}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500 leading-relaxed">
                No sourced risk flags on file for this brand. That is <span className="font-semibold">not a clean bill of
                health</span> — it may simply mean our market research hasn't covered this brand deeply yet. Validate
                litigation history (FDD Item 3) and franchisee turnover (Item 20) yourself.
              </p>
            </div>
          )}
          {profile?.item19Available !== true && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2.5">
              <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
              {profile?.item19Available === false
                ? "Verified: this brand's FDD does NOT include an Item 19 financial performance representation."
                : "Item 19 (financial performance) status not yet verified for this brand."}
            </p>
          )}
        </div>

        {/* ── e. Territory reality ── */}
        <div className="dossier-section">
          <SectionTitle>Territory reality{prospectState ? ` — ${prospectState}` : ""}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Your state
              </p>
              {stateRow ? (
                <>
                  <p className={`text-lg font-extrabold mt-1 ${stateRow.status === "open" ? "text-emerald-600" : stateRow.status === "registered" ? "text-amber-600" : "text-rose-600"}`}>
                    {stateRow.status === "open" ? "Open" : stateRow.status === "registered" ? "Registered" : "Closed"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {stateRow.status === "open"
                      ? "Actively selling franchises here."
                      : stateRow.status === "registered"
                        ? "Legally able to sell, not a current focus."
                        : "Not currently available in your state."}
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-slate-400 italic mt-1">Not yet verified</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Operating locations on record</p>
              <p className="text-lg font-extrabold text-slate-900 mt-1 tabular-nums">
                {territoryCounts.operating + territoryCounts.sold > 0
                  ? territoryCounts.operating + territoryCounts.sold
                  : profile?.totalUnits ?? "—"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {territoryCounts.operating + territoryCounts.sold > 0
                  ? `${territoryCounts.operating} existing + ${territoryCounts.sold} claimed in our territory data.`
                  : profile?.totalUnits
                    ? "From the brand's reported system size."
                    : "No location data on file yet."}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">States with verified status</p>
              <p className="text-lg font-extrabold text-slate-900 mt-1 tabular-nums">
                {stateAvailability.length > 0 ? stateAvailability.length : "—"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {stateAvailability.length > 0
                  ? `${stateAvailability.filter((r) => r.status === "open").length} open · ${stateAvailability.filter((r) => r.status === "registered").length} registered · ${stateAvailability.filter((r) => r.status === "closed").length} closed`
                  : "State-level availability not yet mapped."}
              </p>
            </div>
          </div>
        </div>

        {/* ── f. 10 questions ── */}
        <div className="dossier-section">
          <SectionTitle>10 questions to ask this franchisor</SectionTitle>
          <ol className="space-y-2.5">
            {questions.map(({ q, dynamic }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${dynamic ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-600"}`}>
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {q}
                  {dynamic && (
                    <span className="ml-2 text-[9px] font-bold tracking-wider text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-full px-1.5 py-0.5 align-middle">
                      BASED ON THIS BRAND'S DATA
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
 * Gate panels
 * ════════════════════════════════════════════════════════════ */

function LockedPanel() {
  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-5">
        <Lock className="w-7 h-7 text-slate-400" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Your Due Diligence Dossier is waiting</h1>
      <p className="text-slate-600 leading-relaxed mb-2">
        A personalized due-diligence report on your top matched franchises — verified investment numbers,
        sourced risk flags, territory availability in your state, and the 10 questions to ask each franchisor.
      </p>
      <p className="text-sm text-slate-500 mb-8">
        A report like this costs $5,000+ from a franchise consultant. Yours is free — it just needs an account.
      </p>
      <Link to="/signup">
        <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white">
          Create a free account to unlock it
        </Button>
      </Link>
    </div>
  );
}

function NeedsMatchesPanel({ hasProfile }: { hasProfile: boolean }) {
  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center mx-auto mb-5">
        <CircleHelp className="w-7 h-7 text-cyan-600" />
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-3">We need your matches first</h1>
      <p className="text-slate-600 leading-relaxed mb-8">
        {hasProfile
          ? "Your profile doesn't have enough detail to generate matches yet. Add your budget and target territory, and your dossier will build itself."
          : "Your Due Diligence Dossier is built from your top matched brands. Take the 90-second PerfectFit quiz and it will be ready when you are."}
      </p>
      <Link to={hasProfile ? "/my-profile" : "/quiz"}>
        <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white">
          {hasProfile ? "Complete my profile" : "Take the PerfectFit quiz"}
        </Button>
      </Link>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Page
 * ════════════════════════════════════════════════════════════ */

export function DossierPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [searchParams] = useSearchParams();

  // KPI intent event: opening the dossier = dossier_requested (deduped server-side)
  const trackEvent = useMutation(api.activity.track);
  useEffect(() => {
    if (isAuthenticated) trackEvent({ eventType: "dossier_requested" }).catch(() => {});
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optional explicit selection: /dossier?brandIds=a,b,c (used by saved-brands links)
  const paramIds = useMemo(() => {
    const raw = searchParams.get("brandIds");
    if (!raw) return null;
    const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
    return ids.length > 0 ? (ids as Id<"brands">[]) : null;
  }, [searchParams]);

  const prospectProfile = useQuery(api.prospect.getMyProspectProfile, isAuthenticated ? {} : "skip");
  // Same query the dashboard uses — top matches drive brand selection + match context
  const matches = useQuery(api.prospect.getMatches, isAuthenticated ? {} : "skip");

  const selectedIds = useMemo<Id<"brands">[] | null>(() => {
    if (paramIds) return paramIds;
    if (!matches) return null;
    return matches
      .filter((m) => !m.knockedOut)
      .slice(0, 3)
      .map((m) => m.brandId as Id<"brands">);
  }, [paramIds, matches]);

  const dossier = useQuery(
    api.dossier.getDossierData,
    isAuthenticated && selectedIds && selectedIds.length > 0 ? { brandIds: selectedIds } : "skip"
  );

  const matchByBrand = useMemo(() => {
    const map = new Map<string, { matchScore: number; matchReasons: string[] }>();
    for (const m of matches ?? []) {
      map.set(m.brandId.toString(), { matchScore: m.matchScore, matchReasons: m.matchReasons });
    }
    return map;
  }, [matches]);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const prospectName = [dossier?.prospect?.firstName, dossier?.prospect?.lastName].filter(Boolean).join(" ");

  /* ── Render states ── */
  let body: React.ReactNode;
  if (isLoading || (isAuthenticated && (prospectProfile === undefined || (matches === undefined && !paramIds)))) {
    body = (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center text-slate-400">
        <FileText className="w-8 h-8 mx-auto mb-3 animate-pulse text-cyan-500" />
        Building your dossier…
      </div>
    );
  } else if (!isAuthenticated) {
    body = <LockedPanel />;
  } else if (!paramIds && (!matches || matches.filter((m) => !m.knockedOut).length === 0)) {
    body = <NeedsMatchesPanel hasProfile={!!prospectProfile} />;
  } else if (dossier === undefined) {
    body = (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center text-slate-400">
        <FileText className="w-8 h-8 mx-auto mb-3 animate-pulse text-cyan-500" />
        Building your dossier…
      </div>
    );
  } else if (!dossier || dossier.brands.length === 0) {
    body = <NeedsMatchesPanel hasProfile={!!prospectProfile} />;
  } else {
    body = (
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* ── Report header ── */}
        <Reveal className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-cyan-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Franchise KI · Confidential Prospect Report
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1.5">Due Diligence Dossier</h1>
              <p className="text-sm text-slate-500 mt-1.5">
                Prepared for {prospectName || "you"}
                {dossier.prospect?.primaryCity ? ` · ${dossier.prospect.primaryCity}, ${dossier.prospect.primaryState}` : dossier.prospect?.primaryState ? ` · ${dossier.prospect.primaryState}` : ""}
                {" · "}{today}
              </p>
            </div>
            <Button
              onClick={() => window.print()}
              className="print-hide bg-slate-900 hover:bg-slate-800 text-white shrink-0"
            >
              <Printer className="w-4 h-4 mr-2" /> Download / Print report
            </Button>
          </div>

          {/* Anchor copy */}
          <div className="mt-5 rounded-xl bg-gradient-to-r from-cyan-50 to-slate-50 border border-cyan-200/60 px-5 py-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900">A report like this costs $5,000+ from a franchise consultant</span>
              {" "}— and 60+ hours of FDD reading. Yours took 90 seconds.
            </p>
          </div>
        </Reveal>

        {/* ── Brand sections ── */}
        <div className="space-y-8">
          {dossier.brands.map((entry, i) => (
            <Reveal key={entry.brand._id} threshold={0.05}>
              <BrandDossier
                entry={entry}
                prospect={dossier.prospect}
                matchInfo={matchByBrand.get(entry.brand._id.toString())}
                index={i}
              />
            </Reveal>
          ))}
        </div>

        {/* ── g. Full disclaimer ── */}
        <div className="dossier-section">
          <DueDiligenceDisclaimer variant="full" />
        </div>
      </div>
    );
  }

  return (
    <div className="dossier-page min-h-screen bg-slate-100 text-slate-900 motion-page motion-page-light">
      {/* Print stylesheet — clean black-on-white, no chrome, no page breaks mid-section */}
      <style>{`
        @media print {
          .print-hide, nav, footer { display: none !important; }
          .dossier-page { background: #fff !important; }
          .dossier-page .reveal, .dossier-page .reveal-stagger > * {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
          .dossier-section { break-inside: avoid; page-break-inside: avoid; }
          .dossier-page-break { break-before: page; page-break-before: always; }
          .dossier-brand { box-shadow: none !important; border-color: #cbd5e1 !important; }
          .dossier-page a { text-decoration: none; color: inherit; }
        }
      `}</style>
      <div className="print-hide">
        <PublicNav />
      </div>
      {body}
      <div className="print-hide">
        <PublicFooter />
      </div>
    </div>
  );
}

export default DossierPage;