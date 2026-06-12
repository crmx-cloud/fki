import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getAttribution } from "@/lib/attribution";
import { formatPhoneDashes } from "@/lib/phone";
import { useSearchParams } from "react-router-dom";
import { SpotlightTour, type TourStep } from "@/components/SpotlightTour";
import { toast } from "sonner";
import {
  Sparkles,
  CheckCircle,
  MapPin,
  DollarSign,
  Briefcase,
  Target,
  Clock,
  Save,
  User,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

/* ── Shared constants (must match convex/prospect.ts) ── */

const LIQUID_CAPITAL_OPTIONS = [
  { label: "Under $50K", value: "under_50k" },
  { label: "$50K – $100K", value: "50k_100k" },
  { label: "$100K – $150K", value: "100k_150k" },
  { label: "$150K – $250K", value: "150k_250k" },
  { label: "$250K – $500K", value: "250k_500k" },
  { label: "$500K – $1M", value: "500k_1m" },
  { label: "$1M+", value: "1m_plus" },
];

const OWNER_TYPE_OPTIONS = [
  { label: "Owner/Operator", value: "owner_operator" },
  { label: "Semi-Absentee", value: "semi_absentee" },
  { label: "Absentee/Executive", value: "absentee" },
  { label: "Investor/Multi-Unit", value: "investor" },
];

const FRANCHISE_CATEGORY_OPTIONS = [
  { label: "Food & Beverage", value: "food_bev" },
  { label: "Health & Fitness", value: "health_fitness" },
  { label: "Services", value: "services" },
  { label: "Home Services", value: "home_services" },
  { label: "Education", value: "education" },
  { label: "Beauty & Self Care", value: "beauty_selfcare" },
];

const RADIUS_OPTIONS = [
  { label: "10 miles", value: 10 },
  { label: "25 miles", value: 25 },
  { label: "50 miles", value: 50 },
  { label: "100 miles", value: 100 },
  { label: "200 miles", value: 200 },
];

const TIMELINE_OPTIONS = [
  { label: "ASAP", value: "asap" },
  { label: "Within 3 months", value: "3_months" },
  { label: "Within 6 months", value: "6_months" },
  { label: "Within 12 months", value: "12_months" },
  { label: "Just exploring", value: "exploring" },
];

const EXPERIENCE_OPTIONS = [
  { label: "No business experience", value: "none" },
  { label: "Some business experience", value: "some_business" },
  { label: "Current/past franchise owner", value: "franchise_owner" },
  { label: "Multi-unit operator", value: "multi_unit" },
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

export function ProspectProfilePage() {
  const profile = useQuery(api.prospect.getMyProspectProfile);
  const authUser = useQuery(api.auth.currentUser);
  const saveProfile = useMutation(api.prospect.saveProfile);
  const [saving, setSaving] = useState(false);

  const [liquidCapital, setLiquidCapital] = useState("");
  const [ownerType, setOwnerType] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [primaryCity, setPrimaryCity] = useState("");
  const [primaryState, setPrimaryState] = useState("");
  const [primaryRadius, setPrimaryRadius] = useState<number>(50);
  const [secondaryCity, setSecondaryCity] = useState("");
  const [secondaryState, setSecondaryState] = useState("");
  const [secondaryRadius, setSecondaryRadius] = useState<number>(50);
  const [timeline, setTimeline] = useState("");
  const [priorExperience, setPriorExperience] = useState("");

  // ── Tier 1: Hard Match ──
  const [totalInvestmentBudget, setTotalInvestmentBudget] = useState("");
  const [sbaFinancingIntent, setSbaFinancingIntent] = useState("");
  const [ownershipModel, setOwnershipModel] = useState<string[]>([]);
  const [runFromHome, setRunFromHome] = useState("");
  const [fullTimePartTime, setFullTimePartTime] = useState("");
  const [multiUnitInterest, setMultiUnitInterest] = useState("");
  const [veteranStatus, setVeteranStatus] = useState<boolean | undefined>(undefined);
  const [revenueGoal, setRevenueGoal] = useState("");
  const [incomeGoal, setIncomeGoal] = useState("");

  // ── Tier 2: Soft Match ──
  const [mustHaveFilters, setMustHaveFilters] = useState<string[]>([]);
  const [brandMaturity, setBrandMaturity] = useState("");
  const [supportImportance, setSupportImportance] = useState("");
  const [supportPriorities, setSupportPriorities] = useState<string[]>([]);
  const [employeeComfort, setEmployeeComfort] = useState("");
  const [spacePreference, setSpacePreference] = useState("");

  // ── Tier 3: Psychographic ──
  const [motivations, setMotivations] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState("");
  const [professionalBackground, setProfessionalBackground] = useState<string[]>([]);
  const [lifestylePriorities, setLifestylePriorities] = useState<string[]>([]);
  const [avoidList, setAvoidList] = useState<string[]>([]);

  // ── Contact Info ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactCity, setContactCity] = useState("");
  const [contactState, setContactState] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [showEnhanced, setShowEnhanced] = useState(false);

  // First-login guided tour (?welcome=1 arrives from the verify step)
  const [tourParams] = useSearchParams();
  const showTour = tourParams.get("welcome") === "1" && profile !== undefined;

  // ── Unsaved-changes tracking (drives the floating save bar) ──
  // Snapshot of every editable field; compared against the last-saved
  // snapshot so the save bar appears the moment anything changes.
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const snapshotResetPending = useRef(false);

  // Populate form from existing profile
  useEffect(() => {
    if (profile) {
      snapshotResetPending.current = true; // re-baseline after fields load
      // Contact
      setFirstName((profile as any).firstName || "");
      setLastName((profile as any).lastName || "");
      setPhone(formatPhoneDashes((profile as any).phone || ""));
      setContactAddress((profile as any).address || "");
      setContactCity((profile as any).city || "");
      setContactState((profile as any).state || "");
      setZipCode((profile as any).zipCode || "");
      // Financial
      setLiquidCapital(profile.liquidCapital || "");
      setOwnerType(profile.ownerType || "");
      setCategories(profile.preferredCategories || []);
      setPrimaryCity(profile.primaryCity || "");
      setPrimaryState(profile.primaryState || "");
      setPrimaryRadius(profile.primaryRadius || 50);
      setSecondaryCity(profile.secondaryCity || "");
      setSecondaryState(profile.secondaryState || "");
      setSecondaryRadius(profile.secondaryRadius || 50);
      setTimeline(profile.timeline || "");
      setPriorExperience(profile.priorExperience || "");
      // Tier 1
      setTotalInvestmentBudget((profile as any).totalInvestmentBudget || "");
      setSbaFinancingIntent((profile as any).sbaFinancingIntent || "");
      setOwnershipModel((profile as any).ownershipModel || []);
      setRunFromHome((profile as any).runFromHome || "");
      setFullTimePartTime((profile as any).fullTimePartTime || "");
      setMultiUnitInterest((profile as any).multiUnitInterest || "");
      setVeteranStatus((profile as any).veteranStatus);
      setRevenueGoal((profile as any).revenueGoal || "");
      setIncomeGoal((profile as any).incomeGoal || "");
      // Tier 2
      setMustHaveFilters((profile as any).mustHaveFilters || []);
      setBrandMaturity((profile as any).brandMaturity || "");
      setSupportImportance((profile as any).supportImportance || "");
      setSupportPriorities((profile as any).supportPriorities || []);
      setEmployeeComfort((profile as any).employeeComfort || "");
      setSpacePreference((profile as any).spacePreference || "");
      // Tier 3
      setMotivations((profile as any).motivations || []);
      setRiskTolerance((profile as any).riskTolerance || "");
      setProfessionalBackground((profile as any).professionalBackground || []);
      setLifestylePriorities((profile as any).lifestylePriorities || []);
      setAvoidList((profile as any).avoidList || []);
      // Show enhanced sections if any tier 1+ data exists
      if ((profile as any).totalInvestmentBudget || (profile as any).multiUnitInterest || (profile as any).motivations?.length) {
        setShowEnhanced(true);
      }
    }
  }, [profile]);

  const toggleCategory = (value: string) => {
    setCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  // Generic multi-select toggle helper
  const toggleMulti = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };

  // Current values of every editable field (order matters, keep stable)
  const currentSnapshot = JSON.stringify([
    liquidCapital, ownerType, categories, primaryCity, primaryState, primaryRadius,
    secondaryCity, secondaryState, secondaryRadius, timeline, priorExperience,
    totalInvestmentBudget, sbaFinancingIntent, ownershipModel, runFromHome,
    fullTimePartTime, multiUnitInterest, veteranStatus ?? null, revenueGoal, incomeGoal,
    mustHaveFilters, brandMaturity, supportImportance, supportPriorities,
    employeeComfort, spacePreference, motivations, riskTolerance,
    professionalBackground, lifestylePriorities, avoidList,
    firstName, lastName, phone, contactAddress, contactCity, contactState, zipCode,
  ]);
  // Re-baseline once the load effect has applied profile values
  useEffect(() => {
    if (snapshotResetPending.current) {
      snapshotResetPending.current = false;
      setSavedSnapshot(currentSnapshot);
    }
  }, [currentSnapshot]);
  const dirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  // Warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile({
        attribution: getAttribution(),
        // Contact
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone.replace(/\D/g, "") || undefined, // store digits; format on display
        address: contactAddress || undefined,
        contactCity: contactCity || undefined,
        contactState: contactState || undefined,
        zipCode: zipCode || undefined,
        // Matching
        liquidCapital: liquidCapital || undefined,
        ownerType: ownerType || undefined,
        preferredCategories: categories.length > 0 ? categories : undefined,
        primaryCity: primaryCity || undefined,
        primaryState: primaryState || undefined,
        primaryRadius: primaryRadius || undefined,
        secondaryCity: secondaryCity || undefined,
        secondaryState: secondaryState || undefined,
        secondaryRadius: secondaryRadius || undefined,
        timeline: timeline || undefined,
        priorExperience: priorExperience || undefined,
        // Tier 1
        totalInvestmentBudget: totalInvestmentBudget || undefined,
        sbaFinancingIntent: sbaFinancingIntent || undefined,
        ownershipModel: ownershipModel.length > 0 ? ownershipModel : undefined,
        runFromHome: runFromHome || undefined,
        fullTimePartTime: fullTimePartTime || undefined,
        multiUnitInterest: multiUnitInterest || undefined,
        veteranStatus: veteranStatus,
        revenueGoal: revenueGoal || undefined,
        incomeGoal: incomeGoal || undefined,
        // Tier 2
        mustHaveFilters: mustHaveFilters.length > 0 ? mustHaveFilters : undefined,
        brandMaturity: brandMaturity || undefined,
        supportImportance: supportImportance || undefined,
        supportPriorities: supportPriorities.length > 0 ? supportPriorities : undefined,
        employeeComfort: employeeComfort || undefined,
        spacePreference: spacePreference || undefined,
        // Tier 3
        motivations: motivations.length > 0 ? motivations : undefined,
        riskTolerance: riskTolerance || undefined,
        professionalBackground: professionalBackground.length > 0 ? professionalBackground : undefined,
        lifestylePriorities: lifestylePriorities.length > 0 ? lifestylePriorities : undefined,
        avoidList: avoidList.length > 0 ? avoidList : undefined,
      });
      toast.success("Saved! Your PerfectFit results are refreshing.");
      setSavedSnapshot(currentSnapshot);
    } catch (e: any) {
      toast.error(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // 100% = basics AND every enhancement answered. The bar must never read
  // "complete" while enhanced questions sit unanswered — that kills the
  // motivation to fill the fields that sharpen matching the most.
  const basicsDone = [
    !!liquidCapital,
    !!ownerType,
    categories.length > 0,
    !!(primaryCity && primaryState),
    !!timeline,
  ];
  const enhancedDone = [
    !!totalInvestmentBudget,
    !!sbaFinancingIntent,
    ownershipModel.length > 0,
    !!runFromHome,
    !!fullTimePartTime,
    !!multiUnitInterest,
    veteranStatus !== undefined,
    !!revenueGoal,
    !!incomeGoal,
    mustHaveFilters.length > 0,
    !!brandMaturity,
    !!supportImportance,
    !!employeeComfort,
    !!spacePreference,
    motivations.length > 0,
    !!riskTolerance,
    professionalBackground.length > 0,
    lifestylePriorities.length > 0,
    avoidList.length > 0,
  ];
  const allChecks = [...basicsDone, ...enhancedDone];
  const completedFields = allChecks.filter(Boolean).length;
  const totalRequired = allChecks.length;
  const completePct = Math.round((completedFields / totalRequired) * 100);
  const enhancedRemaining = enhancedDone.filter((d) => !d).length;

  return (
    <div className="space-y-8 max-w-[800px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cyan-400" />
          Your PerfectFit Profile
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          The more details you add, the better your matches. You can always change these later.
        </p>
      </div>

      {/* PerfectFit hint banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Refine your PerfectFit results</p>
            <p className="text-xs text-muted-foreground mt-1">
              Want more targeted matches? Add details below to narrow your results.
              Want broader options? Leave fields open. Every change updates your matches instantly when you save.
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Profile Completion</span>
          <span className="text-sm text-cyan-400 font-semibold">{completePct}%</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${completePct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {completePct === 100 ? (
            "✨ Your profile is 100% complete — every matching dimension is active."
          ) : (
            <>
              {totalRequired - completedFields} answer{totalRequired - completedFields === 1 ? "" : "s"} to go
              {enhancedRemaining > 0 && (
                <>
                  {" — "}
                  <button
                    type="button"
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                    onClick={() => {
                      setShowEnhanced(true);
                      setTimeout(() => document.getElementById("enhance-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
                    }}
                  >
                    answer {enhancedRemaining} enhancement question{enhancedRemaining === 1 ? "" : "s"}
                  </button>{" "}
                  to fully personalize your matches.
                </>
              )}
            </>
          )}
        </p>
      </div>

      {/* Section 0: Contact Information */}
      <div id="tour-contact" className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Contact Information</h2>
            <p className="text-xs text-muted-foreground">Your name, phone, email, and address</p>
          </div>
          {(profile as any)?.adminVerified && (
            <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified by team
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">First Name</Label>
            <Input className="mt-1.5" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm font-medium">Last Name</Label>
            <Input className="mt-1.5" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <Input placeholder="Email address" value={profile?.email || (authUser as any)?.email || ""} disabled className="mt-1.5 opacity-60" />
            <p className="text-xs text-muted-foreground mt-1">Email is tied to your account and cannot be changed here.</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Phone</Label>
            <Input className="mt-1.5" type="tel" inputMode="numeric" placeholder="555-123-4567" value={phone} onChange={(e) => setPhone(formatPhoneDashes(e.target.value))} />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Street Address</Label>
          <Input className="mt-1.5" placeholder="123 Main St" value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-sm font-medium">City</Label>
            <Input className="mt-1.5" placeholder="City" value={contactCity} onChange={(e) => setContactCity(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm font-medium">State</Label>
            <Select value={contactState} onValueChange={setContactState}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">ZIP Code</Label>
            <Input className="mt-1.5" placeholder="12345" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Where you live. Your matches also use the Primary Territory below — set it to wherever
          you want to open, even if that's somewhere else.
        </p>
      </div>

      {/* Section 4: Location Preferences */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Territory Preferences</h2>
            <p className="text-xs text-muted-foreground">Where do you want to operate? *</p>
          </div>
        </div>

        {/* Primary Territory */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-cyan-400">Primary Territory of Interest</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">City *</Label>
              <Input
                value={primaryCity}
                onChange={(e) => setPrimaryCity(e.target.value)}
                placeholder="e.g. Austin"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State *</Label>
              <Select value={primaryState} onValueChange={setPrimaryState}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Radius</Label>
              <Select
                value={String(primaryRadius)}
                onValueChange={(v) => setPrimaryRadius(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={String(r.value)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Secondary Territory */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-400">Secondary Territory of Interest</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input
                value={secondaryCity}
                onChange={(e) => setSecondaryCity(e.target.value)}
                placeholder="e.g. Dallas"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <Select value={secondaryState} onValueChange={setSecondaryState}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Radius</Label>
              <Select
                value={String(secondaryRadius)}
                onValueChange={(v) => setSecondaryRadius(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={String(r.value)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* ════ ENHANCE MY MATCHES — prominent, pulsing (crucial for match quality) ════ */}
      {!showEnhanced && (
        <button
          type="button"
          onClick={() => {
            setShowEnhanced(true);
            setTimeout(() => document.getElementById("enhance-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
          }}
          className="enhance-pulse group w-full bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-400/40 rounded-xl p-5 text-left hover:from-cyan-500/25 hover:to-blue-500/25 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-cyan-300">Enhance My Matches</h2>
                {enhancedRemaining > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                    {enhancedRemaining} question{enhancedRemaining === 1 ? "" : "s"} left
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                2 more minutes of questions = dramatically sharper matches — investment goals, lifestyle, must-haves, and more
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full border border-cyan-400/50 bg-cyan-500/15 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                <ChevronDown className="w-5 h-5 text-cyan-300 enhance-caret-bounce" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400/80">Expand</span>
            </div>
          </div>
        </button>
      )}

      {/* Section 1: Financial */}
      <div id="tour-financial" className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Financial</h2>
            <p className="text-xs text-muted-foreground">Used to match you with franchises in your budget</p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">
            Liquid Capital Available *
          </Label>
          <Select value={liquidCapital} onValueChange={setLiquidCapital}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select your liquid capital..." />
            </SelectTrigger>
            <SelectContent>
              {LIQUID_CAPITAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 3: Franchise Preferences */}
      <div id="tour-preferences" className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Franchise Preferences</h2>
            <p className="text-xs text-muted-foreground">Select all categories that interest you *</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FRANCHISE_CATEGORY_OPTIONS.map((cat) => {
            const selected = categories.includes(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                  selected
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {selected && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Ownership Style */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Ownership Style</h2>
            <p className="text-xs text-muted-foreground">What type of franchise owner do you want to be?</p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Owner Type *</Label>
          <Select value={ownerType} onValueChange={setOwnerType}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select ownership type..." />
            </SelectTrigger>
            <SelectContent>
              {OWNER_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Prior Experience</Label>
          <Select value={priorExperience} onValueChange={setPriorExperience}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select experience level..." />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 5: Timeline */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Timeline</h2>
            <p className="text-xs text-muted-foreground">When are you looking to get started? *</p>
          </div>
        </div>

        <Select value={timeline} onValueChange={setTimeline}>
          <SelectTrigger>
            <SelectValue placeholder="Select your timeline..." />
          </SelectTrigger>
          <SelectContent>
            {TIMELINE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ════ ENHANCE MY MATCHES (expanded content) ════════════════════ */}
      <div id="enhance-section" />
      {showEnhanced && (
        <>
          <div className="border-t border-border pt-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Enhanced PerfectFit Profile
            </h2>
            <p className="text-xs text-muted-foreground">
              The more you share, the better your matches. Every field is optional — click any chip to select, click again to deselect.
            </p>
          </div>

          {/* ── TIER 1: Investment & Goals ── */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">Investment & Goals</h2>
                <p className="text-xs text-muted-foreground">What are you willing to invest, and what do you want in return?</p>
              </div>
              {(!totalInvestmentBudget || !revenueGoal) && (
                <span className="text-[10px] px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
                  +3 scoring dimensions
                </span>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Total Investment Budget</Label>
              <p className="text-xs text-muted-foreground mb-1.5">The most you'd invest in total (with financing)</p>
              <Select value={totalInvestmentBudget} onValueChange={setTotalInvestmentBudget}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select total investment range..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_100k">Under $100K</SelectItem>
                  <SelectItem value="100k_250k">$100K – $250K</SelectItem>
                  <SelectItem value="250k_500k">$250K – $500K</SelectItem>
                  <SelectItem value="500k_1m">$500K – $1M</SelectItem>
                  <SelectItem value="1m_plus">$1M+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">SBA Financing</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Do you plan to use SBA financing?</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Yes", value: "yes" },
                  { label: "No", value: "no" },
                  { label: "Maybe — open to learning more", value: "maybe" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSbaFinancingIntent(sbaFinancingIntent === opt.value ? "" : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      sbaFinancingIntent === opt.value
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {sbaFinancingIntent === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Target Revenue (Per Location)</Label>
              <Select value={revenueGoal} onValueChange={setRevenueGoal}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="What annual revenue would meet your goals?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_500k">Under $500K</SelectItem>
                  <SelectItem value="500k_1m">$500K – $1M</SelectItem>
                  <SelectItem value="1m_2m">$1M – $2M</SelectItem>
                  <SelectItem value="2m_plus">$2M+</SelectItem>
                  <SelectItem value="not_sure">Not sure yet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Owner Income Goal</Label>
              <Select value={incomeGoal} onValueChange={setIncomeGoal}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="What take-home income would make this worth it?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50k_100k">$50K – $100K</SelectItem>
                  <SelectItem value="100k_200k">$100K – $200K</SelectItem>
                  <SelectItem value="200k_500k">$200K – $500K</SelectItem>
                  <SelectItem value="500k_plus">$500K+</SelectItem>
                  <SelectItem value="equity">Just want to build equity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── TIER 1: Ownership & Commitment ── */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Ownership & Commitment</h2>
                <p className="text-xs text-muted-foreground">How do you want to run your franchise?</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Ownership Model</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Owner/Operator (full-time, on-site)", value: "owner_operator" },
                  { label: "Semi-Absentee (oversee with a manager)", value: "semi_absentee" },
                  { label: "Absentee (fully managed)", value: "absentee" },
                  { label: "Investor (financial partner)", value: "investor" },
                  { label: "Open to all", value: "open_to_all" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulti(setOwnershipModel, opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      ownershipModel.includes(opt.value)
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {ownershipModel.includes(opt.value) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Would you run this from home?</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Yes, I prefer home-based", value: "yes" },
                  { label: "Open to it", value: "open" },
                  { label: "No, I want a physical location", value: "no" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRunFromHome(runFromHome === opt.value ? "" : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      runFromHome === opt.value
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {runFromHome === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Full-time or part-time?</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Full-time", value: "full_time" },
                  { label: "Part-time / side venture", value: "part_time" },
                  { label: "Start part-time and transition", value: "start_part_transition" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFullTimePartTime(fullTimePartTime === opt.value ? "" : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      fullTimePartTime === opt.value
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {fullTimePartTime === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">How many units do you want to own?</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "1", value: "1" },
                  { label: "2–3", value: "2-3" },
                  { label: "4–10", value: "4-10" },
                  { label: "10+ (area developer)", value: "10+" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMultiUnitInterest(multiUnitInterest === opt.value ? "" : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      multiUnitInterest === opt.value
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {multiUnitInterest === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Are you a military veteran or active-duty spouse?</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Yes", value: true },
                  { label: "No", value: false },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setVeteranStatus(veteranStatus === opt.value ? undefined : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      veteranStatus === opt.value
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {veteranStatus === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── TIER 2: Preferences & Must-Haves ── */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">Preferences & Must-Haves</h2>
                <p className="text-xs text-muted-foreground">Set hard requirements and soft preferences</p>
              </div>
              {(!mustHaveFilters.length && !brandMaturity && !supportImportance) && (
                <span className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                  +4 scoring dimensions
                </span>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Must-Have Franchise Requirements</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Brands missing these will be filtered out</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Item 19 available", value: "item19" },
                  { label: "FDD ready for review", value: "fdd" },
                  { label: "SBA approved", value: "sba" },
                  { label: "Exclusive territories", value: "exclusive_territory" },
                  { label: "Veteran discount", value: "veteran_discount" },
                  { label: "Multi-unit available", value: "multi_unit" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulti(setMustHaveFilters, opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      mustHaveFilters.includes(opt.value)
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {mustHaveFilters.includes(opt.value) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Franchise Stage Preference</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Emerging (1–20 units)", value: "emerging" },
                  { label: "Growth (20–100 units)", value: "growth" },
                  { label: "Established (100+ units)", value: "established" },
                  { label: "No preference", value: "no_preference" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBrandMaturity(brandMaturity === opt.value ? "" : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      brandMaturity === opt.value
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {brandMaturity === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">How important is franchisor support?</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Critical — I need strong systems", value: "critical" },
                  { label: "Important — but I'm fairly independent", value: "important" },
                  { label: "Minimal — just give me the playbook", value: "minimal" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSupportImportance(supportImportance === opt.value ? "" : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      supportImportance === opt.value
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {supportImportance === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">What support matters most? (pick top 2)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Operations guidance", value: "operations" },
                  { label: "Marketing help", value: "marketing" },
                  { label: "Technology platform", value: "technology" },
                  { label: "Real estate / site selection", value: "real_estate" },
                  { label: "Hiring & staffing", value: "hiring" },
                  { label: "Financial planning", value: "financial" },
                  { label: "All matter equally", value: "all" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulti(setSupportPriorities, opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      supportPriorities.includes(opt.value)
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {supportPriorities.includes(opt.value) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">How many employees are you comfortable managing?</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Just me (solo)", value: "solo" },
                  { label: "Small team (1–5)", value: "small_1_5" },
                  { label: "Medium team (5–15)", value: "medium_5_15" },
                  { label: "Large team (15+)", value: "large_15_plus" },
                  { label: "I'd hire a manager", value: "hire_manager" },
                  { label: "No preference", value: "no_preference" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEmployeeComfort(employeeComfort === opt.value ? "" : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      employeeComfort === opt.value
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {employeeComfort === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Business space preference</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Home-based / mobile", value: "home_mobile" },
                  { label: "Small retail / office (<2K sqft)", value: "small_retail" },
                  { label: "Standard retail (2K–10K sqft)", value: "standard_retail" },
                  { label: "Large format (10K+ sqft)", value: "large_format" },
                  { label: "No preference", value: "no_preference" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSpacePreference(spacePreference === opt.value ? "" : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      spacePreference === opt.value
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {spacePreference === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── TIER 3: About You ── */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-pink-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">About You</h2>
                <p className="text-xs text-muted-foreground">This is what makes matches feel truly personal</p>
              </div>
              {(!motivations.length && !riskTolerance) && (
                <span className="text-[10px] px-2 py-1 rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/20 whitespace-nowrap">
                  +2 scoring dimensions
                </span>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Why do you want to own a franchise? (pick top 2)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Financial freedom / wealth building", value: "financial_freedom" },
                  { label: "Be my own boss", value: "be_my_own_boss" },
                  { label: "Build a legacy for my family", value: "legacy" },
                  { label: "Passion for the industry", value: "passion" },
                  { label: "Community impact", value: "community" },
                  { label: "Replace my current income", value: "replace_income" },
                  { label: "Semi-retirement / lifestyle business", value: "lifestyle" },
                  { label: "Still figuring it out", value: "figuring_it_out" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulti(setMotivations, opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      motivations.includes(opt.value)
                        ? "bg-pink-500/15 border-pink-500/40 text-pink-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {motivations.includes(opt.value) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">How do you feel about risk?</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Conservative — proven systems, strong track record", value: "conservative" },
                  { label: "Moderate — some risk for higher upside", value: "moderate" },
                  { label: "Aggressive — early-stage / high-growth opportunity", value: "aggressive" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRiskTolerance(riskTolerance === opt.value ? "" : opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      riskTolerance === opt.value
                        ? "bg-pink-500/15 border-pink-500/40 text-pink-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {riskTolerance === opt.value && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Professional background (pick top 2)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Sales / business development", value: "sales" },
                  { label: "Management / operations", value: "management" },
                  { label: "Marketing / branding", value: "marketing" },
                  { label: "Finance / accounting", value: "finance" },
                  { label: "Healthcare / medical", value: "healthcare" },
                  { label: "Real estate", value: "real_estate" },
                  { label: "Technology", value: "technology" },
                  { label: "Education", value: "education" },
                  { label: "Trades / construction", value: "trades" },
                  { label: "Hospitality / food service", value: "hospitality" },
                  { label: "Military / government", value: "military" },
                  { label: "Generalist / varied", value: "generalist" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulti(setProfessionalBackground, opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      professionalBackground.includes(opt.value)
                        ? "bg-pink-500/15 border-pink-500/40 text-pink-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {professionalBackground.includes(opt.value) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">What matters most in your day-to-day? (pick top 2)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Flexible schedule / work-life balance", value: "flexibility" },
                  { label: "High earning potential", value: "high_earning" },
                  { label: "Community involvement", value: "community" },
                  { label: "Health & wellness focus", value: "health_wellness" },
                  { label: "Creativity / building something", value: "creativity" },
                  { label: "Predictable routine / systems", value: "predictable_routine" },
                  { label: "No strong preference", value: "no_preference" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulti(setLifestylePriorities, opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      lifestylePriorities.includes(opt.value)
                        ? "bg-pink-500/15 border-pink-500/40 text-pink-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {lifestylePriorities.includes(opt.value) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Anything you want to avoid? (optional)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Nights/weekends required", value: "nights_weekends" },
                  { label: "Heavy build-out / construction", value: "heavy_buildout" },
                  { label: "Managing large teams", value: "large_teams" },
                  { label: "Perishable inventory / food handling", value: "perishable_inventory" },
                  { label: "Cold calling / door-to-door sales", value: "cold_calling" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulti(setAvoidList, opt.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      avoidList.includes(opt.value)
                        ? "bg-red-500/15 border-red-500/40 text-red-300"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {avoidList.includes(opt.value) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}


      {showTour && (
        <SpotlightTour
          storageKey="fki-tour-profile"
          onDone={() => {
            try { localStorage.setItem("fki-tour-dash-pending", "1"); } catch { /* ignore */ }
          }}
          steps={[
            { target: "#tour-contact", title: "Start with the basics", body: "Your name and contact info — this is what your matches and (if you ever want one) a consultant will use to reach you." },
            { target: "#tour-territory", title: "Where do you want to open?", body: "Set your primary territory — it can be anywhere, not just where you live. Matching checks real state-by-state availability for every brand." },
            { target: "#tour-financial", title: "Your investment level", body: "Liquid capital drives which franchises are realistically in reach. Brands outside your budget are filtered out automatically." },
            { target: "#tour-preferences", title: "Industries you're drawn to", body: "Pick every category that interests you — more selections widen your matches, fewer sharpen them." },
            { target: ".enhance-pulse", title: "Dial it in with Enhance My Matches", body: "Two extra minutes of questions here is the single biggest upgrade to your match quality — goals, lifestyle, must-haves, and dealbreakers." },
            { target: "#tour-save", title: "Save = instant PerfectFit results", body: "Every save re-scores all 300+ brands against your profile instantly. A floating save bar appears whenever you have unsaved changes." },
          ]}
        />
      )}

      {/* Floating save bar — appears the moment anything is edited so the
          user never has to hunt for the save button at the bottom */}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
          dirty ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 rounded-full border border-cyan-400/40 bg-[#0b1426]/95 backdrop-blur-md pl-5 pr-2 py-2 shadow-2xl shadow-cyan-500/10">
          <span className="text-sm text-slate-200 whitespace-nowrap">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 align-middle" />
            Unsaved changes
          </span>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-cyan-600 hover:bg-cyan-500 text-white px-5"
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save & Refresh My Matches
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <div id="tour-save" className="flex justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-8"
        >
          {saving ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save & Refresh My PerfectFit Results
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
