import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
} from "lucide-react";

interface SwotAnalysisProps {
  brandName: string;
  brandCategory?: string;
  matchScore: number;
  matchReasons: string[];
  matchWarnings?: string[];
  investmentMin?: number;
  investmentMax?: number;
  nearbyTerritories: number;
  totalAvailableNearby: number;
  // ── Enhanced prospect fields ──
  ownershipModel?: string[];
  ownerType?: string;
  runFromHome?: string;
  fullTimePartTime?: string;
  multiUnitInterest?: string;
  veteranStatus?: boolean;
  revenueGoal?: string;
  incomeGoal?: string;
  brandMaturity?: string;
  riskTolerance?: string;
  spacePreference?: string;
  employeeComfort?: string;
  motivations?: string[];
  avoidList?: string[];
  sbaFinancingIntent?: string;
  supportImportance?: string;
  supportPriorities?: string[];
  professionalBackground?: string[];
}

function generateSwot(p: SwotAnalysisProps) {
  const s: string[] = [];
  const w: string[] = [];
  const o: string[] = [];
  const t: string[] = [];

  const hasBudgetFit = p.matchReasons.some((r) => r.toLowerCase().includes("budget meets") || r.toLowerCase().includes("comfortable budget"));
  const hasBudgetClose = p.matchReasons.some((r) => r.toLowerCase().includes("budget close"));
  const hasCategoryMatch = p.matchReasons.some((r) => r.toLowerCase().includes("matches your") && r.toLowerCase().includes("interest"));
  const hasOwnerMatch = p.matchReasons.some((r) => r.toLowerCase().includes("ownership style"));
  const hasTerritory = p.nearbyTerritories > 0;
  const hasSba = p.matchReasons.some((r) => r.toLowerCase().includes("sba"));
  const hasRunFromHome = p.matchReasons.some((r) => r.toLowerCase().includes("run from home") || r.toLowerCase().includes("home-based"));
  const hasMultiUnit = p.matchReasons.some((r) => r.toLowerCase().includes("multi-unit"));
  const hasVeteran = p.matchReasons.some((r) => r.toLowerCase().includes("veteran"));
  const hasRevenueMatch = p.matchReasons.some((r) => r.toLowerCase().includes("auv") || r.toLowerCase().includes("revenue goal"));
  const hasIncomeMatch = p.matchReasons.some((r) => r.toLowerCase().includes("income"));
  const hasSupportMatch = p.matchReasons.some((r) => r.toLowerCase().includes("support"));

  // ── STRENGTHS — personalized based on active dimensions ──
  if (hasBudgetFit) s.push("Your liquid capital comfortably covers the investment requirements");
  if (hasCategoryMatch) s.push(`${p.brandName} aligns with your preferred franchise category`);
  if (hasOwnerMatch) s.push("Your desired ownership style matches what this franchise supports");
  if (hasTerritory) s.push(`${p.nearbyTerritories} available territor${p.nearbyTerritories === 1 ? "y" : "ies"} near your target location`);
  if (hasRunFromHome && p.runFromHome === "yes") s.push("This franchise supports home-based operations — matches your preference");
  if (hasMultiUnit) s.push("Multi-unit development available — aligns with your growth ambitions");
  if (hasVeteran) s.push("Veteran discount offered — financial advantage for your military background");
  if (hasSba && p.sbaFinancingIntent === "yes") s.push("SBA approved — supports your financing strategy");
  if (hasRevenueMatch) s.push("Revenue performance aligns with your income/revenue goals");
  if (hasSupportMatch && p.supportImportance === "critical") s.push("Strong franchisor support system — matches your priority for hands-on guidance");
  if (p.matchScore >= 70) s.push(`Strong overall compatibility (${p.matchScore}/100) across ${p.matchReasons.length} dimensions`);
  // Ensure at least 2
  if (s.length < 2) s.push("Active franchise system with territories available for growth");
  if (s.length < 2) s.push("Brand is listed on Franchise KI — increased visibility to qualified prospects");

  // ── WEAKNESSES — personalized warnings ──
  if (hasBudgetClose && !hasBudgetFit) w.push("Your budget is close but may not fully cover the minimum investment — explore financing options");
  if (!hasBudgetFit && !hasBudgetClose) w.push("Investment requirements may exceed your stated liquid capital — consider SBA loans or partners");
  if (!hasCategoryMatch && p.brandCategory) w.push(`${p.brandName}'s ${p.brandCategory} category may not match your preferences — assess if you're open to pivoting`);
  if (!hasTerritory) w.push("No available territories found near your target location at this time");

  // Enhanced field-driven weaknesses
  if (p.runFromHome === "yes" && !hasRunFromHome) w.push("This franchise likely requires a dedicated location — not suited for home-based operation");
  if (p.fullTimePartTime === "part_time" && p.matchWarnings?.some(w => w.toLowerCase().includes("full-time"))) {
    w.push("This franchise requires full-time commitment — may conflict with your part-time preference");
  }
  if (p.employeeComfort === "solo" && p.brandCategory?.toLowerCase().includes("food")) {
    w.push("Food & Beverage franchises typically require staff — may not suit your solo preference");
  }
  if (p.avoidList?.includes("nights_weekends") && (p.brandCategory?.toLowerCase().includes("food") || p.brandCategory?.toLowerCase().includes("beverage"))) {
    w.push("This category often involves nights & weekends — flagged on your avoid list");
  }
  if (p.avoidList?.includes("large_teams") && p.matchWarnings?.some(w => w.toLowerCase().includes("lifestyle conflict"))) {
    w.push("Large team management may be required — noted as something you'd prefer to avoid");
  }
  if (p.riskTolerance === "conservative" && p.matchScore < 50) {
    w.push("Lower match score combined with your conservative risk profile suggests caution");
  }
  // Ensure at least 2
  if (w.length < 2) w.push("Always validate franchise earnings claims through the FDD (Franchise Disclosure Document)");
  if (w.length < 2) w.push("Speak with existing franchisees about their actual experience before committing");

  // ── OPPORTUNITIES — based on prospect's goals ──
  if (hasTerritory && p.nearbyTerritories > 2) o.push(`Multiple territories near you (${p.nearbyTerritories}) — potential for multi-unit development`);
  if (hasTerritory) o.push("Territory availability in your market means you can act before competitors claim them");
  if (hasBudgetFit) o.push("Strong financial fit positions you well to negotiate favorable terms");
  if (p.multiUnitInterest && p.multiUnitInterest !== "1" && hasMultiUnit) {
    o.push("Your multi-unit interest aligns with this brand's expansion model — ask about area development agreements");
  }
  if (p.motivations?.includes("legacy")) o.push("This franchise could serve as a long-term legacy asset for your family");
  if (p.motivations?.includes("community")) o.push(`${p.brandName} gives you a chance to make a local community impact`);
  if (p.motivations?.includes("financial_freedom") && hasRevenueMatch) o.push("Revenue performance suggests a viable path to the financial freedom you're seeking");
  if (p.professionalBackground?.length) {
    o.push("Your professional background could give you a competitive edge in operating this franchise");
  }
  o.push("Request a Discovery Day to meet the corporate team and see operations firsthand");
  if (!hasTerritory) o.push("Explore adjacent markets where this brand may have availability");

  // ── THREATS — based on prospect context ──
  if (!hasTerritory) t.push("No nearby territories — desired locations may already be claimed or pending");
  if (!hasBudgetFit && !hasBudgetClose) t.push("Capital gap could delay your timeline or require taking on additional debt");
  if (p.riskTolerance === "conservative") t.push("As a conservative investor, ensure you have 6+ months operating reserves beyond the initial investment");
  if (p.riskTolerance === "aggressive" && p.brandMaturity === "emerging") t.push("Emerging brands carry higher risk — validate unit economics thoroughly before committing");
  t.push("Competition from other brands in the same category in your target area");
  if (p.nearbyTerritories > 0) t.push("Popular territories can move quickly — territory status may change before you commit");
  if (p.avoidList?.includes("perishable_inventory") && (p.brandCategory?.toLowerCase().includes("food"))) {
    t.push("Perishable inventory management is inherent to this category — a concern you've flagged");
  }
  // Ensure at least 2
  if (t.length < 2) t.push("General economic conditions could impact consumer spending in your target market");
  if (t.length < 2) t.push("Franchise regulations and FDD requirements vary by state — consult a franchise attorney");

  return {
    strengths: s.slice(0, 4),
    weaknesses: w.slice(0, 4),
    opportunities: o.slice(0, 4),
    threats: t.slice(0, 4),
  };
}

