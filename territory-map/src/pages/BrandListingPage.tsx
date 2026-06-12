import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { SaveBrandButton } from "@/components/SaveBrandButton";
import { ProspectInquiryDialog } from "@/components/ProspectInquiryDialog";
import { BrandSwotSection } from "@/components/BrandSwotSection";
import { normalizeVideoEmbedUrl } from "@/lib/video";
import { useUnlocked } from "@/hooks/useUnlocked";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { BrandStateMap } from "@/components/BrandStateMap";
import { DueDiligenceDisclaimer } from "@/components/DueDiligenceDisclaimer";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Reveal, useReveal } from "@/components/Reveal";
import { GatedSection, MembershipUpsellStrip } from "@/components/GatedSection";
import { CountUp } from "@/components/CountUp";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import {
  MapPin,
  DollarSign,
  Percent,
  Building2,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Star,
  CheckCircle,
  XCircle,
  HelpCircle,
  User,
  Mail,
  Phone,
  TrendingUp,
  Shield,
  Award,
  Clock,
  Users,
  CheckSquare,
  PhoneCall,
  FileText,
  ClipboardCheck,
  UserCheck,
  Sparkles,
  Globe,
  BadgeCheck,
  Zap,
  Calendar,
  BookOpen,
  Target,
  ChevronRight,
  Play,
  Briefcase,
  GraduationCap,
  Megaphone,
  Home,
  Trophy,
  Handshake,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Search,
  ChevronDown,
  X,
  Lock,
} from "lucide-react";

const CAPITAL_OPTIONS = [
  "Under $50K",
  "$50K–$100K",
  "$100K–$250K",
  "$250K–$500K",
  "$500K–$1M",
  "$1M+",
];

const TIMELINE_OPTIONS = [
  "ASAP",
  "Within 3 months",
  "Within 6 months",
  "Within 12 months",
  "Just exploring",
];

type TabKey = "overview" | "profile" | "swot" | "learn-more";

// ── Data provenance (fieldSources) ──
type FieldSource = {
  source: string;
  url?: string;
  year?: number;
  confidence?: "high" | "medium" | "low";
};
type FieldSources = Record<string, FieldSource> | undefined;

const OWNER_TYPE_LABELS: Record<string, string> = {
  owner_operator: "Owner-Operator",
  semi_absentee: "Semi-Absentee",
  absentee: "Absentee",
  executive: "Executive",
  investor: "Investor",
};

// ── Helper: contrast text color for accessibility ──
function contrastTextColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1e293b" : "#ffffff";
}

// ── Helper: format currency ──
function fmtCurrency(val: number | undefined, short = true): string {
  if (!val) return "—";
  if (short) {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  }
  return `$${val.toLocaleString()}`;
}

