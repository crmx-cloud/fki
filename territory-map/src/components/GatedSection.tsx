import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Freemium gate primitives (signed-out visitors only).
 *
 * <GatedSection> — children-as-locked-placeholder pattern:
 * callers pass LOW-FIDELITY placeholder content (e.g. "$—" rows or
 * skeleton bars) as children. The placeholder is blurred and inert,
 * with a centered lock overlay + signup CTA. NEVER pass real data
 * values as children — nothing behind the blur should leak into the
 * DOM for signed-out users.
 *
 * Static styling only (no animation) → prefers-reduced-motion safe.
 */
export function GatedSection({
  children,
  heading = "Free with your account",
  note,
  bullets,
  ctaLabel = "Create free account",
  className = "",
  verifyMode = false,
}: {
  /** Placeholder-only content rendered blurred behind the lock */
  children: ReactNode;
  heading?: string;
  /** Small line under the heading (e.g. flag counts) */
  note?: ReactNode;
  /** Benefit bullets shown inside the lock card */
  bullets?: string[];
  ctaLabel?: string;
  className?: string;
  /** Signed-in but unverified: CTA routes to /verify instead of signup */
  verifyMode?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Locked placeholder — blurred, inert, hidden from a11y tree */}
      <div aria-hidden="true" className="pointer-events-none select-none blur-[5px] opacity-70">
        {children}
      </div>

      {/* Centered lock overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm shadow-xl px-7 py-7 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-900">{heading}</p>
          {note && <p className="text-xs text-slate-500 mt-1">{note}</p>}
          {bullets && bullets.length > 0 && (
            <div className="mt-4 space-y-2 text-left w-fit mx-auto">
              {bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 leading-snug">{b}</span>
                </div>
              ))}
            </div>
          )}
          <Link to={verifyMode ? "/verify" : "/signup"} className="inline-block mt-5">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6">
              {verifyMode ? "Verify email & phone to unlock" : ctaLabel} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Slim membership upsell strip — shown to signed-out visitors at the
 * bottom of brand pages (all tabs), above the footer. Elegant, not a
 * paywall scream.
 */
export function MembershipUpsellStrip() {
  return (
    <section className="border-t border-slate-100 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Free account unlocks:</p>
            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
              full financial performance data · sourced red-flag alerts · save &amp; compare
              up to 4 brands side-by-side · your personalized Due Diligence Dossier{" "}
              <span className="font-medium text-slate-700">($5,000+ consultant value)</span>
            </p>
          </div>
        </div>
        <Link to="/signup" className="shrink-0">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold">
            Create free account <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
