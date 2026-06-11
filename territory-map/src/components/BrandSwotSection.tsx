import { useMemo } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SaveBrandButton } from "@/components/SaveBrandButton";
import { Reveal } from "@/components/Reveal";
import { GatedSection } from "@/components/GatedSection";
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Target,
  Sparkles,
  Zap,
  Brain,
  Lock,
  Info,
  CheckCircle2,
  Circle,
  DollarSign,
  MapPin,
  Tag,
  UserCheck,
  Clock,
  Shield,
  Building2,
  Heart,
  ArrowRight,
  Lightbulb,
  BarChart3,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

function contrastTextColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1e293b" : "#ffffff";
}

interface BrandSwotSectionProps {
  brand: any;
  profile: any;
  territories: any[];
  accent: string;
}

/* ═══════════════════════════════════════════════════════════
 * Capital mapping — keep in sync with prospect.ts
 * ═══════════════════════════════════════════════════════════ */
const CAPITAL_MAP: Record<string, number> = {
  under_50k: 25_000,
  "50k_100k": 75_000,
  "100k_150k": 125_000,
  "150k_250k": 200_000,
  "250k_500k": 375_000,
  "500k_1m": 750_000,
  "1m_plus": 1_500_000,
};
const CAPITAL_LABELS: Record<string, string> = {
  under_50k: "Under $50K",
  "50k_100k": "$50K–$100K",
  "100k_150k": "$100K–$150K",
  "150k_250k": "$150K–$250K",
  "250k_500k": "$250K–$500K",
  "500k_1m": "$500K–$1M",
  "1m_plus": "$1M+",
};
const CATEGORY_LABELS: Record<string, string> = {
  food_bev: "Food & Beverage",
  health_fitness: "Health & Fitness",
  services: "Services",
  home_services: "Home Services",
  education: "Education",
  beauty_selfcare: "Beauty & Self Care",
};
const OWNER_LABELS: Record<string, string> = {
  owner_operator: "Owner/Operator",
  semi_absentee: "Semi-Absentee",
  absentee: "Absentee/Executive",
  investor: "Investor/Multi-Unit",
};

