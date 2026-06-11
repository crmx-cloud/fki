import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { formatMoney, formatMoneyRange } from "@/lib/format";
import { api } from "../../convex/_generated/api";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { LocationAutocomplete, type LocationResult } from "@/components/LocationAutocomplete";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, MapPin, BarChart3, Zap, ArrowRight, DollarSign,
  Target, ClipboardCheck, Star, TrendingUp, Building2, Sparkles,
  Handshake, ShieldCheck, BadgeCheck,
} from "lucide-react";

const CATEGORIES = [
  { label: "🍽️ Food & Beverage", slug: "food-beverage" },
  { label: "💪 Health & Wellness", slug: "health-wellness" },
  { label: "🛠️ Services", slug: "services" },
  { label: "🏠 Home Services", slug: "home-services" },
  { label: "📚 Education", slug: "education-children" },
  { label: "🏋️ Fitness", slug: "fitness" },
];

const BUDGET_OPTIONS = [
  { label: "Under $50K", value: "under-50k" },
  { label: "$50K–$100K", value: "50k-100k" },
  { label: "$100K–$250K", value: "100k-250k" },
  { label: "$250K–$500K", value: "250k-500k" },
  { label: "$500K+", value: "500k-plus" },
];

const RADIUS_OPTIONS = [
  { label: "10 mi", value: 10 },
  { label: "25 mi", value: 25 },
  { label: "50 mi", value: 50 },
  { label: "100 mi", value: 100 },
  { label: "200 mi", value: 200 },
];

