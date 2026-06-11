import { useEffect, useState } from "react";
import { prefersReducedMotion, useReveal } from "./Reveal";

/**
 * Animated number counter — counts from 0 to `value` over ~1.2s with
 * ease-out once the element enters the viewport (runs once).
 * Respects prefers-reduced-motion by rendering the final value instantly.
 * Uses requestAnimationFrame only (no layout-thrashing).
 */
export function CountUp({
  value,
  duration = 1200,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLSpanElement>(0.25);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (prefersReducedMotion() || value <= 0) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3; // ease-out cubic
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
    </span>
  );
}
