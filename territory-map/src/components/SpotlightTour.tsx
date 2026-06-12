import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * Lightweight spotlight tour — no library. Dims the page and cuts a
 * "spotlight" around the target element (box-shadow trick), with a step
 * card beside it. Steps target DOM selectors; missing targets are
 * skipped automatically so the tour never strands the user.
 *
 * Used for the first-login onboarding walkthrough (profile sections →
 * find/save/compare/dossier/consultant path).
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

  const finish = useCallback(() => {
    setActive(false);
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    onDone?.();
  }, [storageKey, onDone]);

  // Resolve the current step's element; skip steps whose target is missing
  const measure = useCallback(() => {
    if (!active) return;
    let i = idx;
    let el: Element | null = null;
    while (i < steps.length) {
      el = document.querySelector(steps[i].target);
      if (el) break;
      i++;
    }
    if (!el) { finish(); return; }
    if (i !== idx) { setIdx(i); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // measure after the scroll settles
    const t = setTimeout(() => {
      const r = document.querySelector(steps[i].target)?.getBoundingClientRect();
      if (r) setRect(r);
    }, 350);
    return () => clearTimeout(t);
  }, [active, idx, steps, finish]);

  useEffect(() => {
    const cleanup = measure();
    const onScrollOrResize = () => {
      const r = document.querySelector(steps[idx]?.target)?.getBoundingClientRect();
      if (r) setRect(r);
    };
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      if (typeof cleanup === "function") cleanup();
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [measure, idx, steps]);

  if (!active || !rect) return null;
  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  // Card below the target unless that would clip off-screen
  const cardBelow = rect.bottom + 190 < window.innerHeight;
  const cardTop = cardBelow ? rect.bottom + PAD + 6 : undefined;
  const cardBottom = cardBelow ? undefined : window.innerHeight - rect.top + PAD + 6;
  const cardLeft = Math.min(Math.max(rect.left, 12), Math.max(window.innerWidth - 372, 12));

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-label="Onboarding tour">
      {/* Spotlight cutout */}
      <div
        className="absolute rounded-xl ring-2 ring-cyan-400/90 transition-all duration-300 pointer-events-none"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.82)",
        }}
      />
      {/* Step card */}
      <div
        className="absolute w-[360px] max-w-[calc(100vw-24px)] bg-[#0b1426] border border-cyan-400/30 rounded-xl shadow-2xl p-4"
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
        <p className="text-[13px] leading-relaxed text-slate-300 mb-4">{step.body}</p>
        <div className="flex items-center justify-between">
          <button onClick={finish} className="text-xs text-slate-500 hover:text-slate-300">
            Skip tour
          </button>
          <div className="flex gap-2">
            {idx > 0 && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => setIdx(idx - 1)}>
                Back
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 bg-cyan-600 hover:bg-cyan-500 text-white"
              onClick={() => (isLast ? finish() : setIdx(idx + 1))}
            >
              {isLast ? "Got it!" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
