/**
 * NSW Selective High School Placement — Writing practice tasks.
 *
 * The Writing test is a single 30-minute extended-writing task, so it does not
 * run through the multiple-choice exam engine. These tasks power the Writing
 * component of the Selective section: a prompt, a timer and a drafting area.
 * Source: the official NSW "Writing Question Paper" practice PDFs (PT1-PT3).
 */
export interface WritingTask {
  id: string;
  /** Short code shown in lists, e.g. "PT1". */
  code: string;
  /** The task's own title, e.g. "New to the area". */
  title: string;
  /** The scenario / stimulus paragraph(s). */
  scenario: string;
  /** The actual instruction: what to write. */
  instruction: string;
  /** Optional "In your writing, you could:" points. */
  guidance?: string[];
  /** Optional sentence the response must begin with. */
  startingSentence?: string;
  /** One-line summary for the task list. */
  summary: string;
  timeLimitMinutes: number;
}

export const WRITING_TASKS: WritingTask[] = [
  {
    id: "new-to-the-area",
    code: "PT1",
    title: "New to the area",
    scenario:
      "Three new students have just arrived in your local area. Your teacher has asked you to write an advice sheet for them, making them feel enthusiastic about coming to your school.",
    instruction:
      "Write an advice sheet for the new students about how to get on well in your school and local area.",
    summary: "Write an advice sheet welcoming three new students to your school and area.",
    timeLimitMinutes: 30,
  },
  {
    id: "chaos-on-the-beach",
    code: "PT2",
    title: "Chaos on the beach",
    scenario:
      "A shipping container with party accessories has been washed up on a beach. The container has burst open and the contents have gone everywhere. Crowds of people have rushed to the beach to have a look at the balloons, plastic straws, plates, cups and fancy dress costumes, and so on.",
    instruction: "Write a newspaper report about this incident for the local paper.",
    guidance: [
      "explain what has happened",
      "describe the impact on the beach and the sea",
      "include comments from different people",
    ],
    summary: "Write a local newspaper report about a burst shipping container on a beach.",
    timeLimitMinutes: 30,
  },
  {
    id: "in-the-future",
    code: "PT3",
    title: "In the future",
    scenario: "Imagine the date is July 19th 2099.",
    instruction:
      "Write a diary entry of someone your own age who is living in the future. Use the sentence below to start your diary:",
    startingSentence:
      "Dear Diary,\nWhen our house robot woke me up with its loud singing, I remembered that…",
    guidance: ["technology", "ways to travel", "home and social life"],
    summary: "Write a diary entry set in the year 2099, starting from a given sentence.",
    timeLimitMinutes: 30,
  },
];

export function getWritingTask(id: string): WritingTask | undefined {
  return WRITING_TASKS.find((t) => t.id === id);
}
