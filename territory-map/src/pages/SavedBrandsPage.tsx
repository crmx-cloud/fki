import { useState, useMemo, useEffect } from "react";
import { formatMoney } from "@/lib/format";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Link } from "react-router-dom";
import {
  Heart,
  MapPin,
  DollarSign,
  ArrowRight,
  Trash2,
  BarChart3,
  X,
  Building2,
  Star,
  TrendingUp,
  Briefcase,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Target,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Reveal } from "@/components/Reveal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ProspectInquiryDialog } from "@/components/ProspectInquiryDialog";
import { DueDiligenceDisclaimer } from "@/components/DueDiligenceDisclaimer";
import { cn } from "@/lib/utils";

/* ═════════════════════════════════════════════════════════
 * Saved Brands Page
 * ═════════════════════════════════════════════════════════ */
export function SavedBrandsPage() {
  const savedBrands = useQuery(api.savedItems.getMySavedBrandsDetailed);
  const toggleSave = useMutation(api.savedItems.toggleSave);

  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [inquiryBrand, setInquiryBrand] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);

  const toggleCompare = (brandId: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else if (next.size < 4) {
        next.add(brandId);
      } else {
        toast.info("Compare up to 4 brands at a time");
      }
      return next;
    });
  };

  const handleUnsave = async (brandId: Id<"brands">, name: string) => {
    await toggleSave({ brandId });
    setCompareIds((prev) => {
      const next = new Set(prev);
      next.delete(brandId);
      return next;
    });
    toast("Removed " + name + " from saved");
  };

  const compareBrands = useMemo(
    () => (savedBrands || []).filter((b: any) => compareIds.has(b?.brand?._id)),
    [savedBrands, compareIds]
  );

  // KPI intent event: comparing 2+ brands = brand_compared (deduped server-side)
  const trackEvent = useMutation(api.activity.track);
  useEffect(() => {
    if (compareBrands.length >= 2)
      trackEvent({ eventType: "brand_compared", brandId: compareBrands[0]?.brand?._id }).catch(() => {});
  }, [compareBrands.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Loading ── */
  if (savedBrands === undefined) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-400" /> Saved Brands
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Loading…</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border rounded-xl p-5 animate-pulse"
            >
              <div className="h-6 w-32 bg-muted rounded mb-3" />
              <div className="h-4 w-48 bg-muted rounded mb-2" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty ── */
  if (!savedBrands || savedBrands.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-400" /> Saved Brands
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Your franchise shortlist
          </p>
        </div>
        <div className="bg-card border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Saved Brands Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Browse franchise opportunities and tap the heart icon to save brands
            you&#39;re interested in. Come back here to compare them
            side&#8209;by&#8209;side.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/explore">
              <Button className="bg-cyan-600 hover:bg-cyan-500 text-white">
                <MapPin className="w-4 h-4 mr-2" /> Explore Brands
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline">
                <Star className="w-4 h-4 mr-2" /> View Matches
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main ── */
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-400" /> Saved Brands
            <Badge variant="secondary" className="text-sm font-normal ml-1">
              {savedBrands.length}
            </Badge>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {compareIds.size > 0
              ? `${compareIds.size} selected — `
              : "Select brands to "}
            compare side&#8209;by&#8209;side
          </p>
        </div>
        {compareIds.size >= 2 && (
          <Button
            onClick={() => setShowCompare(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Compare ({compareIds.size})
          </Button>
        )}
      </div>

      {/* Grid */}
      <Reveal stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {savedBrands.map((item: any) => {
          const b = item.brand;
          const selected = compareIds.has(b._id);
          const accent = item.profile?.primaryColor || b.color || "#06b6d4";

          return (
            <div
              key={b._id}
              className={cn(
                "card-lift bg-card border rounded-xl p-5 relative group",
                selected
                  ? "border-cyan-500/50 ring-1 ring-cyan-500/20 bg-cyan-500/5"
                  : "hover:border-border/80"
              )}
            >
              {/* Checkbox */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => toggleCompare(b._id)}
                  className="data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                />
              </div>

              {/* Color bar */}
              <div
                className="h-1 w-12 rounded-full mb-3"
                style={{ backgroundColor: accent }}
              />

              {/* Name */}
              <div className="pr-10 mb-3">
                <h3 className="font-semibold text-lg leading-tight">
                  {b.name}
                </h3>
                {b.category && (
                  <Badge className="mt-1 bg-muted text-muted-foreground border-0 text-xs">
                    {b.category}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {b.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {b.description}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                {b.investmentMin && (
                  <Stat
                    icon={DollarSign}
                    label={`$${k(b.investmentMin)}–$${k(
                      b.investmentMax || b.investmentMin
                    )}`}
                  />
                )}
                <Stat
                  icon={MapPin}
                  label={
                    <>
                      <span className="text-emerald-500 font-medium">
                        {item.territories.available}
                      </span>
                      /{item.territories.total} open
                    </>
                  }
                />
                {b.franchiseFee && (
                  <Stat
                    icon={Building2}
                    label={`Fee: $${k(b.franchiseFee)}`}
                  />
                )}
                {b.royaltyPercent != null && (
                  <Stat
                    icon={TrendingUp}
                    label={`Royalty: ${b.royaltyPercent}%`}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Link to={`/brand/${b.slug}`} className="flex-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                  >
                    View Details <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => handleUnsave(b._id, b.name)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </Reveal>

      {/* Browse more */}
      <div className="text-center pt-4">
        <Link to="/explore">
          <Button variant="ghost" className="text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2" /> Browse More Brands
          </Button>
        </Link>
      </div>

      {/* ─── Compare Dialog ─── */}
      <CompareDialog
        open={showCompare}
        onClose={() => setShowCompare(false)}
        brands={compareBrands}
        onInquiry={(b: any) =>
          setInquiryBrand({
            id: b.brand._id,
            name: b.brand.name,
            slug: b.brand.slug,
          })
        }
      />

      {/* Inquiry dialog */}
      {inquiryBrand && (
        <ProspectInquiryDialog
          open={!!inquiryBrand}
          onClose={() => setInquiryBrand(null)}
          brandId={inquiryBrand.id as Id<"brands">}
          brandName={inquiryBrand.name}
          brandSlug={inquiryBrand.slug}
        />
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
 * AI Comparison Summary — "futuristic" personalized analysis
 * ═════════════════════════════════════════════════════════ */
function AiComparisonSummary({ brands }: { brands: any[] }) {
  const prospectProfile = useQuery(api.prospect.getMyProspectProfile);

  if (brands.length < 2) return null;

  const summary = generateComparisonInsight(brands, prospectProfile);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/50 via-slate-900/80 to-indigo-950/50 p-5 mb-6">
      {/* Glow effects */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />

      {/* Animated scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-pulse" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Brain className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              AI Comparison Analysis
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] font-medium">
                PERSONALIZED
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-400">Based on your profile &amp; preferences</p>
          </div>
        </div>

        {/* Top Pick */}
        {summary.topPick && (
          <div className="bg-gradient-to-r from-cyan-500/10 to-transparent rounded-xl px-4 py-3 mb-4 border border-cyan-500/20">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Top Pick for You</span>
                <p className="text-sm text-white mt-0.5">{summary.topPick}</p>
              </div>
            </div>
          </div>
        )}

        {/* Insight bullets */}
        <div className="space-y-2.5">
          {summary.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                insight.type === "strength" ? "bg-emerald-500/15 text-emerald-400" :
                insight.type === "warning" ? "bg-amber-500/15 text-amber-400" :
                insight.type === "opportunity" ? "bg-cyan-500/15 text-cyan-400" :
                "bg-indigo-500/15 text-indigo-400"
              )}>
                {insight.type === "strength" ? <ShieldCheck className="w-3 h-3" /> :
                 insight.type === "warning" ? <AlertTriangle className="w-3 h-3" /> :
                 insight.type === "opportunity" ? <TrendingUp className="w-3 h-3" /> :
                 <Target className="w-3 h-3" />}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{insight.text}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
          <Zap className="w-3 h-3 text-cyan-500/60" />
          <span className="text-[11px] text-slate-500">
            Powered by Franchise KI intelligence • Always conduct independent due diligence
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
 * Generate comparison insight text
 * ═════════════════════════════════════════════════════════ */
type InsightItem = { type: "strength" | "warning" | "opportunity" | "info"; text: string };

function generateComparisonInsight(brands: any[], profile: any): { topPick: string | null; insights: InsightItem[] } {
  const insights: InsightItem[] = [];
  let topPick: string | null = null;

  const names = brands.map((b: any) => b.brand.name);

  // Investment range comparison
  const investmentRanges = brands.map((b: any) => ({
    name: b.brand.name,
    min: b.profile?.totalInvestmentMin || b.brand?.investmentMin || 0,
    max: b.profile?.totalInvestmentMax || b.brand?.investmentMax || 0,
    fee: b.profile?.franchiseFee || b.brand?.franchiseFee || 0,
    royalty: b.profile?.royaltyPercent || b.brand?.royaltyPercent || 0,
    territories: b.territories?.available || 0,
    totalUnits: b.profile?.totalUnits || 0,
    category: b.brand?.category || "",
  }));

  // Cheapest / most expensive
  const sorted = [...investmentRanges].sort((a, b) => a.min - b.min);
  const cheapest = sorted[0];
  const priciest = sorted[sorted.length - 1];
  if (cheapest.min > 0 && priciest.min > 0 && cheapest.name !== priciest.name) {
    const diff = priciest.min - cheapest.min;
    insights.push({
      type: "info",
      text: `*${cheapest.name}* has the lowest entry point ($${k(cheapest.min)}), while *${priciest.name}* requires $${k(priciest.min)}+ — a $${k(diff)} difference.`,
    });
  }

  // Territory availability
  const bestTerritory = [...investmentRanges].sort((a, b) => b.territories - a.territories)[0];
  const worstTerritory = [...investmentRanges].sort((a, b) => a.territories - b.territories)[0];
  if (bestTerritory.territories > 0) {
    insights.push({
      type: "opportunity",
      text: `*${bestTerritory.name}* has the most open territories (${bestTerritory.territories}) — more locations to choose from.`,
    });
  }
  if (worstTerritory.territories === 0 && worstTerritory.name !== bestTerritory.name) {
    insights.push({
      type: "warning",
      text: `*${worstTerritory.name}* has no available territories near you right now — you may need to explore adjacent markets.`,
    });
  }

  // Royalty comparison
  const lowestRoyalty = [...investmentRanges].sort((a, b) => a.royalty - b.royalty).find(r => r.royalty > 0);
  const highestRoyalty = [...investmentRanges].sort((a, b) => b.royalty - a.royalty)[0];
  if (lowestRoyalty && highestRoyalty && lowestRoyalty.name !== highestRoyalty.name && lowestRoyalty.royalty !== highestRoyalty.royalty) {
    insights.push({
      type: "strength",
      text: `*${lowestRoyalty.name}* has the lowest ongoing royalty (${lowestRoyalty.royalty}%) vs *${highestRoyalty.name}* at ${highestRoyalty.royalty}% — that adds up over time.`,
    });
  }

  // Brand size / maturity
  const biggestBrand = [...investmentRanges].sort((a, b) => b.totalUnits - a.totalUnits)[0];
  if (biggestBrand.totalUnits > 0) {
    insights.push({
      type: "info",
      text: `*${biggestBrand.name}* is the most established with ${biggestBrand.totalUnits.toLocaleString()} units — larger system = more proven operations.`,
    });
  }

  // Budget fit (if prospect profile exists)
  if (profile?.liquidCapital) {
    const capitalStr = profile.liquidCapital;
    const capitalMap: Record<string, number> = {
      "under-50k": 50000, "50k-100k": 75000, "100k-250k": 175000,
      "250k-500k": 375000, "500k-1m": 750000, "over-1m": 1500000,
    };
    const capital = capitalMap[capitalStr] || 0;
    if (capital > 0) {
      const affordable = investmentRanges.filter(r => r.min <= capital * 2);
      const stretch = investmentRanges.filter(r => r.min > capital * 2);
      if (affordable.length > 0) {
        const best = affordable.sort((a, b) => b.territories - a.territories)[0];
        topPick = `${best.name} — fits your budget${best.territories > 0 ? ` and has ${best.territories} territories available` : ""}.${affordable.length > 1 ? ` ${affordable.length} of ${brands.length} brands are within your investment range.` : ""}`;
      }
      if (stretch.length > 0) {
        insights.push({
          type: "warning",
          text: `${stretch.map(s => `*${s.name}*`).join(" and ")} may stretch your budget — explore SBA financing or investor partnerships.`,
        });
      }
    }
  }

  // Category diversity
  const categories = new Set(investmentRanges.map(r => r.category));
  if (categories.size > 1) {
    insights.push({
      type: "info",
      text: `You're comparing across ${categories.size} categories (${[...categories].join(", ")}) — good for exploring diverse opportunities.`,
    });
  } else if (categories.size === 1) {
    insights.push({
      type: "info",
      text: `All ${brands.length} brands are in ${[...categories][0]} — you're focused. Consider comparing across categories too for a wider perspective.`,
    });
  }

  // If no top pick generated, create one based on territories + lowest cost
  if (!topPick && investmentRanges.length > 0) {
    const pick = [...investmentRanges]
      .sort((a, b) => (b.territories * 1000 - b.min / 1000) - (a.territories * 1000 - a.min / 1000))[0];
    if (pick) {
      topPick = `${pick.name} stands out with ${pick.territories > 0 ? `${pick.territories} available territories and ` : ""}a $${k(pick.min)} minimum investment.`;
    }
  }

  return { topPick, insights: insights.slice(0, 5) };
}

/* ═════════════════════════════════════════════════════════
 * Compare Dialog — WIDE, RESPONSIVE
 * ═════════════════════════════════════════════════════════ */
function CompareDialog({
  open,
  onClose,
  brands,
  onInquiry,
}: {
  open: boolean;
  onClose: () => void;
  brands: any[];
  onInquiry: (b: any) => void;
}) {
  if (brands.length < 2) return null;

  const count = brands.length;
  const accent = (b: any) =>
    b.profile?.primaryColor || b.brand?.color || "#06b6d4";

  const sections: Section[] = [
    {
      title: "Investment",
      icon: DollarSign,
      rows: [
        {
          label: "Total Investment",
          get: (b) => {
            const lo = b.profile?.totalInvestmentMin || b.brand?.investmentMin;
            const hi = b.profile?.totalInvestmentMax || b.brand?.investmentMax;
            return lo ? `$${k(lo)}–$${k(hi || lo)}` : dash;
          },
        },
        {
          label: "Franchise Fee",
          get: (b) =>
            $(b.profile?.franchiseFee || b.brand?.franchiseFee),
        },
        {
          label: "Royalty",
          get: (b) =>
            pct(b.profile?.royaltyPercent || b.brand?.royaltyPercent),
        },
        { label: "Brand Fund", get: (b) => pct(b.profile?.brandFundPercent) },
        {
          label: "Min Liquid Capital",
          get: (b) => $(b.profile?.liquidCapitalMin),
        },
        { label: "SBA Approved", get: (b) => yn(b.profile?.sbaApproved) },
      ],
    },
    {
      title: "Territories",
      icon: MapPin,
      rows: [
        { label: "Total", get: (b) => b.territories?.total ?? dash },
        {
          label: "Available",
          get: (b) => (
            <span className="text-emerald-400 font-semibold">
              {b.territories?.available ?? dash}
            </span>
          ),
        },
        { label: "Sold", get: (b) => b.territories?.sold ?? dash },
        {
          label: "Geographic Focus",
          get: (b) => b.profile?.geographicFocus || dash,
        },
        {
          label: "Exclusive Territory",
          get: (b) => yn(b.profile?.territoryExclusivity),
        },
      ],
    },
    {
      title: "Brand",
      icon: Building2,
      rows: [
        { label: "Founded", get: (b) => b.profile?.yearFounded ?? dash },
        {
          label: "Franchising Since",
          get: (b) => b.profile?.yearFranchising ?? dash,
        },
        { label: "Total Units", get: (b) => b.profile?.totalUnits ?? dash },
        {
          label: "Retention Rate",
          get: (b) => b.profile?.retentionRate || dash,
        },
        {
          label: "Avg Revenue",
          get: (b) =>
            b.profile?.avgRevenueMin
              ? `$${k(b.profile.avgRevenueMin)}–$${k(
                  b.profile.avgRevenueMax
                )}`
              : b.profile?.avgUnitRevenue
                ? `$${k(b.profile.avgUnitRevenue)}`
                : dash,
        },
      ],
    },
    {
      title: "Operations",
      icon: Briefcase,
      rows: [
        {
          label: "Training",
          get: (b) =>
            b.profile?.trainingWeeks
              ? `${b.profile.trainingWeeks} weeks`
              : dash,
        },
        { label: "Veteran Discount", get: (b) => yn(b.profile?.veteranDiscount) },
        { label: "Multi-Unit", get: (b) => yn(b.profile?.multiUnitAvailable) },
        { label: "Absentee OK", get: (b) => yn(b.profile?.absenteeOwnership) },
        { label: "Home-Based OK", get: (b) => yn(b.profile?.canRunFromHome) },
        { label: "Part-Time OK", get: (b) => yn(b.profile?.canRunPartTime) },
        {
          label: "Term",
          get: (b) => b.profile?.termOfAgreement || dash,
        },
        { label: "Renewable", get: (b) => yn(b.profile?.termRenewable) },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] xl:max-w-[85vw] 2xl:max-w-[1400px] max-h-[90vh] overflow-y-auto p-0 w-full">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Compare {brands.length} Brands
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-6">
          {/* ── AI Comparison Summary ── */}
          <div className="pt-4">
            <AiComparisonSummary brands={brands} />
          </div>

          {/* Brand headers — responsive */}
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div
              className="grid gap-3 sm:gap-4 mb-6 min-w-0"
              style={{ gridTemplateColumns: `minmax(100px, 140px) repeat(${count}, minmax(140px, 1fr))` }}
            >
              <div />
              {brands.map((b: any) => (
                <div key={b.brand._id} className="text-center min-w-0">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm sm:text-lg"
                    style={{ backgroundColor: accent(b) }}
                  >
                    {b.brand.name.charAt(0)}
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm truncate px-1">
                    {b.brand.name}
                  </h3>
                  {b.brand.category && (
                    <Badge
                      className="mt-1 text-[9px] sm:text-[10px] border-0"
                      style={{
                        backgroundColor: accent(b) + "20",
                        color: accent(b),
                      }}
                    >
                      {b.brand.category}
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Sections — scrollable on mobile */}
            <div className="space-y-6">
              {sections.map((s) => (
                <div key={s.title}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <s.icon className="w-3.5 h-3.5" /> {s.title}
                  </h4>
                  <div className="bg-muted/30 rounded-xl overflow-hidden">
                    {s.rows.map((row, ri) => (
                      <div
                        key={row.label}
                        className={cn(
                          "grid gap-3 sm:gap-4 py-2.5 px-3 sm:px-4 text-sm items-center",
                          ri % 2 === 0 ? "bg-transparent" : "bg-muted/30"
                        )}
                        style={{ gridTemplateColumns: `minmax(100px, 140px) repeat(${count}, minmax(140px, 1fr))` }}
                      >
                        <div className="text-muted-foreground font-medium text-xs whitespace-nowrap">
                          {row.label}
                        </div>
                        {brands.map((b: any) => (
                          <div
                            key={b.brand._id}
                            className="text-center text-xs sm:text-sm font-medium"
                          >
                            {row.get(b)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div
              className="grid gap-3 sm:gap-4 mt-6 pt-4 border-t border-border"
              style={{ gridTemplateColumns: `minmax(100px, 140px) repeat(${count}, minmax(140px, 1fr))` }}
            >
              <div />
              {brands.map((b: any) => (
                <div key={b.brand._id} className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="w-full text-white text-xs"
                    style={{ backgroundColor: accent(b) }}
                    onClick={() => onInquiry(b)}
                  >
                    <MessageCircle className="w-3 h-3 mr-1" /> I'm Interested
                  </Button>
                  <Link to={`/brand/${b.brand.slug}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                    >
                      View Profile <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 pb-5">
            <DueDiligenceDisclaimer variant="inline" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═════════════════════════════════════════════════════════
 * Tiny helpers
 * ═════════════════════════════════════════════════════════ */
const dash = <span className="text-muted-foreground">—</span>;

function k(v: number) {
  return formatMoney(v).replace(/^\$/, "");
}
function $(v?: number) {
  return v ? formatMoney(v) : dash;
}
function pct(v?: number) {
  return v != null ? v + "%" : dash;
}
function yn(v?: boolean) {
  return v === true ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
  ) : v === false ? (
    <X className="w-4 h-4 text-slate-500 inline" />
  ) : (
    dash
  );
}

type Section = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: { label: string; get: (b: any) => React.ReactNode }[];
};

function Stat({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