function fmtK(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(v / 1_000)}K`;
}

/* ═══════════════════════════════════════════════════════════
 * Checklist item evaluator
 * ═══════════════════════════════════════════════════════════ */
interface CheckItem {
  key: string;
  icon: any;
  label: string;
  description: string;
  passed: boolean | null; // null = no data to evaluate
}

function evaluateChecklist(
  brand: any,
  profile: any,
  territories: any[],
  prospect: any | null,
): { items: CheckItem[]; score: number; maxScore: number; reasons: string[] } {
  const items: CheckItem[] = [];
  const reasons: string[] = [];
  let score = 0;
  let maxScore = 0;

  const available = territories?.filter((t: any) => t.status === "available" || t.status === "open") || [];
  const investMin = profile?.totalInvestmentMin || brand.investmentMin || 0;
  const investMax = profile?.totalInvestmentMax || brand.investmentMax || investMin;

  // 1. Capital fit
  maxScore += 25;
  if (prospect?.liquidCapital) {
    const cap = CAPITAL_MAP[prospect.liquidCapital] || 0;
    const minRequired = profile?.liquidCapitalMin ?? investMin;
    if (cap >= minRequired) {
      items.push({
        key: "capital",
        icon: DollarSign,
        label: "Investment Budget",
        description: `Your ${CAPITAL_LABELS[prospect.liquidCapital] || prospect.liquidCapital} budget covers the ${fmtK(investMin)}${investMax > investMin ? `–${fmtK(investMax)}` : ""} investment`,
        passed: true,
      });
      score += 25;
      reasons.push("Budget fits the investment range");
    } else if (cap >= minRequired * 0.7) {
      items.push({
        key: "capital",
        icon: DollarSign,
        label: "Investment Budget",
        description: `Close — your ${CAPITAL_LABELS[prospect.liquidCapital] || prospect.liquidCapital} is near the ${fmtK(minRequired)} minimum. Financing could bridge the gap${profile?.sbaApproved ? " (SBA approved)" : ""}`,
        passed: false,
      });
      score += 10;
      reasons.push("Budget is close — financing may help");
    } else {
      items.push({
        key: "capital",
        icon: DollarSign,
        label: "Investment Budget",
        description: `This brand requires ${fmtK(minRequired)}+ — consider financing options or investor partnerships`,
        passed: false,
      });
      reasons.push("Investment exceeds your stated budget");
    }
  } else {
    items.push({
      key: "capital",
      icon: DollarSign,
      label: "Investment Budget",
      description: investMin ? `Total investment: ${fmtK(investMin)}${investMax > investMin ? `–${fmtK(investMax)}` : ""}` : "Investment details not available",
      passed: null,
    });
  }

  // 2. Location / territory availability
  maxScore += 25;
  if (prospect?.primaryState || prospect?.primaryCity) {
    const loc = prospect.primaryCity ? `${prospect.primaryCity}, ${prospect.primaryState}` : prospect.primaryState;
    // Check if any territories are in the prospect's state
    const stateMatches = available.filter(
      (t: any) => t.state?.toLowerCase() === prospect.primaryState?.toLowerCase()
    );
    if (stateMatches.length > 0) {
      items.push({
        key: "location",
        icon: MapPin,
        label: "Territory Near You",
        description: `${stateMatches.length} available territor${stateMatches.length === 1 ? "y" : "ies"} in ${prospect.primaryState} — near ${loc}`,
        passed: true,
      });
      score += 25;
      reasons.push(`${stateMatches.length} territories near your location`);
    } else if (available.length > 0) {
      items.push({
        key: "location",
        icon: MapPin,
        label: "Territory Near You",
        description: `${available.length} territories available but none in ${prospect.primaryState}. Check the map for the closest options.`,
        passed: false,
      });
      score += 5;
      reasons.push("Available territories but not in your area");
    } else {
      items.push({
        key: "location",
        icon: MapPin,
        label: "Territory Near You",
        description: `No territories currently available. Ask about upcoming openings or waitlist options.`,
        passed: false,
      });
    }
  } else {
    items.push({
      key: "location",
      icon: MapPin,
      label: "Territory Availability",
      description: available.length > 0 ? `${available.length} territories currently available` : "No territories currently listed",
      passed: null,
    });
  }

  // 3. Category match
  maxScore += 20;
  if (prospect?.preferredCategories?.length && brand.category) {
    const brandCatLower = brand.category.toLowerCase().replace(/[& ]+/g, "_");
    const matched = prospect.preferredCategories.some(
      (c: string) => c === brandCatLower || brand.category?.toLowerCase().includes(c.replace(/_/g, " "))
    );
    if (matched) {
      items.push({
        key: "category",
        icon: Tag,
        label: "Industry Match",
        description: `${brand.category} is one of your preferred industries`,
        passed: true,
      });
      score += 20;
      reasons.push(`Matches your ${brand.category} preference`);
    } else {
      items.push({
        key: "category",
        icon: Tag,
        label: "Industry Match",
        description: `${brand.category} isn't in your selected categories — but great brands exist outside your comfort zone`,
        passed: false,
      });
      score += 3;
    }
  } else {
    items.push({
      key: "category",
      icon: Tag,
      label: "Industry Category",
      description: brand.category ? `${brand.category} franchise` : "Category not specified",
      passed: null,
    });
  }

  // 4. Ownership style
  maxScore += 15;
  if (prospect?.ownerType && profile?.ownerTypes?.length) {
    const ownerLabel = OWNER_LABELS[prospect.ownerType] || prospect.ownerType;
    if (profile.ownerTypes.includes(prospect.ownerType)) {
      items.push({
        key: "ownership",
        icon: UserCheck,
        label: "Ownership Style",
        description: `Supports ${ownerLabel} — the way you want to run it`,
        passed: true,
      });
      score += 15;
      reasons.push("Supports your preferred ownership style");
    } else {
      const supported = profile.ownerTypes.map((t: string) => OWNER_LABELS[t] || t).join(", ");
      items.push({
        key: "ownership",
        icon: UserCheck,
        label: "Ownership Style",
        description: `Designed for ${supported} — your preference is ${ownerLabel}`,
        passed: false,
      });
    }
  } else if (prospect?.ownerType) {
    items.push({
      key: "ownership",
      icon: UserCheck,
      label: "Ownership Style",
      description: `Ask the franchisor if they support ${OWNER_LABELS[prospect.ownerType] || prospect.ownerType} ownership`,
      passed: null,
    });
  } else {
    items.push({
      key: "ownership",
      icon: UserCheck,
      label: "Ownership Style",
      description: profile?.ownerTypes?.length ? `Supports: ${profile.ownerTypes.map((t: string) => OWNER_LABELS[t] || t).join(", ")}` : "Ownership options not specified",
      passed: null,
    });
  }

  // 5. Timing / growth
  maxScore += 15;
  const isGrowing = profile?.isGrowing;
  if (isGrowing && available.length > 0) {
    items.push({
      key: "timing",
      icon: Clock,
      label: "Ready for You Now",
      description: `Actively growing brand with ${available.length} open territories — great timing to start`,
      passed: true,
    });
    score += 15;
    reasons.push("Actively growing with open territories");
  } else if (available.length > 0) {
    items.push({
      key: "timing",
      icon: Clock,
      label: "Territories Open",
      description: `${available.length} territories available — check if your preferred market is included`,
      passed: true,
    });
    score += 10;
  } else {
    items.push({
      key: "timing",
      icon: Clock,
      label: "Availability",
      description: "No territories currently listed — inquire about upcoming openings",
      passed: false,
    });
  }

  // ── Enhanced checklist items (only shown when prospect has enhanced profile) ──

  // 6. Home-based / Space preference
  if (prospect?.runFromHome || prospect?.spacePreference) {
    maxScore += 10;
    if (prospect.runFromHome === "yes") {
      if (profile?.canRunFromHome) {
        items.push({ key: "home", icon: Building2, label: "Home-Based", description: "This franchise supports home-based operations — matches your preference", passed: true });
        score += 10;
        reasons.push("Home-based operation available");
      } else if (profile?.canRunFromHome === false) {
        items.push({ key: "home", icon: Building2, label: "Home-Based", description: "This franchise requires a dedicated location — not home-based", passed: false });
      } else {
        items.push({ key: "home", icon: Building2, label: "Home-Based", description: "Ask the franchisor if home-based operation is supported", passed: null });
      }
    } else if (prospect.spacePreference) {
      items.push({ key: "home", icon: Building2, label: "Space Fit", description: "Your space preference is noted — verify with the franchisor during Discovery Day", passed: null });
      score += 5;
    }
  }

  // 7. Multi-unit interest
  if (prospect?.multiUnitInterest && prospect.multiUnitInterest !== "1") {
    maxScore += 10;
    if (profile?.multiUnitAvailable) {
      items.push({ key: "multiunit", icon: Star, label: "Multi-Unit", description: "Multi-unit development available — matches your growth plans", passed: true });
      score += 10;
      reasons.push("Multi-unit expansion possible");
    } else if (profile?.multiUnitAvailable === false) {
      items.push({ key: "multiunit", icon: Star, label: "Multi-Unit", description: "This franchise may not support multi-unit development", passed: false });
    } else {
      items.push({ key: "multiunit", icon: Star, label: "Multi-Unit", description: "Ask about area development agreements for multiple units", passed: null });
      score += 3;
    }
  }

  // 8. Veteran status
  if (prospect?.veteranStatus === true) {
    maxScore += 8;
    if (profile?.veteranDiscount) {
      items.push({ key: "veteran", icon: Shield, label: "Veteran Discount", description: "Veteran franchise fee discount available — financial advantage for your service", passed: true });
      score += 8;
      reasons.push("Veteran discount offered");
    } else {
      items.push({ key: "veteran", icon: Shield, label: "Veteran Discount", description: "No veteran discount listed — some brands offer it upon request", passed: false });
    }
  }

  // 9. Full-time / Part-time
  if (prospect?.fullTimePartTime) {
    maxScore += 8;
    if (prospect.fullTimePartTime === "part_time") {
      if (profile?.canRunPartTime || profile?.absenteeOwnership) {
        items.push({ key: "parttime", icon: Clock, label: "Part-Time Friendly", description: "This franchise supports part-time or semi-absentee operation", passed: true });
        score += 8;
      } else if (profile?.canRunPartTime === false) {
        items.push({ key: "parttime", icon: Clock, label: "Full-Time Required", description: "This franchise requires full-time commitment — may conflict with your preference", passed: false });
      } else {
        items.push({ key: "parttime", icon: Clock, label: "Time Commitment", description: "Verify part-time viability with the franchisor", passed: null });
        score += 3;
      }
    } else {
      score += 8; // Full-time is always compatible
    }
  }

  return { items, score: Math.min(100, Math.round((score / maxScore) * 100)), maxScore, reasons };
}

