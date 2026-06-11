import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  UserPlus,
  Mail,
  Loader2,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";

const CATEGORIES = [
  "Food & Beverage",
  "Health & Wellness",
  "Services",
  "Retail",
  "Education & Children",
  "Home Services",
  "Fitness",
  "Automotive",
];

type ClaimStep = 1 | 2 | 3 | "verify" | "submitting" | "done";

export function ClaimPage() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const submitClaim = useMutation(api.claims.submitClaim);

  // Step tracking
  const [step, setStep] = useState<ClaimStep>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Track if we need to submit claim after auth settles
  const pendingSubmitRef = useRef(false);

  // Step 1: Brand info
  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  // Step 2: Contact + account
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Honeypot (anti-bot): invisible field that bots fill in
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Step 3: Territories
  const [territories, setTerritories] = useState("");

  // OTP verification
  const [otpCode, setOtpCode] = useState("");

  // Brand slug for redirect
  const [brandSlug, setBrandSlug] = useState("");

  const totalSteps = 3;
  const currentStepNum = typeof step === "number" ? step : 3;
  const progress = step === "done" ? 100 : step === "submitting" ? 95 : step === "verify" ? 85 : (currentStepNum / totalSteps) * 75;

  // Parse territories text into array
  function parseTerritories(): { city: string; state: string }[] {
    return territories
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        return { city: parts[0] || line, state: parts[1] || "" };
      })
      .filter((t) => t.city);
  }

  // Step 3 → Create account + send OTP
  async function handleCreateAccount() {
    // Bot check
    if (honeypotRef.current?.value) {
      // Silently fail — bot filled in the honeypot
      setStep("done");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Create account via Convex Auth
      const formData = new FormData();
      formData.set("name", contactName);
      formData.set("email", contactEmail);
      formData.set("password", password);
      formData.set("flow", "signUp");

      await signIn("password", formData);

      // Account created, OTP sent — show verification
      setStep("verify");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already exists") || msg.includes("already")) {
        setError("An account with this email already exists. Try logging in instead.");
      } else {
        setError("Could not create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Submit claim (called from useEffect when auth is ready) ──
  const doSubmitClaim = useCallback(async () => {
    try {
      const result = await submitClaim({
        brandName,
        category: category || undefined,
        description: description || undefined,
        websiteUrl: website || undefined,
        contactName,
        contactEmail,
        contactPhone: contactPhone || undefined,
        territories: parseTerritories(),
      });

      setBrandSlug(result.slug);
      setStep("done");
    } catch (err: any) {
      const msg = err?.message || "";
      console.error("[ClaimPage] submitClaim error:", msg);
      if (msg.includes("Not authenticated")) {
        setError("Authentication error. Please try verifying again.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
      // Always go back to verify on error (fixes stale closure bug)
      setStep("verify");
    } finally {
      setLoading(false);
      pendingSubmitRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandName, category, description, website, contactName, contactEmail, contactPhone, territories, submitClaim]);

  // ── After OTP verification, wait for auth to be ready, then submit ──
  useEffect(() => {
    if (step === "submitting" && isAuthenticated && pendingSubmitRef.current) {
      doSubmitClaim();
    }
  }, [step, isAuthenticated, doSubmitClaim]);

  // ── Safety: if stuck on submitting for >15s, go back to verify ──
  useEffect(() => {
    if (step !== "submitting") return;
    const timeout = setTimeout(() => {
      if (pendingSubmitRef.current) {
        setError("Something took too long. Please try verifying again.");
        setStep("verify");
        setLoading(false);
        pendingSubmitRef.current = false;
      }
    }, 15_000);
    return () => clearTimeout(timeout);
  }, [step]);

  // Verify OTP → mark as pending submit
  async function handleVerifyAndSubmit() {
    setError("");
    setLoading(true);

    try {
      // Verify the OTP code
      const formData = new FormData();
      formData.set("code", otpCode);
      formData.set("email", contactEmail);
      formData.set("flow", "email-verification");

      await signIn("password", formData);

      // Mark that we need to submit after auth settles
      pendingSubmitRef.current = true;
      setStep("submitting");

      // If already authenticated (immediate), the useEffect will fire.
      // If auth is propagating, useEffect fires when isAuthenticated becomes true.
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid") || msg.includes("expired")) {
        setError("Invalid or expired code. Please try again.");
      } else if (msg.includes("Not authenticated")) {
        setError("Verification failed. Please try again.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
      setStep("verify"); // Always go back to verify on OTP error
      setLoading(false);
    }
  }

  // ── Done ──
  if (step === "done") {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <PublicNav />
        <div className="flex items-center justify-center py-24">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-extrabold mb-3">You're All Set!</h1>
            <p className="text-slate-400 text-lg mb-3">
              <strong className="text-white">{brandName}</strong> has been added to Franchise KI.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Your account is active and your franchise profile is ready to customize.
              Our team will review and activate your map shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              {brandSlug && (
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => navigate(`/map/${brandSlug}`)}
                >
                  <MapPin className="w-4 h-4 mr-1" /> View Your Map
                </Button>
              )}
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Submitting state ──
  if (step === "submitting") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Setting up your franchise profile...</p>
          <p className="text-slate-500 text-sm mt-1">This only takes a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicNav />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold mb-2">Build Your Map</h1>
          <p className="text-slate-400">
            {step === "verify"
              ? "Verify your email to complete setup"
              : "Set up your franchise profile in minutes — completely free"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-slate-400">
              {step === "verify" ? "Verify Email" : `Step ${currentStepNum} of ${totalSteps}`}
            </span>
            <span className="text-cyan-400">{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Honeypot — hidden from humans, visible to bots */}
        <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
          <label>
            Leave this blank
            <input ref={honeypotRef} type="text" name="website_url_confirm" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {/* ── Step 1: Brand Info ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Brand Information</h2>
                <p className="text-sm text-slate-400">Tell us about your franchise</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">Brand Name *</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Your Franchise Name"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your franchise..."
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourfranchise.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11"
              />
            </div>

            <Button
              onClick={() => setStep(2)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white h-11"
              disabled={!brandName.trim()}
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── Step 2: Contact + Account ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Create Your Account</h2>
                <p className="text-sm text-slate-400">We'll create your login so you can manage your franchise</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">Your Name *</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1 block">Email *</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="john@franchise.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Phone</Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11"
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-400">Set a password for your Franchise KI account</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1 block">Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11 pr-10"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Confirm Password *</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className={`bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11 ${
                      confirmPassword && password !== confirmPassword ? "border-red-500/50" : ""
                    }`}
                  />
                </div>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep(1); setError(""); }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => { setError(""); setStep(3); }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white h-11"
                disabled={!contactName.trim() || !contactEmail.trim() || !password || password !== confirmPassword || password.length < 8}
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Territories + Review + Submit ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Territories</h2>
                <p className="text-sm text-slate-400">
                  Add your franchise locations — or skip and add later
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">
                Territories (one per line: City, State)
              </Label>
              <Textarea
                value={territories}
                onChange={(e) => setTerritories(e.target.value)}
                placeholder={"Austin, TX\nDallas, TX\nHouston, TX\nSan Antonio, TX"}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-mono text-sm"
                rows={8}
              />
              <p className="text-xs text-slate-500 mt-1">
                {parseTerritories().length} territories entered. You can always add more from your dashboard.
              </p>
            </div>

            {/* Review Summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-400">
                Review & Submit
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Brand</span>
                  <span className="font-medium">{brandName}</span>
                </div>
                {category && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category</span>
                    <span>{category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact</span>
                  <span>{contactName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Email</span>
                  <span>{contactEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Territories</span>
                  <span>{parseTerritories().length || "None yet"}</span>
                </div>
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex items-start gap-3">
              <Mail className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-cyan-300">
                  We'll send a verification code to {contactEmail}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Verify your email to activate your account and start managing your franchise.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep(2); setError(""); }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleCreateAccount}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-11"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" /> Creating Account...
                  </>
                ) : (
                  <>
                    Create Account & Verify <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Email Verification Step ── */}
        {step === "verify" && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
              <p className="text-slate-400">
                We sent a 6-digit verification code to{" "}
                <strong className="text-white">{contactEmail}</strong>
              </p>
            </div>

            <div className="max-w-sm mx-auto">
              <Label className="text-sm font-medium mb-2 block text-center">
                Enter Verification Code
              </Label>
              <Input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.5em] font-mono h-14"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 max-w-sm mx-auto text-center">
                {error}
              </p>
            )}

            <div className="max-w-sm mx-auto space-y-3">
              <Button
                onClick={handleVerifyAndSubmit}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white h-11"
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" /> Verifying...
                  </>
                ) : (
                  "Verify & Create Profile"
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Didn't receive the code? Check your spam folder or{" "}
                <button
                  className="text-cyan-400 hover:text-cyan-300 underline"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const formData = new FormData();
                      formData.set("name", contactName);
                      formData.set("email", contactEmail);
                      formData.set("password", password);
                      formData.set("flow", "signUp");
                      await signIn("password", formData);
                    } catch {
                      // Expected — account already exists, but OTP will be resent
                    }
                    setLoading(false);
                  }}
                >
                  resend code
                </button>
              </p>
            </div>
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
