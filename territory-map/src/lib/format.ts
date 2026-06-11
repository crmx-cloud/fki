/**
 * Canonical money formatter — THE one way dollar amounts render in the app.
 *   $850        (< $1K)
 *   $568K       (< $1M)
 *   $1.41M      (>= $1M, one decimal, trailing .0 dropped → $2M)
 * Never "$1406K".
 */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const v = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    const s = m >= 100 ? Math.round(m).toString() : m.toFixed(m % 1 < 0.05 || m % 1 > 0.95 ? 0 : 1);
    return `${sign}$${parseFloat(s)}M`;
  }
  if (v >= 1_000) return `${sign}$${Math.round(v / 1_000)}K`;
  return `${sign}$${Math.round(v)}`;
}

/** "$304K–$751K" / "$1.41M–$2.64M"; single value when min === max or max missing. */
export function formatMoneyRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (min == null && max == null) return "—";
  if (min == null) return formatMoney(max);
  if (max == null || max === min) return formatMoney(min);
  return `${formatMoney(min)}–${formatMoney(max)}`;
}