/* ═══════════════════════════════════════════════════════════
 * Score label + color
 * ═══════════════════════════════════════════════════════════ */
/** Label thresholds MUST mirror ProspectDashboardPage.scoreLabel — one score, one label. */
function scoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Excellent Match", color: "#059669", bg: "#ecfdf5" };
  if (score >= 60) return { label: "Strong Match", color: "#0891b2", bg: "#ecfeff" };
  if (score >= 40) return { label: "Good Match", color: "#d97706", bg: "#fffbeb" };
  return { label: "Potential Match", color: "#6b7280", bg: "#f9fafb" };
}

/* ═══════════════════════════════════════════════════════════
 * Profile completeness check
 * ═══════════════════════════════════════════════════════════ */
function profileCompleteness(prospect: any): { percent: number; missing: string[] } {
  if (!prospect) return { percent: 0, missing: ["everything"] };
  const fields = [
    { key: "liquidCapital", label: "budget" },
    { key: "primaryState", label: "location" },
    { key: "preferredCategories", label: "industry preferences" },
    { key: "ownerType", label: "ownership style" },
    { key: "totalInvestmentBudget", label: "investment goals" },
    { key: "revenueGoal", label: "revenue goals" },
    { key: "riskTolerance", label: "risk profile" },
    { key: "motivations", label: "motivations" },
  ];
  const missing: string[] = [];
  let filled = 0;
  for (const f of fields) {
    const val = prospect[f.key];
    if (val && (!Array.isArray(val) || val.length > 0)) filled++;
    else missing.push(f.label);
  }
  return { percent: Math.round((filled / fields.length) * 100), missing };
}

/* ═══════════════════════════════════════════════════════════
 * Data-driven flag system
 * — riskFlags: SOURCED market-research flags from the profile
 * — computed flags: derived ONLY from independently verified
 *   fields (a field must appear in fieldSources to count)
 * ═══════════════════════════════════════════════════════════ */
type FlagSource = { source: string; url?: string; year?: number };

type RiskFlag = {
  severity: "info" | "caution" | "red";
  title: string;
  detail: string;
  source: string;
  url?: string;
  year?: number;
};

type ComputedFlag = {
  quadrant: "weaknesses" | "threats";
  title: string;
  source?: FlagSource;
};

