import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: branding + customer service contact */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <img src="/logo-dark-bg.png" alt="Franchise KI" className="h-6" />
              <span className="text-sm text-slate-400">
                © {new Date().getFullYear()} Franchise KI. All rights reserved.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
              <span>
                Customer service:{" "}
                <a href="tel:+13854755319" className="text-slate-300 hover:text-white transition-colors">
                  (385) 475-5319
                </a>
              </span>
              <a href="mailto:info@franchiseki.com" className="text-slate-300 hover:text-white transition-colors">
                info@franchiseki.com
              </a>
            </div>
          </div>

          {/* Right: links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <Link to="/quiz" className="hover:text-white transition-colors">PerfectFit</Link>
            <Link to="/explore" className="hover:text-white transition-colors">Explore</Link>
            <Link to="/lists" className="hover:text-white transition-colors">Top Lists</Link>
            <a href="https://brandshowcase.franchiseki.com/" className="hover:text-white transition-colors">For Franchisors</a>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <span className="hidden md:inline text-white/10">|</span>
            <Link to="/login" className="hover:text-cyan-400 transition-colors">Franchisor Login</Link>
            <Link to="/login" className="hover:text-cyan-400 transition-colors">Admin Login</Link>
          </div>
        </div>

        {/* Newsletter capture → CRMX (fki-newsletter tag) */}
        <NewsletterSignup />

        {/* Site-wide due-diligence / liability disclaimer */}
        <p className="mt-8 pt-6 border-t border-white/5 text-[11px] leading-relaxed text-slate-600 max-w-5xl">
          Franchise KI's research, data points, scores, and summaries are generated with the
          assistance of artificial intelligence from publicly available sources (including
          Franchise Disclosure Documents, franchisor websites, and industry directories) and may
          contain errors, omissions, or outdated figures. Nothing on this site is financial,
          legal, accounting, or investment advice, and nothing here is a recommendation to buy
          any franchise. You are 100% responsible for completing your own independent due
          diligence before investing any money — including reviewing the brand's current FDD in
          full, validating with existing franchisees, and consulting a qualified franchise
          attorney and accountant. Franchise KI and its affiliates assume no liability for
          investment decisions made based on information presented here.
        </p>
      </div>
    </footer>
  );
}


function NewsletterSignup() {
  const subscribe = useMutation(api.newsletter.subscribe);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  return (
    <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="text-sm text-slate-400 sm:flex-1">
        <span className="font-semibold text-slate-300">Franchise intel, monthly.</span>{" "}
        New brands, market moves, and due-diligence tips — no spam.
      </div>
      {state === "done" ? (
        <span className="text-sm text-emerald-400 font-medium">You're in — welcome aboard.</span>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email.trim() || state === "busy") return;
            setState("busy");
            const r = await subscribe({ email: email.trim(), source: "footer" }).catch(() => ({ ok: false }));
            setState(r?.ok ? "done" : "idle");
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-56 rounded-lg bg-white/[0.06] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400/50 placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={state === "busy"}
            className="rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-60"
          >
            {state === "busy" ? "…" : "Subscribe"}
          </button>
        </form>
      )}
    </div>
  );
}
