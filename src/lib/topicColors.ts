export const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  // ICAS strands
  "Number & Arithmetic": { bg: "#dbeafe", text: "#1d4ed8" },
  "Algebra & Patterns": { bg: "#fef3c7", text: "#a16207" },
  "Measures & Units": { bg: "#fee2e2", text: "#b91c1c" },
  "Space & Geometry": { bg: "#d1fae5", text: "#047857" },
  "Chance & Data": { bg: "#ffedd5", text: "#c2410c" },
  // NSW Mathematics K–10 (2022) strands — used by the Selective papers
  "Number and algebra": { bg: "#dbeafe", text: "#1d4ed8" },
  "Measurement and space": { bg: "#fee2e2", text: "#b91c1c" },
  "Statistics and probability": { bg: "#d1fae5", text: "#047857" },
  // EduTest strands — Mathematics + Numerical Reasoning sections.
  // "Algebra & Patterns" and "Space & Geometry" are shared with the ICAS block above.
  "Number": { bg: "#dbeafe", text: "#1d4ed8" },
  "Measurement": { bg: "#fee2e2", text: "#b91c1c" },
  "Data & Statistics": { bg: "#ffedd5", text: "#c2410c" },
  "Numerical Reasoning": { bg: "#ede9fe", text: "#6d28d9" },
  // NAPLAN Numeracy — Australian Curriculum v9 strands.
  // "Number" and "Measurement" are shared with the EduTest block above.
  "Algebra": { bg: "#fef3c7", text: "#a16207" },
  "Space": { bg: "#d1fae5", text: "#047857" },
  "Statistics": { bg: "#ffedd5", text: "#c2410c" },
  "Probability": { bg: "#ede9fe", text: "#6d28d9" },
  // EduTest Verbal Reasoning / Numerical Reasoning / Reading Comprehension
  // sub-strands. Each paper shows only its own five, so the hues repeat across
  // the three sets.
  "Analogies": { bg: "#dbeafe", text: "#1d4ed8" },
  "Number Sequences": { bg: "#dbeafe", text: "#1d4ed8" },
  "Literal Comprehension": { bg: "#dbeafe", text: "#1d4ed8" },
  "Odd One Out": { bg: "#fef3c7", text: "#a16207" },
  "Number Patterns": { bg: "#fef3c7", text: "#a16207" },
  "Inference": { bg: "#fef3c7", text: "#a16207" },
  "Word Meanings": { bg: "#fee2e2", text: "#b91c1c" },
  "Problem Solving": { bg: "#fee2e2", text: "#b91c1c" },
  "Vocabulary in Context": { bg: "#fee2e2", text: "#b91c1c" },
  "Letters, Codes & Series": { bg: "#d1fae5", text: "#047857" },
  "Fractions & Proportion": { bg: "#d1fae5", text: "#047857" },
  "Main Idea & Purpose": { bg: "#d1fae5", text: "#047857" },
  "Logical Deduction": { bg: "#ede9fe", text: "#6d28d9" },
  "Logical Reasoning": { bg: "#ede9fe", text: "#6d28d9" },
  "Author's Craft": { bg: "#ede9fe", text: "#6d28d9" },
  // Selective Reading extra sub-strands
  "Text Structure": { bg: "#ffedd5", text: "#c2410c" },
  "Locating Information": { bg: "#cffafe", text: "#0e7490" },
  // Selective Thinking Skills — "Problem Solving" is shared with the block above
  "Critical Thinking": { bg: "#ede9fe", text: "#6d28d9" },
};

export const TOPIC_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  "Number & Arithmetic": { bg: "#1e3a5f", text: "#60a5fa" },
  "Algebra & Patterns": { bg: "#4a3a0a", text: "#facc15" },
  "Measures & Units": { bg: "#4a1414", text: "#f87171" },
  "Space & Geometry": { bg: "#0d3b2e", text: "#34d399" },
  "Chance & Data": { bg: "#4a2a10", text: "#fb923c" },
  "Number and algebra": { bg: "#1e3a5f", text: "#60a5fa" },
  "Measurement and space": { bg: "#4a1414", text: "#f87171" },
  "Statistics and probability": { bg: "#0d3b2e", text: "#34d399" },
  // EduTest strands
  "Number": { bg: "#1e3a5f", text: "#60a5fa" },
  "Measurement": { bg: "#4a1414", text: "#f87171" },
  "Data & Statistics": { bg: "#4a2a10", text: "#fb923c" },
  "Numerical Reasoning": { bg: "#2e2455", text: "#a78bfa" },
  // NAPLAN Numeracy strands
  "Algebra": { bg: "#4a3a0a", text: "#facc15" },
  "Space": { bg: "#0d3b2e", text: "#34d399" },
  "Statistics": { bg: "#4a2a10", text: "#fb923c" },
  "Probability": { bg: "#2e2455", text: "#a78bfa" },
  // EduTest Verbal / Numerical / Reading sub-strands (hues repeat across the sets)
  "Analogies": { bg: "#1e3a5f", text: "#60a5fa" },
  "Number Sequences": { bg: "#1e3a5f", text: "#60a5fa" },
  "Literal Comprehension": { bg: "#1e3a5f", text: "#60a5fa" },
  "Odd One Out": { bg: "#4a3a0a", text: "#facc15" },
  "Number Patterns": { bg: "#4a3a0a", text: "#facc15" },
  "Inference": { bg: "#4a3a0a", text: "#facc15" },
  "Word Meanings": { bg: "#4a1414", text: "#f87171" },
  "Problem Solving": { bg: "#4a1414", text: "#f87171" },
  "Vocabulary in Context": { bg: "#4a1414", text: "#f87171" },
  "Letters, Codes & Series": { bg: "#0d3b2e", text: "#34d399" },
  "Fractions & Proportion": { bg: "#0d3b2e", text: "#34d399" },
  "Main Idea & Purpose": { bg: "#0d3b2e", text: "#34d399" },
  "Logical Deduction": { bg: "#2e2455", text: "#a78bfa" },
  "Logical Reasoning": { bg: "#2e2455", text: "#a78bfa" },
  "Author's Craft": { bg: "#2e2455", text: "#a78bfa" },
  "Text Structure": { bg: "#4a2a10", text: "#fb923c" },
  "Locating Information": { bg: "#164e57", text: "#22d3ee" },
  "Critical Thinking": { bg: "#2e2455", text: "#a78bfa" },
};
