"use client";

import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextIsDark = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      aria-label={nextIsDark ? "Switch to dark mode" : "Switch to light mode"}
      title={nextIsDark ? "Dark mode" : "Light mode"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
    >
      {nextIsDark ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