function computeDataFlags(profile: any): ComputedFlag[] {
  const flags: ComputedFlag[] = [];
  if (!profile) return flags;
  const fs = (profile.fieldSources ?? {}) as Record<string, FlagSource>;

  // Verified not-growing system → Threat
  if (profile.isGrowing === false && fs.isGrowing) {
    flags.push({
      quadrant: "threats",
      title: "System not currently growing",
      source: fs.isGrowing,
    });
  }

  // Verified elevated closure rate (> 3% of units) → Threat
  if (
    fs.closureCount &&
    fs.totalUnits &&
    typeof profile.closureCount === "number" &&
    typeof profile.totalUnits === "number" &&
    profile.totalUnits > 0 &&
    profile.closureCount / profile.totalUnits > 0.03
  ) {
    const pct = ((profile.closureCount / profile.totalUnits) * 100).toFixed(1);
    flags.push({
      quadrant: "threats",
      title: `Elevated closure rate: ${profile.closureCount} closures against ${profile.totalUnits.toLocaleString()} units (${pct}%)`,
      source: fs.closureCount,
    });
  }

  // Verified no Item 19 → Weakness
  if (profile.item19Available === false && fs.item19Available) {
    flags.push({
      quadrant: "weaknesses",
      title: "No published financial performance data (FDD Item 19)",
      source: fs.item19Available,
    });
  }

  // Verified no exclusive territories → Weakness
  if (profile.exclusiveTerritories === false && fs.exclusiveTerritories) {
    flags.push({
      quadrant: "weaknesses",
      title: "No exclusive territory protection (FDD Item 12)",
      source: fs.exclusiveTerritories,
    });
  }

  // Item 19 exists but no revenue figure we could verify → Weakness
  if (
    profile.item19Available === true &&
    fs.item19Available &&
    !profile.avgUnitRevenue &&
    !profile.item19Revenue?.average
  ) {
    flags.push({
      quadrant: "weaknesses",
      title: "Financial performance data could not be independently verified",
    });
  }

  return flags;
}

const SEVERITY_ORDER: Record<RiskFlag["severity"], number> = { red: 0, caution: 1, info: 2 };

const RISK_STYLES: Record<
  RiskFlag["severity"],
  { card: string; icon: any; iconColor: string; chip: string; chipLabel: string; title: string; detail: string }
> = {
  red: {
    card: "bg-rose-50 border-rose-200",
    icon: AlertTriangle,
    iconColor: "text-rose-600",
    chip: "bg-rose-600 text-white",
    chipLabel: "RED FLAG",
    title: "text-rose-900",
    detail: "text-rose-800/80",
  },
  caution: {
    card: "bg-amber-50 border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    chip: "bg-amber-500 text-white",
    chipLabel: "CAUTION",
    title: "text-amber-900",
    detail: "text-amber-800/80",
  },
  info: {
    card: "bg-slate-50 border-slate-200",
    icon: Info,
    iconColor: "text-slate-400",
    chip: "bg-slate-200 text-slate-600",
    chipLabel: "INFO",
    title: "text-slate-700",
    detail: "text-slate-500",
  },
};

// Match the page-level SourceTag idiom: if the source string is itself a URL,
// display its hostname instead of the raw URL.
function flagHostnameFrom(input?: string): string | undefined {
  if (!input) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const host = url.hostname.replace(/^www\./, "");
    return host.includes(".") && !host.includes(" ") ? host : undefined;
  } catch {
    return undefined;
  }
}

function FlagSourceLine({ source }: { source: FlagSource }) {
  const sourceHost = flagHostnameFrom(source.source);
  const label = sourceHost ?? source.source;
  const rawHref = source.url ?? (sourceHost ? source.source : undefined);
  const href = rawHref && !/^https?:\/\//i.test(rawHref) ? `https://${rawHref}` : rawHref;
  return (
    <p className="text-[11px] text-slate-400 mt-1.5">
      Source:{" "}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-slate-600 transition-colors"
        >
          {label}
        </a>
      ) : (
        label
      )}
      {source.year ? ` · ${source.year}` : ""}
    </p>
  );
}

function RiskFlagCard({ flag }: { flag: RiskFlag }) {
  const s = RISK_STYLES[flag.severity];
  const Icon = s.icon;
  return (
    <div className={cn("rounded-xl border p-3.5 shadow-sm", s.card)}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", s.iconColor)} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-semibold leading-snug", s.title)}>{flag.title}</span>
            <span
              className={cn(
                "text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full shrink-0",
                s.chip,
                // RED FLAG chips: one subtle attention pulse when the quadrant reveals
                flag.severity === "red" && "flag-pulse-once",
              )}
            >
              {s.chipLabel}
            </span>
          </div>
          <p className={cn("text-xs mt-1 leading-relaxed", s.detail)}>{flag.detail}</p>
          <FlagSourceLine source={flag} />
        </div>
      </div>
    </div>
  );
}

