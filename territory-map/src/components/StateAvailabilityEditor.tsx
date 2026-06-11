import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Map, Loader2, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// All 50 states + DC, alphabetical by 2-letter code
const US_STATES = [
  "AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL",
  "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA",
  "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE",
  "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV",
  "WY",
] as const;

type StateStatus = "open" | "registered" | "closed";

const CYCLE: Record<StateStatus, StateStatus> = {
  open: "registered",
  registered: "closed",
  closed: "open",
};

const CHIP_STYLES: Record<StateStatus | "none", string> = {
  open: "bg-emerald-500/90 text-white border-emerald-400/50 hover:bg-emerald-400",
  registered: "bg-amber-500/90 text-white border-amber-400/50 hover:bg-amber-400",
  closed: "bg-slate-600/90 text-slate-200 border-slate-500/50 hover:bg-slate-500",
  none: "bg-transparent text-slate-400 border-white/15 hover:border-white/40 hover:text-white",
};

export function StateAvailabilityEditor({
  brand,
  onClose,
}: {
  brand: { _id: string; name: string } | null;
  onClose: () => void;
}) {
  const rows = useQuery(
    api.stateAvailability.getByBrand,
    brand ? { brandId: brand._id as Id<"brands"> } : "skip"
  );
  const bulkSetStates = useMutation(api.stateAvailability.bulkSetStates);

  const [statuses, setStatuses] = useState<Record<string, StateStatus>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  // Hydrate local grid from server data when the editor opens for a brand
  useEffect(() => {
    if (!brand) {
      setHydratedFor(null);
      setStatuses({});
      setDirty(false);
      return;
    }
    if (rows && hydratedFor !== brand._id) {
      const next: Record<string, StateStatus> = {};
      for (const r of rows) next[r.state] = r.status;
      setStatuses(next);
      setHydratedFor(brand._id);
      setDirty(false);
    }
  }, [brand, rows, hydratedFor]);

  const lastUpdated = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    return rows.reduce<string | null>(
      (max, r) => (r.updatedAt && (!max || r.updatedAt > max) ? r.updatedAt : max),
      null
    );
  }, [rows]);

  const counts = useMemo(() => {
    const c = { open: 0, registered: 0, closed: 0 };
    for (const s of Object.values(statuses)) c[s]++;
    return c;
  }, [statuses]);

  function cycleState(code: string) {
    setStatuses((prev) => {
      const current = prev[code];
      return { ...prev, [code]: current ? CYCLE[current] : "open" };
    });
    setDirty(true);
  }

  function clearState(code: string) {
    setStatuses((prev) => {
      if (!(code in prev)) return prev;
      const next = { ...prev };
      delete next[code];
      return next;
    });
    setDirty(true);
  }

  function setAll(status: StateStatus) {
    const next: Record<string, StateStatus> = {};
    for (const code of US_STATES) next[code] = status;
    setStatuses(next);
    setDirty(true);
  }

  function resetToServer() {
    const next: Record<string, StateStatus> = {};
    for (const r of rows ?? []) next[r.state] = r.status;
    setStatuses(next);
    setDirty(false);
  }

  async function handleSave() {
    if (!brand) return;
    const entries = Object.entries(statuses).map(([state, status]) => ({ state, status }));
    if (entries.length === 0) {
      toast.error("No states set — click a state chip to set its status first.");
      return;
    }
    setSaving(true);
    try {
      const result = await bulkSetStates({
        brandId: brand._id as Id<"brands">,
        entries,
      });
      toast.success(`Saved state availability for ${brand.name} (${result.written} states)`);
      setDirty(false);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save state availability");
    } finally {
      setSaving(false);
    }
  }

  const loading = !!brand && rows === undefined;

  return (
    <Dialog open={!!brand} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" /> State Availability — {brand?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Legend */}
        <p className="text-xs text-slate-400 -mt-1">
          <span className="text-emerald-400 font-medium">Open</span> = actively selling there ·{" "}
          <span className="text-amber-400 font-medium">Registered</span> = FDD-registered, not a focus ·{" "}
          <span className="text-slate-300 font-medium">Closed</span> = not available. Click a state to cycle; right-click to clear.
        </p>

        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
            <p className="text-sm">Loading state data...</p>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            {/* Bulk actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setAll("open")}
              >
                Open all
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => setAll("registered")}
              >
                Set all registered
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-white/10 text-slate-300 hover:bg-white/10"
                onClick={() => setAll("closed")}
              >
                Close all
              </Button>
              <div className="flex-1" />
              {dirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-400 hover:text-white"
                  onClick={resetToServer}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </Button>
              )}
            </div>

            {/* State chip grid */}
            <div className="grid grid-cols-8 gap-1.5">
              {US_STATES.map((code) => {
                const status = statuses[code];
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => cycleState(code)}
                    onContextMenu={(e) => { e.preventDefault(); clearState(code); }}
                    title={status ? `${code}: ${status} (click to cycle, right-click to clear)` : `${code}: no data (click to set open)`}
                    className={`h-8 rounded-md border text-xs font-semibold tracking-wide transition-colors select-none ${CHIP_STYLES[status ?? "none"]}`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>

            {/* Counts */}
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="text-emerald-400 font-medium">{counts.open} open</span>
              <span className="text-amber-400 font-medium">{counts.registered} registered</span>
              <span className="text-slate-400 font-medium">{counts.closed} closed</span>
              <span className="text-slate-600">{51 - counts.open - counts.registered - counts.closed} unset</span>
              <div className="flex-1" />
              {lastUpdated && (
                <span className="text-slate-500">Last updated {lastUpdated}</span>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="outline" className="border-white/10" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !dirty}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
