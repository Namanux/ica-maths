/**
 * Server-side proxy for the ICAS Writing AI feedback.
 *
 * The standalone prototype called `api.anthropic.com` straight from the
 * browser (fine inside Claude's artifact sandbox, not here). This Route
 * Handler keeps the API key server-side and exposes three "modes":
 *
 *   - score   → the 5-criteria rubric score + strengths + tips
 *   - detail  → the annotated "Logs" report
 *   - rewrite → a full-marks rewrite that preserves the student's ideas
 *
 * Set ANTHROPIC_API_KEY in the environment to enable it. Without a key the
 * endpoint responds 503 and the UI shows an "AI feedback unavailable" note.
 */

import type { NextRequest } from "next/server";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

type Mode = "score" | "detail" | "rewrite";

interface FeedbackRequest {
  mode: Mode;
  taskType: "narrative" | "persuasive";
  taskTitle: string;
  responseText: string;
  wordCount?: number;
  timeUsed?: string;
  previousTotal?: number | null;
  isRevision?: boolean;
}

const SCORE_SYSTEM =
  "You are an experienced ICAS Writing marker for Year 5-6 students in Australia. " +
  "Score the student's response using the REAL, official ICAS Writing framework, which has three domains: " +
  "(1) Genre — how well the text is structured for its purpose (narrative or persuasive) and the stylistic/vocabulary choices made to engage the reader; " +
  "(2) Textual Grammar — correct and effective use of tense, correct use of pronouns/conjunctions/text connectives (however, therefore, furthermore, meanwhile, in addition, as a result) for cohesion, and correctly formed varied sentence types (simple, compound, complex); " +
  "(3) Syntax/Punctuation — correct sentence grammar (subject-verb agreement), correct use of prepositions, articles, plurals, and punctuation — including correct comma use (commas before coordinating conjunctions in compound sentences, commas after introductory clauses) and the ABSENCE of run-on/fused sentences and comma splices. " +
  "When judging grammarTense and grammarCohesion, specifically weigh whether compound and complex sentences are correctly formed (not just present), whether connectives are used accurately, and dock marks for run-on sentences. When judging syntaxPunctuation, specifically weigh correct comma placement and penalise comma splices/run-ons. " +
  "Score these 5 sub-criteria out of 5 each: genreStructure (Genre: Structure & Purpose), genreStyle (Genre: Style & Vocabulary), grammarTense (Textual Grammar: Tense & Sentence Variety), grammarCohesion (Textual Grammar: Cohesion via pronouns/conjunctions/connectives), syntaxPunctuation (Syntax & Punctuation). " +
  "Note: ICAS scoring is cumulative in principle (a score of 3 means standards 1-3 are met but not 4) — keep that in mind when assigning scores. Be honest and age-appropriate, encouraging but not inflated. " +
  "If the student used copyrighted characters or settings (e.g. Harry Potter, Pokemon, Marvel), note this in tips and explain ICAS wants original ideas. " +
  "Respond with ONLY raw JSON, no markdown fences, no preamble, in exactly this shape: " +
  '{"scores":{"genreStructure":0-5,"genreStyle":0-5,"grammarTense":0-5,"grammarCohesion":0-5,"syntaxPunctuation":0-5},"strengths":["short point","short point"],"tips":["short actionable tip","short actionable tip","short actionable tip"]}. ' +
  "Keep each strength/tip under 20 words. Provide 2-3 strengths and 3-5 tips. If run-on sentences or comma splices are present, at least one tip must address this specifically.";

const DETAIL_SYSTEM =
  "You are an experienced, kind Year 7 English teacher mentoring a Year 5 student for the ICAS Writing test. " +
  "Be extremely concise — this must fit in a short response. Return ONLY raw JSON, no markdown fences, no preamble, in exactly this shape: " +
  '{"quickGuide":"1-2 sentences, under 25 words, on the single biggest thing to fix",' +
  '"annotations":[{"type":"spelling|grammar|punctuation|originality|strength|technique","quote":"exact text copied verbatim, 1-6 words","note":"under 10 words"}],' +
  '"miniLessons":[{"title":"short rule name","rule":"under 15 words","example":"one short correct example"}],' +
  '"techniqueChecklist":[{"technique":"name","used":true,"note":"under 8 words"}],' +
  '"sentenceStarters":{"repeated":["We"],"note":"under 12 words"},' +
  '"modelRewrite":{"original":"weakest sentence verbatim","improved":"stronger version","why":"under 10 words"},' +
  '"sentenceVariety":{"simple":0,"compound":0,"complex":0,"note":"under 15 words, mention if any run-on/fused sentences or comma splices were found"},' +
  '"stretchTips":["under 12 words","under 12 words"],' +
  '"nextIdeas":["one short brainstorming idea, under 10 words"]}. ' +
  'Grammar/punctuation checks to actively look for (use type "grammar" for sentence-formation issues, type "punctuation" for comma/mechanics issues): ' +
  "run-on/fused sentences (two independent clauses joined with no punctuation or conjunction), comma splices (two independent clauses joined only by a comma), missing comma before a coordinating conjunction joining two independent clauses (compound sentences), missing comma after an introductory clause (complex sentences), and incorrect or missing text connectives (however, therefore, furthermore, meanwhile, in addition, as a result). " +
  "When flagging a run-on or comma splice, quote the exact fused text and explain briefly how to fix it (split into two sentences, or add the missing comma/conjunction). " +
  "Limits, do not exceed: 6 annotations max total — prioritise (in order): run-on sentences/comma splices, other clear spelling or grammar mistakes, then 1 originality note only if copyrighted names used, then 1 technique highlight if a real device was used. " +
  'techniqueChecklist MUST cover exactly these 9 items, in this order, using these exact names: "Simile or metaphor", "Five senses", "Personification", "Hyperbole", "Show, don’t tell", "Character and plot development", "Vivid setting", "Dialogue", "Repetition and contrast" — mark used:true only if genuinely present. ' +
  "miniLessons: 0-2 items max, only for mistake types actually present (a run-on/comma-splice lesson takes priority if present). stretchTips: exactly 2. nextIdeas: exactly 1. " +
  'Every "quote" value MUST be copied character-for-character from the student response. Keep tone encouraging but honest. Every field is required — prioritise finishing the full JSON over adding extra detail to any one field.';

