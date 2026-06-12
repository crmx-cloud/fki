import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Users, BadgeCheck, Building2, Database,
  Headset, DollarSign, Target, Activity, PieChart, Download, Plus, Trash2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RANGE_OPTIONS, computeRange, type RangeKey } from "@/lib/dateRanges";
import { formatMoney } from "@/lib/format";

/**
 * Executive KPI / acquisition-readiness dashboard (admin + super admin).
 * All metric definitions live in convex/metricsDefs.ts; this page only
 * presents what convex/adminMetrics.ts aggregates.
 */

const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-US");
const fmtUsd = (n: number | null | undefined) =>
  n == null ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const fmtHours = (h: number | null | undefined) => {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} hrs`;
  return `${Math.round((h / 24) * 10) / 10} days`;
};

// ── Building blocks ─────────────────────────────────────────────────────
function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0 && cur === 0) return <span className="text-xs text-muted-foreground">—</span>;
  if (prev === 0) return <span className="text-xs text-emerald-400 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />new</span>;
  const d = Math.round(((cur - prev) / prev) * 1000) / 10;
  const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  const color = d > 0 ? "text-emerald-400" : d < 0 ? "text-red-400" : "text-muted-foreground";
  return (
    <span className={`text-xs ${color} flex items-center gap-0.5`}>
      <Icon className="w-3 h-3" />
      {d > 0 ? "+" : ""}{d}%
    </span>
  );
}

function GrandTotal({ icon: Icon, label, value, accent, hint }: {
  icon: any; label: string; value: string; accent: string; hint?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center" style={{ background: `${accent}1a` }}>
        <Icon className="w-4.5 h-4.5" style={{ color: accent, width: 18, height: 18 }} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold leading-tight truncate">{value}</div>
        <div className="text-[11px] text-muted-foreground leading-tight truncate" title={hint}>{label}</div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, cur, prev, sub, spark, sparkKey }: {
  label: string; value: string; cur?: number; prev?: number; sub?: string;
  spark?: any[]; sparkKey?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground mt-1.5">{sub}</div>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {cur !== undefined && prev !== undefined && <Delta cur={cur} prev={prev} />}
          {spark && spark.length > 1 && sparkKey && (
            <div className="w-20 h-7">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spark}>
                  <Line type="monotone" dataKey={sparkKey} stroke="#22d3ee" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, right }: { title: string; icon: any; children: any; right?: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
        </h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function PctCard({ label, num, den }: { label: string; num: number; den: number }) {
  const p = den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="text-lg font-bold">{p}%</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
      <div className="mt-2 h-1 rounded bg-white/5"><div className="h-1 rounded bg-cyan-500/70" style={{ width: `${Math.min(p, 100)}%` }} /></div>
      <div className="text-[10px] text-muted-foreground mt-1">{fmtNum(num)} of {fmtNum(den)}</div>
    </div>
  );
}

function ProgressRow({ label, value, target }: { label: string; value: number; target: number }) {
  const p = Math.min(100, Math.round((value / target) * 1000) / 10);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{fmtNum(value)} / {fmtNum(target)} <span className="text-muted-foreground">({p}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${Math.max(p, 0.5)}%` }} />
      </div>
    </div>
  );
}

