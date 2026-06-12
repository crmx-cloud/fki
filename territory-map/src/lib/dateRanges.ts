/**
 * Date-range presets for the KPI dashboard. All ranges are [start, end)
 * in ms epoch, local time. `bucket` controls chart grouping density:
 * 1-day ranges → hour, ≤62 days → day, ≤200 days → week, else month.
 * The "previous period" (for % comparisons) is the same-length window
 * immediately before `start` — computed in convex/adminMetrics.ts.
 */
export type RangeKey =
  | "today" | "yesterday" | "this_week" | "last_week" | "last_7" | "last_30"
  | "this_month" | "last_month" | "this_quarter" | "last_quarter"
  | "this_year" | "last_year" | "custom";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This week" },
  { key: "last_week", label: "Last week" },
  { key: "last_7", label: "Last 7 days" },
  { key: "last_30", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_quarter", label: "This quarter" },
  { key: "last_quarter", label: "Last quarter" },
  { key: "this_year", label: "This year" },
  { key: "last_year", label: "Last year" },
  { key: "custom", label: "Custom range" },
];

const DAY = 86400_000;

export function computeRange(
  key: RangeKey,
  custom?: { from?: string; to?: string }
): { start: number; end: number; bucket: "hour" | "day" | "week" | "month" } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const monday = today - ((now.getDay() + 6) % 7) * DAY;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), qStartMonth, 1).getTime();
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

  let start: number, end: number;
  switch (key) {
    case "today": start = today; end = today + DAY; break;
    case "yesterday": start = today - DAY; end = today; break;
    case "this_week": start = monday; end = monday + 7 * DAY; break;
    case "last_week": start = monday - 7 * DAY; end = monday; break;
    case "last_7": start = today - 6 * DAY; end = today + DAY; break;
    case "last_30": start = today - 29 * DAY; end = today + DAY; break;
    case "this_month": start = monthStart; end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(); break;
    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      end = monthStart; break;
    case "this_quarter": start = quarterStart; end = new Date(now.getFullYear(), qStartMonth + 3, 1).getTime(); break;
    case "last_quarter":
      start = new Date(now.getFullYear(), qStartMonth - 3, 1).getTime();
      end = quarterStart; break;
    case "this_year": start = yearStart; end = new Date(now.getFullYear() + 1, 0, 1).getTime(); break;
    case "last_year":
      start = new Date(now.getFullYear() - 1, 0, 1).getTime();
      end = yearStart; break;
    case "custom": {
      start = custom?.from ? new Date(`${custom.from}T00:00:00`).getTime() : today - 29 * DAY;
      end = custom?.to ? new Date(`${custom.to}T00:00:00`).getTime() + DAY : today + DAY;
      if (end <= start) end = start + DAY;
      break;
    }
  }
  const days = (end - start) / DAY;
  const bucket = days <= 2 ? "hour" : days <= 62 ? "day" : days <= 200 ? "week" : "month";
  return { start, end, bucket };
}
