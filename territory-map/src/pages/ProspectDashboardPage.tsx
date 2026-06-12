import { useState } from "react";
import { formatMoney, formatMoneyRange } from "@/lib/format";
import { useUnlocked } from "@/hooks/useUnlocked";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Link, Navigate } from "react-router-dom";
import { SpotlightTour } from "@/components/SpotlightTour";
import {
  Sparkles,
  MapPin,
  ArrowRight,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  FileText,
  Tag,
  Briefcase,
  Map,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProspectInquiryDialog } from "@/components/ProspectInquiryDialog";
import { SaveBrandButton } from "@/components/SaveBrandButton";
import { SwotAnalysis } from "@/components/SwotAnalysis";

const STATUS_DOT: Record<string, string> = {
  available: "bg-fuchsia-500",
  high_interest: "bg-amber-500",
  pending_award: "bg-orange-500",
  sold: "bg-red-500",
  open: "bg-emerald-500",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  high_interest: "High Interest",
  pending_award: "Pending",
  sold: "Sold",
  open: "Open",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-cyan-400";
  if (score >= 40) return "text-amber-400";
  return "text-slate-400";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/20 border-emerald-500/30";
  if (score >= 60) return "bg-cyan-500/20 border-cyan-500/30";
  if (score >= 40) return "bg-amber-500/20 border-amber-500/30";
  return "bg-slate-500/20 border-slate-500/30";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent Match";
  if (score >= 60) return "Strong Match";
  if (score >= 40) return "Good Match";
  return "Potential Match";
}

