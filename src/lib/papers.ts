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
import selectiveReadingPt1 from "@/data/papers/selective-reading-pt1.json";
import selectiveReadingPt2 from "@/data/papers/selective-reading-pt2.json";
import selectiveReadingPt3 from "@/data/papers/selective-reading-pt3.json";
import selectiveThinkingPt1 from "@/data/papers/selective-thinking-pt1.json";
import selectiveThinkingPt2 from "@/data/papers/selective-thinking-pt2.json";
import selectiveThinkingPt3 from "@/data/papers/selective-thinking-pt3.json";
import icas2010EnglishPaperC from "@/data/papers/icas-2010-english-paper-c.json";
import icas2018EnglishPaperC from "@/data/papers/icas-2018-english-paper-c.json";
import icas2017EnglishPaperC from "@/data/papers/icas-2017-english-paper-c.json";
import icas2016EnglishPaperC from "@/data/papers/icas-2016-english-paper-c.json";
import icas2011EnglishPaperC from "@/data/papers/icas-2011-english-paper-c.json";
import icas2012EnglishPaperC from "@/data/papers/icas-2012-english-paper-c.json";
import icas2013EnglishPaperC from "@/data/papers/icas-2013-english-paper-c.json";
import icas2014EnglishPaperC from "@/data/papers/icas-2014-english-paper-c.json";
import icas2015EnglishPaperC from "@/data/papers/icas-2015-english-paper-c.json";
import icas2018EnglishOriginal from "@/data/papers/icas-2018-english-original.json";

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
  selectiveReadingPt1 as Paper,
  selectiveReadingPt2 as Paper,
  selectiveReadingPt3 as Paper,
  selectiveThinkingPt1 as Paper,
  selectiveThinkingPt2 as Paper,
  selectiveThinkingPt3 as Paper,
  edutestY5Maths1 as Paper,
  edutestY5Numerical1 as Paper,
  edutestY5Verbal1 as Paper,
  edutestY5Reading1 as Paper,
  icas2010EnglishPaperC as Paper,
  icas2018EnglishPaperC as Paper,
  icas2017EnglishPaperC as Paper,
  icas2016EnglishPaperC as Paper,
  icas2011EnglishPaperC as Paper,
  icas2012EnglishPaperC as Paper,
  icas2013EnglishPaperC as Paper,
  icas2014EnglishPaperC as Paper,
  icas2015EnglishPaperC as Paper,
  icas2018EnglishOriginal as Paper,
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
export function examHomeSlug(
  paper: Pick<Paper, "exam" | "component" | "subject">
): string {
  const exam = paperExam(paper);
  if (exam === "selective-test") {
    return `selective-test/${paper.component ?? "mathematical-reasoning"}`;
  }
  if (exam === "icas") {
    return `icas/year5/${icasSubjectSlug(paper)}`;
  }
  if (exam === "edutest") {
    return `edutest/year5/${edutestSubjectSlug(paper)}`;
  }
  return exam;
}

/**
 * ICAS Year 5 is split by subject (Mathematics, English, …). This maps a
 * paper's `subject` to the URL segment used under `icas/year5/`.
 */
const ICAS_SUBJECT_SLUGS: Record<string, string> = {
  Mathematics: "maths",
  English: "english",
};

export function icasSubjectSlug(paper: Pick<Paper, "subject">): string {
  return ICAS_SUBJECT_SLUGS[paper.subject] ?? "maths";
}

/** ICAS papers for one subject slug ("maths", "english"). */
export function getIcasPapers(subjectSlug: string): PaperSummary[] {
  return papers
    .filter((p) => paperExam(p) === "icas" && icasSubjectSlug(p) === subjectSlug)
    .map(toSummary)
    .sort((a, b) => a.year - b.year);
}

/**
 * EduTest is split by year level, then by subject (Mathematics, Numerical
 * Reasoning, Verbal Reasoning, Reading Comprehension). This maps a paper's
 * `subject` to the URL segment used under `edutest/year5/`.
 */
const EDUTEST_SUBJECT_SLUGS: Record<string, string> = {
  Mathematics: "maths",
  "Numerical Reasoning": "numerical-reasoning",
  "Verbal Reasoning": "verbal-reasoning",
  "Reading Comprehension": "reading-comprehension",
};

export function edutestSubjectSlug(paper: Pick<Paper, "subject">): string {
  return EDUTEST_SUBJECT_SLUGS[paper.subject] ?? "maths";
}

/** EduTest papers for one subject slug ("maths", "verbal-reasoning", …). */
export function getEdutestPapers(subjectSlug: string): PaperSummary[] {
  return papers
    .filter(
      (p) => paperExam(p) === "edutest" && edutestSubjectSlug(p) === subjectSlug
    )
    .map(toSummary);
}

export function selectiveComponent(paper: Pick<Paper, "component">): string {
  return paper.component ?? "mathematical-reasoning";
}

function toSummary(p: Paper): PaperSummary {
  return {
    id: p.id,
    exam: paperExam(p),
    component: p.component,
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

/** Selective papers for one test component ("mathematical-reasoning", "reading", …). */
export function getSelectivePapers(component: string): PaperSummary[] {
  return papers
    .filter(
      (p) => paperExam(p) === "selective-test" && selectiveComponent(p) === component
    )
    .map(toSummary);
}

export function getPaperById(id: string): Paper | undefined {
  return papers.find((p) => p.id === id);
}

/**
 * Short, disambiguating chart-axis label for an attempt's paper — e.g. "2010 C"
 * or "2024 PT1". Attempts are otherwise easy to mix up when a profile sits
 * multiple papers on the same calendar day (or retakes the same paper), since
 * a date-only label can't tell those points apart.
 */
export function paperChartLabel(paperId: string, fallbackTitle: string): string {
  const paper = getPaperById(paperId);
  return paper ? `${paper.year} ${paper.paperCode}` : fallbackTitle;
}
