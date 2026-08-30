import type { Paper, PaperSummary } from "./types";
import sampleY5Paper1 from "@/data/papers/sample-y5-paper1.json";
import icas2010PaperC from "@/data/papers/icas-2010-paper-c.json";
import icas2011PaperC from "@/data/papers/icas-2011-paper-c.json";
import icas2012PaperC from "@/data/papers/icas-2012-paper-c.json";
import icas2013PaperC from "@/data/papers/icas-2013-paper-c.json";
import icas2014PaperC from "@/data/papers/icas-2014-paper-c.json";
import icas2015PaperC from "@/data/papers/icas-2015-paper-c.json";
import icas2016PaperC from "@/data/papers/icas-2016-paper-c.json";
import icas2017PaperC from "@/data/papers/icas-2017-paper-c.json";
import icas2018PaperC from "@/data/papers/icas-2018-paper-c.json";
import selectivePt1 from "@/data/papers/selective-pt1.json";
import selectivePt2 from "@/data/papers/selective-pt2.json";
import selectivePt3 from "@/data/papers/selective-pt3.json";
import selectivePt4 from "@/data/papers/selective-pt4.json";
import edutestY5Maths1 from "@/data/papers/edutest-y5-maths-1.json";
import edutestY5Numerical1 from "@/data/papers/edutest-y5-numerical-1.json";
import edutestY5Verbal1 from "@/data/papers/edutest-y5-verbal-1.json";
import edutestY5Reading1 from "@/data/papers/edutest-y5-reading-1.json";

const DEFAULT_EXAM = "icas";

const papers: Paper[] = [
  sampleY5Paper1 as Paper,
  icas2010PaperC as Paper,
  icas2011PaperC as Paper,
  icas2012PaperC as Paper,
  icas2013PaperC as Paper,
  icas2014PaperC as Paper,
  icas2015PaperC as Paper,
  icas2016PaperC as Paper,
  icas2017PaperC as Paper,
  icas2018PaperC as Paper,
  selectivePt1 as Paper,
  selectivePt2 as Paper,
  selectivePt3 as Paper,
  selectivePt4 as Paper,
  edutestY5Maths1 as Paper,
  edutestY5Numerical1 as Paper,
  edutestY5Verbal1 as Paper,
  edutestY5Reading1 as Paper,
];

export function paperExam(paper: Pick<Paper, "exam">): string {
  return paper.exam ?? DEFAULT_EXAM;
}

/**
 * Path segment(s) under `/{profileSlug}/` for a paper's "section home" — the
 * page a Back/Cancel button returns to. The Selective section is split by test
 * component (Mathematical Reasoning, Reading, …), so its papers land on
 * `selective-test/<component>` rather than plain `selective-test`. ICAS is
 * split by year level then subject, so its papers land on
 * `icas/<yearLevel>/<subject>` rather than plain `icas`.
 */
export function examHomeSlug(paper: Pick<Paper, "exam" | "component">): string {
  const exam = paperExam(paper);
  if (exam === "selective-test") {
    return `selective-test/${paper.component ?? "mathematical-reasoning"}`;
  }
  if (exam === "icas") {
    return "icas/year5/maths";
  }
  return exam;
}

function toSummary(p: Paper): PaperSummary {
  return {
    id: p.id,
    exam: paperExam(p),
    subject: p.subject,
    yearLevel: p.yearLevel,
    paperCode: p.paperCode,
    title: p.title,
    year: p.year,
    timeLimitMinutes: p.timeLimitMinutes,
    questionCount: p.questions.length,
  };
}

export function getAllPapers(): PaperSummary[] {
  return papers.map(toSummary);
}

export function getPapersByExam(exam: string): PaperSummary[] {
  return papers.filter((p) => paperExam(p) === exam).map(toSummary);
}

export function getPaperById(id: string): Paper | undefined {
  return papers.find((p) => p.id === id);
}
