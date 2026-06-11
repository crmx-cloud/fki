import { useConvexAuth, useQuery } from "convex/react";
import { formatMoney, formatMoneyRange } from "@/lib/format";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationAutocomplete, type LocationResult } from "@/components/LocationAutocomplete";
import { ArrowRight, ArrowLeft, Trophy, RotateCcw, Sparkles, MapPin, Plus, X, ChevronDown, Star, Crown, FileText } from "lucide-react";
import { DueDiligenceDisclaimer } from "@/components/DueDiligenceDisclaimer";
import { QuizAvailabilityMap } from "@/components/QuizAvailabilityMap";

type QuizStep = "location" | "budget" | "involvement" | "categories" | "timeline" | "results";

/* ── Radius options ── */
const RADIUS_OPTIONS = [
  { value: 10,  label: "10 mi" },
  { value: 25,  label: "25 mi" },
  { value: 50,  label: "50 mi" },
  { value: 100, label: "100 mi" },
  { value: 200, label: "200 mi" },
];

/* ── Budget slider stops ── */
const BUDGET_STOPS = [
  { value: "under-50k",  label: "Up to $50K",  shortLabel: "$50K",  max: 50000 },
  { value: "50k-100k",   label: "Up to $100K", shortLabel: "$100K", max: 100000 },
  { value: "100k-250k",  label: "Up to $250K", shortLabel: "$250K", max: 250000 },
  { value: "250k-500k",  label: "Up to $500K", shortLabel: "$500K", max: 500000 },
  { value: "500k-plus",  label: "Up to $1M+",  shortLabel: "$1M+",  max: 10000000 },
];

const INVOLVEMENT_OPTIONS = [
  { value: "all", label: "Open To All Options", desc: "Show me everything — I'll narrow it down later" },
  { value: "owner-operator", label: "Owner-Operator", desc: "I want to run the business day-to-day" },
  { value: "semi-absentee", label: "Semi-Absentee", desc: "I'll hire a manager and oversee operations" },
  { value: "investor", label: "Investor", desc: "I want a passive investment with strong returns" },
];

const CATEGORY_OPTIONS = [
  { value: "Food & Beverage", icon: "🍽️" },
  { value: "Health & Wellness", icon: "💪" },
  { value: "Services", icon: "🛠️" },
  { value: "Retail", icon: "🛍️" },
  { value: "Education & Children", icon: "📚" },
  { value: "Home Services", icon: "🏠" },
  { value: "Fitness", icon: "🏋️" },
  { value: "Automotive", icon: "🚗" },
];

const TIMELINE_OPTIONS = [
  { value: "asap", label: "ASAP", desc: "Ready to start within 3 months" },
  { value: "6months", label: "6 Months", desc: "Exploring options, deciding soon" },
  { value: "1year", label: "1 Year", desc: "Still researching and planning" },
  { value: "just-looking", label: "Just Looking", desc: "Curious about what's out there" },
];

