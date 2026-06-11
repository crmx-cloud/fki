import { useQuery } from "convex/react";
import { formatMoney, formatMoneyRange } from "@/lib/format";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Reveal } from "@/components/Reveal";
import { LocationAutocomplete, type LocationResult } from "@/components/LocationAutocomplete";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export function DiscoverPage() {
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [radius, setRadius] = useState(50);
  const [budgetRange, setBudgetRange] = useState("");

  const budgetFilter = budgetRange
    ? {
        budgetMin: ({ "under-100k": 0, "100k-250k": 100000, "250k-500k": 250000, "500k-plus": 500000 } as any)[budgetRange] ?? 0,
        budgetMax: ({ "under-100k": 100000, "100k-250k": 250000, "250k-500k": 500000, "500k-plus": 10000000 } as any)[budgetRange] ?? 10000000,
      }
    : {};

  const results = useQuery(
    api.discovery.discoverByLocation,
    selectedLocation
      ? { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude, radiusMiles: radius, ...budgetFilter }
      : "skip"
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white motion-page">
      <PublicNav />

      {/* Hero Search */}
      <section className="pt-20 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal as="h1" className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4">
            Which Franchise Will{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
              Crush It
            </span>{" "}
            in Your City?
          </Reveal>
          <Reveal as="p" delay={100} className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Type your city below and see which franchise brands have the highest success potential in your area — powered by real data.
          </Reveal>

          <Reveal delay={200} className="max-w-xl mx-auto">
            <LocationAutocomplete
              onSelect={(loc) => setSelectedLocation(loc)}
              placeholder="Enter your city, state, or ZIP code..."
              size="lg"
            />
          </Reveal>

          {/* Filters */}
          <Reveal delay={280} className="flex flex-wrap gap-3 justify-center mt-6">
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-white"
            >
              <option value={25}>25 mi radius</option>
              <option value={50}>50 mi radius</option>
              <option value={100}>100 mi radius</option>
              <option value={200}>200 mi radius</option>
            </select>
            <select
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-white"
            >
              <option value="">Any budget</option>
              <option value="under-100k">Under $100K</option>
              <option value="100k-250k">$100K–$250K</option>
              <option value="250k-500k">$250K–$500K</option>
              <option value="500k-plus">$500K+</option>
            </select>
          </Reveal>
        </div>
      </section>

      {/* Results */}
      {selectedLocation && (
        <section className="pb-20 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm text-slate-500 mb-6 text-center">
              Showing results near{" "}
              <span className="text-white font-medium">{selectedLocation.displayName}</span>
            </p>

            {results === undefined ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-slate-400">Analyzing franchise potential...</div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No franchise brands found matching your criteria. Try expanding your search radius.
              </div>
            ) : (
              <Reveal stagger className="space-y-6">
                {results.map((result: any, index: number) => (
                  <BrandResultCard key={result.brand._id} result={result} rank={index + 1} />
                ))}
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      {!selectedLocation && (
        <section className="pb-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-slate-500 mb-6">Not sure what you're looking for?</p>
            <Link
              to="/quiz"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-white font-semibold transition-colors"
            >
              Take the Franchise Match Quiz →
            </Link>
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}

function BrandResultCard({ result, rank }: { result: any; rank: number }) {
  const { brand, score, breakdown, reasons, nearbyAvailable, totalTerritories } = result;
  const scoreColor =
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-orange-400";
  const scoreBg =
    score >= 80 ? "from-emerald-500/20 to-emerald-500/5" : score >= 60 ? "from-yellow-500/20 to-yellow-500/5" : "from-orange-500/20 to-orange-500/5";

  return (
    <div className="card-lift bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07]">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Score Circle */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-b ${scoreBg} border-2 border-white/10 flex items-center justify-center`}>
            <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
          </div>
          <span className="text-xs text-slate-500 mt-1">Success Score</span>
          {rank <= 3 && (
            <span className="text-xs mt-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
              #{rank} Match
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <Link to={`/brand/${brand.slug}`} className="text-xl font-bold text-white hover:text-cyan-400 transition-colors">
                {brand.name}
              </Link>
              <p className="text-sm text-slate-400 mt-1">{brand.category}</p>
            </div>
            {brand.investmentMin && (
              <div className="text-right">
                <span className="text-sm font-medium text-white">
                  {formatMoneyRange(brand.investmentMin, brand.investmentMax)}
                </span>
                <p className="text-xs text-slate-500">Investment</p>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-400 mt-3 line-clamp-2">{brand.description}</p>

          {/* Reasons */}
          <div className="flex flex-wrap gap-2 mt-4">
            {reasons.map((reason: string, i: number) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/10 text-slate-300">
                {reason}
              </span>
            ))}
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {Object.entries(breakdown).map(([key, value]: [string, any]) => (
              <div key={key} className="text-center">
                <div className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                <div className="text-sm font-semibold text-white">{value}</div>
                <div className="h-1 rounded-full bg-white/10 mt-1 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick stats + actions */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <span className="text-xs text-slate-400">{nearbyAvailable} available nearby</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">{totalTerritories} territories total</span>
            <div className="ml-auto flex gap-2">
              <Link to={`/map/${brand.slug}`}>
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs">
                  <MapPin className="w-3 h-3 mr-1" /> Map
                </Button>
              </Link>
              <Link to={`/brand/${brand.slug}`}>
                <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-xs">
                  Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiscoverPage;
