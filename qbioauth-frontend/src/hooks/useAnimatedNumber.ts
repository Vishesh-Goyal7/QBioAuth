import { useEffect, useRef, useState } from "react";

// Tweens a displayed number toward `target` whenever it changes, instead of
// snapping instantly — used for the key-size shrink animation.
export function useAnimatedNumber(target: number, durationMs = 800): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    const from = valueRef.current;
    if (from === target) return;

    let raf: number;
    const startTime = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      valueRef.current = next;
      setValue(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