const chartTheme = {
  grid: "rgba(148,163,184,0.1)",
  tick: { fill: "#94a3b8", fontSize: 11 },
  tooltip: {
    contentStyle: { background: "#0f172a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, fontSize: 12 },
  },
};

function exportCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const cell = (x: any) => `"${String(x ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

// ── Date field: type a date OR pick from a calendar with month/year
//    dropdowns (custom-range filter) ─────────────────────────────────────
function DateField({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  return (
    <div className="flex items-center">
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-36 rounded-r-none"
        aria-label={placeholder}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-l-none border-l-0 shrink-0" aria-label={`Pick ${placeholder} from calendar`}>
            <CalendarIcon className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={new Date(2024, 0)}
            endMonth={new Date(new Date().getFullYear() + 1, 11)}
            onSelect={(d) => {
              if (d) {
                const pad = (n: number) => String(n).padStart(2, "0");
                onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
              }
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────
export function AdminKpiPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("last_30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const range = useMemo(
    () => computeRange(rangeKey, { from: customFrom, to: customTo }),
    [rangeKey, customFrom, customTo]
  );
  const dash = useQuery(api.adminMetrics.dashboard, range);
  const [table, setTable] = useState<"profiles" | "brands" | "sources">("profiles");

  if (dash === undefined) {
    return <div className="p-8 text-muted-foreground">Loading KPI dashboard…</div>;
  }

  const D = dash;
  const q = D.quality.counts;
  const den = D.quality.denominator;
  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === rangeKey)?.label ?? "";

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1500px]">
      {/* ════ Header + global date filter ════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company KPIs</h1>
          <p className="text-sm text-muted-foreground">Acquisition-readiness dashboard — definitions in convex/metricsDefs.ts</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rangeKey === "custom" && (
            <>
              <DateField value={customFrom} onChange={setCustomFrom} placeholder="Start date" />
              <span className="text-muted-foreground text-sm">→</span>
              <DateField value={customTo} onChange={setCustomTo} placeholder="End date" />
            </>
          )}
        </div>
      </div>

      {/* ════ Grand totals (lifetime + selected range) ════ */}
      <div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Lifetime totals</div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <GrandTotal icon={Users} label="Valid profiles" value={fmtNum(D.lifetime.validProfiles)} accent="#22d3ee" hint="Profiles with an email address" />
          <GrandTotal icon={Users} label="Profiles created (all)" value={fmtNum(D.lifetime.profilesAll)} accent="#818cf8" />
          <GrandTotal icon={BadgeCheck} label="Qualified profiles" value={fmtNum(D.lifetime.qualifiedProfiles)} accent="#34d399" hint="Verified + investment + timeline + geography + category" />
          <GrandTotal icon={Building2} label="Brands" value={fmtNum(D.lifetime.brands)} accent="#a855f7" />
          <GrandTotal icon={Database} label="Brands enriched" value={fmtNum(D.lifetime.brandsComplete)} accent="#f59e0b" hint="All critical data points present" />
          <GrandTotal icon={Headset} label="Consultant requests" value={fmtNum(D.lifetime.consultantRequests)} accent="#fb7185" />
        </div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 mt-4">Selected range — {rangeLabel}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GrandTotal icon={Users} label="Profiles created in range" value={fmtNum(D.period.profiles)} accent="#22d3ee" />
          <GrandTotal icon={BadgeCheck} label="Qualified created in range" value={fmtNum(D.period.qualified)} accent="#34d399" />
          <GrandTotal icon={DollarSign} label="Cost / profile" value={D.cost.costPerProfile != null ? fmtUsd(D.cost.costPerProfile) : "—"} accent="#f59e0b" hint="Marketing spend ÷ valid profiles created (range)" />
          <GrandTotal icon={DollarSign} label="Cost / qualified profile" value={D.cost.costPerQualified != null ? fmtUsd(D.cost.costPerQualified) : "—"} accent="#fb7185" hint="Marketing spend ÷ qualified profiles created (range)" />
        </div>
      </div>

      {/* ════ Profile Growth ════ */}
      <Section title="Profile Growth" icon={TrendingUp}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Profiles created" value={fmtNum(D.period.profiles)} cur={D.period.profiles} prev={D.period.profilesPrev} sub="vs previous period" spark={D.series} sparkKey="profiles" />
          <KpiCard label="Qualified created" value={fmtNum(D.period.qualified)} cur={D.period.qualified} prev={D.period.qualifiedPrev} sub="vs previous period" spark={D.series} sparkKey="qualified" />
          <KpiCard label="Profiles this month" value={fmtNum(D.thisMonth.profiles)} sub={D.momGrowth != null ? `${D.momGrowth > 0 ? "+" : ""}${D.momGrowth}% MoM` : "no prior month"} />
          <KpiCard label="Avg / month" value={fmtNum(Math.round(D.readiness.avgProfilesPerMonth))} sub={`${D.readiness.avgQualifiedPerMonth} qualified avg / month`} />
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-3">Profile creation trend — grouped by {range.bucket}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={D.series}>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="key" tick={chartTheme.tick} minTickGap={30} />
                <YAxis tick={chartTheme.tick} allowDecimals={false} width={32} />
                <Tooltip {...chartTheme.tooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="profiles" name="Profiles" stroke="#22d3ee" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="qualified" name="Qualified" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-3">Monthly profile growth (lifetime)</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={D.monthly}>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="key" tick={chartTheme.tick} />
                <YAxis tick={chartTheme.tick} allowDecimals={false} width={32} />
                <Tooltip {...chartTheme.tooltip} />
                <Bar dataKey="profiles" name="Profiles" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                <Bar dataKey="qualified" name="Qualified" fill="#34d399" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* ════ Cost ════ */}
      <Section title="Cost per Profile" icon={DollarSign} right={<SpendManager />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label={`Marketing spend (${rangeLabel})`} value={fmtUsd(D.cost.spendInRange)} cur={D.cost.spendInRange} prev={D.cost.spendInPrev} sub={`Lifetime: ${fmtUsd(D.cost.spendLifetime)}`} />
          <KpiCard label="Cost per profile" value={D.cost.costPerProfile != null ? fmtUsd(D.cost.costPerProfile) : "—"} sub="spend ÷ valid profiles (range)" />
          <KpiCard label="Cost per qualified profile" value={D.cost.costPerQualified != null ? fmtUsd(D.cost.costPerQualified) : "—"} sub="spend ÷ qualified (range)" spark={D.series} sparkKey="costPerQualified" />
          <KpiCard label="Revenue per qualified" value={D.revenue.perQualified != null ? fmtUsd(D.revenue.perQualified) : "—"} sub="attributed revenue ÷ qualified (range)" />
        </div>
      </Section>

      {/* ════ Profile Data Quality ════ */}
      <Section title="Profile Data Quality" icon={PieChart} right={<span className="text-[11px] text-muted-foreground">across all {fmtNum(den)} valid profiles (lifetime)</span>}>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <PctCard label="Email verified" num={q.emailVerified} den={den} />
          <PctCard label="Phone verified" num={q.phoneVerified} den={den} />
          <PctCard label="Both verified" num={q.bothVerified} den={den} />
          <PctCard label="Investment range set" num={q.investment} den={den} />
          <PctCard label="Timeline set" num={q.timeline} den={den} />
          <PctCard label="Timeline < 12 months" num={q.timelineUnder12} den={den} />
          <PctCard label="Location / territory set" num={q.location} den={den} />
          <PctCard label="Category set" num={q.category} den={den} />
          <PctCard label="Funding capacity set" num={q.funding} den={den} />
          <PctCard label="Source attributed" num={q.sourceAttributed} den={den} />
          <PctCard label="Opt-in / consent" num={q.optIn} den={den} />
          <PctCard label="Meets qualified definition" num={q.qualified} den={den} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard label="Avg profile completeness" value={`${D.completeness.avg}%`} sub="of 24 matching fields" spark={D.series} sparkKey="avgCompleteness" />
          <KpiCard label="Profiles ≥ 80% complete" value={fmtNum(D.completeness.above80)} />
          <KpiCard label="Profiles < 50% complete" value={fmtNum(D.completeness.below50)} />
        </div>
      </Section>

      {/* ════ Acquisition Readiness ════ */}
      <Section title="Acquisition Readiness" icon={Target}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total qualified profiles" value={fmtNum(D.readiness.totalQualified)} />
          <KpiCard label="Active qualified (90 days)" value={fmtNum(D.readiness.activeQualified90d)} sub={`target ${fmtNum(D.readiness.active90Target)}`} />
          <KpiCard label="Active qualified (12 months)" value={fmtNum(D.readiness.activeQualified12mo)} sub={`targets ${D.readiness.active12moTargets.map(fmtNum).join(" / ")}`} />
          <KpiCard label="New qualified / month" value={fmtNum(Math.round(D.readiness.avgQualifiedPerMonth))} sub="average across active months" />
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="text-xs text-muted-foreground">Qualified-profile milestones</div>
          {D.readiness.milestones.map((m: number, i: number) => (
            <ProgressRow
              key={m}
              label={["Early strategic asset", "Meaningful acquisition conversation", "Serious acquisition target", "Major strategic asset"][i] ?? ""}
              value={D.readiness.totalQualified}
              target={m}
            />
          ))}
        </div>
      </Section>

      {/* ════ Consultant Intent ════ */}
      <Section title="Consultant Intent" icon={Headset}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total consultant requests" value={fmtNum(D.consultantIntent.totalRequests)} />
          <KpiCard label={`Requests (${rangeLabel})`} value={fmtNum(D.consultantIntent.requestsInRange)} cur={D.consultantIntent.requestsInRange} prev={D.consultantIntent.requestsInPrev} sub="vs previous period" />
          <KpiCard label="% of profiles requesting" value={`${D.consultantIntent.pctProfilesRequesting}%`} />
          <KpiCard label="% of qualified requesting" value={`${D.consultantIntent.pctQualifiedRequesting}%`} />
          <KpiCard label="Avg time to request" value={fmtHours(D.consultantIntent.avgHoursToRequest)} />
          <KpiCard label="Median time to request" value={fmtHours(D.consultantIntent.medianHoursToRequest)} />
          <KpiCard label="Same-day request rate" value={`${D.consultantIntent.sameDayRate}%`} />
          <KpiCard label="7-day / 30-day rate" value={`${D.consultantIntent.within7dRate}% / ${D.consultantIntent.within30dRate}%`} />
        </div>
        {/* Funnel */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs text-muted-foreground mb-4">Buyer funnel (lifetime)</div>
          <div className="space-y-2">
            {D.funnel.map((f: any) => {
              const max = D.funnel[0].count || 1;
              const w = f.count != null ? Math.max((f.count / max) * 100, f.count > 0 ? 4 : 0) : 0;
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <div className="w-44 text-xs text-muted-foreground shrink-0">{f.stage}</div>
                  {f.configured ? (
                    <>
                      <div className="flex-1 h-6 rounded bg-white/5 overflow-hidden">
                        <div className="h-6 rounded bg-gradient-to-r from-cyan-500/80 to-blue-500/80" style={{ width: `${w}%` }} />
                      </div>
                      <div className="w-14 text-right text-sm font-semibold">{fmtNum(f.count)}</div>
                    </>
                  ) : (
                    <div className="flex-1 text-[11px] text-muted-foreground italic border border-dashed border-border rounded px-2 py-1.5">
                      not configured yet
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ════ Revenue Attribution ════ */}
      <Section title="Revenue Attribution" icon={DollarSign} right={<RevenueManager />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total attributed revenue" value={fmtUsd(D.revenue.totalLifetime)} sub={`${fmtNum(D.revenue.entries)} attribution entries`} />
          <KpiCard label={`Revenue (${rangeLabel})`} value={fmtUsd(D.revenue.inRange)} cur={D.revenue.inRange} prev={D.revenue.inPrev} sub="vs previous period" />
          <KpiCard label="Revenue per profile" value={D.revenue.perProfile != null ? fmtUsd(D.revenue.perProfile) : "—"} />
          <KpiCard label="Revenue per consultant request" value={D.revenue.perConsultantRequest != null ? fmtUsd(D.revenue.perConsultantRequest) : "—"} />
        </div>
        {D.revenue.entries === 0 && (
          <p className="text-xs text-muted-foreground">
            No revenue attributed yet. Add entries manually (button above) or wire the GHL sync later — the model
            supports contact ID, pipeline stage, and trigger tag so attribution isn't tied to a single tag.
          </p>
        )}
      </Section>

      {/* ════ Source Performance ════ */}
      <Section title="Source Performance" icon={Activity}>
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                {["Source", "Profiles", "Qualified", "Qual. rate", "Spend", "Cost/profile", "Cost/qualified", "Requests", "Req. rate", "Avg complete", "Revenue", "Rev/qualified"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {D.sources.map((s: any) => (
                <tr key={s.source} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 font-medium">{s.source}</td>
                  <td className="px-3 py-2">{fmtNum(s.profiles)}</td>
                  <td className="px-3 py-2">{fmtNum(s.qualified)}</td>
                  <td className="px-3 py-2">{s.qualificationRate}%</td>
                  <td className="px-3 py-2">{fmtUsd(s.spend)}</td>
                  <td className="px-3 py-2">{s.costPerProfile != null ? fmtUsd(s.costPerProfile) : "—"}</td>
                  <td className="px-3 py-2">{s.costPerQualified != null ? fmtUsd(s.costPerQualified) : "—"}</td>
                  <td className="px-3 py-2">{fmtNum(s.consultantRequests)}</td>
                  <td className="px-3 py-2">{s.requestRate}%</td>
                  <td className="px-3 py-2">{s.avgCompleteness}%</td>
                  <td className="px-3 py-2">{fmtUsd(s.revenue)}</td>
                  <td className="px-3 py-2">{s.revenuePerQualified != null ? fmtUsd(s.revenuePerQualified) : "—"}</td>
                </tr>
              ))}
              {D.sources.length === 0 && (
                <tr><td colSpan={12} className="px-3 py-6 text-center text-muted-foreground text-xs">No profiles yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Spend rows match when marketing-spend "source" equals the attribution bucket (paid_ads, social, email, partner, organic_search, referral, direct).
          UTM capture is live — profiles created before it show as "unknown".
        </p>
      </Section>

      {/* ════ Brand Data Quality ════ */}
      <Section title="Brand Data Quality" icon={Database}>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
          <KpiCard label="Total brands" value={fmtNum(D.brandKpis.total)} />
          <KpiCard label="Complete / enriched" value={fmtNum(D.brandKpis.complete)} sub={`${Math.round((D.brandKpis.complete / Math.max(D.brandKpis.total, 1)) * 100)}% of brands`} />
          <KpiCard label="Avg completeness score" value={`${D.brandKpis.avgCompleteness}%`} />
          <KpiCard label="Missing investment data" value={fmtNum(D.brandKpis.missingInvestment)} />
          <KpiCard label="Missing fee data" value={fmtNum(D.brandKpis.missingFees)} />
          <KpiCard label="Missing territory data" value={fmtNum(D.brandKpis.missingTerritory)} />
          <KpiCard label="Missing source verification" value={fmtNum(D.brandKpis.missingSourceVerification)} />
          <KpiCard label="Outdated verification (>1yr)" value={fmtNum(D.brandKpis.outdatedVerification)} />
          <KpiCard label="With risk flags" value={fmtNum(D.brandKpis.withRiskFlags)} />
          <KpiCard label="With Item 19" value={fmtNum(D.brandKpis.withItem19)} />
        </div>
      </Section>

      {/* ════ Drill-down tables ════ */}
      <Section
        title="Drill-Down Tables"
        icon={Users}
        right={
          <div className="flex gap-1">
            {(["profiles", "brands", "sources"] as const).map((t) => (
              <Button key={t} size="sm" variant={table === t ? "default" : "outline"} onClick={() => setTable(t)} className="capitalize h-7 text-xs">
                {t}
              </Button>
            ))}
          </div>
        }
      >
        {table === "profiles" && <ProfilesTable range={range} />}
        {table === "brands" && <BrandsTable />}
        {table === "sources" && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => exportCsv("source-performance.csv", D.sources)}>
              <Download className="w-3 h-3 mr-1" /> Export CSV
            </Button>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Drill-down: profiles ────────────────────────────────────────────────
function ProfilesTable({ range }: { range: { start: number; end: number } }) {
  const [scope, setScope] = useState<"range" | "all">("all");
  const rows = useQuery(
    api.adminMetrics.profilesTable,
    scope === "range" ? { start: range.start, end: range.end } : {}
  );
  if (!rows) return <div className="text-xs text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex gap-1">
          <Button size="sm" variant={scope === "all" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setScope("all")}>All time</Button>
          <Button size="sm" variant={scope === "range" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setScope("range")}>Selected range</Button>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => exportCsv("profiles.csv", rows as any)}>
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              {["Profile", "Created", "Qualified", "Complete", "Email ✓", "Phone ✓", "Investment", "Timeline", "<12mo", "Category", "Location", "Source", "Consultant req.", "Time to req.", "Revenue"].map((h) => (
                <th key={h} className="px-2.5 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-b border-border/50 last:border-0">
                <td className="px-2.5 py-1.5 font-medium whitespace-nowrap">{r.name}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-2.5 py-1.5">{r.qualified ? <span className="text-emerald-400 font-semibold">Yes</span> : "No"}</td>
                <td className="px-2.5 py-1.5">{r.completeness}%</td>
                <td className="px-2.5 py-1.5">{r.emailVerified ? "✓" : "—"}</td>
                <td className="px-2.5 py-1.5">{r.phoneVerified ? "✓" : "—"}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{r.investment ?? "—"}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{r.timeline ?? "—"}</td>
                <td className="px-2.5 py-1.5">{r.timelineUnder12 ? "✓" : "—"}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{r.categories.slice(0, 2).join(", ") || "—"}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{r.location ?? "—"}</td>
                <td className="px-2.5 py-1.5">{r.source}</td>
                <td className="px-2.5 py-1.5">{r.consultantRequested ? <span className="text-cyan-400 font-semibold">Yes</span> : "—"}</td>
                <td className="px-2.5 py-1.5">{r.hoursToRequest != null ? fmtHours(r.hoursToRequest) : "—"}</td>
                <td className="px-2.5 py-1.5">{r.revenue ? fmtUsd(r.revenue) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={15} className="px-3 py-6 text-center text-muted-foreground">No profiles in this window</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Drill-down: brands ──────────────────────────────────────────────────
function BrandsTable() {
  const rows = useQuery(api.adminMetrics.brandsTable);
  if (!rows) return <div className="text-xs text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => exportCsv("brand-completeness.csv", rows.map((r: any) => ({ ...r, missingCritical: r.missingCritical.join("; ") })) as any)}>
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              {["Brand", "Category", "Score", "Source verified", "Last verified", "Investment", "Royalty", "Item 19", "Risk flags", "Missing critical"].map((h) => (
                <th key={h} className="px-2.5 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-b border-border/50 last:border-0">
                <td className="px-2.5 py-1.5 font-medium whitespace-nowrap">{r.name}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{r.category ?? "—"}</td>
                <td className="px-2.5 py-1.5">
                  <span className={r.score >= 80 ? "text-emerald-400" : r.score >= 60 ? "text-amber-400" : "text-red-400"}>{r.score}%</span>
                </td>
                <td className="px-2.5 py-1.5">{r.sourceVerified ? `✓ (${r.verifiedFieldCount})` : "—"}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{r.lastVerified ?? "—"}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">
                  {r.investmentMin != null ? `${formatMoney(r.investmentMin)}–${formatMoney(r.investmentMax)}` : "—"}
                </td>
                <td className="px-2.5 py-1.5">{r.royaltyPercent != null ? `${r.royaltyPercent}%` : "—"}</td>
                <td className="px-2.5 py-1.5">{r.item19 === true ? "✓" : r.item19 === false ? "✗" : "—"}</td>
                <td className="px-2.5 py-1.5">{r.riskFlags || "—"}</td>
                <td className="px-2.5 py-1.5 text-muted-foreground">{r.missingCritical.join(", ") || "none"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Marketing spend manager ─────────────────────────────────────────────
function SpendManager() {
  const [open, setOpen] = useState(false);
  const rows = useQuery(api.adminMetrics.listSpend, open ? {} : "skip");
  const add = useMutation(api.adminMetrics.addSpend);
  const remove = useMutation(api.adminMetrics.removeSpend);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), source: "paid_ads", campaign: "", amount: "", notes: "" });
  return (
    <div className="relative">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(!open)}>
        <Plus className="w-3 h-3 mr-1" /> Manage spend
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-[440px] bg-card border border-border rounded-xl p-4 shadow-2xl space-y-3">
          <div className="text-xs font-semibold">Add marketing spend</div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["paid_ads", "social", "email", "partner", "organic_search", "referral", "direct", "other"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Campaign (optional)" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
            <Input type="number" placeholder="Amount ($)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button
            size="sm"
            className="w-full"
            disabled={!form.amount || !form.date}
            onClick={async () => {
              await add({
                date: form.date, source: form.source,
                campaign: form.campaign || undefined,
                amount: parseFloat(form.amount), notes: form.notes || undefined,
              });
              setForm({ ...form, campaign: "", amount: "", notes: "" });
            }}
          >
            Add spend entry
          </Button>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {(rows ?? []).map((r: any) => (
              <div key={r._id} className="flex items-center justify-between text-xs bg-white/[0.03] rounded px-2 py-1.5">
                <span>{r.date} · {r.source}{r.campaign ? ` · ${r.campaign}` : ""}</span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{fmtUsd(r.amount)}</span>
                  <button onClick={() => remove({ id: r._id })} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </span>
              </div>
            ))}
            {rows && rows.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-2">No spend entries yet</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profile typeahead: search by name, email, or phone ─────────────────
function ProfileSearchCombobox({ value, onSelect }: {
  value: string;
  onSelect: (email: string) => void;
}) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const results = useQuery(api.adminMetrics.searchProfiles, q.trim().length >= 2 ? { q } : "skip");
  const open = focused && q.trim().length >= 2;
  return (
    <div className="relative col-span-2">
      <Input
        placeholder="Search profile by name, email, or phone…"
        value={value || q}
        onChange={(e) => {
          setQ(e.target.value);
          if (value) onSelect(""); // typing again clears the locked-in selection
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
          {(results ?? []).map((r: any) => (
            <button
              key={r.email}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(r.email);
                setQ("");
                setFocused(false);
              }}
            >
              <div className="text-xs font-semibold">{r.name ?? r.email}</div>
              <div className="text-[11px] text-muted-foreground">
                {[r.email, r.phone, r.location].filter(Boolean).join(" · ")}
              </div>
            </button>
          ))}
          {results && results.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">No matching profiles</div>
          )}
          {results === undefined && (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">Searching…</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Revenue attribution manager ─────────────────────────────────────────
function RevenueManager() {
  const [open, setOpen] = useState(false);
  const rows = useQuery(api.adminMetrics.listRevenue, open ? {} : "skip");
  const add = useMutation(api.adminMetrics.addRevenue);
  const remove = useMutation(api.adminMetrics.removeRevenue);
  const [form, setForm] = useState({
    profileEmail: "", amount: "", revenueDate: new Date().toISOString().slice(0, 10),
    source: "", triggerTag: "", notes: "",
  });
  return (
    <div className="relative">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(!open)}>
        <Plus className="w-3 h-3 mr-1" /> Attribute revenue
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-[440px] bg-card border border-border rounded-xl p-4 shadow-2xl space-y-3">
          <div className="text-xs font-semibold">Attribute revenue to a profile</div>
          <div className="grid grid-cols-2 gap-2">
            <ProfileSearchCombobox
              value={form.profileEmail}
              onSelect={(email) => setForm({ ...form, profileEmail: email })}
            />
            <Input type="number" placeholder="Amount ($)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input type="date" value={form.revenueDate} onChange={(e) => setForm({ ...form, revenueDate: e.target.value })} />
            <Input placeholder="Source (optional)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <Input placeholder="GHL trigger tag (optional)" value={form.triggerTag} onChange={(e) => setForm({ ...form, triggerTag: e.target.value })} />
            <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!form.amount || !form.revenueDate}
            onClick={async () => {
              await add({
                profileEmail: form.profileEmail || undefined,
                amount: parseFloat(form.amount),
                revenueDate: form.revenueDate,
                source: form.source || undefined,
                triggerTag: form.triggerTag || undefined,
                notes: form.notes || undefined,
              });
              setForm({ ...form, profileEmail: "", amount: "", notes: "" });
            }}
          >
            Add revenue entry
          </Button>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {(rows ?? []).map((r: any) => (
              <div key={r._id} className="flex items-center justify-between text-xs bg-white/[0.03] rounded px-2 py-1.5">
                <span>{r.revenueDate} · {r.profileEmail ?? "unlinked"}</span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{fmtUsd(r.amount)}</span>
                  <button onClick={() => remove({ id: r._id })} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </span>
              </div>
            ))}
            {rows && rows.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-2">No revenue entries yet</div>}
          </div>
        </div>
      )}
    </div>
  );
}
