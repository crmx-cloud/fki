import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { User, X } from "lucide-react";

/**
 * Real-time social-proof popups ("purchase proof" style) for the public
 * site. Shows anonymized, real profile activity: state + what they did —
 * never a name or any personal detail. New signups (reactive via Convex)
 * jump the queue instantly; otherwise it slowly rotates through the latest
 * 50. Dismissing hides it for the rest of the session.
 */

const SHOW_MS = 6500;
const GAP_MS = 9000;
const DISMISS_KEY = "fki-social-proof-dismissed";

function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  return "recently";
}

function message(item: { complete: boolean; enhanced: boolean }): string {
  if (item.enhanced) return "completed their enhanced profile and sharpened their PerfectFit matches";
  if (item.complete) return "just created their profile and found their top franchise matches";
  return "just started their franchise search";
}

export function SocialProofToasts() {
  const items = useQuery(api.socialProof.recent);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });
  const latestTs = useRef<number | null>(null);
  const list = useMemo(() => items ?? [], [items]);

  // New real-time signup → jump the queue and show it immediately
  useEffect(() => {
    if (!list.length) return;
    if (latestTs.current === null) {
      latestTs.current = list[0].ts; // initial load — don't force-show
      return;
    }
    if (list[0].ts > latestTs.current) {
      latestTs.current = list[0].ts;
      setIdx(0);
      setVisible(true);
    }
  }, [list]);

  // Rotation loop
  useEffect(() => {
    if (dismissed || !list.length) return;
    let t: ReturnType<typeof setTimeout>;
    if (visible) {
      t = setTimeout(() => setVisible(false), SHOW_MS);
    } else {
      t = setTimeout(() => {
        setIdx((i) => (i + 1) % list.length);
        setVisible(true);
      }, GAP_MS);
    }
    return () => clearTimeout(t);
  }, [visible, dismissed, list.length]);

  if (dismissed || !list.length) return null;
  const item = list[idx % list.length];

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-4 left-4 z-40 max-w-[320px] transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <div className="relative flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0b1426]/95 backdrop-blur-md p-3.5 pr-8 shadow-2xl shadow-black/40">
        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/30 flex items-center justify-center">
          <User className="w-4 h-4 text-cyan-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] leading-snug text-slate-200">
            <span className="font-semibold text-white">Someone in {item.state}</span>{" "}
            {message(item)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            {timeAgo(item.ts)} · FranchiseKI
          </p>
        </div>
        <button
          aria-label="Dismiss"
          onClick={() => {
            setDismissed(true);
            try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
          }}
          className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
