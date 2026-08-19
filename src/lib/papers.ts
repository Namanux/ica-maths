import type { Paper, PaperSummary } from "./types";
import sampleY5Paper1 from "@/data/papers/sample-y5-paper1.json";
import icas2017PaperC from "@/data/papers/icas-2017-paper-c.json";
import icas2018PaperC from "@/data/papers/icas-2018-paper-c.json";

const papers: Paper[] = [
  sampleY5Paper1 as Paper,
  icas2017PaperC as Paper,
  icas2018PaperC as Paper,
];

export function getAllPapers(): PaperSummary[] {
  return papers.map((p) => ({
    id: p.id,
    subject: p.subject,
    yearLevel: p.yearLevel,
    paperCode: p.paperCode,
    title: p.title,
    year: p.year,
    timeLimitMinutes: p.timeLimitMinutes,
    questionCount: p.questions.length,
  }));
}

export function getPaperById(id: string): Paper | undefined {
  return papers.find((p) => p.id === id);
}
