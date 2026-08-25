"use client";

import { useEffect } from "react";

/**
 * Remembers this page's scroll position across navigations, independent of
 * how the user leaves and returns. Browser/Next.js scroll restoration only
 * kicks in for actual back/forward navigation — a plain link (e.g. the
 * header title) is a fresh forward navigation and always lands at the top.
 * This covers every path back to the page, not just one button.
 *
 * Uses setTimeout rather than requestAnimationFrame throughout: rAF is tied
 * to the paint loop and can be throttled or never fire in a backgrounded or
 * not-yet-composited tab, silently dropping both the save and the restore.
 */
export function ScrollRestoration({ storageKey }: { storageKey: string }) {
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    const targetY = saved ? parseInt(saved, 10) : null;

    if (targetY !== null && !Number.isNaN(targetY) && targetY > 0) {
      // Content on this page loads asynchronously (attempts, charts), so the
      // page may not be tall enough to reach targetY yet — poll briefly for
      // it to grow before scrolling, rather than restoring too early.
      let attempts = 0;
      let pollTimer: ReturnType<typeof setTimeout>;
      const tryScroll = () => {
        attempts++;
        const canReach = document.documentElement.scrollHeight - window.innerHeight >= targetY;
        if (canReach || attempts > 40) {
          window.scrollTo(0, targetY);
        } else {
          pollTimer = setTimeout(tryScroll, 50);
        }
      };
      tryScroll();
      return () => clearTimeout(pollTimer);
    }
  }, [storageKey]);

  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      }, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [storageKey]);

  return null;
}
