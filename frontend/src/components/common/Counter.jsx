import { useEffect, useRef, useState } from "react";
import { fmtNumber } from "@/utils/format";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export const Counter = ({ value = 0, duration = 1200, suffix = "" }) => {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const ref = useRef(null);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return (
    <span ref={ref}>
      {fmtNumber(display)}
      {suffix}
    </span>
  );
};
