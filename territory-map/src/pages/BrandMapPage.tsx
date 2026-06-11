import { useState } from "react";
import { useQuery } from "convex/react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { BrandStateMap } from "@/components/BrandStateMap";
import { PublicNav } from "@/components/PublicNav";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { ArrowLeft, MapPin, ExternalLink, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmbedCodeDialog } from "@/components/EmbedCodeDialog";

export function BrandMapPage() {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const brand = useQuery(api.brands.getBySlug, brandSlug ? { slug: brandSlug } : "skip");
  const territories = useQuery(
    api.territories.listByBrand,
    brand ? { brandId: brand._id } : "skip"
  );
  // State-level availability — franchisors open STATES; most brands have no
  // city-pin territories, so this is usually the only real map data.
  const stateAvailability = useQuery(
    api.stateAvailability.getByBrand,
    brand ? { brandId: brand._id } : "skip"
  );
  const myProfile = useQuery(api.users.getMyProfile);
  const [embedOpen, setEmbedOpen] = useState(false);

  // Embed only for: FKI admins (any brand) OR franchisor who owns THIS brand
  const canEmbed = (() => {
    if (!myProfile) return false;
    if (myProfile.isAdmin || myProfile.isSuperAdmin) return true;
    if (myProfile.isFranchisor && brand && myProfile.brandIds?.includes(brand._id)) return true;
    return false;
  })();

  if (brand === undefined || territories === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading map...</div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Brand Not Found</h1>
          <p className="text-slate-400 mb-6">The brand "{brandSlug}" doesn't exist.</p>
          <Link to="/">
            <Button>← Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Status counts
  const statusCounts: Record<string, number> = {};
  (territories || []).forEach((t: any) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });
  const stateRows = stateAvailability ?? [];
  const openStates = stateRows.filter((r: any) => r.status === "open");
  const hasPins = (territories || []).length > 0;
  const hasStates = stateRows.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicNav />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Brand Info Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-extrabold mb-2">{brand.name} Territory Map</h2>
              <p className="text-slate-400 max-w-2xl">{brand.description}</p>
            </div>
            <div className="flex gap-3">
              {brand.websiteUrl && (
                <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                    <ExternalLink className="w-3 h-3 mr-1" /> Website
                  </Button>
                </a>
              )}
              {canEmbed && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setEmbedOpen(true)}
                >
                  <Code2 className="w-3 h-3 mr-1" /> Embed
                </Button>
              )}
              <Link to={`/brand/${brand.slug}`}>
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  View Full Profile
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Stats — pin statuses when pins exist; state availability otherwise */}
          {hasPins ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div
                  key={status}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-slate-400 uppercase tracking-wide">
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
                </div>
              ))}
            </div>
          ) : hasStates ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#10b981" }} />
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Open States</span>
                </div>
                <div className="text-2xl font-bold">{openStates.length}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  <span className="text-xs text-slate-400 uppercase tracking-wide">FDD-Registered</span>
                </div>
                <div className="text-2xl font-bold">
                  {stateRows.filter((r: any) => r.status === "registered").length}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center col-span-2 md:col-span-1">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Specific Territories</span>
                </div>
                <div className="text-sm font-semibold text-slate-300 mt-1.5">Confirmed when you inquire</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ONE map engine — the same BrandStateMap (state shading + city pins,
            same two tables) used on the brand profile. No second engine. */}
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <BrandStateMap
            territories={(territories || []) as any}
            stateAvailability={stateRows as any}
            brandName={brand.name}
            height="600px"
          />
        </div>

        {/* State list — pin-less brands get the open-states picture instead */}
        {!hasPins && hasStates && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              Open for New Franchisees ({openStates.length} states)
            </h3>
            <div className="flex flex-wrap gap-2">
              {openStates
                .map((r: any) => r.state)
                .sort()
                .map((st: string) => (
                  <span
                    key={st}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    {st}
                  </span>
                ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Green states are open for new franchisees — specific territories are confirmed when you inquire.
            </p>
          </div>
        )}

        {/* Territory List */}
        {hasPins && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            All Territories ({territories?.length || 0})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(territories || []).map((t: any) => (
              <div
                key={t._id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors"
              >
                <div>
                  <div className="font-medium">
                    {t.city}, {t.state}
                  </div>
                  {t.notes && (
                    <div className="text-xs text-slate-500 mt-1">{t.notes}</div>
                  )}
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${STATUS_COLORS[t.status]}20`,
                    color: STATUS_COLORS[t.status],
                  }}
                >
                  {STATUS_LABELS[t.status] || t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {brandSlug && (
        <EmbedCodeDialog
          open={embedOpen}
          onOpenChange={setEmbedOpen}
          brandSlug={brandSlug}
          brandName={brand.name}
          brandColor={brand.color}
        />
      )}
    </div>
  );
}