const QUADRANTS = [
  { key: "strengths" as const, label: "Strengths", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  { key: "weaknesses" as const, label: "Weaknesses", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-400" },
  { key: "opportunities" as const, label: "Opportunities", icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", dot: "bg-cyan-400" },
  { key: "threats" as const, label: "Threats", icon: Target, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-400" },
];

export function SwotAnalysis(props: SwotAnalysisProps) {
  const [expanded, setExpanded] = useState(false);
  const swot = generateSwot(props);

  // Count how many personalization signals are active
  const personalizedCount = [
    props.ownershipModel?.length, props.runFromHome, props.fullTimePartTime,
    props.multiUnitInterest, props.veteranStatus, props.riskTolerance,
    props.motivations?.length, props.avoidList?.length, props.sbaFinancingIntent,
    props.supportImportance, props.employeeComfort, props.spacePreference,
  ].filter(Boolean).length;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-cyan-400 transition-colors w-full text-left group"
      >
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>AI Match Analysis</span>
        <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] ml-1">SWOT</Badge>
        {personalizedCount > 3 && (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] ml-0.5">Personalized</Badge>
        )}
        {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          {QUADRANTS.map(({ key, label, icon: Icon, color, bg, border, dot }) => (
            <div key={key} className={`rounded-lg ${bg} border ${border} p-3`}>
              <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
              </div>
              <ul className="space-y-1.5">
                {swot[key].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-1 sm:col-span-2 flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <Zap className="w-3 h-3 text-cyan-500/50" />
            {personalizedCount > 3
              ? `Personalized analysis using ${personalizedCount} of your profile dimensions. Always conduct independent due diligence.`
              : "Based on your profile, budget, and territory preferences. Complete more profile fields for deeper insights."}
          </div>
        </div>
      )}
    </div>
  );
}
