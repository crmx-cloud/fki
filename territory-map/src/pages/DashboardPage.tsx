import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import { MapPin, Building2, ArrowRight, Map, Globe, TrendingUp } from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  available:     { color: "#e879f9", label: "Available" },
  high_interest: { color: "#fbbf24", label: "High Interest" },
  pending_award: { color: "#f97316", label: "Pending Award" },
  sold:          { color: "#ef4444", label: "Sold" },
  open:          { color: "#22d3ee", label: "Open" },
};

export function DashboardPage() {
  const allBrands = useQuery(api.brands.listAll);
  const allTerritories = useQuery(api.territories.listAll);
  const myProfile = useQuery(api.users.getMyProfile);

  // Brand-scoped filtering for brand_admin users
  const isBrandAdmin = myProfile?.isBrandAdmin;
  const accessibleBrandIds = myProfile?.brandIds || [];

  const brands = isBrandAdmin
    ? allBrands?.filter((b) => accessibleBrandIds.includes(b._id))
    : allBrands;

  const territories = isBrandAdmin
    ? allTerritories?.filter((t) => accessibleBrandIds.includes(t.brandId))
    : allTerritories;

  const totalTerritories = territories?.length || 0;
  const totalBrands = brands?.length || 0;

  const brandStats = brands?.map((brand) => {
    const bt = territories?.filter((t) => t.brandId === brand._id) || [];
    const counts: Record<string, number> = {};
    bt.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return { brand, counts, total: bt.length };
  });

  const overallCounts: Record<string, number> = {};
  territories?.forEach((t) => { overallCounts[t.status] = (overallCounts[t.status] || 0) + 1; });

  return (
    <div className="space-y-8 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {isBrandAdmin
            ? `Territory overview for your brand${accessibleBrandIds.length > 1 ? "s" : ""}`
            : "Territory overview across all brands"}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Building2} iconColor="#a855f7" label="Brands" value={totalBrands} />
        <StatCard icon={MapPin} iconColor="#e879f9" label="Territories" value={totalTerritories} />
        <StatCard icon={TrendingUp} iconColor="#22c55e" label="Available" value={overallCounts.available || 0} />
        <StatCard icon={Globe} iconColor="#ef4444" label="Sold" value={overallCounts.sold || 0} />
      </div>

      {/* Status bar */}
      <div className="bg-card border rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Status Breakdown</h2>
        <div className="flex gap-1 mb-4 h-2 rounded-full overflow-hidden bg-muted/30">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const count = overallCounts[status] || 0;
            const pct = totalTerritories > 0 ? (count / totalTerritories) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={status}
                className="h-full rounded-full transition-all duration-500"
                style={{ backgroundColor: cfg.color, width: `${pct}%`, minWidth: pct > 0 ? "4px" : 0 }}
                title={`${cfg.label}: ${count}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
              <span className="text-xs font-semibold">{overallCounts[status] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Brand cards */}
      <div>
        <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Brands</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {brandStats?.map(({ brand, counts, total }) => (
            <div key={brand._id} className="bg-card border rounded-2xl p-5 hover:border-foreground/10 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${brand.color || "#64748b"}15` }}>
                    <Building2 className="w-4.5 h-4.5" style={{ color: brand.color || "#64748b" }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{brand.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{brand.category}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-muted-foreground">{total}</span>
              </div>

              {/* Mini status bars */}
              <div className="space-y-1.5 mb-4">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                  const count = counts[status] || 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-20 truncate">{cfg.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ backgroundColor: cfg.color, width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/map/${brand.slug}`}
                  className="flex-1 text-center text-xs px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                >
                  Map
                </Link>
                <Link
                  to="/territories"
                  className="flex-1 text-center text-xs px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-3">
        <QuickLink to="/territories" icon={MapPin} color="#10b981" title="Manage Territories" desc="Add, edit, import, and update status" />
        <QuickLink to="/brands" icon={Building2} color="#a855f7" title="Manage Brands" desc="Add and edit brand details" />
        <QuickLink to="/explore" icon={Map} color="#f59e0b" title="Public Marketplace" desc="See the consumer-facing view" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, label, value }: { icon: any; iconColor: string; label: string; value: number }) {
  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, color, title, desc }: { to: string; icon: any; color: string; title: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 bg-card border rounded-2xl p-4 hover:bg-accent/50 transition-colors group">
      <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

export default DashboardPage;
