import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
} from "react";

/**
 * Motion design system — scroll-triggered reveal primitives.
 *
 * One reusable mechanism for the whole public site:
 *  - `useReveal`  — IntersectionObserver hook (fires once at ~25% visibility)
 *  - `<Reveal>`   — wrapper that fades up (`.reveal`) or staggers its
 *                   direct children (`.reveal-stagger`, ~80ms apart, capped)
 *
 * CSS lives in index.css. Respects prefers-reduced-motion (content is
 * shown immediately, no animation).
 */

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useReveal<T extends HTMLElement = HTMLElement>(
  threshold = 0.25,
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    // Reduced motion or no IO support → show content immediately.
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    // Trigger once ~25% of the element is in view. For elements taller
    // than the viewport a 25% ratio can never be reached, so cap the
    // effective threshold at "25% of the viewport's worth of the element".
    const viewportH = window.innerHeight || 800;
    const elH = el.offsetHeight;
    const effectiveThreshold =
      elH > 0 ? Math.min(threshold, (viewportH * threshold) / elH) : threshold;

    let ticking = false;

    const cleanup = () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    const reveal = () => {
      setVisible(true);
      cleanup();
    };

    // Fallback: fast jumps (anchor links, End key, scroll restoration) can
    // skip IntersectionObserver entirely — if the element ends up above the
    // viewport it was scrolled past, so show it immediately.
    const checkScrolledPast = () => {
      ticking = false;
      if (el.getBoundingClientRect().bottom < 0) reveal();
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(checkScrolledPast);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Already scrolled past (e.g. page restored mid-scroll) → show.
          if (e.isIntersecting || e.boundingClientRect.bottom < 0) {
            reveal();
            return;
          }
        }
      },
      { threshold: effectiveThreshold },
    );
    observer.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  return { ref, visible };
}

interface RevealProps extends HTMLAttributes<HTMLElement> {
  /** Element tag to render (default "div") */
  as?: ElementType;
  /** Stagger direct children instead of fading the wrapper itself */
  stagger?: boolean;
  /** Extra transition delay in ms (for layered hero reveals) */
  delay?: number;
  /** IntersectionObserver threshold (default 0.25) */
  threshold?: number;
}

export function Reveal({
  as = "div",
  stagger = false,
  delay = 0,
  threshold = 0.25,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const { ref, visible } = useReveal<HTMLElement>(threshold);
  const base = stagger ? "reveal-stagger" : "reveal";
  const cls = `${base}${visible ? " reveal-visible" : ""}${className ? ` ${className}` : ""}`;
  return createElement(
    as,
    {
      ref,
      className: cls,
      style: delay > 0 ? { ...style, transitionDelay: `${delay}ms` } : style,
      ...rest,
    },
    children,
  );
}