function ComputedFlagRow({ flag }: { flag: ComputedFlag }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-3 flex items-start gap-2.5">
      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 leading-snug">{flag.title}</p>
        {flag.source && <FlagSourceLine source={flag.source} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════ */
export function BrandSwotSection({ brand, profile, territories, accent }: BrandSwotSectionProps) {
  const { isAuthenticated } = useConvexAuth();
  const prospectProfile = useQuery(
    api.prospect.getMyProspectProfile,
    isAuthenticated ? {} : "skip"
  );
  // PerfectFit engine results — the SAME query the dashboard and dossier use.
  // The headline score must come from here so every surface shows one number.
  const allMatches = useQuery(
    api.prospect.getMatches,
    isAuthenticated && prospectProfile ? {} : "skip"
  );
  const savedIds = useQuery(
    api.savedItems.getMySavedBrandIds,
    isAuthenticated ? {} : "skip"
  );

  const isPersonalized = !!prospectProfile;
  const { percent: completeness, missing } = profileCompleteness(prospectProfile);

  // Evaluate checklist (drives the box-by-box display only — NOT the headline score)
  const { items: checkItems, score: checklistScore, reasons } = useMemo(
    () => evaluateChecklist(brand, profile, territories, prospectProfile),
    [brand, profile, territories, prospectProfile]
  );

  // Headline score comes from the PerfectFit engine (prospect.getMatches) so the
  // brand page always agrees with the dashboard and dossier. The local checklist
  // score is only a fallback while the engine result is loading or the brand
  // scored below the engine's inclusion threshold.
  const engineMatch = useMemo(
    () => allMatches?.find((m: any) => m.brandId === brand._id),
    [allMatches, brand._id]
  );
  const score = engineMatch?.matchScore ?? checklistScore;

  const { label: matchLabel, color: matchColor, bg: matchBg } = scoreLabel(score);

  // Top 3 brands to compare (excluding current brand)
  const topCompare = useMemo(() => {
    if (!allMatches) return [];
    return allMatches
      .filter((m: any) => m.brandSlug !== brand.slug)
      .slice(0, 3);
  }, [allMatches, brand.slug]);

  // Also generate SWOT data for the expandable section
  const swot = useMemo(() => generateBrandSwot({
    brandName: brand.name,
    category: brand.category,
    yearFounded: profile?.yearFounded,
    totalUnits: profile?.totalUnits,
    investmentMin: profile?.totalInvestmentMin || brand.investmentMin,
    investmentMax: profile?.totalInvestmentMax || brand.investmentMax,
    franchiseFee: profile?.franchiseFee || brand.franchiseFee,
    royaltyPercent: profile?.royaltyPercent || brand.royaltyPercent,
    brandFundPercent: profile?.brandFundPercent,
    liquidCapitalMin: profile?.liquidCapitalMin,
    avgUnitRevenue: profile?.avgUnitRevenue,
    sbaApproved: profile?.sbaApproved,
    isGrowing: profile?.isGrowing,
    fddAvailable: profile?.fddAvailable,
    item19Available: profile?.item19Available,
    veteranDiscount: profile?.veteranDiscount,
    multiUnitAvailable: profile?.multiUnitAvailable,
    territoriesAvailable: territories?.filter((t: any) => t.status === "available" || t.status === "open")?.length || 0,
    territoriesTotal: territories?.length || 0,
  }), [brand, profile, territories]);

  // ── Data-driven flags ──
  const riskFlags = useMemo<RiskFlag[]>(() => {
    const list = (profile?.riskFlags ?? []) as RiskFlag[];
    return [...list].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [profile]);
  const computedFlags = useMemo(() => computeDataFlags(profile), [profile]);
  const hasAnyFlags = riskFlags.length > 0 || computedFlags.length > 0;

  // Signed-out teaser: counts only — flag CONTENTS never enter the DOM.
  const redFlagCount = riskFlags.filter((f) => f.severity === "red").length;
  const cautionCount =
    riskFlags.filter((f) => f.severity === "caution").length + computedFlags.length;
  const flagCountParts: string[] = [];
  if (redFlagCount > 0) flagCountParts.push(`${redFlagCount} red flag${redFlagCount === 1 ? "" : "s"}`);
  if (cautionCount > 0) flagCountParts.push(`${cautionCount} caution${cautionCount === 1 ? "" : "s"}`);
  const flagCountLabel = flagCountParts.join(" · ");

  // Avoid duplicating the generated Item 19 weakness when the verified flag exists
  const hasVerifiedItem19Flag = computedFlags.some(
    (f) => f.quadrant === "weaknesses" && f.title.includes("FDD Item 19")
  );
  const swotListFor = (key: "strengths" | "weaknesses" | "opportunities" | "threats"): string[] =>
    key === "weaknesses" && hasVerifiedItem19Flag
      ? swot.weaknesses.filter((item) => !item.includes("Item 19"))
      : swot[key];

  return (
    <section className="py-12 border-b border-slate-100">
      <div className="max-w-4xl">
        {/* ── Header ── */}
        <Reveal className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
                Does {brand.name} Check Your Boxes?
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {isPersonalized
                  ? "Personalized to your profile"
                  : "Complete your profile for a personalized evaluation"}
              </p>
            </div>
          </div>
        </Reveal>

        <div className="animate-in fade-in slide-in-from-top-2 duration-300">

            {/* ══════════════════════════════════════════
                PERSONALIZED VIEW (logged in with profile)
                ══════════════════════════════════════════ */}
            {isPersonalized ? (
              <>
                {/* Score Banner */}
                <div
                  className="rounded-2xl p-6 mb-6 border"
                  style={{ backgroundColor: matchBg, borderColor: `${matchColor}30` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center"
                        style={{ backgroundColor: `${matchColor}15`, border: `2px solid ${matchColor}40` }}
                      >
                        <span className="text-2xl font-black" style={{ color: matchColor }}>{score}</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: matchColor }}>/ 100</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold" style={{ color: matchColor }}>{matchLabel}</span>
                          <Badge
                            className="text-[10px] font-semibold border-0"
                            style={{ backgroundColor: `${matchColor}15`, color: matchColor }}
                          >
                            PERFECTFIT™
                          </Badge>
                        </div>
                        <p className="text-slate-500 text-sm mt-0.5">
                          Based on your budget, location, and preferences
                        </p>
                      </div>
                    </div>
                    {completeness < 100 && (
                      <Link to={isAuthenticated ? "/my-profile" : "/get-started"}>
                        <Button
                          size="sm"
                          className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-[0_4px_14px_-4px_rgba(8,145,178,0.55)]"
                        >
                          <Lightbulb className="w-3 h-3 mr-1" />
                          Complete profile for better accuracy
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Checklist Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {checkItems.map((item) => {
                    const Icon = item.icon;
                    const isChecked = item.passed === true;
                    const isMissing = item.passed === null;
                    return (
                      <div
                        key={item.key}
                        className={cn(
                          "rounded-xl border p-4 flex items-start gap-3 transition-all",
                          isChecked
                            ? "bg-emerald-50/50 border-emerald-200"
                            : isMissing
                            ? "bg-slate-50 border-slate-200 border-dashed"
                            : "bg-white border-slate-200"
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : isMissing ? (
                            <Circle className="w-5 h-5 text-slate-300" />
                          ) : (
                            <Circle className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className={cn(
                              "w-3.5 h-3.5",
                              isChecked ? "text-emerald-600" : isMissing ? "text-slate-400" : "text-slate-500"
                            )} />
                            <span className={cn(
                              "text-sm font-semibold",
                              isChecked ? "text-emerald-700" : isMissing ? "text-slate-400" : "text-slate-700"
                            )}>
                              {item.label}
                            </span>
                          </div>
                          <p className={cn(
                            "text-xs mt-1 leading-relaxed",
                            isChecked ? "text-emerald-600" : isMissing ? "text-slate-400" : "text-slate-500"
                          )}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Incomplete profile nudge */}
                {completeness < 100 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 flex items-center gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-amber-800">
                        Add your {missing.join(" and ")} to unlock all checkboxes.
                      </span>
                      <span className="text-amber-600 ml-1">
                        More profile data = more accurate match.
                      </span>
                    </div>
                    <Link to={isAuthenticated ? "/my-profile" : "/get-started"} className="shrink-0 ml-auto">
                      <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-100 text-xs">
                        Update →
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Top 3 Brands to Compare */}
                {topCompare.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">Top Matches to Compare</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {topCompare.map((m: any) => (
                        <Link
                          key={m.brandSlug}
                          to={`/brand/${m.brandSlug}`}
                          className="group rounded-xl border border-slate-200 hover:border-slate-300 bg-white p-4 flex items-center gap-3 transition-all hover:shadow-sm"
                        >
                          {m.logoUrl ? (
                            <img src={m.logoUrl} alt={m.brandName} className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-400 shrink-0">
                              {m.brandName?.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 truncate">{m.brandName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-xs font-bold"
                                style={{ color: scoreLabel(m.matchScore).color }}
                              >
                                {m.matchScore}%
                              </span>
                              <span className="text-[10px] text-slate-400">{m.brandCategory}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {brand?._id && (
                              <SaveBrandButton
                                brandId={m.brandId}
                                savedBrandIds={savedIds ?? []}
                                variant="icon-light"
                              />
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ══════════════════════════════════════════
                  NOT LOGGED IN / NO PROFILE
                  ══════════════════════════════════════════ */
              <>
                {/* Greyed-out checklist preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 opacity-80">
                  {checkItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 flex items-start gap-3"
                      >
                        <Circle className="w-5 h-5 text-slate-300 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-400">{item.label}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}20` }}
                    >
                      <Lock className="w-5 h-5" style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">See if {brand.name} checks your boxes</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Create a free profile to get your personalized PerfectFit™ score, matched territories, and brand recommendations.
                      </p>
                    </div>
                  </div>
                  <Link to="/get-started" className="shrink-0">
                    <Button
                      size="sm"
                      className="font-semibold"
                      style={{ backgroundColor: accent, color: contrastTextColor(accent) }}
                    >
                      Get My Score <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {/* ── SWOT Grid header ── */}
            <Reveal>
            <div className="swot-bar w-full flex items-center justify-between py-3.5 px-5 rounded-xl mb-4 !cursor-default">
              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <Brain className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                {isPersonalized ? (
                  <>
                    <span className="text-sm font-semibold text-white/90 truncate">Your Personalized SWOT Analysis</span>
                    <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 text-[10px] shrink-0">
                      BASED ON YOUR PROFILE
                    </Badge>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-white/90 shrink-0">AI SWOT Analysis</span>
                    <span className="hidden sm:inline text-xs text-slate-400 truncate">
                      Create a free profile for your personalized analysis
                    </span>
                  </>
                )}
              </div>
            </div>
            </Reveal>

            {/* SWOT Grid — signed-out visitors get a blurred skeleton + lock overlay.
                Quadrant contents and flag details are NOT rendered into the DOM. */}
            {!isAuthenticated ? (
              <>
                {flagCountLabel && (
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">
                      {flagCountLabel} found by our market research
                    </span>
                  </div>
                )}
                <GatedSection
                  className="mb-4"
                  note={flagCountLabel ? `Including ${flagCountLabel} — fully sourced` : undefined}
                  bullets={[
                    "Full AI SWOT analysis",
                    "Sourced red-flag alerts",
                    "Your personalized fit score",
                  ]}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {QUADRANTS.map(({ key, label, icon: Icon, lightBg, lightBorder, lightText }) => (
                      <div key={key} className={cn("rounded-2xl border p-5", lightBg, lightBorder)}>
                        <div className={cn("flex items-center gap-2 mb-3", lightText)}>
                          <Icon className="w-4.5 h-4.5" />
                          <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
                        </div>
                        <ul className="space-y-3">
                          {["w-11/12", "w-3/4", "w-5/6", "w-2/3"].map((w, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="w-2 h-2 rounded-full mt-0.5 shrink-0 bg-slate-300" />
                              <span className={cn("h-3 rounded-full bg-slate-300/70", w)} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </GatedSection>
              </>
            ) : (
            <Reveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {QUADRANTS.map(({ key, label, icon: Icon, lightBg, lightBorder, lightText, lightDot }) => {
                const quadrantRiskFlags = key === "threats" ? riskFlags : [];
                const quadrantComputedFlags = computedFlags.filter((f) => f.quadrant === key);
                return (
                  <div
                    key={key}
                    className={cn("card-lift card-lift-light rounded-2xl border p-5", lightBg, lightBorder)}
                  >
                    <div className={cn("flex items-center gap-2 mb-3", lightText)}>
                      <Icon className="w-4.5 h-4.5" />
                      <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
                    </div>
                    {/* Data-driven flags render FIRST */}
                    {(quadrantRiskFlags.length > 0 || quadrantComputedFlags.length > 0) && (
                      <div className="space-y-2.5 mb-3">
                        {quadrantRiskFlags.map((flag, i) => (
                          <RiskFlagCard key={`rf-${i}`} flag={flag} />
                        ))}
                        {quadrantComputedFlags.map((flag, i) => (
                          <ComputedFlagRow key={`cf-${i}`} flag={flag} />
                        ))}
                      </div>
                    )}
                    <ul className="space-y-2.5">
                      {swotListFor(key).map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                          <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", lightDot)} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </Reveal>
            )}

            {/* Flag attribution + claim right-of-reply (flag details are gated for visitors) */}
            {hasAnyFlags && isAuthenticated && (
              <div className="mb-4 space-y-2">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Flags are generated from market research and public filings (FDD Items 19/20, trade press) — not editorial opinion.
                </p>
                {riskFlags.length > 0 && brand.isClaimed !== true && (
                  <Link
                    to="/claim"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    Represent {brand.name}? Claim this listing to respond or provide updated data
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400">
              <Zap className="w-3 h-3 shrink-0" />
              Powered by Franchise KI intelligence • Always conduct independent due diligence before investing
            </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════
 * SWOT generation logic (kept for expandable section)
 * ═════════════════════════════════════════════════════════ */
const QUADRANTS = [
  {
    key: "strengths" as const,
    label: "Strengths",
    icon: ShieldCheck,
    lightBg: "bg-emerald-50",
    lightBorder: "border-emerald-200",
    lightText: "text-emerald-700",
    lightDot: "bg-emerald-500",
  },
  {
    key: "weaknesses" as const,
    label: "Weaknesses",
    icon: AlertTriangle,
    lightBg: "bg-amber-50",
    lightBorder: "border-amber-200",
    lightText: "text-amber-700",
    lightDot: "bg-amber-500",
  },
  {
    key: "opportunities" as const,
    label: "Opportunities",
    icon: TrendingUp,
    lightBg: "bg-cyan-50",
    lightBorder: "border-cyan-200",
    lightText: "text-cyan-700",
    lightDot: "bg-cyan-500",
  },
  {
    key: "threats" as const,
    label: "Threats",
    icon: Target,
    lightBg: "bg-red-50",
    lightBorder: "border-red-200",
    lightText: "text-red-700",
    lightDot: "bg-red-500",
  },
];

interface SwotInput {
  brandName: string;
  category?: string;
  yearFounded?: number;
  totalUnits?: number;
  investmentMin?: number;
  investmentMax?: number;
  franchiseFee?: number;
  royaltyPercent?: number;
  brandFundPercent?: number;
  liquidCapitalMin?: number;
  avgUnitRevenue?: number;
  sbaApproved?: boolean;
  isGrowing?: boolean;
  fddAvailable?: boolean;
  item19Available?: boolean;
  veteranDiscount?: boolean;
  multiUnitAvailable?: boolean;
  territoriesAvailable: number;
  territoriesTotal: number;
}

function generateBrandSwot(p: SwotInput): {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
} {
  const s: string[] = [];
  const w: string[] = [];
  const o: string[] = [];
  const t: string[] = [];

  const age = p.yearFounded ? new Date().getFullYear() - p.yearFounded : 0;

  // ── STRENGTHS ──
  if (age > 20) s.push(`Established brand with ${age} years in the market — proven staying power and brand recognition`);
  else if (age > 5) s.push(`${age} years of operating history provides a foundation of proven systems and processes`);
  if (p.totalUnits && p.totalUnits > 500) s.push(`Large franchise system with ${p.totalUnits.toLocaleString()} units — extensive peer network and operational support`);
  else if (p.totalUnits && p.totalUnits > 50) s.push(`Growing network of ${p.totalUnits.toLocaleString()} units demonstrates market demand and franchisee confidence`);
  if (p.item19Available) s.push("Item 19 financial performance data available in FDD — transparency into potential earnings");
  if (p.sbaApproved) s.push("SBA-approved franchise — easier access to Small Business Administration loan programs");
  if (p.fddAvailable) s.push("Franchise Disclosure Document readily available for review");
  if (p.isGrowing) s.push("Actively growing franchise system — corporate investment in expansion and support");
  if (p.territoriesAvailable > 0) s.push(`${p.territoriesAvailable} territories currently available — active growth opportunity`);
  if (p.royaltyPercent && p.royaltyPercent <= 5) s.push(`Competitive royalty rate of ${p.royaltyPercent}% keeps more revenue in franchisee hands`);
  if (p.multiUnitAvailable) s.push("Multi-unit development available — potential for portfolio expansion");
  if (p.veteranDiscount) s.push("Veteran franchise fee discount offered — demonstrates community commitment");

  // ── WEAKNESSES ──
  if (age < 3) w.push("Relatively new franchise system — limited track record and fewer established franchisees to consult");
  if (!p.item19Available) w.push("No Item 19 financial performance data in FDD — you'll need to research earnings independently");
  if (p.royaltyPercent && p.royaltyPercent >= 8) w.push(`Higher royalty rate of ${p.royaltyPercent}% will impact ongoing profitability margins`);
  if (p.brandFundPercent && p.brandFundPercent >= 3) w.push(`Brand/ad fund contribution of ${p.brandFundPercent}% adds to ongoing costs`);
  if (p.investmentMin && p.investmentMin >= 1000000) w.push(`High total investment (${fmtK(p.investmentMin)}+) — significant capital commitment and longer break-even period`);
  if (p.territoriesAvailable === 0) w.push("No territories currently listed as available — may limit immediate location choices");
  if (!p.sbaApproved) w.push("Not listed as SBA-approved — may need to explore alternative financing options");

  // ── OPPORTUNITIES ──
  if (p.territoriesAvailable > 3) o.push(`${p.territoriesAvailable} available territories — multiple markets to choose from before competitors claim them`);
  if (p.territoriesAvailable > 0) o.push("Territory availability means you can enter while prime locations are still open");
  if (p.multiUnitAvailable) o.push("Multi-unit development potential — build a portfolio of locations for scale");
  if (p.isGrowing) o.push("Growing brand benefits from increasing national awareness and marketing reach");
  o.push("Request a Discovery Day to meet the corporate team and evaluate culture fit firsthand");
  o.push("Connect with 3–5 existing franchisees for validation — the FDD lists every owner's contact info");
  if (p.avgUnitRevenue && p.avgUnitRevenue > 500000) o.push(`Average unit volume of ${fmtK(p.avgUnitRevenue)} suggests strong consumer demand`);
  if (p.sbaApproved) o.push("SBA approval opens access to favorable loan terms — potentially 10-year terms at competitive rates");

  // ── THREATS ──
  t.push("Market competition — research how many competing brands operate in your target territory");
  if (p.territoriesAvailable === 0) t.push("No currently available territories may mean popular markets are already claimed");
  if (p.investmentMin && p.investmentMin > 500000) t.push("Higher investment levels increase financial exposure during economic downturns");
  t.push("Franchise regulations vary by state — work with an experienced franchise attorney before signing");
  if (p.territoriesAvailable > 0 && p.territoriesAvailable < 5) t.push("Limited territory availability — popular locations can move quickly");
  t.push("Economic conditions and consumer spending trends in your target market could impact unit performance");
  if (age < 10 && p.totalUnits && p.totalUnits < 100) t.push("Smaller system size means less brand recognition and fewer proven market data points");

  // Ensure minimums — each filler used at most once (no duplicated lines)
  if (s.length < 2) s.push("Active franchise brand listed on Franchise KI for increased prospect visibility");
  if (w.length < 2) w.push("Always validate franchise claims independently — speak with existing franchisees");
  if (w.length < 2) w.push("Request the latest FDD and review Items 7, 19, and 20 with a franchise attorney");
  if (o.length < 2) o.push("Franchise ownership builds long-term equity — a business you own vs a job you work");
  if (t.length < 2) t.push("Ensure adequate working capital beyond the initial investment for the first 6-12 months of operations");

  return {
    strengths: s.slice(0, 4),
    weaknesses: w.slice(0, 4),
    opportunities: o.slice(0, 4),
    threats: t.slice(0, 4),
  };
}