export function HomePage() {
  const navigate = useNavigate();
  const brands = useQuery(api.brands.listWithStats);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(50);

  // Persist radius for logged-in users
  const { isAuthenticated } = useConvexAuth();
  const prospectProfile = useQuery(
    api.matching.getMyProspectProfile,
    isAuthenticated ? {} : "skip"
  );
  const updateRadius = useMutation(api.matching.updateProspectRadius);

  // Load saved radius from profile on mount
  useEffect(() => {
    if (prospectProfile?.primaryRadius) {
      setSelectedRadius(prospectProfile.primaryRadius);
    }
  }, [prospectProfile?.primaryRadius]);

  // Public stats count ACTIVE brands only — must agree with the Explore page count
  // (listWithStats includes inactive brands for the admin dashboard).
  const activeBrands = brands?.filter((b: any) => b.isActive !== false);
  const totalTerritories = activeBrands?.reduce((s: number, b: any) => s + b.totalTerritories, 0) || 0;
  const totalBrands = activeBrands?.length || 0;
  const totalAvailable = activeBrands?.reduce((s: number, b: any) => s + b.availableTerritories, 0) || 0;

  // Build discovery query
  const discoveryArgs = selectedLocation
    ? {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        radiusMiles: selectedRadius,
        state: selectedLocation.state,
        ...(selectedBudget ? {
          budgetMin: ({ "under-50k": 0, "50k-100k": 50000, "100k-250k": 100000, "250k-500k": 250000, "500k-plus": 500000 } as any)[selectedBudget] ?? 0,
          budgetMax: ({ "under-50k": 50000, "50k-100k": 100000, "100k-250k": 250000, "250k-500k": 500000, "500k-plus": 10000000 } as any)[selectedBudget] ?? 10000000,
        } : {}),
      }
    : null;

  const results = useQuery(
    api.discovery.discoverByLocation,
    showResults && discoveryArgs ? discoveryArgs : "skip"
  );

  // Filter by selected categories if any
  const filteredResults = results
    ? selectedCategories.length > 0
      ? results.filter((r: any) =>
          selectedCategories.some(
            (cat) => r.brand.category?.toLowerCase().includes(cat.replace("-", " ").replace("education children", "education"))
          )
        )
      : results
    : null;

  const top10 = filteredResults?.slice(0, 10) || [];

  function handleFindMatches() {
    if (selectedLocation) {
      setShowResults(true);
    }
  }

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white motion-page">
      <PublicNav />

      {/* Hero — Prospect-focused */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30" />
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <Badge className="mb-6 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 px-4 py-1.5">
                <Sparkles className="w-3 h-3 mr-1" /> AI-Powered Franchise Matching
              </Badge>
            </Reveal>
            <Reveal as="h1" delay={80} className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5 leading-[1.1]">
              Hundreds of Hours of Due Diligence.{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
                Done in 90 Seconds.
              </span>
            </Reveal>
            <Reveal as="p" delay={180} className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-5">
              The world's first platform that does your franchise due diligence for you — every brand, including the sleepers nobody shows you, backed by verified, sourced data. Match, compare side-by-side, and get a Due Diligence Dossier that tells you exactly what to ask before you invest.
            </Reveal>
            <Reveal as="p" delay={240} className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-400 mb-10">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              100% free for franchise buyers — matching, due diligence, comparisons, even working with a vetted broker. No cost. Ever.
            </Reveal>

            {/* Search & Filters */}
            <Reveal delay={280} className="max-w-2xl mx-auto space-y-4">
              {/* Location search */}
              <LocationAutocomplete
                onSelect={(loc) => { setSelectedLocation(loc); setShowResults(false); }}
                placeholder="Enter your city, state, or ZIP code..."
                size="lg"
              />

              {/* Radius */}
              <div className="flex flex-wrap gap-2 justify-center items-center">
                <span className="flex items-center gap-1 text-sm text-slate-500 mr-1">
                  <MapPin className="w-3.5 h-3.5" /> Radius:
                </span>
                {RADIUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSelectedRadius(opt.value);
                      setShowResults(false);
                      if (isAuthenticated) {
                        updateRadius({ primaryRadius: opt.value }).catch(() => {});
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedRadius === opt.value
                        ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300"
                        : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-2 justify-center">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => { toggleCategory(cat.slug); setShowResults(false); }}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      selectedCategories.includes(cat.slug)
                        ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300"
                        : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Budget */}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="flex items-center gap-1 text-sm text-slate-500 mr-1">
                  <DollarSign className="w-3.5 h-3.5" /> Liquid Capital:
                </span>
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSelectedBudget(selectedBudget === opt.value ? "" : opt.value); setShowResults(false); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedBudget === opt.value
                        ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300"
                        : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* CTA */}
              <div className="pt-2">
                <Button
                  size="lg"
                  onClick={handleFindMatches}
                  disabled={!selectedLocation}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-10 py-4 text-lg w-full sm:w-auto disabled:opacity-40"
                >
                  <Target className="w-5 h-5 mr-2" />
                  Find My Top Matches
                </Button>
                {!selectedLocation && (
                  <p className="text-xs text-slate-600 mt-2">Enter your location above to get started</p>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Results section */}
      {showResults && (
        <section className="py-12 px-6 border-t border-white/10" id="results">
          <div className="max-w-5xl mx-auto">
            {selectedLocation && (
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold">
                  Top Franchise Matches Near{" "}
                  <span className="text-cyan-400">{selectedLocation.displayName}</span>
                </h2>
                <p className="text-slate-400 mt-2">
                  Ranked by Franchise Fit Score — based on territory availability, market data, and your preferences
                </p>
              </div>
            )}

            {filteredResults === undefined || filteredResults === null ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-slate-400">Analyzing franchise potential in your area...</div>
              </div>
            ) : top10.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="mb-4">No matches found with your current filters.</p>
                <Button
                  variant="outline"
                  onClick={() => { setSelectedCategories([]); setSelectedBudget(""); }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <Reveal stagger className="space-y-4">
                  {top10.map((result: any, index: number) => (
                    <FitScoreCard key={result.brand._id} result={result} rank={index + 1} />
                  ))}
                </Reveal>

                {/* CTA to take the quiz */}
                <div className="mt-12 text-center bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 rounded-2xl p-8">
                  <ClipboardCheck className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Want a Detailed Fit Score?</h3>
                  <p className="text-slate-400 max-w-lg mx-auto mb-6">
                    Take our 2-minute Franchise Fit Quiz for a personalized deep-dive analysis — matching your goals, timeline, involvement level, and capital to the best opportunities.
                  </p>
                  <Link to="/quiz">
                    <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white px-8">
                      Take the Franchise Fit Quiz <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Live Stats — always visible */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Reveal stagger className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-extrabold text-cyan-400"><CountUp value={totalBrands} /></div>
              <div className="text-sm text-slate-400 mt-1">Active Brands</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-emerald-400"><CountUp value={totalTerritories} /></div>
              <div className="text-sm text-slate-400 mt-1">Territories Mapped</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-amber-400"><CountUp value={totalAvailable} /></div>
              <div className="text-sm text-slate-400 mt-1">Available Now</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works — prospect perspective */}
      <section className="py-20 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal as="h2" className="text-3xl font-bold text-center mb-4">How Franchise KI Works</Reveal>
          <Reveal as="p" delay={80} className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Find your ideal franchise match in three simple steps
          </Reveal>
          <Reveal stagger className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="w-8 h-8" />,
                title: "Find Your PerfectFit",
                desc: "Search your area or take the PerfectFit quiz — we match every brand in the database against your budget, goals, and territory, and rank them by Fit Score.",
                color: "text-cyan-400",
                bg: "bg-cyan-500/10",
              },
              {
                icon: <ClipboardCheck className="w-8 h-8" />,
                title: "Do 90-Second Due Diligence",
                desc: "Explore any brand with verified, sourced data — investment and fees, SWOT analysis with red flags, side-by-side comparisons, and your personal Due Diligence Dossier.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                icon: <Handshake className="w-8 h-8" />,
                title: "Work With a Vetted Broker",
                desc: "Pressure-test your shortlist with a vetted broker from our network — decades of franchise experience, free to you, because brokers are paid by franchisors, not buyers.",
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div
                  className={`w-16 h-16 rounded-2xl ${step.bg} flex items-center justify-center mx-auto mb-4 ${step.color}`}
                >
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Vetted broker network */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/[0.07] to-blue-500/[0.04] p-8 md:p-12">
            <Reveal className="text-center mb-10">
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20 mb-4">
                <Handshake className="w-3 h-3 mr-1" /> Free Broker Network
              </Badge>
              <h2 className="text-3xl font-bold mb-3">A Vetted Broker in Your Corner — at No Cost</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                The platform narrows it down. A vetted broker helps you get it right — double-checking
                your shortlist, asking the questions you'd miss, and walking you through the deal.
              </p>
            </Reveal>
            <Reveal stagger className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
                <BadgeCheck className="w-7 h-7 text-cyan-400 mb-3" />
                <h3 className="font-bold mb-1.5">Vetted, Not Random</h3>
                <p className="text-sm text-slate-400">
                  Every broker in our network is vetted, with decades of franchise experience guiding
                  buyers through real deals.
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
                <DollarSign className="w-7 h-7 text-emerald-400 mb-3" />
                <h3 className="font-bold mb-1.5">Free — Here's Why</h3>
                <p className="text-sm text-slate-400">
                  Brokers are paid by franchisors when a deal closes, never by you. Your guidance costs
                  nothing at any point.
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
                <ShieldCheck className="w-7 h-7 text-amber-400 mb-3" />
                <h3 className="font-bold mb-1.5">On Your Side of the Table</h3>
                <p className="text-sm text-slate-400">
                  Our brokers aren't tied to any one brand — their job is making sure the franchise you
                  pick is the right use of your investment.
                </p>
              </div>
            </Reveal>
            <Reveal className="text-center">
              <Link to="/get-started">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Get Matched With a Broker <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Featured Brands preview */}
      {!showResults && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold">Featured Brands</h2>
                <p className="text-slate-400 mt-1">Explore franchise opportunities with mapped territories</p>
              </div>
              <Link to="/explore">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </Reveal>
            <Reveal stagger className="grid md:grid-cols-3 gap-6">
              {brands && brands.length > 0
                ? brands.slice(0, 3).map((brand: any) => (
                    <Link
                      key={brand._id}
                      to={`/brand/${brand.slug}`}
                      className="group card-lift bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-cyan-500/30"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold group-hover:text-cyan-400 transition-colors">
                            {brand.name}
                          </h3>
                          {brand.category && (
                            <Badge className="mt-2 bg-white/10 text-slate-300 border-0 text-xs">
                              {brand.category}
                            </Badge>
                          )}
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-cyan-400" />
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-4">{brand.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-300">
                          <span className="font-semibold text-cyan-400">{brand.totalTerritories}</span>{" "}
                          territories
                        </span>
                        <span className="text-slate-300">
                          <span className="font-semibold text-emerald-400">{brand.availableTerritories}</span>{" "}
                          available
                        </span>
                      </div>
                      {brand.investmentMin && (
                        <div className="mt-3 text-xs text-slate-500">
                          Investment: {formatMoneyRange(brand.investmentMin, brand.investmentMax)}
                        </div>
                      )}
                    </Link>
                  ))
                : brands && brands.length === 0 ? (
                  <div className="col-span-3 text-center py-12 text-slate-500">
                    No brands yet. Seed the database from the admin dashboard.
                  </div>
                ) : (
                  <div className="col-span-3 text-center py-12 text-slate-500">Loading brands...</div>
                )}
            </Reveal>
          </div>
        </section>
      )}

      {/* Franchisor CTA — secondary */}
      <section className="py-16 border-t border-white/10">
        <Reveal className="max-w-4xl mx-auto px-6 text-center">
          <Building2 className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Are You a Franchise Brand?</h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Map your territories for free, embed interactive maps on your website, and attract qualified prospects — no monthly fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/for-franchisors">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8">
                Learn More
              </Button>
            </Link>
            <Link to="/claim">
              <Button className="bg-cyan-600 hover:bg-cyan-500 text-white px-8">
                Build My Map <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  );
}

/* ==========================================
   Franchise Fit Score Card
   ========================================== */
function FitScoreCard({ result, rank }: { result: any; rank: number }) {
  const { brand, score, breakdown, reasons, nearbyAvailable, totalTerritories } = result;
  const scoreColor =
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-cyan-400" : score >= 40 ? "text-amber-400" : "text-orange-400";
  const scoreBorder =
    score >= 80 ? "border-emerald-500/30" : score >= 60 ? "border-cyan-500/30" : score >= 40 ? "border-amber-500/30" : "border-orange-500/30";
  const scoreBg =
    score >= 80 ? "from-emerald-500/20" : score >= 60 ? "from-cyan-500/20" : score >= 40 ? "from-amber-500/20" : "from-orange-500/20";
  const rankLabel = rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`;

  return (
    <div className={`card-lift bg-white/5 border ${rank <= 3 ? scoreBorder : "border-white/10"} rounded-2xl p-5 md:p-6 hover:bg-white/[0.07]`}>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Score */}
        <div className="flex sm:flex-col items-center gap-3 sm:gap-1 flex-shrink-0">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b ${scoreBg} to-transparent border-2 border-white/10 flex items-center justify-center`}>
            <span className={`text-2xl sm:text-3xl font-bold ${scoreColor}`}>{score}</span>
          </div>
          <div className="text-center">
            <span className="text-xs text-slate-500 block">Fit Score</span>
            <span className="text-sm font-medium">{rankLabel}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link to={`/brand/${brand.slug}`} className="text-xl font-bold text-white hover:text-cyan-400 transition-colors">
                {brand.name}
              </Link>
              <p className="text-sm text-slate-400 mt-0.5">{brand.category}</p>
            </div>
            {brand.investmentMin && (
              <div className="text-right flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {formatMoneyRange(brand.investmentMin, brand.investmentMax)}
                </span>
                <p className="text-xs text-slate-500">Investment</p>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-400 mt-2 line-clamp-2">{brand.description}</p>

          {/* Reasons */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {reasons.map((reason: string, i: number) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-300">
                {reason}
              </span>
            ))}
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
            {nearbyAvailable > 0 && (
              <span className="text-emerald-400">{nearbyAvailable} available nearby</span>
            )}
            <span>{totalTerritories} territories total</span>
            {brand.royaltyPercent && <span>{brand.royaltyPercent}% royalty</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Link to={`/map/${brand.slug}`}>
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-4">
                <MapPin className="w-3 h-3 mr-1" /> View Map
              </Button>
            </Link>
            <Link to={`/brand/${brand.slug}`}>
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-xs px-4">
                Details
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
