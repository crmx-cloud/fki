/**
 * Consumer-facing availability line for brand cards — answers the only
 * territory question a buyer actually has: "can I get this where I am?"
 * Replaces the legacy MapKI-era "141 territories / 103 available" counters.
 * Data comes from the same stateAvailability table as the maps and matcher.
 */
export function AvailabilityLine({
  openStateCount,
  availableInState,
  stateName,
  availableTerritories,
  className = "",
}: {
  openStateCount: number;
  /** true = open in user's state · false = has data, not open there · null/undefined = unknown */
  availableInState?: boolean | null;
  /** Full state name for personalized copy (e.g. "Florida") */
  stateName?: string;
  /** Legacy mapped territory pins (only a few brands have these) */
  availableTerritories?: number;
  className?: string;
}) {
  let dot: string;
  let text: string;
  let color: string;

  if (stateName && availableInState === true) {
    dot = "bg-emerald-400";
    color = "text-emerald-400";
    text = `Available in ${stateName}`;
  } else if (stateName && availableInState === false && openStateCount > 0) {
    dot = "bg-slate-500";
    color = "text-slate-400";
    text = `Not currently offered in ${stateName} · open in ${openStateCount} other state${openStateCount === 1 ? "" : "s"}`;
  } else if (openStateCount >= 50) {
    dot = "bg-emerald-400";
    color = "text-emerald-400";
    text = "Open in all 50 states";
  } else if (openStateCount > 0) {
    dot = "bg-emerald-400";
    color = "text-emerald-400";
    text = `Open in ${openStateCount} state${openStateCount === 1 ? "" : "s"}`;
  } else {
    dot = "bg-amber-400";
    color = "text-amber-400";
    text = stateName ? "Availability unknown — inquire to confirm" : "Availability on request";
  }

  return (
    <div className={`text-sm ${className}`}>
      <span className={`inline-flex items-center gap-1.5 font-medium ${color}`}>
        <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
        {text}
      </span>
      {(availableTerritories ?? 0) > 0 && (
        <span className="block text-xs text-slate-500 mt-0.5 ml-3.5">
          {availableTerritories} open territories mapped
        </span>
      )}
    </div>
  );
}
