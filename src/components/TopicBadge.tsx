"use client";

import { useTheme } from "@/lib/theme-provider";
import { TOPIC_COLORS, TOPIC_COLORS_DARK } from "@/lib/topicColors";

export function TopicBadge({ topic }: { topic: string }) {
  const { theme } = useTheme();
  const palette = theme === "dark" ? TOPIC_COLORS_DARK : TOPIC_COLORS;
  const colors = palette[topic] ?? { bg: "var(--surface)", text: "var(--foreground)" };

  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {topic}
    </span>
  );
}