/* ── Haversine distance (miles) between two lat/lng pairs ── */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function BrandListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useConvexAuth();
  const { unlocked } = useUnlocked();
  const detail = useQuery(api.marketplace.getBrandDetail, slug ? { slug } : "skip");
  const myProfile = useQuery(api.users.getMyProfile);
  const savedIds = useQuery(api.savedItems.getMySavedBrandIds);
  const prospectProfile = useQuery(
    api.prospect.getMyProspectProfile,
    isAuthenticated ? {} : "skip"
  );
  const stateAvailability = useQuery(
    api.stateAvailability.getByBrand,
    detail?.brand?._id ? { brandId: detail.brand._id } : "skip"
  );
  const isProspect = myProfile?.profile?.role === "prospect";
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [showProspectInquiry, setShowProspectInquiry] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showAllTerritories, setShowAllTerritories] = useState(false);
  const [territorySearch, setTerritorySearch] = useState("");

  // KPI intent event: brand viewed (authed users only; deduped server-side)
  const trackEvent = useMutation(api.activity.track);
  useEffect(() => {
    if (detail?.brand?._id && isAuthenticated)
      trackEvent({ eventType: "brand_viewed", brandId: detail.brand._id }).catch(() => {});
  }, [detail?.brand?._id, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // SEO: keep document title/meta in sync on client-side navigation (the
  // prerendered static HTML sets these for crawlers; this covers SPA routing)
  useEffect(() => {
    const name = detail?.brand?.name;
    if (!name) return;
    document.title = `${name} Franchise: Cost, Fees & Availability (2026) | FranchiseKI`;
    return () => {
      document.title = "FranchiseKI — Hundreds of Hours of Franchise Due Diligence, Done in 90 Seconds";
    };
  }, [detail?.brand?.name]);

  // Tab state from URL query param
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "overview";
  const setTab = (tab: TabKey) => {
    if (tab === "overview") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (detail === undefined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-500">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <PublicNav />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Brand Not Found</h1>
            <Link to="/explore">
              <Button className="bg-cyan-600 hover:bg-cyan-500 text-white">← Browse Brands</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { brand, territories, profile, photoUrls, resolvedLogoUrl, sectionImageUrls } = detail;

  // ── Territory data model ──
  // "open" = existing operating location; "sold" = claimed/awarded territory;
  // available / high_interest / pending_award = rare franchisor-CONFIRMED open territories.
  const existingLocations = territories.filter((t: any) => t.status === "open");
  const claimedTerritories = territories.filter((t: any) => t.status === "sold");
  const confirmedOpenTerritories = territories.filter((t: any) =>
    ["available", "high_interest", "pending_award"].includes(t.status)
  );
  // State-level availability (franchisors open STATES, not city territories)
  const stateRows = stateAvailability ?? [];
  const openStateCount = stateRows.filter((r) => r.status === "open").length;

  // Brand accent color
  const accent = profile?.primaryColor || brand.color || "#06b6d4";
  const accentBg = `${accent}15`;
  const accentBorder = `${accent}30`;

  const openInterest = () => {
    if (isProspect) setShowProspectInquiry(true);
    else { setShowInterestForm(true); setSubmitted(false); }
  };

  // Determine current year for calculations
  const currentYear = new Date().getFullYear();
  const yearsOperating = profile?.yearFounded ? currentYear - profile.yearFounded : undefined;
  const yearsFranchising = profile?.yearFranchising ? currentYear - profile.yearFranchising : undefined;

  const hasProfile = !!profile;
  const hasPerformance = !!(profile?.avgRevenueMin || profile?.totalUnits || profile?.yearFounded);
  const hasInvestment = !!(profile?.totalInvestmentMin || profile?.franchiseFee || brand.franchiseFee);
  const hasContent = !!(profile?.brandStory || profile?.sellingPoints?.length);
  const hasFaqs = !!(profile?.faqs && profile.faqs.length > 0);
  const hasIdealPartner = !!(profile?.idealPartner && profile.idealPartner.length > 0);
  const hasFlags = !!(profile?.fddAvailable || profile?.sbaApproved || profile?.multiUnitAvailable || profile?.territoryExclusivity);
  const hasPhotos = !!(photoUrls && photoUrls.length > 0);
  const hasCompanyDetails = !!(profile?.parentCompany || profile?.leadershipName || profile?.corporateCity || profile?.employeesAtHQ);
  const hasTraining = !!(profile?.classroomTrainingHours || profile?.onTheJobTrainingHours || profile?.ongoingSupport?.length || profile?.marketingSupport?.length);
  const overviewEmbedUrl = normalizeVideoEmbedUrl(profile?.overviewVideoUrl);
  const testimonialEmbedUrl = normalizeVideoEmbedUrl(profile?.testimonialVideoUrl);
  const hasVideo = !!(overviewEmbedUrl || testimonialEmbedUrl);
  const hasSocials = !!(profile?.socialLinks && Object.values(profile.socialLinks).some(Boolean));
  const hasRanking = !!(profile?.franchiseRanking);
  const hasStorySection = !!(profile?.model || profile?.positioning || profile?.brandStory);
  const hasUnitsGrowth = !!(profile?.totalUnits || profile?.yearFounded || profile?.yearFranchising || profile?.closureCount !== undefined || profile?.isGrowing !== undefined || profile?.retentionRate || profile?.guestRating);

  // ── FDD enrichment data detection ──
  const hasItem19 = !!(profile?.item19Revenue?.average || profile?.item19Revenue?.median || profile?.item19Profit?.estimatedAverage);
  const hasItem7 = !!(profile?.item7Breakdown && profile.item7Breakdown.length > 0);
  const hasItem20 = !!(profile?.item20?.franchisedUnitsEnd || profile?.item20?.newOpenings !== undefined);
  const hasLawsuits = !!(profile?.activeLawsuits !== undefined || profile?.activeLawsuitCount);
  const hasFeeDetails = !!(profile?.royaltyNotes || profile?.techFeeAnnual || profile?.otherRecurringFees);
  const hasTerritoryDetails = !!(profile?.territorySize || profile?.territoryPopulation);

  // ── Per-tab data completeness (drives "profile incomplete" blocks) ──
  const hasFinancialData = hasItem19 || !!(profile?.avgUnitRevenue || profile?.avgRevenueMin);
  const hasOpsData = !!(profile && (
    profile.absenteeOwnership !== undefined ||
    profile.canRunFromHome !== undefined ||
    profile.canRunPartTime !== undefined ||
    profile.exclusiveTerritories !== undefined ||
    profile.multiUnitAvailable !== undefined ||
    profile.veteranDiscount !== undefined ||
    profile.sbaApproved !== undefined ||
    profile.fddAvailable !== undefined ||
    profile.employeesRequired ||
    profile.termOfAgreement
  ));
  const hasTerritoryRecords = territories.length > 0 || stateRows.length > 0;
  const overviewTabSectionCount = [hasStorySection, hasTerritoryRecords, hasPhotos].filter(Boolean).length;
  const profileTabSectionCount = [
    hasStorySection,
    hasFinancialData,
    hasInvestment,
    hasItem7,
    hasUnitsGrowth,
    hasOpsData,
    hasIdealPartner,
    !!profile?.sellingPoints?.length,
    hasFaqs,
    hasPhotos,
  ].filter(Boolean).length;
  const learnMoreTabSectionCount = [hasVideo, hasCompanyDetails, hasTraining, hasSocials].filter(Boolean).length;
  const overviewTabIncomplete = overviewTabSectionCount <= 1;
  const profileTabIncomplete = profileTabSectionCount <= 1;
  const learnMoreTabIncomplete = learnMoreTabSectionCount <= 1;

  // Build highlight badges
  const highlights: { icon: any; label: string }[] = [];
  if (profile?.fddAvailable) highlights.push({ icon: FileText, label: "FDD Available" });
  if (profile?.item19Available) highlights.push({ icon: BookOpen, label: "Item 19 Available" });
  if (profile?.sbaApproved) highlights.push({ icon: Shield, label: "SBA Approved" });
  if (profile?.veteranDiscount) highlights.push({ icon: Award, label: "Veteran Discount" });
  if (profile?.multiUnitAvailable) highlights.push({ icon: Building2, label: "Multi-Unit Available" });
  if (profile?.territoryExclusivity) highlights.push({ icon: Target, label: "Territory Exclusivity" });
  if (profile?.isGrowing) highlights.push({ icon: TrendingUp, label: "Actively Growing" });
  if (profile?.trainingWeeks) highlights.push({ icon: Calendar, label: `${profile.trainingWeeks}-Week Training` });
  if (hasRanking) highlights.push({ icon: Trophy, label: `#${profile!.franchiseRanking} ${profile?.rankingSource || "Franchise 500"}` });
  if (profile?.fddYear) highlights.push({ icon: FileText, label: `${profile.fddYear} FDD Data` });

  // Tab definitions
  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: Globe },
    { key: "profile", label: "Profile", icon: Building2 },
    { key: "swot", label: "SWOT Analysis", icon: Sparkles },
    { key: "learn-more", label: "Learn More", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 motion-page motion-page-light">
      <PublicNav />

      {/* ════════════════════════════════════════════
          HERO HEADER
          ════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `radial-gradient(circle at 30% 50%, ${accent}, transparent 60%)` }}
        />
        <div className="relative max-w-7xl mx-auto px-6 pt-8 pb-12">
          {/* Breadcrumb */}
          <Link to="/explore" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-8 w-fit">
            <ArrowLeft className="w-3 h-3" /> Back to All Brands
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="flex-1">
              {/* Logo + Name */}
              <div className="flex items-center gap-4 mb-4">
                {resolvedLogoUrl ? (
                  <img src={resolvedLogoUrl} alt={brand.name} className="w-16 h-16 rounded-2xl object-cover bg-slate-100" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black" style={{ backgroundColor: accentBg, color: accent }}>
                    {brand.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{brand.name}</h1>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {brand.category && (
                      <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">{brand.category}</Badge>
                    )}
                    {brand.featured && (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        <Star className="w-3 h-3 mr-1" /> Featured
                      </Badge>
                    )}
                    {profile?.isGrowing && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" /> Growing
                      </Badge>
                    )}
                    {brand?._id && (
                      <SaveBrandButton
                        brandId={brand._id}
                        savedBrandIds={savedIds ?? []}
                        variant="icon-light"
                      />
                    )}
                  </div>
                </div>
              </div>

              <p className="text-slate-600 max-w-2xl text-lg leading-relaxed mb-6">
                {brand.description}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="font-semibold px-8"
                  style={{ backgroundColor: accent, color: contrastTextColor(accent) }}
                  onClick={openInterest}
                >
                  I'm Interested <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                {brand.websiteUrl && (
                  <a href={brand.websiteUrl.startsWith("http") ? brand.websiteUrl : `https://${brand.websiteUrl}`} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" variant="outline" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100">
                      <ExternalLink className="w-4 h-4 mr-2" /> Website
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="min-w-[280px]">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <div className="space-y-4">
                {(brand.investmentMin || profile?.totalInvestmentMin) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4" style={{ color: accent }} /> Investment
                    </span>
                    <span className="font-bold">
                      {fmtCurrency(profile?.totalInvestmentMin || brand.investmentMin)}–{fmtCurrency(profile?.totalInvestmentMax || brand.investmentMax)}
                    </span>
                  </div>
                )}
                {(brand.franchiseFee || profile?.franchiseFee) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4" style={{ color: accent }} /> Franchise Fee
                    </span>
                    <span className="font-bold">{fmtCurrency(profile?.franchiseFee || brand.franchiseFee)}</span>
                  </div>
                )}
                {(brand.royaltyPercent || profile?.royaltyPercent) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-2">
                      <Percent className="w-4 h-4" style={{ color: accent }} /> Royalty
                    </span>
                    <span className="font-bold">{profile?.royaltyPercent || brand.royaltyPercent}%</span>
                  </div>
                )}
                {profile?.liquidCapitalMin && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" style={{ color: accent }} /> Liquid Capital
                    </span>
                    <span className="font-bold">{fmtCurrency(profile.liquidCapitalMin)}+</span>
                  </div>
                )}
                {existingLocations.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" style={{ color: accent }} /> Locations
                    </span>
                    <span className="font-bold"><CountUp value={existingLocations.length} /> operating</span>
                  </div>
                )}
                {openStateCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-500" /> Open States
                    </span>
                    <span className="font-bold text-emerald-600"><CountUp value={openStateCount} /> open</span>
                  </div>
                )}
                {/* Transparency Receipt — verification seal for the stats above */}
                {!!profile?.verifiedFieldCount && (
                  <VerificationSeal>
                    <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs leading-snug text-emerald-800">
                      {profile.verifiedFieldCount} data points independently verified
                      {profile.dataVerifiedAt ? ` · ${profile.dataVerifiedAt}` : ""}
                    </span>
                  </VerificationSeal>
                )}
              </div>
            </div>
            {/* Unclaimed-listing nudge */}
            {brand.isClaimed !== true && (
              <Link
                to="/claim"
                className="mt-3 flex items-center gap-2 px-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Unclaimed listing — own this brand?{" "}
                  <span className="underline underline-offset-2">Claim it</span>
                </span>
              </Link>
            )}
            </div>
          </div>

          {/* Highlight Badges Row */}
          {highlights.length > 0 && (
            <Reveal stagger className="flex flex-wrap gap-2 mt-8">
              {highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: accentBg, color: accent, border: `1px solid ${accentBorder}` }}
                >
                  <h.icon className="w-3.5 h-3.5" />
                  {h.label}
                </div>
              ))}
            </Reveal>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          TAB BAR
          ════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`px-5 py-3.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-current text-slate-900 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
                style={activeTab === tab.key ? { color: accent, borderColor: accent } : undefined}
              >
                <tab.icon className={`w-4 h-4${activeTab === tab.key ? " tab-active-pop" : ""}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* key={activeTab} remounts the panel so the incoming tab fades up briefly */}
      <div key={activeTab} className="max-w-7xl mx-auto px-6 tab-panel-in">

        {/* ════════════════════════════════════════════════════════
            TAB: OVERVIEW
            ════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <>
            {/* Slim link-card into the dedicated SWOT Analysis tab */}
            <Reveal as="section" className="py-10 border-b border-slate-100">
              <button
                onClick={() => setTab("swot")}
                className="w-full max-w-3xl flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 text-left hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">AI SWOT Analysis</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      Strengths, weaknesses, risk flags, and your personalized PerfectFit™ score
                    </p>
                  </div>
                </div>
                <span
                  className="text-sm font-semibold flex items-center gap-1 shrink-0"
                  style={{ color: accent }}
                >
                  <span className="hidden sm:inline">View the full AI SWOT Analysis</span>
                  <span className="sm:hidden">View</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            </Reveal>

            {/* Territory Map — state-shaded availability */}
            <section className="py-16 border-b border-slate-100">
              {/* Reveal the heading only — the Leaflet map stays outside any opacity/transform animation */}
              <Reveal as="h2" className="text-3xl md:text-4xl font-extrabold mb-6">Territory Map</Reveal>
              <BrandStateMap
                territories={territories}
                stateAvailability={stateRows}
                brandName={brand.name}
                height="500px"
              />
              <DueDiligenceDisclaimer variant="inline" />

              {/* Inquire CTA */}
              <Reveal className="mt-8 flex flex-col items-center gap-2 text-center">
                <Button
                  size="lg"
                  className="font-semibold px-8 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={openInterest}
                >
                  Check if your territory is available <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                {openStateCount > 0 ? (
                  <p className="text-sm text-slate-500">
                    {openStateCount} {openStateCount === 1 ? "state" : "states"} open for new franchisees
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    State availability not yet published — inquire for current openings
                  </p>
                )}
              </Reveal>
            </section>

            {/* Full Territory Report — gated behind a free profile */}
            <section className="py-16 border-b border-slate-100">
              {!isAuthenticated ? (
                /* ── PUBLIC: locked teaser panel ── */
                <div className="max-w-3xl mx-auto rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/50 shadow-sm p-8 md:p-10">
                  <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                      <Lock className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-1">Full Territory Report</h2>
                    <p className="text-slate-500">Free with your profile</p>
                  </div>
                  <div className="max-w-md mx-auto space-y-3 mb-8">
                    {[
                      "Nearest operating locations to you (visit them before you invest)",
                      "Claimed & sold territories in your state",
                      "Confirmed-open territories the moment they list",
                      "Territory availability fast-lane: we inquire for you",
                    ].map((bullet, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-700 leading-relaxed">{bullet}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <Link to="/signup">
                      <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8">
                        Create your free profile <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <p className="text-xs text-slate-400 mt-3">Free account · verified email &amp; phone</p>
                  </div>
                </div>
              ) : (
                /* ── SIGNED IN: the real report ── */
                (() => {
                  const hasProspectLocation = !!(prospectProfile?.primaryLat && prospectProfile?.primaryLng);

                  // Nearest-first sorting when the user's profile has coordinates
                  const withDistance = (list: any[]) =>
                    hasProspectLocation
                      ? list
                          .map((t: any) => ({
                            ...t,
                            _distance:
                              t.latitude && t.longitude
                                ? haversineDistance(
                                    prospectProfile!.primaryLat!,
                                    prospectProfile!.primaryLng!,
                                    t.latitude,
                                    t.longitude
                                  )
                                : Infinity,
                          }))
                          .sort((a: any, b: any) => a._distance - b._distance)
                      : list;

                  const searchLower = territorySearch.trim().toLowerCase();
                  const matchesSearch = (t: any) =>
                    !searchLower || `${t.city}, ${t.state}`.toLowerCase().includes(searchLower);

                  const locations = withDistance(existingLocations).filter(matchesSearch);
                  const claimed = claimedTerritories.filter(matchesSearch);
                  const confirmed = confirmedOpenTerritories.filter(matchesSearch);

                  const totalRecords =
                    existingLocations.length + claimedTerritories.length + confirmedOpenTerritories.length;
                  const showSearch = totalRecords > 12;

                  // Cap the (potentially long) operating-location list
                  const INITIAL_SHOW = 12;
                  const visibleLocations =
                    showAllTerritories || searchLower ? locations : locations.slice(0, INITIAL_SHOW);
                  const hiddenLocations = locations.length - visibleLocations.length;

                  return (
                    <>
                      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h2 className="text-3xl md:text-4xl font-extrabold">Full Territory Report</h2>
                          <p className="text-slate-500 text-sm mt-1.5">
                            Operating locations, claimed territories, and confirmed openings for {brand.name}
                          </p>
                        </div>
                        {showSearch && (
                          <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              placeholder="Search city or state..."
                              value={territorySearch}
                              onChange={(e) => setTerritorySearch(e.target.value)}
                              className="pl-9 bg-white border-slate-200 text-slate-900"
                            />
                          </div>
                        )}
                      </div>

                      {totalRecords === 0 ? (
                        <p className="text-slate-500 text-sm">
                          No territory records published yet for {brand.name} — inquire for current availability.
                        </p>
                      ) : (
                        <div className="space-y-12">
                          {/* Confirmed Open Territories — rare and highlighted */}
                          {confirmed.length > 0 && (
                            <div>
                              <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-emerald-600" />
                                Confirmed Open Territories ({confirmed.length})
                              </h3>
                              <p className="text-sm text-slate-500 mb-4">
                                Franchisor-confirmed territories — these are rare and move fast.
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {confirmed.map((t: any) => (
                                  <div
                                    key={t._id}
                                    className="rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-sm p-4 flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <MapPin className="w-4 h-4 shrink-0 text-emerald-600" />
                                      <span className="font-semibold truncate">
                                        {t.city}, {t.state}
                                      </span>
                                    </div>
                                    <Badge
                                      style={{
                                        backgroundColor: `${STATUS_COLORS[t.status as keyof typeof STATUS_COLORS]}20`,
                                        color: STATUS_COLORS[t.status as keyof typeof STATUS_COLORS],
                                      }}
                                      className="border-0 text-xs shrink-0 ml-2"
                                    >
                                      {STATUS_LABELS[t.status as keyof typeof STATUS_LABELS]}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Existing Locations */}
                          {locations.length > 0 && (
                            <div>
                              <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-slate-600" />
                                Existing Locations ({locations.length})
                              </h3>
                              <p className="text-sm text-slate-500 mb-4">
                                {hasProspectLocation
                                  ? `Sorted nearest to ${prospectProfile?.primaryCity || "your location"} — visit a few before you invest.`
                                  : "Operating locations — visit a few before you invest."}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {visibleLocations.map((t: any) => (
                                  <div
                                    key={t._id}
                                    className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <MapPin className="w-4 h-4 shrink-0 text-slate-500" />
                                      <span className="font-medium truncate">
                                        {t.city}, {t.state}
                                      </span>
                                      {hasProspectLocation &&
                                        t._distance !== undefined &&
                                        t._distance !== Infinity && (
                                          <span className="text-xs text-slate-400 shrink-0">
                                            {Math.round(t._distance)} mi
                                          </span>
                                        )}
                                    </div>
                                    <Badge className="bg-slate-100 text-slate-600 border-0 text-xs shrink-0 ml-2">
                                      Operating
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                              {hiddenLocations > 0 && !searchLower && (
                                <div className="mt-4 text-center">
                                  <Button
                                    variant="outline"
                                    className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                                    onClick={() => setShowAllTerritories(true)}
                                  >
                                    <ChevronDown className="w-4 h-4 mr-2" />
                                    Show all {locations.length} locations
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Claimed / Sold */}
                          {claimed.length > 0 && (
                            <div>
                              <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-slate-400" />
                                Claimed / Sold ({claimed.length})
                              </h3>
                              <p className="text-sm text-slate-500 mb-4">
                                Territories already awarded to other franchisees.
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {claimed.map((t: any) => (
                                  <div
                                    key={t._id}
                                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between opacity-75"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                                      <span className="font-medium truncate text-slate-600">
                                        {t.city}, {t.state}
                                      </span>
                                    </div>
                                    <Badge className="bg-slate-200 text-slate-500 border-0 text-xs shrink-0 ml-2">
                                      Claimed
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {searchLower &&
                            locations.length === 0 &&
                            claimed.length === 0 &&
                            confirmed.length === 0 && (
                              <p className="text-center text-slate-500">
                                No territories matching "{territorySearch}"
                              </p>
                            )}
                        </div>
                      )}
                    </>
                  );
                })()
              )}
              <DueDiligenceDisclaimer variant="inline" />
            </section>

            {/* Brand story (only when content exists) + single CTA row into the Profile tab */}
            <Reveal as="section" className="py-16 border-b border-slate-100">
              <div className={`${hasPhotos && photoUrls![0] ? "grid md:grid-cols-2 gap-12 items-center" : "max-w-3xl"}`}>
                <div>
                  {profile?.brandStory && (
                    <p className="text-slate-600 leading-relaxed mb-6">{profile.brandStory}</p>
                  )}
                  {profile?.positioning && (
                    <p className="text-slate-500 text-sm mb-6">{profile.positioning}</p>
                  )}
                  {!profile?.brandStory && !profile?.positioning && (
                    <div className="mb-6">
                      <SectionPlaceholder icon={BookOpen} label="Brand story" />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="font-semibold"
                      style={{ backgroundColor: accent, color: contrastTextColor(accent) }}
                      onClick={() => setTab("profile")}
                    >
                      View Full Profile &amp; Investment Breakdown <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                      onClick={openInterest}
                    >
                      I'm Interested
                    </Button>
                  </div>
                </div>
                {hasPhotos && photoUrls![0] && (
                  <div className="flex justify-center">
                    <img src={photoUrls![0]} alt={brand.name} className="rounded-2xl max-h-[400px] object-cover shadow-2xl" />
                  </div>
                )}
              </div>
            </Reveal>

            {/* Next Steps — Process Flow */}
            <section className="py-16 border-b border-slate-100">
              <Reveal className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-extrabold">Next Steps</h2>
              </Reveal>
              <div className="max-w-5xl mx-auto">
                <Reveal stagger className="grid md:grid-cols-3 gap-6 mb-6">
                  <StepCard step={1} icon={PhoneCall} title="Intro Call" desc="Background + Goals" accent={accent} />
                  <StepCard step={2} icon={MapPin} title="Territory + FDD" desc="Review Demographic Report, Address All FDD Questions" accent={accent} />
                  <StepCard step={3} icon={CheckCircle} title="Funding & Validation" desc="Corporate Team Joins To Verify Funding & Verify Operations" accent={accent} />
                </Reveal>
                <Reveal stagger className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <StepCard step={4} icon={ClipboardCheck} title="Franchise Application" desc="Collect Full Franchise Application And Intent To Join Franchise" accent={accent} />
                  <StepCard step={5} icon={UserCheck} title="CEO Approval" desc="CEO Joins For Pre-Approval And Final Steps" accent={accent} />
                </Reveal>
              </div>
              <div className="text-center mt-10">
                <Button
                  size="lg"
                  className="font-semibold px-10"
                  style={{ backgroundColor: accent, color: contrastTextColor(accent) }}
                  onClick={openInterest}
                >
                  Start Your Qualification Call
                </Button>
              </div>
            </section>

            {/* Bottom CTA */}
            <Reveal as="section" className="py-20">
              <div
                className="rounded-3xl p-12 text-center relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}05)`, border: `1px solid ${accentBorder}` }}
              >
                <h3 className="text-3xl md:text-4xl font-extrabold mb-3">
                  Interested in {brand.name}?
                </h3>
                <p className="text-slate-500 mb-8 max-w-lg mx-auto">
                  Take the first step toward owning a {brand.name} franchise. Connect with our team to explore available territories and learn more.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button
                    size="lg"
                    className="font-semibold px-10"
                    style={{ backgroundColor: accent, color: contrastTextColor(accent) }}
                    onClick={openInterest}
                  >
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Link to="/explore">
                    <Button size="lg" variant="outline" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 px-8">
                      Explore Other Brands
                    </Button>
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Profile-incomplete block */}
            {overviewTabIncomplete && <IncompleteProfileBlock isClaimed={brand.isClaimed} />}
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: PROFILE
            ════════════════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <>
            {/* Brand story / model / positioning — only when the brand actually has this content */}
            {(profile?.model || profile?.positioning || profile?.brandStory) && (
              <section className="py-16 border-b border-slate-100">
                <div className={`${hasPhotos && photoUrls![0] ? "grid md:grid-cols-2 gap-12 items-center" : "max-w-3xl"}`}>
                  <div>
                    {profile?.model && (
                      <div className="mb-4">
                        <span className="text-slate-500 text-sm">Model: </span>
                        <span className="text-slate-900 font-medium">{profile.model}</span>
                      </div>
                    )}
                    {profile?.positioning && (
                      <div className="mb-6">
                        <span className="text-slate-500 text-sm">Positioning: </span>
                        <span className="text-slate-900 font-medium">{profile.positioning}</span>
                      </div>
                    )}
                    {profile?.brandStory && (
                      <p className="text-slate-600 leading-relaxed">{profile.brandStory}</p>
                    )}
                  </div>

                  {hasPhotos && photoUrls![0] && (
                    <div className="flex justify-center">
                      <img src={photoUrls![0]} alt={brand.name} className="rounded-2xl max-h-[400px] object-cover shadow-2xl" />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Financial Performance — FDD Item 19 (with avgUnitRevenue fallback) */}
            {(() => {
              const auv = profile?.item19Revenue?.average ?? profile?.avgUnitRevenue;
              const auvField = profile?.item19Revenue?.average ? "item19Revenue" : "avgUnitRevenue";
              const hasProfitData = !!(profile?.item19Profit?.estimatedAverage || profile?.item19Profit?.estimatedMargin);
              const hasRevenueData = !!(
                auv ||
                profile?.item19Revenue?.median ||
                profile?.item19Revenue?.high ||
                profile?.item19Revenue?.low ||
                profile?.avgRevenueMin
              );

              // Signed-out gate: keep the header public, blur placeholder rows.
              // Real values are NOT rendered into the DOM for visitors.
              const financialGated = !unlocked && (hasRevenueData || hasProfitData);

              return (
                <Reveal as="section" className="py-16 border-b border-slate-100">
                  <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Financial Performance</h2>
                  {financialGated ? (
                    <>
                      <p className="text-slate-500 text-sm mb-8">
                        Revenue and profitability data from the {profile?.fddYear || "most recent"} FDD (Item 19)
                      </p>
                      <GatedSection className="max-w-4xl" verifyMode={isAuthenticated}>
                        <div className="grid md:grid-cols-2 gap-8">
                          {hasRevenueData && (
                            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" style={{ color: accent }} /> Average Unit Revenue (AUV)
                              </h3>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center gap-3">
                                  <span className="text-sm text-slate-500">Average</span>
                                  <span className="text-lg font-bold" style={{ color: accent }}>$—</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Median</span>
                                  <span className="text-sm font-semibold">$—</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Highest</span>
                                  <span className="text-sm font-semibold text-emerald-600">$—</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Lowest</span>
                                  <span className="text-sm font-semibold text-slate-400">$—</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {hasProfitData && (
                            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" style={{ color: accent }} /> Estimated Owner Economics
                              </h3>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Est. Operating Income</span>
                                  <span className="text-lg font-bold" style={{ color: accent }}>$—</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Operating Margin</span>
                                  <span className="text-sm font-semibold">—%</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </GatedSection>
                    </>
                  ) : (hasRevenueData || hasProfitData) ? (
                    <>
                      <p className="text-slate-500 text-sm mb-8">
                        Revenue and profitability data from the {profile?.fddYear || "most recent"} FDD (Item 19)
                      </p>
                      <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
                        {/* Revenue Card */}
                        {hasRevenueData && (
                          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <TrendingUp className="w-5 h-5" style={{ color: accent }} /> Average Unit Revenue (AUV)
                            </h3>
                            <div className="space-y-3">
                              {auv && (
                                <div className="flex justify-between items-center gap-3">
                                  <span className="text-sm text-slate-500">Average</span>
                                  <span className="text-right">
                                    <span className="text-lg font-bold block" style={{ color: accent }}>{fmtCurrency(auv, false)}</span>
                                    <SourceTag field={auvField} sources={profile?.fieldSources} />
                                  </span>
                                </div>
                              )}
                              {profile?.item19Revenue?.median && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Median</span>
                                  <span className="text-sm font-semibold">{fmtCurrency(profile.item19Revenue.median, false)}</span>
                                </div>
                              )}
                              {profile?.item19Revenue?.high && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Highest</span>
                                  <span className="text-sm font-semibold text-emerald-600">{fmtCurrency(profile.item19Revenue.high, false)}</span>
                                </div>
                              )}
                              {profile?.item19Revenue?.low && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Lowest</span>
                                  <span className="text-sm font-semibold text-slate-400">{fmtCurrency(profile.item19Revenue.low, false)}</span>
                                </div>
                              )}
                              {!auv && profile?.avgRevenueMin && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Reported Range</span>
                                  <span className="text-sm font-semibold">
                                    {profile.avgRevenueMax
                                      ? `${fmtCurrency(profile.avgRevenueMin)} – ${fmtCurrency(profile.avgRevenueMax)}`
                                      : fmtCurrency(profile.avgRevenueMin)}
                                  </span>
                                </div>
                              )}
                              {profile?.investmentReturnRatio && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Revenue-to-Investment Ratio</span>
                                  <span className="text-sm font-semibold">{profile.investmentReturnRatio}x</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Profit Card */}
                        {hasProfitData && (
                          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <DollarSign className="w-5 h-5" style={{ color: accent }} /> Estimated Owner Economics
                            </h3>
                            <div className="space-y-3">
                              {profile?.item19Profit?.estimatedAverage && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Est. Operating Income</span>
                                  <span className="text-lg font-bold" style={{ color: accent }}>{fmtCurrency(profile.item19Profit.estimatedAverage, false)}</span>
                                </div>
                              )}
                              {profile?.item19Profit?.estimatedMargin && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Operating Margin</span>
                                  <span className="text-sm font-semibold">{profile.item19Profit.estimatedMargin}%</span>
                                </div>
                              )}
                              {profile?.item19Profit?.notes && (
                                <p className="text-xs text-slate-400 mt-2 italic">{profile.item19Profit.notes}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : profile?.item19Available === false ? (
                    <p className="text-slate-500 text-sm max-w-2xl mt-4">
                      This brand does not publish financial performance representations (FDD Item 19).
                    </p>
                  ) : profile?.item19Available === true ? (
                    <p className="text-slate-500 text-sm max-w-2xl mt-4">
                      This brand publishes an FDD Item 19 — detailed figures are being verified.
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm max-w-2xl mt-4">
                      Financial performance not yet verified.
                    </p>
                  )}
                </Reveal>
              );
            })()}

            {/* Investment Breakdown */}
            {hasInvestment && (
              <Reveal as="section" className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Investment Breakdown</h2>
                <div className="max-w-2xl bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {(profile?.totalInvestmentMin || brand.investmentMin) && (
                    <InvestmentRow accent={accent} label="Total Investment" value={`${fmtCurrency(profile?.totalInvestmentMin || brand.investmentMin)} – ${fmtCurrency(profile?.totalInvestmentMax || brand.investmentMax)}`} tag={<SourceTag field="totalInvestmentMin" sources={profile?.fieldSources} />} />
                  )}
                  {(profile?.franchiseFee || brand.franchiseFee) && (
                    <InvestmentRow accent={accent} label="Franchise Fee" value={fmtCurrency(profile?.franchiseFee || brand.franchiseFee)} tag={<SourceTag field="franchiseFee" sources={profile?.fieldSources} />} />
                  )}
                  {(profile?.royaltyPercent || brand.royaltyPercent) && (
                    <InvestmentRow accent={accent} label="Royalty" value={`${profile?.royaltyPercent || brand.royaltyPercent}%`} tag={<SourceTag field="royaltyPercent" sources={profile?.fieldSources} />} />
                  )}
                  {profile?.brandFundPercent && (
                    <InvestmentRow accent={accent} label="Brand Fund / Ad Fund" value={`${profile.brandFundPercent}%`} tag={<SourceTag field="brandFundPercent" sources={profile?.fieldSources} />} />
                  )}
                  {profile?.marketingFees && (
                    <InvestmentRow accent={accent} label="Marketing Fees" value={profile.marketingFees} />
                  )}
                  {profile?.liquidCapitalMin && (
                    <InvestmentRow accent={accent} label="Min. Liquid Capital" value={`${fmtCurrency(profile.liquidCapitalMin)}+`} tag={<SourceTag field="liquidCapitalMin" sources={profile?.fieldSources} />} />
                  )}
                  {profile?.minFootprint && (
                    <InvestmentRow accent={accent} label="Min Footprint" value={profile.minFootprint} />
                  )}
                  {profile?.termOfAgreement && (
                    <InvestmentRow accent={accent} label="Agreement Term" value={`${profile.termOfAgreement}${profile.termRenewable ? " (renewable)" : ""}`} />
                  )}
                  {profile?.royaltyNotes && (
                    <InvestmentRow accent={accent} label="Royalty Details" value={profile.royaltyNotes} />
                  )}
                  {profile?.techFeeAnnual && (
                    <InvestmentRow accent={accent} label="Annual Tech Fees" value={fmtCurrency(profile.techFeeAnnual, false)} />
                  )}
                  {profile?.techFeeDetails && (
                    <div className="px-5 py-3 flex flex-col gap-1">
                      <span className="text-xs text-slate-500">Tech Fee Breakdown</span>
                      <span className="text-sm text-slate-700 leading-relaxed">{profile.techFeeDetails}</span>
                    </div>
                  )}
                  {profile?.otherRecurringFees && (
                    <InvestmentRow accent={accent} label="Other Recurring Fees" value={profile.otherRecurringFees} />
                  )}
                </div>
              </Reveal>
            )}
            {!hasInvestment && (
              <section className="py-10 border-b border-slate-100">
                <SectionPlaceholder icon={DollarSign} label="Investment breakdown" />
              </section>
            )}

            {/* Item 7 — Startup Cost Breakdown */}
            {hasItem7 && (
              <section className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Startup Cost Breakdown</h2>
                <p className="text-slate-500 text-sm mb-8">
                  Estimated initial investment from the {profile?.fddYear || "most recent"} Franchise Disclosure Document (Item 7)
                  {profile?.item7Average ? ` — Average: ${fmtCurrency(profile.item7Average, false)}` : ""}
                </p>
                <div className="max-w-2xl bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-3 px-5 py-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Item</span>
                    <span className="text-right">Low</span>
                    <span className="text-right">High</span>
                  </div>
                  {profile!.item7Breakdown!.map((item: { name: string; low: number; high: number }, i: number) => (
                    <div key={i} className="grid grid-cols-3 px-5 py-3 border-b border-slate-50 text-sm hover:bg-slate-50 transition-colors">
                      <span className="text-slate-700 font-medium">{item.name}</span>
                      <span className="text-right text-slate-600">{fmtCurrency(item.low, false)}</span>
                      <span className="text-right font-semibold" style={{ color: accent }}>{fmtCurrency(item.high, false)}</span>
                    </div>
                  ))}
                  {(profile?.totalInvestmentMin || profile?.totalInvestmentMax) && (
                    <div className="grid grid-cols-3 px-5 py-3 bg-slate-50 text-sm font-bold">
                      <span className="text-slate-900">Total</span>
                      <span className="text-right text-slate-700">{fmtCurrency(profile?.totalInvestmentMin, false)}</span>
                      <span className="text-right" style={{ color: accent }}>{fmtCurrency(profile?.totalInvestmentMax, false)}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Units & Growth */}
            {hasUnitsGrowth && !unlocked && (
              /* Signed-out gate — header public, placeholder rows blurred (no real values in DOM) */
              <Reveal as="section" className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Units & Growth</h2>
                <GatedSection className="max-w-3xl" verifyMode={isAuthenticated}>
                  <div className="space-y-4">
                    <StatRow accent={accent} label="Total Locations" value="—" />
                    <StatRow accent={accent} label="Founded" value="—" />
                    <StatRow accent={accent} label="Franchising Since" value="—" />
                    <StatRow accent={accent} label="Closures (most recent FDD year)" value="—" />
                    <StatRow accent={accent} label="Growth Status" value="—" />
                    <StatRow accent={accent} label="Retention Rate" value="—" />
                  </div>
                </GatedSection>
              </Reveal>
            )}
            {hasUnitsGrowth && unlocked && (
              <Reveal as="section" className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Units & Growth</h2>
                <div className="max-w-3xl space-y-4">
                  {profile?.totalUnits && (
                    <StatRow
                      accent={accent}
                      label="Total Locations"
                      value={profile.totalUnits.toLocaleString()}
                      tag={<SourceTag field="totalUnits" sources={profile?.fieldSources} />}
                    />
                  )}
                  {profile?.yearFounded && (
                    <StatRow
                      accent={accent}
                      label="Founded"
                      value={`${profile.yearFounded}${yearsOperating ? ` · ${yearsOperating} years operating` : ""}`}
                      tag={<SourceTag field="yearFounded" sources={profile?.fieldSources} />}
                    />
                  )}
                  {profile?.yearFranchising && (
                    <StatRow
                      accent={accent}
                      label="Franchising Since"
                      value={`${profile.yearFranchising}${yearsFranchising ? ` · ${yearsFranchising} years franchising` : ""}`}
                      tag={<SourceTag field="yearFranchising" sources={profile?.fieldSources} />}
                    />
                  )}
                  {profile?.closureCount !== undefined && profile.closureCount !== null && (
                    <StatRow
                      accent={accent}
                      label="Closures (most recent FDD year)"
                      value={`${profile.closureCount}`}
                      tag={<SourceTag field="closureCount" sources={profile?.fieldSources} />}
                    />
                  )}
                  {/* Growth status — honest tri-state */}
                  <div className="flex items-start gap-3">
                    <div className="mt-2 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 text-sm">Growth Status: </span>
                      {profile?.isGrowing === true ? (
                        <>
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" /> Growing
                          </Badge>
                          <SourceTag field="isGrowing" sources={profile?.fieldSources} />
                        </>
                      ) : profile?.isGrowing === false && profile?.fieldSources?.isGrowing ? (
                        <>
                          <span className="text-slate-700 font-medium text-sm">Flat / mature system</span>
                          <SourceTag field="isGrowing" sources={profile?.fieldSources} />
                        </>
                      ) : (
                        <span className="text-slate-400 text-sm">Not yet verified</span>
                      )}
                    </div>
                  </div>
                  {profile?.retentionRate && (
                    <StatRow accent={accent} label="Retention Rate" value={profile.retentionRate} tag={<SourceTag field="retentionRate" sources={profile?.fieldSources} />} />
                  )}
                  {profile?.guestRating && (
                    <StatRow accent={accent} label="Guest / Customer Rating" value={profile.guestRating} tag={<SourceTag field="guestRating" sources={profile?.fieldSources} />} />
                  )}
                </div>
              </Reveal>
            )}
            {!hasUnitsGrowth && (
              <section className="py-10 border-b border-slate-100">
                <SectionPlaceholder icon={TrendingUp} label="Units & growth data" />
              </section>
            )}

            {/* Item 20 — Unit Growth Data */}
            {hasItem20 && !unlocked && (
              /* Signed-out gate — Item 20 closures/terminations are part of the gated growth data */
              <section className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Unit Growth Data</h2>
                <p className="text-slate-500 text-sm mb-8">
                  Franchise system outlet data from the {profile?.item20?.reportingYear || profile?.fddYear || "most recent"} FDD (Item 20)
                </p>
                <GatedSection className="max-w-4xl" verifyMode={isAuthenticated}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {["Franchised Units", "New Openings", "Closures", "YoY Growth"].map((label) => (
                      <div key={label} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-slate-400">—</div>
                        <div className="text-xs text-slate-500 mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                </GatedSection>
              </section>
            )}
            {hasItem20 && unlocked && (
              <section className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Unit Growth Data</h2>
                <p className="text-slate-500 text-sm mb-8">
                  Franchise system outlet data from the {profile?.item20?.reportingYear || profile?.fddYear || "most recent"} FDD (Item 20)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
                  {profile!.item20!.franchisedUnitsEnd && (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold" style={{ color: accent }}>{profile!.item20!.franchisedUnitsEnd.toLocaleString()}</div>
                      <div className="text-xs text-slate-500 mt-1">Franchised Units</div>
                    </div>
                  )}
                  {profile!.item20!.companyUnitsEnd !== undefined && (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold" style={{ color: accent }}>{profile!.item20!.companyUnitsEnd.toLocaleString()}</div>
                      <div className="text-xs text-slate-500 mt-1">Company Units</div>
                    </div>
                  )}
                  {profile!.item20!.newOpenings !== undefined && (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-600">+{profile!.item20!.newOpenings}</div>
                      <div className="text-xs text-slate-500 mt-1">New Openings</div>
                    </div>
                  )}
                  {profile!.item20!.closures !== undefined && (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                      <div className={`text-2xl font-bold ${profile!.item20!.closures === 0 ? "text-emerald-600" : "text-amber-600"}`}>{profile!.item20!.closures}</div>
                      <div className="text-xs text-slate-500 mt-1">Closures</div>
                    </div>
                  )}
                  {profile!.item20!.transfers !== undefined && (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-slate-600">{profile!.item20!.transfers}</div>
                      <div className="text-xs text-slate-500 mt-1">Transfers</div>
                    </div>
                  )}
                  {profile!.item20!.terminations !== undefined && (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                      <div className={`text-2xl font-bold ${profile!.item20!.terminations === 0 ? "text-emerald-600" : "text-red-500"}`}>{profile!.item20!.terminations}</div>
                      <div className="text-xs text-slate-500 mt-1">Terminations</div>
                    </div>
                  )}
                  {profile!.item20!.growthRate !== undefined && (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                      <div className={`text-2xl font-bold ${profile!.item20!.growthRate >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {profile!.item20!.growthRate >= 0 ? "+" : ""}{profile!.item20!.growthRate}%
                      </div>
                      <div className="text-xs text-slate-500 mt-1">YoY Growth</div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Operations & Ownership — tri-state verified booleans */}
            {hasProfile && (
              <section className="py-16 border-b border-slate-100">
                <Reveal as="h2" className="text-3xl md:text-4xl font-extrabold mb-8">Operations & Ownership</Reveal>
                <Reveal stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
                  <TriStateCard label="Absentee Ownership" value={profile?.absenteeOwnership} verified={!!profile?.fieldSources?.absenteeOwnership} tag={<SourceTag field="absenteeOwnership" sources={profile?.fieldSources} hideUnverified />} />
                  <TriStateCard label="Run From Home" value={profile?.canRunFromHome} verified={!!profile?.fieldSources?.canRunFromHome} tag={<SourceTag field="canRunFromHome" sources={profile?.fieldSources} hideUnverified />} />
                  <TriStateCard label="Part-Time Eligible" value={profile?.canRunPartTime} verified={!!profile?.fieldSources?.canRunPartTime} tag={<SourceTag field="canRunPartTime" sources={profile?.fieldSources} hideUnverified />} />
                  <TriStateCard label="Exclusive Territories" value={profile?.exclusiveTerritories} verified={!!profile?.fieldSources?.exclusiveTerritories} tag={<SourceTag field="exclusiveTerritories" sources={profile?.fieldSources} hideUnverified />} />
                  <TriStateCard label="Multi-Unit Available" value={profile?.multiUnitAvailable} verified={!!profile?.fieldSources?.multiUnitAvailable} tag={<SourceTag field="multiUnitAvailable" sources={profile?.fieldSources} hideUnverified />} />
                  <TriStateCard label="Veteran Discount" value={profile?.veteranDiscount} verified={!!profile?.fieldSources?.veteranDiscount} tag={<SourceTag field="veteranDiscount" sources={profile?.fieldSources} hideUnverified />} />
                  <TriStateCard label="SBA Approved" value={profile?.sbaApproved} verified={!!profile?.fieldSources?.sbaApproved} tag={<SourceTag field="sbaApproved" sources={profile?.fieldSources} hideUnverified />} />
                  <TriStateCard label="FDD Available" value={profile?.fddAvailable} verified={!!profile?.fieldSources?.fddAvailable} tag={<SourceTag field="fddAvailable" sources={profile?.fieldSources} hideUnverified />} />
                  {profile?.employeesRequired && (
                    <div className="card-lift card-lift-light bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-3">
                      <Users className="w-5 h-5" style={{ color: accent }} />
                      <div>
                        <div className="text-xs text-slate-500">Employees Needed</div>
                        <div className="font-semibold text-sm">{profile.employeesRequired}</div>
                      </div>
                    </div>
                  )}
                  {profile?.termOfAgreement && (
                    <div className="card-lift card-lift-light bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-3">
                      <FileText className="w-5 h-5" style={{ color: accent }} />
                      <div>
                        <div className="text-xs text-slate-500">Agreement Term</div>
                        <div className="font-semibold text-sm">{profile.termOfAgreement}{profile.termRenewable ? " (renewable)" : ""}</div>
                      </div>
                    </div>
                  )}
                  {profile?.veteranIncentiveDetails && (
                    <div className="card-lift card-lift-light bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-3 md:col-span-2 lg:col-span-3">
                      <Award className="w-5 h-5" style={{ color: accent }} />
                      <div>
                        <div className="text-xs text-slate-500">Veteran Incentive</div>
                        <div className="font-semibold text-sm">{profile.veteranIncentiveDetails}</div>
                      </div>
                    </div>
                  )}
                  {profile?.territorySize && (
                    <div className="card-lift card-lift-light bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-3">
                      <Target className="w-5 h-5" style={{ color: accent }} />
                      <div>
                        <div className="text-xs text-slate-500">Territory Size</div>
                        <div className="font-semibold text-sm">{profile.territorySize}</div>
                      </div>
                    </div>
                  )}
                  {profile?.territoryPopulation && (
                    <div className="card-lift card-lift-light bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-3">
                      <Users className="w-5 h-5" style={{ color: accent }} />
                      <div>
                        <div className="text-xs text-slate-500">Min Territory Population</div>
                        <div className="font-semibold text-sm">{profile.territoryPopulation.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </Reveal>
                {profile?.ownerTypes && profile.ownerTypes.length > 0 && (
                  <div className="mt-6 max-w-4xl">
                    <span className="text-slate-500 text-sm">Ownership Models: </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.ownerTypes.map((t: string) => (
                        <Badge key={t} className="bg-slate-100 text-slate-600 border-0 text-xs">
                          {OWNER_TYPE_LABELS[t] || t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Legal & Compliance (Lawsuits) */}
            {hasLawsuits && profile?.activeLawsuits !== undefined && (
              <section className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Legal & Compliance</h2>
                <div className="max-w-3xl bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-3 h-3 rounded-full ${profile.activeLawsuits ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <span className="font-semibold text-sm">
                      {profile.activeLawsuits
                        ? `${profile.activeLawsuitCount || "Active"} Lawsuit${(profile.activeLawsuitCount || 0) !== 1 ? "s" : ""} Disclosed`
                        : "No Active Lawsuits Disclosed"}
                    </span>
                  </div>
                  {profile.activeLawsuitNotes && (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.activeLawsuitNotes}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-4">Source: {profile.fddYear || "Most recent"} Franchise Disclosure Document (Item 3)</p>
                </div>
              </section>
            )}

            {/* Ideal Franchise Partner */}
            {hasIdealPartner && (
              <section className="py-16 border-b border-slate-100">
                <div className={`${(sectionImageUrls as any)?.idealPartner ? "grid md:grid-cols-2 gap-12 items-center" : "max-w-3xl mx-auto"}`}>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Ideal Franchise Partner</h2>
                    <div className="space-y-3">
                      {profile!.idealPartner!.map((trait: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <CheckSquare className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: accent }} />
                          <span className="text-slate-700 text-sm leading-relaxed">{trait}</span>
                        </div>
                      ))}
                    </div>
                    {profile?.ownerTypes && profile.ownerTypes.length > 0 && (
                      <div className="mt-6">
                        <span className="text-slate-500 text-sm">Ownership Models: </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profile.ownerTypes.map((t: string) => (
                            <Badge key={t} className="bg-slate-100 text-slate-600 border-0 text-xs capitalize">
                              {t.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {(sectionImageUrls as any)?.idealPartner && (
                    <div className="flex justify-center">
                      <img src={(sectionImageUrls as any).idealPartner} alt="Ideal Partner" className="rounded-2xl max-h-[400px] object-cover shadow-2xl" />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Why Franchisees Choose [Brand] */}
            {profile?.sellingPoints && profile.sellingPoints.length > 0 && (
              <section className="py-16 border-b border-slate-100">
                <div className={`${(sectionImageUrls as any)?.whyChoose ? "grid md:grid-cols-2 gap-12 items-center" : "max-w-3xl mx-auto"}`}>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-8">
                      Why Franchisees Choose {brand.name}
                    </h2>
                    <div className="space-y-4">
                      {profile.sellingPoints.map((point: string, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: accent, color: contrastTextColor(accent) }}>
                            {i + 1}
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed pt-1.5">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {(sectionImageUrls as any)?.whyChoose && (
                    <div className="flex justify-center">
                      <img src={(sectionImageUrls as any).whyChoose} alt="Why Choose" className="rounded-2xl max-h-[400px] object-cover shadow-2xl" />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* FAQs */}
            {hasFaqs && (
              <section className="py-16 border-b border-slate-100">
                <div className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Got Questions?</h2>
                  <p className="text-slate-500">Everything you need to know about {brand.name}</p>
                </div>
                <div className="max-w-3xl mx-auto">
                  <Accordion type="single" collapsible className="space-y-2">
                    {profile!.faqs!.map((faq: { question: string; answer: string }, i: number) => (
                      <AccordionItem
                        key={i}
                        value={`faq-${i}`}
                        className="border border-slate-200 rounded-xl px-5 overflow-hidden"
                        style={{ backgroundColor: accentBg }}
                      >
                        <AccordionTrigger className="text-left font-semibold text-sm py-4 hover:no-underline" style={{ color: accent }}>
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-500 text-sm pb-4 leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </section>
            )}

            {/* Photo Gallery / Carousel */}
            {hasPhotos && photoUrls!.length > 0 && (
              <section className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Gallery</h2>
                {photoUrls!.length <= 3 ? (
                  <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
                    {photoUrls!.map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url}
                        alt={`${brand.name} photo ${i + 1}`}
                        className="rounded-xl aspect-[4/3] object-cover w-full max-w-md flex-shrink-0 snap-center hover:scale-[1.01] transition-transform"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photoUrls!.map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url}
                        alt={`${brand.name} photo ${i + 1}`}
                        className="rounded-xl aspect-[4/3] object-cover w-full hover:scale-[1.02] transition-transform"
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Profile CTA */}
            <section className="py-16">
              <div className="text-center">
                <Button
                  size="lg"
                  className="font-semibold px-10"
                  style={{ backgroundColor: accent, color: contrastTextColor(accent) }}
                  onClick={openInterest}
                >
                  I'm Interested in {brand.name} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </section>

            {/* Profile-incomplete block */}
            {profileTabIncomplete && <IncompleteProfileBlock isClaimed={brand.isClaimed} />}
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: SWOT ANALYSIS
            ════════════════════════════════════════════════════════ */}
        {activeTab === "swot" && (
          <BrandSwotSection
            brand={brand}
            profile={profile}
            territories={territories}
            accent={accent}
          />
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: LEARN MORE
            ════════════════════════════════════════════════════════ */}
        {activeTab === "learn-more" && (
          <>
            {/* Overview Video */}
            {hasVideo && (
              <section className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8">
                  {overviewEmbedUrl && testimonialEmbedUrl ? "Videos" : "Brand Video"}
                </h2>
                <div className={`grid ${overviewEmbedUrl && testimonialEmbedUrl ? "md:grid-cols-2" : ""} gap-8`}>
                  {overviewEmbedUrl && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Play className="w-5 h-5" style={{ color: accent }} /> Overview
                      </h3>
                      <div className="aspect-video rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                        <iframe
                          src={overviewEmbedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                  {testimonialEmbedUrl && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5" style={{ color: accent }} /> Franchisee Testimonial
                      </h3>
                      <div className="aspect-video rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                        <iframe
                          src={testimonialEmbedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
            {!hasVideo && (
              <section className="py-10 border-b border-slate-100">
                <SectionPlaceholder icon={Play} label="Brand story & videos" />
              </section>
            )}

            {/* Company Details */}
            {hasCompanyDetails && (
              <Reveal as="section" className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Company Details</h2>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
                  {profile?.parentCompany && (
                    <DetailRow icon={Building2} label="Parent Company" value={profile.parentCompany} accent={accent} />
                  )}
                  {profile?.leadershipName && (
                    <DetailRow icon={User} label="Leadership" value={`${profile.leadershipName}${profile.leadershipTitle ? `, ${profile.leadershipTitle}` : ""}`} accent={accent} />
                  )}
                  {profile?.corporateCity && (
                    <DetailRow icon={MapPin} label="Headquarters" value={`${profile.corporateCity}${profile.corporateState ? `, ${profile.corporateState}` : ""}${profile.corporateZip ? ` ${profile.corporateZip}` : ""}`} accent={accent} />
                  )}
                  {profile?.corporateAddress && (
                    <DetailRow icon={Home} label="Address" value={profile.corporateAddress} accent={accent} />
                  )}
                  {profile?.employeesAtHQ && (
                    <DetailRow icon={Users} label="Employees at HQ" value={`${profile.employeesAtHQ}`} accent={accent} />
                  )}
                  {profile?.geographicFocus && (
                    <DetailRow icon={Globe} label="Geographic Focus" value={profile.geographicFocus} accent={accent} />
                  )}
                </div>
              </Reveal>
            )}
            {!hasCompanyDetails && (
              <section className="py-10 border-b border-slate-100">
                <SectionPlaceholder icon={Building2} label="Company details" />
              </section>
            )}

            {/* Training & Support */}
            {hasTraining && (
              <Reveal as="section" className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Training & Support</h2>
                <div className="max-w-4xl space-y-8">
                  {/* Training Hours */}
                  {(profile?.classroomTrainingHours || profile?.onTheJobTrainingHours || profile?.trainingWeeks) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5" style={{ color: accent }} /> Training Program
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {profile?.classroomTrainingHours && (
                          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold" style={{ color: accent }}>{profile.classroomTrainingHours}</div>
                            <div className="text-xs text-slate-500 mt-1">Classroom Hours</div>
                          </div>
                        )}
                        {profile?.onTheJobTrainingHours && (
                          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold" style={{ color: accent }}>{profile.onTheJobTrainingHours}</div>
                            <div className="text-xs text-slate-500 mt-1">On-the-Job Hours</div>
                          </div>
                        )}
                        {profile?.trainingWeeks && (
                          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold" style={{ color: accent }}>{profile.trainingWeeks}</div>
                            <div className="text-xs text-slate-500 mt-1">Weeks Total</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ongoing Support */}
                  {profile?.ongoingSupport && profile.ongoingSupport.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Handshake className="w-5 h-5" style={{ color: accent }} /> Ongoing Support
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.ongoingSupport.map((item: string, i: number) => (
                          <Badge key={i} className="text-xs py-1.5 px-3" style={{ backgroundColor: accentBg, color: accent, border: `1px solid ${accentBorder}` }}>
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marketing Support */}
                  {profile?.marketingSupport && profile.marketingSupport.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Megaphone className="w-5 h-5" style={{ color: accent }} /> Marketing Support
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.marketingSupport.map((item: string, i: number) => (
                          <Badge key={i} className="text-xs py-1.5 px-3" style={{ backgroundColor: accentBg, color: accent, border: `1px solid ${accentBorder}` }}>
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            )}
            {!hasTraining && (
              <section className="py-10 border-b border-slate-100">
                <SectionPlaceholder icon={GraduationCap} label="Training & support details" />
              </section>
            )}

            {/* Social Links */}
            {hasSocials && (
              <section className="py-16 border-b border-slate-100">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Connect</h2>
                <div className="flex flex-wrap gap-3">
                  {profile?.socialLinks?.facebook && (
                    <SocialLink url={profile.socialLinks.facebook} icon={Facebook} label="Facebook" accent={accent} />
                  )}
                  {profile?.socialLinks?.instagram && (
                    <SocialLink url={profile.socialLinks.instagram} icon={Instagram} label="Instagram" accent={accent} />
                  )}
                  {profile?.socialLinks?.linkedin && (
                    <SocialLink url={profile.socialLinks.linkedin} icon={Linkedin} label="LinkedIn" accent={accent} />
                  )}
                  {profile?.socialLinks?.twitter && (
                    <SocialLink url={profile.socialLinks.twitter} icon={Twitter} label="Twitter / X" accent={accent} />
                  )}
                  {profile?.socialLinks?.youtube && (
                    <SocialLink url={profile.socialLinks.youtube} icon={Youtube} label="YouTube" accent={accent} />
                  )}
                  {profile?.socialLinks?.tiktok && (
                    <SocialLink url={profile.socialLinks.tiktok} icon={Zap} label="TikTok" accent={accent} />
                  )}
                  {brand.websiteUrl && (
                    <SocialLink url={brand.websiteUrl.startsWith("http") ? brand.websiteUrl : `https://${brand.websiteUrl}`} icon={Globe} label="Website" accent={accent} />
                  )}
                </div>
              </section>
            )}

            {/* Profile-incomplete block (supersedes the old all-empty state) */}
            {learnMoreTabIncomplete && <IncompleteProfileBlock isClaimed={brand.isClaimed} />}

            {/* Learn More CTA */}
            {(hasVideo || hasCompanyDetails || hasTraining) && (
              <section className="py-16">
                <div className="text-center">
                  <Button
                    size="lg"
                    className="font-semibold px-10"
                    style={{ backgroundColor: accent, color: contrastTextColor(accent) }}
                    onClick={openInterest}
                  >
                    Ready to Learn More? <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Membership upsell strip — signed-out visitors, all tabs */}
      {!isAuthenticated && <MembershipUpsellStrip />}

      <PublicFooter />

      {/* ── Dialogs ── */}
      <InterestFormDialog
        open={showInterestForm}
        onClose={() => setShowInterestForm(false)}
        brandId={brand._id}
        brandName={brand.name}
        submitted={submitted}
        onSubmitted={() => setSubmitted(true)}
      />

      {isProspect && (
        <ProspectInquiryDialog
          open={showProspectInquiry}
          onClose={() => setShowProspectInquiry(false)}
          brandId={brand._id}
          brandName={brand.name}
          brandSlug={brand.slug}
        />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

// ── VerificationSeal — trust moment: one-time fade-in + slight scale on view ──
function VerificationSeal({ children }: { children: ReactNode }) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.3);
  return (
    <div
      ref={ref}
      className={`seal-reveal${visible ? " reveal-visible" : ""} mt-3 -mx-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2`}
    >
      {children}
    </div>
  );
}

// ── SectionPlaceholder — quiet empty-state for a major section ──
function SectionPlaceholder({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-4 max-w-2xl">
      <Icon className="w-4 h-4 text-slate-300 shrink-0" />
      <span className="text-sm text-slate-400">{label} not yet listed</span>
    </div>
  );
}

// ── IncompleteProfileBlock — shown at the bottom of a mostly-empty tab ──
function IncompleteProfileBlock({ isClaimed }: { isClaimed?: boolean }) {
  return (
    <section className="py-16">
      <div className="max-w-xl mx-auto text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-8 py-10">
        <h3 className="text-xl font-semibold text-slate-700 mb-2">This profile isn't complete yet</h3>
        <p className="text-sm text-slate-500">
          Our team is verifying this brand's details — check back soon.
        </p>
        {isClaimed !== true && (
          <>
            <div className="border-t border-slate-200 my-6 max-w-xs mx-auto" />
            <p className="text-sm font-medium text-slate-600 mb-3">Is this your franchise?</p>
            <Link to="/claim">
              <Button variant="outline" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100">
                <Building2 className="w-4 h-4 mr-2" /> Claim this listing
              </Button>
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

// ── Hostname extraction for source tags ──
function hostnameFrom(input?: string): string | undefined {
  if (!input) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const host = url.hostname.replace(/^www\./, "");
    // Reject things that clearly aren't hostnames (e.g. plain text like "FDD 2024")
    return host.includes(".") && !host.includes(" ") ? host : undefined;
  } catch {
    return undefined;
  }
}

// ── SourceTag — tiny provenance tag next to verified values ──
function SourceTag({
  field,
  sources,
  hideUnverified = false,
}: {
  field: string;
  sources?: FieldSources;
  hideUnverified?: boolean;
}) {
  const src = sources?.[field];
  if (!src) {
    if (hideUnverified) return null;
    return <span className="text-xs text-slate-400 font-normal">unverified</span>;
  }
  const urlHost = hostnameFrom(src.url);
  const sourceHost = hostnameFrom(src.source);
  const label = urlHost && !sourceHost
    ? `${src.source} via ${urlHost}`
    : (sourceHost ?? urlHost ?? src.source);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-normal whitespace-nowrap">
      {src.confidence === "high" && <BadgeCheck className="w-3 h-3 text-emerald-500 shrink-0" />}
      {label}
      {src.year ? ` · ${src.year}` : ""}
    </span>
  );
}

function StatRow({ accent, label, value, tag }: { accent: string; label: string; value: string; tag?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-2 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
      <div className="flex items-baseline gap-2 flex-wrap">
        <span>
          <span className="text-slate-500 text-sm">{label}: </span>
          <span className="text-slate-900 font-medium">{value}</span>
        </span>
        {tag}
      </div>
    </div>
  );
}

function InvestmentRow({ accent, label, value, tag }: { accent: string; label: string; value: string; tag?: ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors">
      <span className="font-semibold text-sm" style={{ color: accent }}>{label}</span>
      <span className="text-right">
        <span className="text-sm font-bold uppercase text-slate-900 block">{value}</span>
        {tag}
      </span>
    </div>
  );
}

// ── TriStateCard — verified Yes / verified No / not yet verified ──
function TriStateCard({
  label,
  value,
  verified,
  tag,
}: {
  label: string;
  value?: boolean;
  verified: boolean;
  tag?: ReactNode;
}) {
  const isYes = value === true;
  const isVerifiedNo = value === false && verified;
  const tileClass = isYes
    ? "bg-emerald-50 border-emerald-200"
    : isVerifiedNo
      ? "bg-rose-50 border-rose-200"
      : "bg-amber-50 border-amber-200";
  return (
    <div className={`${tileClass} card-lift card-lift-light border shadow-sm rounded-xl p-4 flex items-center gap-3`}>
      {isYes ? (
        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
      ) : isVerifiedNo ? (
        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
      ) : (
        <HelpCircle className="w-5 h-5 text-amber-500 shrink-0" />
      )}
      <div className="min-w-0">
        <div className={`text-sm font-medium ${isYes || isVerifiedNo ? "text-slate-800" : "text-amber-900"}`}>
          {label}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isYes ? (
            <span className="text-xs font-semibold text-emerald-700">Yes</span>
          ) : isVerifiedNo ? (
            <span className="text-xs font-semibold text-rose-600">No</span>
          ) : (
            <span className="text-xs font-semibold text-amber-700">Couldn't verify</span>
          )}
          {(isYes || isVerifiedNo) && tag}
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, icon: Icon, title, desc, accent }: { step: number; icon: any; title: string; desc: string; accent: string }) {
  return (
    <div className="card-lift card-lift-light bg-white border border-slate-200 shadow-sm rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors">
      <Badge className="mb-4 text-[10px] font-bold" style={{ backgroundColor: accent, color: contrastTextColor(accent) }}>
        Step {step}
      </Badge>
      <Icon className="w-8 h-8 mx-auto mb-3" style={{ color: accent }} />
      <h3 className="font-bold text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: accent }} />
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-slate-800 font-medium text-sm">{value}</div>
      </div>
    </div>
  );
}

function SocialLink({ url, icon: Icon, label, accent }: { url: string; icon: any; label: string; accent: string }) {
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition-colors text-sm"
    >
      <Icon className="w-4 h-4" style={{ color: accent }} />
      <span className="text-slate-600">{label}</span>
      <ExternalLink className="w-3 h-3 text-slate-500" />
    </a>
  );
}

// ── Brand-Specific Interest Form Dialog ──
function InterestFormDialog({
  open,
  onClose,
  brandId,
  brandName,
  submitted,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  brandId: Id<"brands">;
  brandName: string;
  submitted: boolean;
  onSubmitted: () => void;
}) {
  const createLead = useMutation(api.crm.createLeadFromProspect);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [territory, setTerritory] = useState("");
  const [capital, setCapital] = useState("");
  const [timeline, setTimeline] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!firstName.trim()) { toast.error("Please enter your first name"); return; }
    if (!email.trim()) { toast.error("Please enter your email"); return; }

    setSaving(true);
    try {
      const noteParts = [`Submitted interest via Franchise KI brand page for ${brandName}`];
      if (timeline) noteParts.push(`Timeline: ${timeline}`);

      await createLead({
        brandId,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        mainTerritory: territory || undefined,
        liquidCapital: capital || undefined,
        notes: noteParts.join(" | "),
      });
      onSubmitted();
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setTerritory("");
      setCapital("");
      setTimeline("");
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">You're on the list!</h2>
            <p className="text-slate-500 text-sm mb-6">
              The <strong className="text-slate-900">{brandName}</strong> team has been notified of your interest.
              They'll reach out soon to discuss franchise opportunities.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="border-white/20 text-slate-600 hover:bg-slate-100" onClick={onClose}>
                Close
              </Button>
              <Link to="/explore">
                <Button className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Explore More Brands
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Interested in</span>
            <span className="text-cyan-400">{brandName}</span>
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Tell us a little about yourself and the {brandName} team will follow up.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 bg-slate-50 border-slate-200" placeholder="John" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 bg-slate-50 border-slate-200" placeholder="Smith" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 bg-slate-50 border-slate-200" placeholder="john@example.com" />
            </div>
            <div>
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 bg-slate-50 border-slate-200" placeholder="(555) 123-4567" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-500 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> City & State of Interest</Label>
            <LocationAutocomplete
              placeholder="Type your city or ZIP code..."
              value={territory}
              onSelect={(loc) => setTerritory(loc.displayName)}
              className="mt-1"
              inputClassName="!bg-slate-50 !border-slate-200 !rounded-md !py-2 !text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Liquid Capital Available</Label>
              <Select value={capital} onValueChange={setCapital}>
                <SelectTrigger className="mt-1 bg-slate-50 border-slate-200"><SelectValue placeholder="Select range..." /></SelectTrigger>
                <SelectContent>
                  {CAPITAL_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 flex items-center gap-1">🗓 When do you want to get started?</Label>
              <Select value={timeline} onValueChange={setTimeline}>
                <SelectTrigger className="mt-1 bg-slate-50 border-slate-200"><SelectValue placeholder="Select timeline..." /></SelectTrigger>
                <SelectContent>
                  {TIMELINE_OPTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !firstName.trim() || !email.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white min-w-[120px]"
            >
              {saving ? "Submitting..." : "Submit Interest"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
