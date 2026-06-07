import { useEffect, useRef } from "react";

export type ActivityCounts = {
  keys: number;
  mouseMoves: number;
  clicks: number;
  scrolls: number;
  focused: boolean;
};

/**
 * Tracks user input activity in the current tab.
 * Returns a ref to the running totals — call snapshot() to read & reset.
 */
export function useActivityTracker(enabled: boolean) {
  const counts = useRef<ActivityCounts>({
    keys: 0,
    mouseMoves: 0,
    clicks: 0,
    scrolls: 0,
    focused: typeof document !== "undefined" ? !document.hidden : true,
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let lastMove = 0;
    const onKey = () => { counts.current.keys++; };
    const onClick = () => { counts.current.clicks++; };
    const onMove = (e: MouseEvent) => {
      const now = e.timeStamp;
      if (now - lastMove > 40) { counts.current.mouseMoves++; lastMove = now; }
    };
    const onScroll = () => { counts.current.scrolls++; };
    const onVis = () => { counts.current.focused = !document.hidden; };

    window.addEventListener("keydown", onKey, { passive: true });
    window.addEventListener("click", onClick, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled]);

  const snapshot = (): ActivityCounts => {
    const c = { ...counts.current };
    counts.current.keys = 0;
    counts.current.mouseMoves = 0;
    counts.current.clicks = 0;
    counts.current.scrolls = 0;
    return c;
  };

  return { snapshot };
}
