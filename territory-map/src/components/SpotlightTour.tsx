import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * Lightweight spotlight tour — no library. Dims the page and cuts a
 * "spotlight" around the target element (box-shadow trick), with a step
 * card beside it.
 *
 * INTERACTIVE: the overlay never captures pointer events — only the step
 * card does — so users can click into and fill the highlighted fields
 * while the tour narrates. Missing targets are skipped in the direction
 * of travel so Back/Next never strand the user.
 */

export type TourStep = {
  target: string; // CSS selector
  title: string;
  body: string;
};

const PAD = 8;

export function SpotlightTour({
  steps,
  storageKey,
  onDone,
}: {
  steps: TourStep[];
  storageKey: string; // localStorage key marking the tour as completed
  onDone?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [active, setActive] = useState(() => {
    try { return localStorage.getItem(storageKey) !== "1"; } catch { return true; }
  });
  // Keep a stable reference to steps — parents pass inline arrays
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const stepsKey = useMemo(() => steps.map((s) => s.target).join("|"), [steps]);
  const prevIdx = useRef(0);

  const finish = () => {
    setActive(false);
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    onDone?.();
  };

  const go = (next: number) => {
    const dir = next >= idx ? 1 : -1;
    let i = next;
    // skip steps whose target isn't on the page, in the direction of travel
    while (i >= 0 && i < stepsRef.current.length && !document.querySelector(stepsRef.current[i].target)) {
      i += dir;
    }
    if (i >= stepsRef.current.length) { finish(); return; }
    if (i < 0) i = idx; // nothing before — stay put
    prevIdx.current = idx;
    setIdx(i);
  };

  // Measure + follow the current target
  useEffect(() => {
    if (!active) return;
    const all = stepsRef.current;
    const step = all[idx];
    if (!step) { finish(); return; }
    const el = document.querySelector(step.target);
    if (!el) {
      // current target vanished — try forward, else end
      const after = all.slice(idx + 1).findIndex((s) => document.querySelector(s.target));
      if (after >= 0) setIdx(idx + 1 + after);
      else finish();
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => {
      const r = document.querySelector(step.target)?.getBoundingClientRect();
      if (r) setRect(r);
    }, 380);
    const onMove = () => {
      const r = document.querySelector(step.target)?.getBoundingClientRect();
      if (r) setRect(r);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, idx, stepsKey]);

  if (!active || !rect) return null;
  const step = steps[idx];
  if (!step) return null;
  const isLast = idx === steps.length - 1;

  // Card below the target unless that would clip off-screen
  const cardBelow = rect.bottom + 200 < window.innerHeight;
  const cardTop = cardBelow ? rect.bottom + PAD + 6 : undefined;
  const cardBottom = cardBelow ? undefined : window.innerHeight - rect.top + PAD + 6;
  const cardLeft = Math.min(Math.max(rect.left, 12), Math.max(window.innerWidth - 372, 12));

  return (
    // pointer-events-none: the page stays fully interactive — users can
    // type into the spotlighted fields while the tour narrates
    <div className="fixed inset-0 z-[80] pointer-events-none" role="dialog" aria-label="Onboarding tour">
      {/* Spotlight cutout */}
      <div
        className="absolute rounded-xl ring-2 ring-cyan-400/90 transition-all duration-300"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.7)",
        }}
      />
      {/* Step card — the only interactive part of the overlay */}
      <div
        className="absolute w-[360px] max-w-[calc(100vw-24px)] bg-[#0b1426] border border-cyan-400/30 rounded-xl shadow-2xl p-4 pointer-events-auto"
        style={{ top: cardTop, bottom: cardBottom, left: cardLeft }}
      >
        <button
          aria-label="Skip tour"
          onClick={finish}
          className="absolute top-2.5 right-2.5 text-slate-500 hover:text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">
          Step {idx + 1} of {steps.length}
        </div>
        <h3 className="font-bold text-white mb-1.5">{step.title}</h3>
        <p className="text-[13px] leading-relaxed text-slate-300 mb-1.5">{step.body}</p>
        <p className="text-[11px] text-cyan-300/70 mb-3.5">
          You can fill this in right now — the tour will wait.
        </p>
        <div className="flex items-center justify-between">
          <button onClick={finish} className="text-xs text-slate-500 hover:text-slate-300">
            Skip tour
          </button>
          <div className="flex gap-2">
            {idx > 0 && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => go(idx - 1)}>
                Back
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 bg-cyan-600 hover:bg-cyan-500 text-white"
              onClick={() => (isLast ? finish() : go(idx + 1))}
            >
              {isLast ? "Got it!" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
