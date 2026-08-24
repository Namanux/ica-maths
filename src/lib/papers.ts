import type { Paper, PaperSummary } from "./types";
import sampleY5Paper1 from "@/data/papers/sample-y5-paper1.json";
import icas2011PaperC from "@/data/papers/icas-2011-paper-c.json";
import icas2012PaperC from "@/data/papers/icas-2012-paper-c.json";
import icas2013PaperC from "@/data/papers/icas-2013-paper-c.json";
import icas2014PaperC from "@/data/papers/icas-2014-paper-c.json";
import icas2015PaperC from "@/data/papers/icas-2015-paper-c.json";
import icas2016PaperC from "@/data/papers/icas-2016-paper-c.json";
import icas2017PaperC from "@/data/papers/icas-2017-paper-c.json";
import icas2018PaperC from "@/data/papers/icas-2018-paper-c.json";

const papers: Paper[] = [
  sampleY5Paper1 as Paper,
  icas2011PaperC as Paper,
  icas2012PaperC as Paper,
  icas2013PaperC as Paper,
  icas2014PaperC as Paper,
  icas2015PaperC as Paper,
  icas2016PaperC as Paper,
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
