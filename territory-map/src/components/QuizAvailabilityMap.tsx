import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { BrandStateMap, type StateAvailabilityRow } from "@/components/BrandStateMap";
import { Reveal } from "@/components/Reveal";

/**
 * "Availability where you are" — the Zillow moment on the quiz results screen.
 *
 * Embeds the brand-page state-availability map, centered on the user's quiz
 * location, with a pulsing "you are here" dot, brand-switcher chips for the
 * top picks, an honest per-state status line, and one CTA to the brand page.
 *
 * The Leaflet map itself stays OUTSIDE any opacity/transform animation
 * (same constraint the brand page solved) — only headings get <Reveal>.
 */

interface QuizMapBrand {
  _id: Id<"brands">;
  name: string;
  slug: string;
  color?: string;
  logoUrl?: string;
}

interface QuizAvailabilityMapProps {
  /** Up to 3 brands (top picks first). */
  brands: QuizMapBrand[];
  city: string;
  /** Full state name, e.g. "Texas". */
  state: string;
  /** 2-letter code, e.g. "TX". */
  stateAbbr: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
}

/** Radius-aware zoom: tighter radius → closer zoom. */
function zoomForRadius(miles: number): number {
  if (miles <= 10) return 10;
  if (miles <= 25) return 9;
  if (miles <= 50) return 8;
  if (miles <= 100) return 7;
  return 6;
}

const EMPTY_ROWS: StateAvailabilityRow[] = [];
const EMPTY_TERRITORIES: any[] = [];

export function QuizAvailabilityMap({
  brands,
  city,
  state,
  stateAbbr,
  latitude,
  longitude,
  radiusMiles,
}: QuizAvailabilityMapProps) {
  const [selected, setSelected] = useState(0);
  // Lazy-load chips: a brand's data is only queried once its chip has been opened.
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));

  const selectBrand = (i: number) => {
    setLoaded((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
    setSelected(i);
  };

  // Fixed hook slots for up to 3 brands, skip-gated until their chip is clicked.
  const sa0 = useQuery(
    api.stateAvailability.getByBrand,
    brands[0] && loaded.has(0) ? { brandId: brands[0]._id } : "skip"
  );
  const sa1 = useQuery(
    api.stateAvailability.getByBrand,
    brands[1] && loaded.has(1) ? { brandId: brands[1]._id } : "skip"
  );
  const sa2 = useQuery(
    api.stateAvailability.getByBrand,
    brands[2] && loaded.has(2) ? { brandId: brands[2]._id } : "skip"
  );
  const t0 = useQuery(
    api.territories.listByBrand,
    brands[0] && loaded.has(0) ? { brandId: brands[0]._id } : "skip"
  );
  const t1 = useQuery(
    api.territories.listByBrand,
    brands[1] && loaded.has(1) ? { brandId: brands[1]._id } : "skip"
  );
  const t2 = useQuery(
    api.territories.listByBrand,
    brands[2] && loaded.has(2) ? { brandId: brands[2]._id } : "skip"
  );

  const brand = brands[selected];
  if (!brand) return null;

  const stateRows = [sa0, sa1, sa2][selected];
  const territories = [t0, t1, t2][selected];
  const isLoading = stateRows === undefined || territories === undefined;

  // ── Status line for the user's state ──
  const code = stateAbbr.toUpperCase();
  const myRow = (stateRows ?? []).find((r: any) => String(r.state).toUpperCase() === code);

  let statusLine: ReactNode;
  if (isLoading) {
    statusLine = <span className="text-slate-500">Checking {brand.name} availability in {state}…</span>;
  } else if (myRow?.status === "open") {
    statusLine = (
      <span className="text-emerald-400">
        ✓ {brand.name} is open for new franchisees in {state} — your territory is confirmed on inquiry
      </span>
    );
  } else if (myRow?.status === "registered") {
    statusLine = (
      <span className="text-amber-400">
        {brand.name} is FDD-registered in {state} — inquire about timing
      </span>
    );
  } else if (myRow?.status === "closed") {
    statusLine = (
      <span className="text-slate-400">
        {brand.name} is not currently available in {state} — see your other matches
      </span>
    );
  } else {
    statusLine = (
      <span className="text-slate-400">
        State availability not yet published — inquire for current openings
      </span>
    );
  }

  // ── Scarcity-honest line: real operating locations in the user's state ──
  const operatingInState = (territories ?? []).filter(
    (t: any) =>
      t.status === "open" &&
      (String(t.state || "").toUpperCase() === code ||
        String(t.state || "").toUpperCase() === state.toUpperCase())
  ).length;

  return (
    <div className="mb-8">
      {/* Heading + status + chips — revealed; the map below is NOT animated */}
      <Reveal>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-cyan-300">
            Availability around {city}, {state}
          </h2>
        </div>
        <p className="text-sm mb-3">{statusLine}</p>

        {brands.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {brands.map((b, i) => (
              <button
                key={b._id}
                onClick={() => selectBrand(i)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selected === i
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                    : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt="" className="w-4 h-4 rounded-sm object-cover bg-white/10" />
                ) : (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: b.color || "#06b6d4" }}
                  />
                )}
                {b.name}
              </button>
            ))}
          </div>
        )}
      </Reveal>

      {/* Map — framed in a dark rounded card; light tiles inside */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
        <BrandStateMap
          territories={(territories ?? EMPTY_TERRITORIES) as any}
          stateAvailability={(stateRows ?? EMPTY_ROWS) as StateAvailabilityRow[]}
          brandName={brand.name}
          height="380px"
          center={[latitude, longitude]}
          zoom={zoomForRadius(radiusMiles)}
          userLocation={{ latitude, longitude, label: `You — ${city}, ${stateAbbr}` }}
          showNoDataNote={false}
        />
      </div>

      {/* Scarcity line + single CTA */}
      <Reveal className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-400">
          {operatingInState > 0
            ? `${operatingInState} location${operatingInState === 1 ? "" : "s"} already operating in ${state}`
            : ""}
        </p>
        <Link to={`/brand/${brand.slug}`} className="shrink-0">
          <Button className="bg-cyan-600 hover:bg-cyan-500 text-white">
            Check my territory <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </Reveal>
    </div>
  );
}