const REWRITE_SYSTEM =
  "You are an expert ICAS Writing tutor for a Year 5 student. Be concise — this must fit in a short response. Rewrite the student's response to fix every spelling, grammar, punctuation, and structural issue, while preserving their own ideas, character, and creative choices as closely as possible — do not replace their story with a different one. " +
  "The rewrite should be capable of scoring close to full marks (25/25) against ICAS's real 3-domain framework: Genre (structure & style), Textual Grammar (tense, cohesion, sentence variety), Syntax/Punctuation. " +
  'Include descriptive techniques naturally wherever they fit without padding length: simile/metaphor, five senses, personification, hyperbole, show-don’t-tell, vivid setting, dialogue, repetition and contrast. Vary sentence openers — avoid repeating "I" or "It" as the first word of multiple sentences. ' +
  "IMPORTANT: keep the rewrite the SAME length as the original or shorter — never longer. Trim rather than add if needed to stay concise. " +
  'Return ONLY raw JSON, no markdown fences: {"rewrite":"the full rewritten story as plain text with paragraph breaks as \\n\\n","changesSummary":["short bullet under 8 words","short bullet","short bullet"]}. Provide EXACTLY 3 changesSummary bullets. Prioritise completing the full rewrite text over the changesSummary if space is tight.';

function systemFor(mode: Mode): string {
  if (mode === "detail") return DETAIL_SYSTEM;
  if (mode === "rewrite") return REWRITE_SYSTEM;
  return SCORE_SYSTEM;
}

function userPromptFor(body: FeedbackRequest): string {
  const typeLabel = body.taskType === "narrative" ? "Narrative" : "Persuasive";
  const base = `Task type: ${typeLabel}\nTask title: ${body.taskTitle}`;

  if (body.mode === "rewrite") {
    return `${base}\n\nStudent response:\n${body.responseText}`;
  }

  const revisionNote = body.isRevision
    ? body.mode === "score"
      ? `\n\nNOTE: This looks like a REVISED version of an attempt the student already submitted${
          body.previousTotal != null ? ` (previous total score: ${body.previousTotal}/25)` : ""
        }. Judge this version fresh on its own merits, but stay consistent with a careful, attentive reading — do not flag issues that are not genuinely present just to find something new to say.`
      : "\n\nNOTE: revised version of a previous attempt. Only flag issues genuinely still present — do not invent new nitpicks just to fill the annotation count."
    : "";

  if (body.mode === "score") {
    const wc = body.wordCount != null ? `\nWord count: ${body.wordCount}` : "";
    const tu = body.timeUsed ? `\nTime used: ${body.timeUsed}` : "";
    return `${base}${wc}${tu}\n\nStudent response:\n${body.responseText}${revisionNote}`;
  }

  return `${base}\n\nStudent response:\n${body.responseText}${revisionNote}`;
}

function stripFences(raw: string): string {
  return raw
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI feedback is not configured. Set ANTHROPIC_API_KEY to enable it." },
      { status: 503 },
    );
  }

  let body: FeedbackRequest;
  try {
    body = (await request.json()) as FeedbackRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !body ||
    !["score", "detail", "rewrite"].includes(body.mode) ||
    typeof body.responseText !== "string" ||
    body.responseText.trim().length === 0
  ) {
    return Response.json({ error: "Missing mode or responseText." }, { status: 400 });
  }

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        thinking: { type: "disabled" },
        system: systemFor(body.mode),
        messages: [{ role: "user", content: userPromptFor(body) }],
      }),
    });
  } catch {
    return Response.json({ error: "Couldn't reach the scoring service." }, { status: 502 });
  }

  if (!anthropicRes.ok) {
    return Response.json(
      { error: `Scoring service error (${anthropicRes.status}).` },
      { status: 502 },
    );
  }

  const data = (await anthropicRes.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    return Response.json(
      { error: "The scoring service returned an unexpected response. Try again." },
      { status: 502 },
    );
  }

  return Response.json({ result: parsed });
}
