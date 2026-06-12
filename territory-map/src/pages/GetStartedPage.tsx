import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { getAttribution } from "@/lib/attribution";
import { PublicNav } from "@/components/PublicNav";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  User,
  DollarSign,
  Briefcase,
  Target,
  MapPin,
  Clock,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Sparkles,
  KeyRound,
  Mail,
} from "lucide-react";

/* ── Constants (same as ProspectProfilePage) ── */

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

const RADIUS_OPTIONS = [
  { label: "10 miles", value: 10 },
  { label: "25 miles", value: 25 },
  { label: "50 miles", value: 50 },
  { label: "100 miles", value: 100 },
  { label: "200 miles", value: 200 },
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

type Step = 1 | 2 | 3 | 4 | "verify" | "saving" | "done";

import { formatPhoneDashes } from "@/lib/phone";

const TOTAL_STEPS = 4;

export function GetStartedPage() {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const saveProfile = useMutation(api.prospect.saveProfile);
  const requestVerifyCode = useMutation(api.verification.requestCode);

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [duplicateAccount, setDuplicateAccount] = useState(false);
  const [loading, setLoading] = useState(false);

  // Step 1 — Personal info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactConsent, setContactConsent] = useState(false); // TCPA — never pre-checked

  // Step 2 — Financial
  const [liquidCapital, setLiquidCapital] = useState("");
  const [ownerType, setOwnerType] = useState("");
  const [priorExperience, setPriorExperience] = useState("");

  // Step 3 — Preferences + Territory
  const [categories, setCategories] = useState<string[]>([]);
  const [primaryCity, setPrimaryCity] = useState("");
  const [primaryState, setPrimaryState] = useState("");
  const [primaryRadius, setPrimaryRadius] = useState(50);
  const [timeline, setTimeline] = useState("");

  // Step 4 — Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP
  const [otpCode, setOtpCode] = useState("");

  // Pending save ref (for auth race condition — same pattern as ClaimPage)
  // Prefill from PerfectFit quiz answers — quiz takers never re-type them.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fki-quiz-prefill");
      if (!raw) return;
      const q = JSON.parse(raw);
      if (q.liquidCapital) setLiquidCapital((v) => v || q.liquidCapital);
      if (q.ownerType) setOwnerType((v) => v || q.ownerType);
      if (q.preferredCategories?.length) setCategories((v) => (v.length ? v : q.preferredCategories));
      if (q.timeline) setTimeline((v) => v || q.timeline);
      if (q.primaryCity) setPrimaryCity((v) => v || q.primaryCity);
      if (q.primaryState) setPrimaryState((v) => v || q.primaryState);
    } catch { /* ignore bad localStorage */ }
  }, []);

  const pendingRef = useRef(false);

  const toggleCategory = (v: string) =>
    setCategories((prev) =>
      prev.includes(v) ? prev.filter((c) => c !== v) : [...prev, v]
    );

  const progress =
    step === "done"
      ? 100
      : step === "saving"
        ? 95
        : step === "verify"
          ? 85
          : (typeof step === "number" ? step / TOTAL_STEPS : 0.85) * 100;

  // ── Step 4: Create Account + Send OTP ──
  async function handleCreateAccount() {
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setError("");
    setDuplicateAccount(false);
    setLoading(true);
    try {
      // If another session is active (e.g. an admin testing, or a shared
      // device), drop it first — otherwise the profile save below races the
      // identity switch and can write the wizard data to the OLD user.
      if (isAuthenticated) {
        await signOut();
      }

      const formData = new FormData();
      formData.set("name", `${firstName} ${lastName}`.trim());
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", "signUp");

      await signIn("password", formData);
      // Email verification is temporarily disabled (legacy email provider was
      // decommissioned) — signUp authenticates immediately, so skip the OTP
      // screen and proceed straight to saving the profile.
      pendingRef.current = true;
      setStep("saving");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already exists") || msg.includes("already")) {
        setDuplicateAccount(true); // dedicated panel with log-in + reset paths
      } else {
        setError("Could not create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── OTP verification ──
  async function handleVerifyOTP() {
    if (!otpCode || otpCode.length < 4) {
      setError("Please enter the verification code");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("code", otpCode);
      formData.set("flow", "email-verification");

      await signIn("password", formData);
      // Auth verified → wait for isAuthenticated to trigger profile save
      pendingRef.current = true;
      setStep("saving");
    } catch (err: any) {
      setError("Invalid verification code. Please check and try again.");
      setStep("verify");
    } finally {
      setLoading(false);
    }
  }

  // ── After auth ready, save profile ──
  const doSaveProfile = useCallback(async () => {
    try {
      await saveProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone.replace(/\D/g, "") || undefined,
        contactConsent: true, // step 1 checkbox is required to reach this point
        attribution: getAttribution(),
        liquidCapital: liquidCapital || undefined,
        ownerType: ownerType || undefined,
        preferredCategories: categories.length > 0 ? categories : undefined,
        primaryCity: primaryCity || undefined,
        primaryState: primaryState || undefined,
        primaryRadius: primaryRadius || undefined,
        timeline: timeline || undefined,
        priorExperience: priorExperience || undefined,
      });
      // Kick off email verification immediately — the code rides CRMX and
      // is waiting in their inbox by the time they see the dashboard.
      requestVerifyCode({ kind: "email" }).catch(() => {});
      setStep("done");
    } catch (err: any) {
      console.error("[GetStarted] save profile error:", err);
      // Still show done — account was created successfully
      setStep("done");
    }
  }, [
    saveProfile, email, liquidCapital, ownerType, categories,
    primaryCity, primaryState, primaryRadius, timeline, priorExperience,
  ]);

  useEffect(() => {
    if (step === "saving" && isAuthenticated && pendingRef.current) {
      pendingRef.current = false;
      doSaveProfile();
    }
  }, [step, isAuthenticated, doSaveProfile]);

  // Safety timeout
  useEffect(() => {
    if (step !== "saving") return;
    const timer = setTimeout(() => {
      if (step === "saving") {
        console.warn("[GetStarted] safety timeout — showing done");
        setStep("done");
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [step]);

  // ── Done state ──
  if (step === "done") {
    return (
      <div className="min-h-screen bg-slate-950 text-white motion-page">
        <PublicNav />
        <div className="flex items-center justify-center py-24">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-extrabold mb-3">Welcome to Franchise KI!</h1>
            <p className="text-slate-400 text-lg mb-3">
              Thanks, <strong className="text-white">{firstName}</strong>! Your account is set up and your franchise profile is ready.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              One last step: we just emailed you a 6-digit verification code. Verify your account to
              unlock your PerfectFit matches.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/verify?welcome=1">
                <Button className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Verify My Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Saving spinner ──
  if (step === "saving") {
    return (
      <div className="min-h-screen bg-slate-950 text-white motion-page">
        <PublicNav />
        <div className="flex items-center justify-center py-24">
          <div className="max-w-lg mx-auto px-6 text-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-2">Setting up your profile...</h2>
            <p className="text-slate-500 text-sm">This should only take a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white motion-page">
      <PublicNav />

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2">Get Started with Franchise KI</h1>
          <p className="text-slate-400">
            Create your free account and get matched with franchise opportunities
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5 text-center">
            {step === "verify" ? "Verify your email" : `Step ${typeof step === "number" ? step : 4} of ${TOTAL_STEPS}`}
          </p>
        </div>

        {/* Duplicate account: friendly redirect to login / password reset */}
        {duplicateAccount && (
          <div className="mb-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-400/30">
            <p className="text-sm text-slate-200 font-semibold mb-1">
              Looks like you already have a profile under this email.
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Good news — your info is saved. Log in to pick up right where you left off.
            </p>
            <div className="flex gap-2">
              <Link
                to={`/login?email=${encodeURIComponent(email)}`}
                className="flex-1 text-center text-sm font-semibold px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors"
              >
                Log in
              </Link>
              <Link
                to={`/login?email=${encodeURIComponent(email)}&reset=1`}
                className="flex-1 text-center text-sm font-medium px-3 py-2 rounded-lg border border-white/15 text-slate-300 hover:bg-white/5 transition-colors"
              >
                Forgot password? Reset it
              </Link>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && !duplicateAccount && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ─── Step 1: Personal Info ─── */}
        {step === 1 && (
          <Reveal className="space-y-6">
            <StepHeader
              icon={User}
              iconBg="bg-cyan-500/20"
              iconColor="text-cyan-400"
              title="About You"
              subtitle="Step 1 of 4 — Let's start with the basics"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">First Name *</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Phone</Label>
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(formatPhoneDashes(e.target.value))}
                placeholder="555-123-4567"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
              />
            </div>

            {/* TCPA/A2P consent — required, never pre-checked. Timestamp is
                recorded on the profile (contactConsentAt) as proof of consent. */}
            <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3.5 cursor-pointer">
              <Checkbox
                checked={contactConsent}
                onCheckedChange={(v) => setContactConsent(v === true)}
                className="mt-0.5"
              />
              <span className="text-[11px] leading-relaxed text-slate-400">
                I agree to FranchiseKI LLC's{" "}
                <Link to="/terms" target="_blank" className="text-slate-300 underline underline-offset-2">Terms of Use</Link> and{" "}
                <Link to="/privacy" target="_blank" className="text-slate-300 underline underline-offset-2">Privacy Policy</Link>, and
                I expressly consent to receive calls and text messages (SMS) — including those made using automated
                technology or AI voice — from FranchiseKI LLC and its franchise consultants at the phone number and
                email I provided, regarding my franchise inquiry. Consent is not a condition of purchase. Msg &amp; data
                rates may apply; msg frequency varies. Reply STOP to opt out, HELP for help.
              </span>
            </label>

            <Button
              onClick={() => { setError(""); setStep(2); }}
              disabled={!firstName.trim() || !email.trim() || !contactConsent}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Reveal>
        )}

        {/* ─── Step 2: Financial & Experience ─── */}
        {step === 2 && (
          <Reveal className="space-y-6">
            <StepHeader
              icon={DollarSign}
              iconBg="bg-emerald-500/20"
              iconColor="text-emerald-400"
              title="Financial & Experience"
              subtitle="Step 2 of 4 — Helps us match you to the right investment level"
            />

            <div>
              <Label className="text-sm font-medium">Liquid Capital Available *</Label>
              <Select value={liquidCapital} onValueChange={setLiquidCapital}>
                <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select your liquid capital..." />
                </SelectTrigger>
                <SelectContent>
                  {LIQUID_CAPITAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Owner Type *</Label>
              <Select value={ownerType} onValueChange={setOwnerType}>
                <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="How do you want to run the business?" />
                </SelectTrigger>
                <SelectContent>
                  {OWNER_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Prior Experience</Label>
              <Select value={priorExperience} onValueChange={setPriorExperience}>
                <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select your experience level..." />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setError(""); setStep(1); }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => { setError(""); setStep(3); }}
                disabled={!liquidCapital}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Continue <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </Reveal>
        )}

        {/* ─── Step 3: Preferences & Territory ─── */}
        {step === 3 && (
          <Reveal className="space-y-6">
            <StepHeader
              icon={Target}
              iconBg="bg-amber-500/20"
              iconColor="text-amber-400"
              title="Preferences & Territory"
              subtitle="Step 3 of 4 — What are you looking for and where?"
            />

            {/* Categories */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Franchise Categories *</Label>
              <div className="grid grid-cols-2 gap-2">
                {FRANCHISE_CATEGORY_OPTIONS.map((cat) => {
                  const selected = categories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleCategory(cat.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        selected
                          ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {selected && <CheckCircle className="w-3.5 h-3.5 inline mr-1" />}
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Territory */}
            <div>
              <Label className="text-sm font-medium mb-2 block flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Primary Territory *
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  value={primaryCity}
                  onChange={(e) => setPrimaryCity(e.target.value)}
                  placeholder="City"
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                />
                <Select value={primaryState} onValueChange={setPrimaryState}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(primaryRadius)} onValueChange={(v) => setPrimaryRadius(Number(v))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RADIUS_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <Label className="text-sm font-medium">Timeline *</Label>
              <Select value={timeline} onValueChange={setTimeline}>
                <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="When are you looking to get started?" />
                </SelectTrigger>
                <SelectContent>
                  {TIMELINE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setError(""); setStep(2); }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => { setError(""); setStep(4); }}
                disabled={categories.length === 0 || !primaryCity || !primaryState}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Continue <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </Reveal>
        )}

        {/* ─── Step 4: Create Password ─── */}
        {step === 4 && (
          <Reveal className="space-y-6">
            <StepHeader
              icon={Lock}
              iconBg="bg-violet-500/20"
              iconColor="text-violet-400"
              title="Create Your Account"
              subtitle="Step 4 of 4 — Set a password and verify your email"
            />

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Mail className="w-3.5 h-3.5" />
                <span>We'll send a verification code to <strong className="text-white">{email}</strong></span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Confirm Password *</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setError(""); setStep(3); }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleCreateAccount}
                disabled={loading || !password || !confirmPassword}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating Account...</>
                ) : (
                  <><KeyRound className="w-4 h-4 mr-1.5" /> Create Account & Verify Email</>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-3">
              By creating an account you agree to our{" "}
              <Link to="/terms" className="text-slate-400 underline underline-offset-2">Terms of Use</Link> and{" "}
              <Link to="/privacy" className="text-slate-400 underline underline-offset-2">Privacy Policy</Link>, and
              consent to receive a verification email and, if you add a phone number, a verification text.
            </p>
          </Reveal>
        )}

        {/* ─── Verify Email (OTP) ─── */}
        {step === "verify" && (
          <Reveal className="space-y-6">
            <StepHeader
              icon={Mail}
              iconBg="bg-cyan-500/20"
              iconColor="text-cyan-400"
              title="Verify Your Email"
              subtitle="We sent a verification code to your email"
            />

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-400">
                Check your inbox at <strong className="text-white">{email}</strong> for a verification code.
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Verification Code *</Label>
              <Input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="Enter code"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-500 text-center text-2xl tracking-[0.3em] font-mono"
                autoFocus
              />
            </div>

            <Button
              onClick={handleVerifyOTP}
              disabled={loading || !otpCode}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Verifying...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-1.5" /> Verify & Complete Setup</>
              )}
            </Button>

            <button
              className="text-sm text-slate-500 hover:text-slate-300 mx-auto block"
              onClick={async () => {
                try {
                  const formData = new FormData();
                  formData.set("name", `${firstName} ${lastName}`.trim());
                  formData.set("email", email);
                  formData.set("password", password);
                  formData.set("flow", "signUp");
                  await signIn("password", formData);
                  toast.success("Verification code resent!");
                } catch {
                  toast.info("If you already have an account, try logging in.");
                }
              }}
            >
              Didn't get the code? Resend
            </button>
          </Reveal>
        )}
      </div>
    </div>
  );
}

/* ── Step Header ── */
function StepHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}