export function ProspectDashboardPage() {
  const matches = useQuery(api.prospect.getMatches);
  const prospectProfile = useQuery(api.prospect.getMyProspectProfile);
  const savedIds = useQuery(api.savedItems.getMySavedBrandIds);
  const profileComplete = prospectProfile?.profileComplete;
  const verifyStatus = useQuery(api.verification.myStatus);

  // 1-click inquiry dialog state
  const [inquiryBrand, setInquiryBrand] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);

  // Double opt-in: matches require a verified email (phone strongly
  // encouraged on the same screen). Waits for status to load first.
  if (verifyStatus && !verifyStatus.emailVerified) {
    return <Navigate to="/verify?welcome=1" replace />;
  }

  const dashTourPending = (() => {
    try { return localStorage.getItem("fki-tour-dash-pending") === "1"; } catch { return false; }
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {dashTourPending && (
        <SpotlightTour
          storageKey="fki-tour-dash"
          onDone={() => {
            try { localStorage.removeItem("fki-tour-dash-pending"); } catch { /* ignore */ }
          }}
          steps={[
            { target: "#tour-checklist", title: "Your path, tracked", body: "This checklist follows you until you've done the full journey — each step checks itself off as you go." },
            { target: "#tour-matches", title: "Your PerfectFit matches", body: "Every brand scored against your profile — the reasons behind each score are shown on every card. They re-rank live as you refine your profile." },
            { target: 'a[href="/saved"]', title: "Save brands you like", body: "Heart any brand to build your shortlist here." },
            { target: 'a[href="/saved?compare=1"]', title: "Compare side-by-side", body: "Pick 2–3 saved brands and compare fees, royalties, support, and availability in one table." },
            { target: 'a[href="/dossier"]', title: "Your free Due Diligence Report", body: "A deep-dive on your top matches — sourced data, risk flags, and exactly what to ask each franchisor. This is the report that saves you hundreds of hours." },
            { target: "#tour-matches", title: "Want a human in your corner?", body: 'Hit "I\'m Interested" on any match to get connected with a vetted consultant — free for you, they\'re paid by franchisors only when a territory is awarded.' },
          ]}
        />
      )}
      <GettingStartedChecklist
        verifyStatus={verifyStatus}
        prospectProfile={prospectProfile}
        savedCount={savedIds?.length ?? 0}
      />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cyan-400" />
          My Franchise Matches
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          AI-powered franchise recommendations based on your profile
        </p>
      </div>

      {/* Profile incomplete banner */}
      {/* Verification banner — verified email+phone unlocks full due diligence */}
      <VerifyBanner />

      {!profileComplete && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-300">Complete Your Profile</h3>
            <p className="text-sm text-amber-200/70 mt-0.5">
              Fill in your budget, preferences, and target territory to unlock personalized AI franchise matches.
            </p>
            <Link to="/my-profile">
              <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-500 text-white">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Complete Profile
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Dimensions active banner — show when profile is complete but enhanced not filled */}
      {profileComplete && matches && matches.length > 0 && (() => {
        const firstMatch = matches[0];
        const active = firstMatch?.activeDimensions || 0;
        const total = firstMatch?.totalDimensions || 12;
        const enhanced = prospectProfile?.enhancedProfileComplete;
        if (active >= total - 1) return null; // already maxed out
        return (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-cyan-300 text-sm">PerfectFit Scoring: {active}/{total} dimensions active</h3>
                <div className="flex-1 max-w-32 h-1.5 bg-cyan-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${(active / total) * 100}%` }} />
                </div>
              </div>
              <p className="text-xs text-cyan-200/60 mt-0.5">
                {!enhanced
                  ? "Complete your Enhanced Profile to unlock investment goals, lifestyle, and psychographic matching."
                  : "Add more preferences to fine-tune your matches even further."}
              </p>
            </div>
            <Link to="/my-profile">
              <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 shrink-0">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Enhance Profile
              </Button>
            </Link>
          </div>
        );
      })()}

      {/* Match stats */}
      {profileComplete && matches && matches.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Star}
            iconColor="text-amber-400"
            label="Total Matches"
            value={matches.length}
          />
          <StatCard
            icon={TrendingUp}
            iconColor="text-emerald-400"
            label="Strong Matches"
            value={matches.filter((m) => m.matchScore >= 60).length}
          />
          <StatCard
            icon={MapPin}
            iconColor="text-cyan-400"
            label="Near You"
            value={matches.filter((m) => m.nearbyTerritories.length > 0 || m.availableInYourState).length}
          />
          <StatCard
            icon={CheckCircle2}
            iconColor="text-fuchsia-400"
            label="Budget Fit"
            value={matches.filter((m) => m.matchReasons.some((r) => r.includes("Budget meets"))).length}
          />
        </div>
      )}

      {/* Due Diligence Dossier card */}
      {profileComplete && matches && matches.length > 0 && (
        <div className="bg-card border rounded-xl p-5 flex items-start gap-4 hover:border-cyan-500/30 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">Your Due Diligence Dossier is ready</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              A consultant-grade report on your top {Math.min(3, matches.length)} matches — verified money
              math, sourced risk flags, territory status in your state, and the 10 questions to ask each
              franchisor. Print-ready.
            </p>
          </div>
          <Link to="/dossier" className="shrink-0 self-center">
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
              Open my Dossier
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Match list */}
      {profileComplete && matches && matches.length > 0 ? (
        <div id="tour-matches" className="space-y-4">
          <h2 className="text-lg font-semibold">Your Top Matches</h2>
          {matches.map((match, i) => (
            <MatchCard
              key={match.brandId}
              match={match}
              rank={i + 1}
              savedBrandIds={savedIds ?? []}
              prospectProfile={prospectProfile}
              onInquiry={() => setInquiryBrand({
                id: match.brandId,
                name: match.brandName,
                slug: match.brandSlug,
              })}
            />
          ))}
        </div>
      ) : profileComplete && matches?.length === 0 ? (
        <div className="bg-card border rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Map className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No Matches Yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            We're growing our brand database. Check back soon or adjust your profile criteria for broader results.
          </p>
          <Link to="/my-profile">
            <Button variant="outline" size="sm" className="mt-4">
              Adjust Profile
            </Button>
          </Link>
        </div>
      ) : null}

      {/* Loading */}
      {!matches && profileComplete && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border rounded-xl p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-muted rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 bg-muted rounded" />
                  <div className="h-4 w-72 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1-click inquiry dialog */}
      {inquiryBrand && (
        <ProspectInquiryDialog
          open={!!inquiryBrand}
          onClose={() => setInquiryBrand(null)}
          brandId={inquiryBrand.id as Id<"brands">}
          brandName={inquiryBrand.name}
          brandSlug={inquiryBrand.slug}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────
 * Match Card
 * ──────────────────────────────────── */
function MatchCard({
  match,
  rank,
  savedBrandIds,
  prospectProfile,
  onInquiry,
}: {
  match: {
    brandId: string;
    brandName: string;
    brandSlug: string;
    brandCategory?: string;
    brandDescription?: string;
    logoUrl?: string;
    investmentMin?: number;
    investmentMax?: number;
    matchScore: number;
    matchReasons: string[];
    matchWarnings?: string[];
    nearbyTerritories: { city: string; state: string; status: string; distance: number }[];
    availableInYourState?: boolean;
    activeDimensions?: number;
    totalDimensions?: number;
  };
  rank: number;
  savedBrandIds: string[];
  prospectProfile?: any;
  onInquiry: () => void;
}) {
  const formatCurrency = (v?: number) => (v ? formatMoney(v) : "N/A");

  return (
    <div className="bg-card border rounded-xl p-5 hover:border-cyan-500/30 transition-colors group">
      <div className="flex items-start gap-4">
        {/* Rank badge */}
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
          {rank}
        </div>

        {/* Brand info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-lg truncate">{match.brandName}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {match.brandCategory && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {match.brandCategory}
                  </span>
                )}
                {match.investmentMin && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> {formatCurrency(match.investmentMin)} – {formatCurrency(match.investmentMax)}
                  </span>
                )}
              </div>
            </div>

            {/* Save + Match score */}
            <div className="flex items-center gap-2 shrink-0">
              <SaveBrandButton
                brandId={match.brandId as Id<"brands">}
                savedBrandIds={savedBrandIds}
                variant="icon"
              />
              <div className={`px-3 py-1.5 rounded-lg border text-center ${scoreBg(match.matchScore)}`}>
                <div className={`text-xl font-bold ${scoreColor(match.matchScore)}`}>
                  {match.matchScore}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {scoreLabel(match.matchScore)}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {match.brandDescription && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {match.brandDescription}
            </p>
          )}

          {/* Match reasons */}
          {match.matchReasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {match.matchReasons.map((reason, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                >
                  <CheckCircle2 className="w-3 h-3 inline mr-1" />
                  {reason}
                </span>
              ))}
            </div>
          )}

          {/* Match warnings */}
          {match.matchWarnings && match.matchWarnings.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {match.matchWarnings.map((warning, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20"
                >
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {warning}
                </span>
              ))}
            </div>
          )}

          {/* Nearby territories */}
          {match.nearbyTerritories.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Territories Near You
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {match.nearbyTerritories.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-foreground inline-flex items-center gap-1.5"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${STATUS_DOT[t.status] || "bg-slate-400"}`}
                    />
                    {t.city}, {t.state}
                    <span className="text-muted-foreground">
                      ({STATUS_LABEL[t.status] || t.status})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* SWOT Analysis */}
          <SwotAnalysis
            brandName={match.brandName}
            brandCategory={match.brandCategory}
            matchScore={match.matchScore}
            matchReasons={match.matchReasons}
            matchWarnings={match.matchWarnings}
            investmentMin={match.investmentMin}
            investmentMax={match.investmentMax}
            nearbyTerritories={match.nearbyTerritories.length}
            totalAvailableNearby={match.nearbyTerritories.length}
            ownershipModel={prospectProfile?.ownershipModel}
            ownerType={prospectProfile?.ownerType}
            runFromHome={prospectProfile?.runFromHome}
            fullTimePartTime={prospectProfile?.fullTimePartTime}
            multiUnitInterest={prospectProfile?.multiUnitInterest}
            veteranStatus={prospectProfile?.veteranStatus}
            revenueGoal={prospectProfile?.revenueGoal}
            incomeGoal={prospectProfile?.incomeGoal}
            brandMaturity={prospectProfile?.brandMaturity}
            riskTolerance={prospectProfile?.riskTolerance}
            spacePreference={prospectProfile?.spacePreference}
            employeeComfort={prospectProfile?.employeeComfort}
            motivations={prospectProfile?.motivations}
            avoidList={prospectProfile?.avoidList}
            sbaFinancingIntent={prospectProfile?.sbaFinancingIntent}
            supportImportance={prospectProfile?.supportImportance}
            supportPriorities={prospectProfile?.supportPriorities}
            professionalBackground={prospectProfile?.professionalBackground}
          />

          {/* CTA */}
          <div className="mt-4 flex items-center gap-3">
            <Button
              size="sm"
              onClick={onInquiry}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              I'm Interested
            </Button>
            <Link to={`/brand/${match.brandSlug}`}>
              <Button size="sm" variant="outline" className="group-hover:border-cyan-500/50">
                View Brand
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
            <Link to={`/map/${match.brandSlug}`}>
              <Button size="sm" variant="ghost" className="text-muted-foreground">
                <Map className="w-3.5 h-3.5 mr-1.5" />
                View Map
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────
 * Stat Card
 * ──────────────────────────────────── */
function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}


function VerifyBanner() {
  const { isAuthenticated, unlocked, loading, emailVerified, phoneVerified } = useUnlocked();
  if (!isAuthenticated || loading || unlocked) return null;
  const missing = [!emailVerified && "email", !phoneVerified && "phone"].filter(Boolean).join(" and ");
  return (
    <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="text-sm">
        <span className="font-semibold text-amber-300">Verify your {missing}</span>
        <span className="text-amber-200/70 ml-1.5">
          to unlock your full due diligence toolkit — dossier depth, favorites, and comparisons.
        </span>
      </div>
      <Link to="/verify" className="shrink-0">
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_4px_14px_-4px_rgba(8,145,178,0.55)]">
          Verify now
        </Button>
      </Link>
    </div>
  );
}


/* ── Getting Started: the clean path (verify → profile → enhance →
      find/save → compare → dossier → consultant). Dismissable; hides
      itself once every step is done. ── */
function GettingStartedChecklist({ verifyStatus, prospectProfile, savedCount }: {
  verifyStatus: any;
  prospectProfile: any;
  savedCount: number;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("fki-getting-started-dismissed") === "1"; } catch { return false; }
  });
  if (dismissed || !prospectProfile) return null;

  const steps: { label: string; done: boolean; to: string; hint: string }[] = [
    {
      label: "Verify your account",
      done: !!verifyStatus?.emailVerified && !!verifyStatus?.phoneVerified,
      to: "/verify",
      hint: verifyStatus?.emailVerified ? "Add phone verification to unlock everything" : "Email + phone",
    },
    {
      label: "Complete your profile basics",
      done: !!prospectProfile?.profileComplete,
      to: "/my-profile",
      hint: "Capital, territory, categories, timeline",
    },
    {
      label: "Answer the enhancement questions",
      done: !!prospectProfile?.enhancedProfileComplete,
      to: "/my-profile",
      hint: "Dial in exactly what you want — sharper matches",
    },
    {
      label: "Find & save brands you like",
      done: savedCount > 0,
      to: "/explore",
      hint: "Browse 300+ verified brands",
    },
    {
      label: "Compare brands side-by-side",
      done: savedCount >= 2,
      to: "/saved?compare=1",
      hint: "Save 2+ brands, then compare",
    },
    {
      label: "Get your Due Diligence Report",
      done: false,
      to: "/dossier",
      hint: "Your free deep-dive on your top matches",
    },
    {
      label: "Talk to a vetted consultant (optional)",
      done: false,
      to: "/dashboard",
      hint: "Request an intro from any match below — free for you",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount >= steps.length - 1) return null; // last 2 steps have no tracked "done"

  return (
    <div id="tour-checklist" className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Getting Started — your path to the right franchise
        </h2>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setDismissed(true);
            try { localStorage.setItem("fki-getting-started-dismissed", "1"); } catch { /* ignore */ }
          }}
        >
          Dismiss
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {steps.map((s, i) => (
          <Link
            key={s.label}
            to={s.to}
            className={`flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors ${
              s.done ? "opacity-60" : "hover:bg-white/5"
            }`}
          >
            <span
              className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${
                s.done ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/15 text-cyan-300 border border-cyan-400/40"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm font-medium ${s.done ? "line-through" : ""}`}>{s.label}</span>
              <span className="block text-[11px] text-muted-foreground">{s.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
