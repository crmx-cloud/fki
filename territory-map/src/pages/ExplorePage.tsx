import { useQuery } from "convex/react";
import { formatMoney, formatMoneyRange } from "@/lib/format";
import { api } from "../../convex/_generated/api";
import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { AvailabilityLine } from "@/components/AvailabilityLine";
import { STATE_ABBREVS } from "@/lib/us-states-geo";
import { SaveBrandButton } from "@/components/SaveBrandButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, X, LayoutGrid, List } from "lucide-react";

const VIEW_MODE_KEY = "explore-view-mode";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function BrandLogo({ brand, size }: { brand: any; size: number }) {
  const color = brand.color || "#06b6d4";
  const [failed, setFailed] = useState(false);
  if (brand.logoUrl && !failed) {
    return (
      <img
        src={brand.logoUrl}
        alt={`${brand.name} logo`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="rounded-lg object-contain bg-white/5 ring-1 ring-white/10 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-lg flex items-center justify-center font-bold shrink-0 ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}40`,
        color,
        fontSize: size * 0.35,
      }}
    >
      {getInitials(brand.name)}
    </div>
  );
}

export function ExplorePage() {
  // Personalize availability to the signed-in user's state (profile territory
  // first, contact state as fallback) — full names normalize to 2-letter codes.
  const prospectProfile = useQuery(api.prospect.getMyProspectProfile);
  const rawState: string = prospectProfile?.primaryState || (prospectProfile as any)?.state || "";
  const userStateCode = rawState.length === 2 ? rawState.toUpperCase() : STATE_ABBREVS[rawState] ?? undefined;
  const userStateName = rawState || undefined;
  const brands = useQuery(api.marketplace.listBrandsWithTerritories, userStateCode ? { stateCode: userStateCode } : {});
  const categories = useQuery(api.marketplace.listCategories);
  const savedIds = useQuery(api.savedItems.getMySavedBrandIds);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    (searchParams.get("category") || "").split(",").filter(Boolean)
  );

  const toggleCategory = (slug: string) =>
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "card";
    } catch {
      return "card";
    }
  });

  const changeViewMode = (mode: "card" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const isAuthenticated = savedIds !== undefined && savedIds !== null;

  const filteredBrands = brands?.filter((b: any) => {
    const matchesSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.description || "").toLowerCase().includes(search.toLowerCase());
    const brandSlug = (b.category || "").toLowerCase().replace(/\s+/g, "-").replace("&", "").replace("--", "-");
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some(
        (slug) =>
          brandSlug === slug ||
          (b.category || "").toLowerCase().includes(slug.replace("-", " "))
      );
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white motion-page">
      <PublicNav />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold mb-2">Explore Franchise Brands</h1>
            <p className="text-slate-400">Browse franchise opportunities with available territories</p>
          </div>
          {(brands?.length ?? 0) > 0 && (
            <div className="text-right">
              <div className="text-4xl font-extrabold text-cyan-400">
                <CountUp value={brands!.length} />
              </div>
              <div className="text-sm text-slate-400 mt-1">Active Brands</div>
            </div>
          )}
        </Reveal>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands..."
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          {selectedCategories.length > 0 && (
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setSelectedCategories([])}
            >
              <X className="w-3 h-3 mr-1" />
              Clear {selectedCategories.length > 1 ? `${selectedCategories.length} categories` : selectedCategories[0].replace(/-/g, " ")}
            </Button>
          )}
        </div>

        {/* Category filters + view toggle */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {(categories || []).map((cat: any) => (
            <button
              key={cat._id}
              onClick={() => toggleCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                selectedCategories.includes(cat.slug)
                  ? "bg-cyan-600 text-white"
                  : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => changeViewMode("card")}
              aria-label="Card view"
              className={`p-2 rounded-md transition-colors ${
                viewMode === "card"
                  ? "bg-cyan-600 text-white tab-active-pop"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => changeViewMode("list")}
              aria-label="List view"
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-cyan-600 text-white tab-active-pop"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Brand results */}
        {!filteredBrands ? (
          <div className="text-center py-16 text-slate-500">Loading brands...</div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            No brands match your search. Try different criteria.
          </div>
        ) : viewMode === "card" ? (
          <Reveal stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand: any) => (
              <div
                key={brand._id}
                className="card-lift bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-cyan-500/30 group relative"
              >
                {/* Save heart — top-right overlay */}
                <SaveBrandButton
                  brandId={brand._id}
                  savedBrandIds={savedIds ?? []}
                  variant="overlay"
                  className="absolute top-4 right-4 z-10"
                />

                <div className="flex items-start gap-3 mb-3 pr-8">
                  <Link to={`/brand/${brand.slug}`} className="shrink-0">
                    <BrandLogo brand={brand} size={48} />
                  </Link>
                  <div>
                    <Link to={`/brand/${brand.slug}`}>
                      <h3 className="text-lg font-bold group-hover:text-cyan-400 hover:text-cyan-400 transition-colors cursor-pointer">
                        {brand.name}
                      </h3>
                    </Link>
                    {brand.category && (
                      <Badge className="mt-1 bg-white/10 text-slate-300 border-0 text-xs">
                        {brand.category}
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                  {brand.description}
                </p>

                <AvailabilityLine
                  className="mb-4"
                  openStateCount={brand.openStateCount}
                  availableInState={brand.availableInState}
                  stateName={userStateName}
                  availableTerritories={brand.availableTerritories}
                />

                {brand.investmentMin && (
                  <div className="text-xs text-slate-500 mb-4">
                    Investment: {formatMoneyRange(brand.investmentMin, brand.investmentMax)}
                  </div>
                )}

                <div className="flex gap-2">
                  <Link to={`/brand/${brand.slug}`} className="flex-1">
                    <Button size="sm" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">
                      Details
                    </Button>
                  </Link>
                  <Link to={`/map/${brand.slug}`}>
                    <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <MapPin className="w-3 h-3 mr-1" /> View Map
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </Reveal>
        ) : (
          <Reveal stagger className="flex flex-col gap-2">
            {filteredBrands.map((brand: any) => (
              <div
                key={brand._id}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/[0.07] hover:border-cyan-500/30 transition-all group flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Link to={`/brand/${brand.slug}`} className="shrink-0">
                    <BrandLogo brand={brand} size={32} />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link to={`/brand/${brand.slug}`} className="min-w-0">
                        <h3 className="font-bold truncate group-hover:text-cyan-400 hover:text-cyan-400 transition-colors cursor-pointer">
                          {brand.name}
                        </h3>
                      </Link>
                      {brand.category && (
                        <Badge className="bg-white/10 text-slate-300 border-0 text-xs shrink-0 hidden sm:inline-flex">
                          {brand.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm shrink-0">
                  <AvailabilityLine
                    openStateCount={brand.openStateCount}
                    availableInState={brand.availableInState}
                    stateName={userStateName}
                  />
                  {brand.investmentMin && (
                    <span className="text-xs text-slate-500 hidden lg:inline">
                      Investment: {formatMoneyRange(brand.investmentMin, brand.investmentMax)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <SaveBrandButton
                    brandId={brand._id}
                    savedBrandIds={savedIds ?? []}
                  />
                  <Link to={`/brand/${brand.slug}`}>
                    <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                      Details
                    </Button>
                  </Link>
                  <Link to={`/map/${brand.slug}`}>
                    <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <MapPin className="w-3 h-3 mr-1" /> View Map
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </Reveal>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
