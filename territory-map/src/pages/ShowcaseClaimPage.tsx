import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  ArrowRight,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  Building2,
} from "lucide-react";

/**
 * Seamless claim finish for franchisors arriving from the Brand Showcase
 * (brandshowcase.franchiseki.com). They already gave their details and
 * verified email + phone there, so the only thing left is to set a password.
 *
 * URL: /brand-setup?t=<claimToken>
 *  - resolveClaimToken → prefill display (name, brand) + already-verified flags
 *  - set password → signIn(password, signUp) → completeShowcaseClaim(token)
 *    → land in /dashboard (franchise profile manager)
 *
 * Additive + isolated: does NOT touch the existing /claim flow.
 */
export function ShowcaseClaimPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const completeClaim = useMutation(api.brandShowcase.completeShowcaseClaim);

  const prefill = useQuery(api.brandShowcase.resolveClaimToken, token ? { token } : "skip");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "submitting" | "done">("form");
  const [brandSlug, setBrandSlug] = useState("");
  const pendingRef = useRef(false);

  const doComplete = useCallback(async () => {
    try {
      const result = await completeClaim({ token });
      setBrandSlug(result.slug);
      setStep("done");
    } catch (err: any) {
      setError(err?.message || "Could not finish setup. Please try again.");
      setStep("form");
    } finally {
      setLoading(false);
      pendingRef.current = false;
    }
  }, [completeClaim, token]);

  // Once Convex Auth settles after sign-up, finish the claim.
  useEffect(() => {
    if (step === "submitting" && isAuthenticated && pendingRef.current) {
      doComplete();
    }
  }, [step, isAuthenticated, doComplete]);

  async function handleSubmit() {
    if (!prefill || !prefill.ok) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", `${prefill.firstName} ${prefill.lastName}`.trim());
      formData.set("email", prefill.email);
      formData.set("password", password);
      formData.set("flow", "signUp");
      await signIn("password", formData);
      pendingRef.current = true;
      setStep("submitting");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already")) {
        setError(
          "An account with this email already exists. Please log in instead, then claim from your dashboard."
        );
      } else {
        setError("Could not create your account. Please try again.");
      }
      setLoading(false);
    }
  }

  // ── Invalid / expired / missing token ──
  if (!token || (prefill && !prefill.ok)) {
    const reason =
      prefill && !prefill.ok ? prefill.reason : "missing";
    const msg =
      reason === "consumed"
        ? "This setup link has already been used. Try logging in instead."
        : reason === "expired"
          ? "This setup link has expired. Please start again from the Brand Showcase."
          : "This setup link is invalid. Please start again from the Brand Showcase.";
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <PublicNav />
        <div className="flex items-center justify-center py-24">
          <div className="max-w-md mx-auto px-6 text-center">
            <h1 className="text-2xl font-extrabold mb-3">Setup link not valid</h1>
            <p className="text-slate-400 mb-8">{msg}</p>
            <div className="flex gap-3 justify-center">
              <Button className="bg-cyan-600 hover:bg-cyan-500" onClick={() => navigate("/login")}>
                Log In
              </Button>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => (window.location.href = "https://brandshowcase.franchiseki.com/")}
              >
                Brand Showcase
              </Button>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Loading prefill ──
  if (!prefill) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
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
            <h1 className="text-3xl font-extrabold mb-3">You're all set!</h1>
            <p className="text-slate-400 text-lg mb-3">
              <strong className="text-white">{prefill.brandName}</strong> is connected to your
              Franchise KI account.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Your franchise profile is ready to build. Our team will review your claim shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={() => navigate("/dashboard")}
              >
                Go to My Franchise Profile <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              {brandSlug && (
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => navigate(`/franchise-onboarding`)}
                >
                  <Building2 className="w-4 h-4 mr-1" /> Build My Profile
                </Button>
              )}
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Submitting ──
  if (step === "submitting") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Setting up your franchise profile…</p>
          <p className="text-slate-500 text-sm mt-1">This only takes a moment</p>
        </div>
      </div>
    );
  }

  // ── Set-password form ──
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicNav />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2">
            Welcome, {prefill.firstName}.
          </h1>
          <p className="text-slate-400">
            Your contact details are verified. Set a password to finish creating your account for{" "}
            <strong className="text-white">{prefill.brandName}</strong> and manage your franchise
            profile.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          {/* Verified summary — no re-entry */}
          <div className="space-y-2 mb-5 text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-none" />
              <span className="truncate">{prefill.email}</span>
              {prefill.emailVerified && (
                <span className="text-[11px] text-emerald-400 font-semibold">verified</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-none" />
              <span>{prefill.phone}</span>
              {prefill.phoneVerified && (
                <span className="text-[11px] text-emerald-400 font-semibold">verified</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-slate-300">
                Create a password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="bg-white/5 border-white/10 pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirm" className="text-slate-300">
                Confirm password
              </Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="bg-white/5 border-white/10 mt-1"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create Account &amp; Manage My Profile <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

export default ShowcaseClaimPage;