export function QuizPage() {
  const { isAuthenticated } = useConvexAuth();
  const [step, setStep] = useState<QuizStep>("location");

  /* ── Location state ── */
  const [primaryLocation, setPrimaryLocation] = useState<LocationResult | null>(null);
  const [primaryRadius, setPrimaryRadius] = useState(50);
  const [showSecondary, setShowSecondary] = useState(false);
  const [secondaryLocation, setSecondaryLocation] = useState<LocationResult | null>(null);
  const [secondaryRadius, setSecondaryRadius] = useState(50);

  /* ── Other quiz state ── */
  const [budgetIndex, setBudgetIndex] = useState(2);
  const [involvement, setInvolvement] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState(false);
  const [timeline, setTimeline] = useState("");
  const [showAll, setShowAll] = useState(false);

  const currentBudget = BUDGET_STOPS[budgetIndex];

  const results = useQuery(
    api.discovery.getQuizResults,
    step === "results"
      ? {
          budget: currentBudget.value,
          involvement: involvement === "all" ? undefined : involvement || undefined,
          categories: allCategories ? undefined : categories.length > 0 ? categories : undefined,
          timeline: timeline || undefined,
          // Primary location
          latitude: primaryLocation?.latitude,
          longitude: primaryLocation?.longitude,
          primaryCity: primaryLocation?.city,
          primaryState: primaryLocation?.state,
          primaryRadius: primaryRadius,
          // Secondary location
          secondaryLatitude: secondaryLocation?.latitude,
          secondaryLongitude: secondaryLocation?.longitude,
          secondaryCity: secondaryLocation?.city,
          secondaryState: secondaryLocation?.state,
          secondaryRadius: secondaryLocation ? secondaryRadius : undefined,
        }
      : "skip"
  );

  const steps: QuizStep[] = ["location", "budget", "involvement", "categories", "timeline", "results"];
  const currentIndex = steps.indexOf(step);
  const progress = ((currentIndex) / (steps.length - 1)) * 100;

  const toggleCategory = (cat: string) => {
    setAllCategories(false);
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAllCategories = () => {
    setAllCategories(true);
    setCategories([]);
  };

  const canProceed = () => {
    if (step === "location") return !!primaryLocation;
    if (step === "budget") return true;
    if (step === "involvement") return !!involvement;
    if (step === "categories") return true;
    if (step === "timeline") return true;
    return false;
  };

  const next = () => {
    const i = steps.indexOf(step);
    if (i < steps.length - 1) setStep(steps[i + 1]);
  };

  const back = () => {
    const i = steps.indexOf(step);
    if (i > 0) setStep(steps[i - 1]);
  };

  const resetQuiz = () => {
    setStep("location");
    setPrimaryLocation(null);
    setPrimaryRadius(50);
    setShowSecondary(false);
    setSecondaryLocation(null);
    setSecondaryRadius(50);
    setBudgetIndex(2);
    setInvolvement("");
    setCategories([]);
    setAllCategories(false);
    setTimeline("");
    setShowAll(false);
  };

  const optionClass = (selected: boolean) =>
    `w-full text-left p-4 rounded-xl border transition-all ${
      selected
        ? "border-cyan-500 bg-cyan-500/10 text-white"
        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.07]"
    }`;

  /* ───────────────────── Results Screen ───────────────────── */

  if (step === "results") {
    // Split results into top picks (with available territories) and the rest
    const topPicks = (results ?? []).filter((r: any) => r.topPick);
    const otherResults = (results ?? []).filter((r: any) => !r.topPick && r.hasAvailable);
    const noTerritoryResults = (results ?? []).filter((r: any) => !r.hasAvailable);

    // Featured partner brands NOT already shown in the ranked results sections
    const rankedIds = new Set([...topPicks, ...otherResults].map((r: any) => r.brand._id));
    const featuredRecs = (results ?? [])
      .filter((r: any) => r.brand?.featured === true && !rankedIds.has(r.brand._id))
      .slice(0, 3);

    // "Availability where you are" map — top 3 ranked results (results are
    // sorted hasAvailable-first, so the #1 top pick leads; falls back to the
    // first ranked result when there are no top picks)
    const mapPicks = (results ?? []).filter((r: any) => r.brand?.slug).slice(0, 3);

    // Show 10 initially (top picks + others), then show more
    const INITIAL_LIMIT = 10;
    const visibleOthers = showAll ? otherResults : otherResults.slice(0, Math.max(0, INITIAL_LIMIT - topPicks.length));
    const hasMore = otherResults.length > visibleOthers.length || noTerritoryResults.length > 0;

    const renderResultCard = (result: any, i: number, isTopPick: boolean) => {
      const score = result.fitScore ?? result.matchScore ?? 0;
      const scoreColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-cyan-400" : score >= 40 ? "text-amber-400" : "text-orange-400";

      return (
        <Link key={result.brand._id} to={`/brand/${result.brand.slug}`}>
          <div className={`rounded-2xl p-6 transition-all cursor-pointer mb-4 ${
            isTopPick
              ? "bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent border-2 border-cyan-500/40 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
              : "bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-white/20"
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {isTopPick ? (
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      {i === 0 ? <Crown className="w-5 h-5 text-cyan-400" /> : <Star className="w-5 h-5 text-cyan-400" />}
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-slate-600 min-w-[28px]">#{topPicks.length + i + 1}</span>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xl font-bold ${isTopPick ? "text-white" : "text-slate-200"}`}>{result.brand.name}</h3>
                      {isTopPick && (
                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 rounded-full px-2.5 py-0.5 tracking-wide">TOP MATCH</span>
                      )}
                    </div>
                    {result.brand.category && (
                      <Badge className="bg-white/10 text-slate-300 border-0 text-xs mt-1">{result.brand.category}</Badge>
                    )}
                  </div>
                </div>
                {result.brand.description && (
                  <p className="text-sm text-slate-400 mb-3">{result.brand.description}</p>
                )}

                {result.reasons && result.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {result.reasons.map((reason: string, ri: number) => (
                      <span key={ri} className={`text-xs px-2.5 py-1 rounded-full ${
                        isTopPick ? "bg-cyan-500/15 text-cyan-200" : "bg-white/10 text-slate-300"
                      }`}>{reason}</span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs">Investment</span>
                    <p className="font-medium">
                      {result.brand.investmentMin
                        ? formatMoneyRange(result.brand.investmentMin, result.brand.investmentMax)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Category</span>
                    <p className="font-medium">{result.brand.category ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Territories</span>
                    <p className="font-medium">{result.totalTerritories ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Available</span>
                    <p className={`font-medium ${isTopPick ? "text-cyan-400" : "text-emerald-400"}`}>{result.availableTerritories ?? "—"}</p>
                  </div>
                </div>
              </div>
              <div className="text-center ml-4 min-w-[70px]">
                <div className={`text-3xl font-bold ${isTopPick ? "text-cyan-400" : scoreColor}`}>{score}</div>
                <div className="text-xs text-slate-500">Fit Score</div>
              </div>
            </div>
          </div>
        </Link>
      );
    };

    return (
      <div className="min-h-screen bg-slate-950 text-white motion-page">
        <PublicNav />
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <Reveal className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-extrabold mb-2">Your PerfectFit Results</h1>
            <p className="text-slate-400">Based on your preferences, here are the best franchise opportunities for you.</p>

            {primaryLocation && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-300">
                  {primaryLocation.displayName} ({primaryRadius} mi)
                  {secondaryLocation && ` + ${secondaryLocation.displayName} (${secondaryRadius} mi)`}
                </span>
              </div>
            )}

            <p className="text-xs text-slate-500 mt-2">
              Want to refine these? <Link to="/my-profile" className="text-cyan-400 hover:underline">Complete your profile</Link> to narrow or widen your matches anytime.
            </p>
          </Reveal>

          {/* Loading */}
          {results === undefined ? (
            <div className="text-center py-12 text-slate-500">
              <Sparkles className="w-8 h-8 mx-auto mb-3 animate-pulse text-cyan-400" />
              Calculating your PerfectFit matches…
            </div>
          ) : topPicks.length === 0 && otherResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-2">No brands with available territories match your criteria.</p>
              <p className="text-xs text-slate-500 mb-6">Try adjusting your location radius or budget to see more options.</p>
              <Button variant="outline" onClick={resetQuiz} className="border-white/20 text-white hover:bg-white/10">
                <RotateCcw className="w-4 h-4 mr-1" /> Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* ── Top Picks Section ── */}
              {topPicks.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-cyan-300">Your Top {topPicks.length === 1 ? "Match" : "Matches"}</h2>
                  </div>
                  <Reveal stagger>
                    {topPicks.map((result: any, i: number) => renderResultCard(result, i, true))}
                  </Reveal>
                </div>
              )}

              {/* ── Availability where you are — the map moment ── */}
              {primaryLocation && mapPicks.length > 0 && (
                <QuizAvailabilityMap
                  brands={mapPicks.map((r: any) => r.brand)}
                  city={primaryLocation.city}
                  state={primaryLocation.state}
                  stateAbbr={primaryLocation.stateAbbr}
                  latitude={primaryLocation.latitude}
                  longitude={primaryLocation.longitude}
                  radiusMiles={primaryRadius}
                />
              )}

              {/* ── Other Matches ── */}
              {visibleOthers.length > 0 && (
                <div>
                  {topPicks.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 mt-2">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-sm text-slate-500 font-medium">More Options</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}
                  <Reveal stagger>
                    {visibleOthers.map((result: any, i: number) => renderResultCard(result, i, false))}
                  </Reveal>
                </div>
              )}

              {/* ── Show More Button ── */}
              {hasMore && !showAll && (
                <div className="text-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowAll(true)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronDown className="w-4 h-4 mr-1" /> Show More Results
                  </Button>
                </div>
              )}

              {/* ── Expanded: brands with NO available territories ── */}
              {showAll && noTerritoryResults.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-sm text-slate-600 font-medium">No Available Territories</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <p className="text-xs text-slate-500 mb-4 text-center">These brands don't currently have available territories in your area.</p>
                  <div className="opacity-50">
                    {noTerritoryResults.map((result: any, i: number) => (
                      <Link key={result.brand._id} to={`/brand/${result.brand.slug}`}>
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:bg-white/[0.05] transition-all cursor-pointer mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-slate-400">{result.brand.name}</h3>
                              {result.brand.category && (
                                <span className="text-xs text-slate-600">{result.brand.category}</span>
                              )}
                            </div>
                            <span className="text-xs text-slate-600">0 available</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Due Diligence Dossier CTA ── */}
              <Reveal className="mt-10">
                <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent p-6 sm:p-8 text-center card-lift">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">Don't stop at the match score</h3>
                  <p className="text-sm text-slate-400 max-w-lg mx-auto mb-5">
                    Verified money math, sourced risk flags, territory status in your state, and the 10
                    questions to ask each franchisor — on your top matches, in one report.
                  </p>
                  <Link to={isAuthenticated ? "/dossier" : "/signup"}>
                    <Button className="bg-cyan-600 hover:bg-cyan-500 text-white">
                      Get your free Due Diligence Dossier on these matches
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                  {!isAuthenticated && (
                    <p className="text-xs text-slate-500 mt-2.5">
                      Takes a free account — the $5,000-consultant-style report is the first thing you'll see.
                    </p>
                  )}
                </div>
              </Reveal>

              {/* ── Recommended (featured partner) slots — clearly separated from ranked results ── */}
              {featuredRecs.length > 0 && (
                <div className="mt-12">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-amber-400" />
                    <h2 className="text-lg font-bold text-amber-300">Recommended franchises worth looking into</h2>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Featured placements from our partner brands — always compare against your matched results.
                  </p>
                  <Reveal stagger>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {featuredRecs.map((r: any) => (
                        <Link key={r.brand._id} to={`/brand/${r.brand.slug}`} className="block h-full">
                          <div className="h-full rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] hover:border-amber-400/50 hover:bg-amber-500/[0.08] transition-all p-5 card-lift">
                            <div className="flex items-center justify-between mb-3">
                              {r.brand.logoUrl ? (
                                <img src={r.brand.logoUrl} alt={r.brand.name} className="w-10 h-10 rounded-lg object-cover bg-white/10" />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold text-white"
                                  style={{ backgroundColor: r.brand.color || "#475569" }}
                                >
                                  {r.brand.name?.charAt(0)}
                                </div>
                              )}
                              <span className="text-[9px] font-bold tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
                                RECOMMENDED
                              </span>
                            </div>
                            <h3 className="font-bold text-white leading-snug">{r.brand.name}</h3>
                            {r.brand.category && (
                              <p className="text-xs text-slate-400 mt-0.5">{r.brand.category}</p>
                            )}
                            <p className="text-sm text-slate-300 mt-2">
                              {r.brand.investmentMin
                                ? formatMoneyRange(r.brand.investmentMin, r.brand.investmentMax)
                                : "Investment not listed"}
                            </p>
                            <span className="inline-flex items-center gap-1 text-xs text-amber-300 mt-3">
                              Details <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </Reveal>
                </div>
              )}

              {/* Retake */}
              <div className="text-center mt-8">
                <Button variant="outline" onClick={resetQuiz} className="border-white/20 text-white hover:bg-white/10">
                  <RotateCcw className="w-4 h-4 mr-1" /> Retake Quiz
                </Button>
              </div>
            </>
          )}
          <DueDiligenceDisclaimer variant="inline" />
        </div>
        <PublicFooter />
      </div>
    );
  }

  /* ───────────────────── Quiz Steps ───────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-white motion-page">
      <PublicNav />

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2 inline-flex items-center gap-2 justify-center flex-wrap">
            <span>PerfectFit</span>
            <span className="inline-flex items-center justify-center text-xs font-bold leading-none bg-[#3B82F6] text-white rounded-full px-2.5 py-1 tracking-wide">AI</span>
            <span>Quiz</span>
          </h1>
          <p className="text-slate-400 mt-2">Answer a few quick questions — we'll match you with the right franchises.</p>
          <p className="text-xs text-slate-500 mt-1">You can always refine your results later. No pressure.</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>Step {currentIndex + 1} of {steps.length - 1}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── Step 1: Your Area ── */}
        {step === "location" && (
          <div>
            <h2 className="text-xl font-bold mb-2">📍 Where are you looking?</h2>
            <p className="text-sm text-slate-400 mb-6">Tell us your city so we can find franchise opportunities near you.</p>

            {/* Primary location */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Your City</label>
                <LocationAutocomplete
                  onSelect={(loc) => setPrimaryLocation(loc)}
                  placeholder="Search city, state, or ZIP code…"
                  value={primaryLocation?.displayName || ""}
                  autoFocus
                />
              </div>

              {/* Show selected primary location */}
              {primaryLocation && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-white">{primaryLocation.city}, {primaryLocation.stateAbbr}</div>
                    <div className="text-xs text-slate-400">Lat {primaryLocation.latitude.toFixed(3)}, Lng {primaryLocation.longitude.toFixed(3)}</div>
                  </div>
                  <button
                    onClick={() => setPrimaryLocation(null)}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Radius selector */}
              {primaryLocation && (
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Maximum Radius</label>
                  <div className="flex gap-2 flex-wrap">
                    {RADIUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPrimaryRadius(opt.value)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          primaryRadius === opt.value
                            ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                            : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Secondary location */}
            {primaryLocation && !showSecondary && (
              <button
                onClick={() => setShowSecondary(true)}
                className="mt-6 flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add a second area of interest
              </button>
            )}

            {showSecondary && (
              <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">Second Area (optional)</label>
                  <button
                    onClick={() => { setShowSecondary(false); setSecondaryLocation(null); }}
                    className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
                <LocationAutocomplete
                  onSelect={(loc) => setSecondaryLocation(loc)}
                  placeholder="Search second city…"
                  value={secondaryLocation?.displayName || ""}
                />

                {secondaryLocation && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-white">{secondaryLocation.city}, {secondaryLocation.stateAbbr}</div>
                      <div className="text-xs text-slate-400">Lat {secondaryLocation.latitude.toFixed(3)}, Lng {secondaryLocation.longitude.toFixed(3)}</div>
                    </div>
                    <button
                      onClick={() => setSecondaryLocation(null)}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {secondaryLocation && (
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Second Area Radius</label>
                    <div className="flex gap-2 flex-wrap">
                      {RADIUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSecondaryRadius(opt.value)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            secondaryRadius === opt.value
                              ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                              : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Budget Slider ── */}
        {step === "budget" && (
          <div>
            <h2 className="text-xl font-bold mb-2">💰 What's the maximum you can invest?</h2>
            <p className="text-sm text-slate-400 mb-8">Drag to your max available liquid capital. We'll show all franchises at or below this amount.</p>

            {/* Current value display */}
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-cyan-400 tracking-tight">{currentBudget.label}</div>
              <p className="text-xs text-slate-500 mt-2">Includes all options below this amount</p>
            </div>

            {/* Range slider */}
            <div className="px-2 mb-6">
              <input
                type="range"
                min={0}
                max={BUDGET_STOPS.length - 1}
                step={1}
                value={budgetIndex}
                onChange={(e) => setBudgetIndex(Number(e.target.value))}
                className="quiz-budget-slider w-full"
              />

              {/* Tick labels */}
              <div className="flex justify-between mt-3">
                {BUDGET_STOPS.map((stop, i) => (
                  <button
                    key={stop.value}
                    onClick={() => setBudgetIndex(i)}
                    className={`text-xs transition-colors ${
                      i <= budgetIndex ? "text-cyan-400 font-medium" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {stop.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Involvement ── */}
        {step === "involvement" && (
          <div>
            <h2 className="text-xl font-bold mb-2">👤 What level of involvement do you prefer?</h2>
            <p className="text-sm text-slate-400 mb-4">Not sure yet? "Open To All" keeps your options flexible.</p>
            <div className="space-y-3">
              {INVOLVEMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInvolvement(opt.value)}
                  className={optionClass(involvement === opt.value)}
                >
                  <div className="font-medium flex items-center gap-2">
                    {opt.label}
                    {opt.value === "all" && (
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/15 rounded-full px-2 py-0.5">RECOMMENDED</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: Industries ── */}
        {step === "categories" && (
          <div>
            <h2 className="text-xl font-bold mb-2">🏷️ Which industries interest you?</h2>
            <p className="text-sm text-slate-400 mb-4">Pick specific industries, or stay open to see everything. You can narrow down later.</p>

            {/* Open To All toggle */}
            <button
              onClick={handleAllCategories}
              className={`w-full mb-4 p-4 rounded-xl border text-center transition-all ${
                allCategories
                  ? "border-cyan-500 bg-cyan-500/10 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              <div className="font-medium flex items-center justify-center gap-2">
                🌐 Open To All Industries
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/15 rounded-full px-2 py-0.5">RECOMMENDED</span>
              </div>
              <div className="text-sm text-slate-400 mt-1">Show me everything — I can narrow down in my profile</div>
            </button>

            <div className={`grid grid-cols-2 gap-3 transition-opacity ${allCategories ? "opacity-40 pointer-events-none" : ""}`}>
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    categories.includes(cat.value)
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-sm font-medium">{cat.value}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 5: Timeline ── */}
        {step === "timeline" && (
          <div>
            <h2 className="text-xl font-bold mb-4">⏰ When are you looking to get started?</h2>
            <div className="space-y-3">
              {TIMELINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeline(opt.value)}
                  className={optionClass(timeline === opt.value)}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-sm text-slate-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={back}
            disabled={currentIndex === 0}
            className="border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={next}
            disabled={!canProceed()}
            className="bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-30"
          >
            {step === "timeline" ? "See My Matches" : "Next"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
