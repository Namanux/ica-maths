/**
 * ICAS-style Writing practice — prompt pools and reference material.
 *
 * The Writing section is a single 35-minute extended-writing task that
 * alternates between narrative and persuasive on each visit. It does not run
 * through the multiple-choice exam engine. Ported from the standalone
 * `icas_writing_practice.html` prototype.
 *
 * `body` paragraphs may contain a little trusted inline markup (`<strong>`),
 * rendered with `dangerouslySetInnerHTML` — the content here is static.
 */

export type WritingGenre = "narrative" | "persuasive";

export interface WritingPrompt {
  title: string;
  body: string[];
}

export const NARRATIVE_PROMPTS: WritingPrompt[] = [
  {
    title: "The Locked Door",
    body: [
      "Write a story about a character who discovers a door that has always been locked — and one day, finds it open.",
      "You can write the <strong>beginning</strong> (setting up the character, the door, and the moment they find it open), the <strong>complication</strong> (what happens once they go through), or a <strong>full short narrative</strong> if there's time.",
    ],
  },
  {
    title: "The Day the Power Went Out",
    body: [
      "Write a story about what happens when the power suddenly goes out across your character's entire street, at the worst possible moment.",
      "You could focus on the beginning (what your character was doing when it happened), the complication (something unexpected in the dark), or a full short narrative.",
    ],
  },
  {
    title: "The Uninvited Guest",
    body: [
      "Write a story about a family gathering that is interrupted by a stranger who claims to know a secret about the house.",
      "Focus on building tension — you might describe the moment the guest arrives, the reaction of the family, or how the secret changes everything.",
    ],
  },
  {
    title: "The Map in the Attic",
    body: [
      "Write a story about a character who finds an old, torn map hidden in the attic, leading to somewhere unexpected.",
      "You can write the beginning (finding the map), the complication (where it leads and what goes wrong), or a full short narrative.",
    ],
  },
  {
    title: "The Last Bus Home",
    body: [
      "Write a story about a character who misses the last bus home and something strange happens while they wait.",
      "Focus on the mood of the empty street or station, and build tension as the story unfolds.",
    ],
  },
  {
    title: "The New Substitute Teacher",
    body: [
      "Write a story about a class that gets an unusual substitute teacher who isn't quite what they seem.",
      "You could write the beginning (the class meets the new teacher) or the complication (something odd starts happening).",
    ],
  },
  {
    title: "The Time Capsule",
    body: [
      "Write a story about a character who digs up an old time capsule buried years ago, and finds something unexpected inside.",
      "Describe the moment of discovery and what it leads to.",
    ],
  },
  {
    title: "Locked in the Library",
    body: [
      "Write a story about a character who is accidentally locked inside the school library after everyone else has gone home.",
      "Build suspense as your character explores and tries to find a way out.",
    ],
  },
  {
    title: "The New Kid at School",
    body: [
      "Write a story about the arrival of a mysterious new student who seems to know more than they should.",
      "Focus on first impressions, and how the class reacts to this new arrival.",
    ],
  },
  {
    title: "Caught in the Storm",
    body: [
      "Write a story about a sudden storm that strands your character somewhere unexpected.",
      "Describe the setting vividly, and how your character copes with the situation.",
    ],
  },
  {
    title: "The Old Photograph",
    body: [
      "Write a story about a character who finds an old photograph tucked inside a secondhand book, showing something puzzling.",
      "You could focus on the discovery, or what your character does to investigate further.",
    ],
  },
  {
    title: "Lost at the Museum",
    body: [
      "Write a story about a character who becomes separated from their class during a museum excursion.",
      "Build tension as they try to find their way back, and consider what unusual things they might encounter.",
    ],
  },
  {
    title: "The Animal That Could Talk",
    body: [
      "Write a story about a character whose pet, or an animal they meet, suddenly begins to talk.",
      "Focus on your character's reaction and what the animal reveals.",
    ],
  },
  {
    title: "The Clock That Stopped",
    body: [
      "Write a story about a clock in your character's house that mysteriously stops working, and strange things begin to happen afterwards.",
      "You can write the beginning, the complication, or a full short narrative.",
    ],
  },
  {
    title: "The Message in a Bottle",
    body: [
      "Write a story about a character who finds a bottle washed up on a beach, containing a strange and unexpected message.",
      "Describe the discovery and where the story leads from there.",
    ],
  },
];

export const PERSUASIVE_PROMPTS: WritingPrompt[] = [
  {
    title: "Phones at School",
    body: [
      "Some schools are considering banning mobile phones during the school day. Write a persuasive piece arguing <strong>for or against</strong> this policy.",
      "Use clear reasons and examples to convince your reader. This could be written as a letter, a speech, or an opinion piece.",
    ],
  },
  {
    title: "A New Park for the Neighbourhood",
    body: [
      "Write a persuasive letter to your local council arguing that your suburb needs a new park, skate ramp, or playground.",
      "Explain why it's needed and what benefits it would bring to the community.",
    ],
  },
  {
    title: "Should Homework Be Banned?",
    body: [
      "Write an opinion piece for your school newsletter arguing <strong>for or against</strong> banning homework in primary school.",
      "Give clear reasons, and try to convince readers who might disagree with you.",
    ],
  },
  {
    title: "Advertise a New Exhibition",
    body: [
      "Write a persuasive advertisement encouraging families to visit a new (imaginary) museum or science exhibition of your choice.",
      "Use persuasive techniques — exciting language, reasons to visit, and a call to action.",
    ],
  },
  {
    title: "Should Students Wear School Uniforms?",
    body: [
      "Write a persuasive essay arguing <strong>for or against</strong> school uniforms.",
      "Support your opinion with clear reasons and examples that would convince someone who disagrees with you.",
    ],
  },
  {
    title: "Longer Lunch Breaks",
    body: [
      "Write a persuasive letter to your principal arguing that lunch breaks at school should be longer.",
      "Explain the benefits this would bring to students, and address reasons someone might disagree.",
    ],
  },
  {
    title: "A Class Pet",
    body: [
      "Write a persuasive piece convincing your teacher and classmates that your class should have a class pet.",
      "Explain what pet you'd choose, why, and how the class would look after it responsibly.",
    ],
  },
  {
    title: "Reducing Plastic in the Canteen",
    body: [
      "Write a persuasive letter to your school arguing that the canteen should reduce or stop using single-use plastic.",
      "Give clear reasons and suggest a realistic alternative.",
    ],
  },
  {
    title: "Should the School Day Start Later?",
    body: [
      "Write an opinion piece arguing <strong>for or against</strong> starting the school day later in the morning.",
      "Support your view with reasons that would matter to students, parents, and teachers.",
    ],
  },
  {
    title: "Convince Your Parents to Get a Pet",
    body: [
      "Write a persuasive letter to your parents convincing them to let you get a pet.",
      "Use strong reasons and address any objections they might raise.",
    ],
  },
  {
    title: "Should Junk Food Be Banned from the Canteen?",
    body: [
      "Write a persuasive piece arguing <strong>for or against</strong> banning junk food from the school canteen.",
      "Consider both health and enjoyment in your argument, and use persuasive language.",
    ],
  },
  {
    title: "A Bike Lane for Your Suburb",
    body: [
      "Write a campaign piece persuading your local council to build a new bike lane in your neighbourhood.",
      "Explain the benefits for safety and the environment, and include a clear call to action.",
    ],
  },
  {
    title: "Should Students Choose Their Own Seats?",
    body: [
      "Write a persuasive piece arguing <strong>for or against</strong> allowing students to choose where they sit in class.",
      "Support your opinion with reasons and think about the other side of the argument too.",
    ],
  },
  {
    title: "More Excursions for Our Class",
    body: [
      "Write a persuasive letter to your teacher arguing that your class should go on more excursions this year.",
      "Explain what students would gain from this and suggest a specific excursion idea.",
    ],
  },
  {
    title: "Should Recess Be Longer?",
    body: [
      "Write an opinion piece for the school newsletter arguing <strong>for or against</strong> extending recess time.",
      "Use clear, convincing reasons and think about how you'd respond to someone who disagrees.",
    ],
  },
];

export function promptPool(genre: WritingGenre): WritingPrompt[] {
  return genre === "narrative" ? NARRATIVE_PROMPTS : PERSUASIVE_PROMPTS;
}

// ── Quick-reference "paragraph-by-paragraph formula" ──────────────────────────

export interface FormulaLine {
  label: string;
  text: string;
}
export interface FormulaParagraph {
  title: string;
  goal: string;
  lines: FormulaLine[];
}

export const NARRATIVE_FORMULA: FormulaParagraph[] = [
  {
    title: "Paragraph 1 — Hook & Setting",
    goal: "Start the story and introduce your character, setting, and the key thing from the prompt.",
    lines: [
      { label: "Action", text: '"I was [doing something ordinary] when..."' },
      { label: "The Detail", text: '"I noticed [the key object or place from the prompt]."' },
      { label: "The Mystery", text: '"Something about it felt different today."' },
    ],
  },
  {
    title: "Paragraph 2 — The Situation",
    goal: "Show the moment things change, and how your character reacts.",
    lines: [
      { label: "The Change", text: '"But today, [the key thing] was different."' },
      { label: "Feeling", text: '"My heart started beating faster."' },
      { label: "Action", text: '"I decided to take a closer look."' },
    ],
  },
  {
    title: "Paragraph 3 — Rising Action",
    goal: "Reveal the discovery or complication and build tension.",
    lines: [
      { label: "What's discovered", text: '"I couldn\'t believe what I saw next..."' },
      { label: "The complication", text: '"Then something unexpected happened."' },
      { label: "The reaction", text: '"I didn\'t know whether to feel excited or scared."' },
    ],
  },
  {
    title: "Paragraph 4 — Climax (if time allows)",
    goal: "The most intense moment — something forces a quick decision.",
    lines: [
      { label: "The trigger", text: '"Suddenly, [a sound / voice / event] interrupted everything."' },
      { label: "The realisation", text: '"I realised I had to act fast."' },
      { label: "The urgency", text: '"There was no time to think."' },
    ],
  },
  {
    title: "Paragraph 5 — Resolution",
    goal: "Wrap up the story and show how your character has changed.",
    lines: [
      { label: "The ending action", text: '"I got out / finished / escaped just in time."' },
      { label: "The status", text: '"Everything looked normal again."' },
      { label: "The lingering detail", text: '"But I still had [a small piece of evidence] to prove it really happened."' },
    ],
  },
];

export const PERSUASIVE_FORMULA: FormulaParagraph[] = [
  {
    title: "Paragraph 1 — Hook & Position",
    goal: "Grab attention and clearly state your opinion.",
    lines: [
      { label: "Hook", text: '"Imagine if [scenario related to the topic]..."' },
      { label: "The issue", text: '"This is something many people have different opinions about."' },
      { label: "Your opinion", text: '"I strongly believe that [your clear opinion]."' },
    ],
  },
  {
    title: "Paragraph 2 — Reason 1",
    goal: "Give your strongest reason with an example.",
    lines: [
      { label: "Topic sentence", text: '"Firstly, [your first reason]."' },
      { label: "Explanation", text: '"This is because [explain why it matters]."' },
      { label: "Example", text: '"For example, [a real or realistic example]."' },
    ],
  },
  {
    title: "Paragraph 3 — Reason 2",
    goal: "Give a second reason, linked with a connective.",
    lines: [
      { label: "Linking word", text: '"Furthermore, [your second reason]."' },
      { label: "Explanation", text: '"This means that [explain the impact]."' },
      { label: "Example", text: '"For instance, [another example]."' },
    ],
  },
  {
    title: "Paragraph 4 — Acknowledge the Other Side",
    goal: "Show balance by mentioning the opposing view, then counter it.",
    lines: [
      { label: "Their view", text: '"Some people might say that [opposing view]."' },
      { label: "Your counter", text: '"However, [why that view doesn\'t change the bigger picture]."' },
      { label: "Reinforce", text: '"This shows that [your position still stands]."' },
    ],
  },
  {
    title: "Paragraph 5 — Conclusion",
    goal: "Restate your opinion and finish strongly.",
    lines: [
      { label: "Restate", text: '"In conclusion, [restate your opinion in new words]."' },
      { label: "Summary", text: '"For all these reasons, [brief summary of your reasons]."' },
      { label: "Call to action", text: '"It\'s time that [call to action or final strong statement]."' },
    ],
  },
];

export function formula(genre: WritingGenre): FormulaParagraph[] {
  return genre === "narrative" ? NARRATIVE_FORMULA : PERSUASIVE_FORMULA;
}

// ── Quick reminders (static nudge list) ──────────────────────────────────────

export interface ReminderSection {
  group: string;
  items: string[];
}

export const QUICK_REMINDERS: ReminderSection[] = [
  {
    group: "Before you start",
    items: [
      "Decide: is this narrative or persuasive? Pick your structure from the Quick reference.",
      "Plan your ending in your head before you write paragraph 1 — don't run out of time mid-story.",
    ],
  },
  {
    group: "Every sentence",
    items: [
      "Capital letter at the start. Full stop, ? or ! at the end.",
      "Read it back in your head — does it actually make sense?",
      "Don't start two sentences in a row the same way (We... We... → mix it up).",
    ],
  },
  {
    group: "Make it interesting",
    items: [
      'Swap "said", "nice", "good", "big" for a more exciting word.',
      "Add one sense (sound, smell, feeling) somewhere in each paragraph.",
      "Use your own original characters and places — never TV, movie or game characters.",
    ],
  },
  {
    group: "Tricky spelling to double-check",
    items: [
      "because, though, straight, definitely, favourite, beautiful",
      "their / there / they're, its / it's, your / you're",
    ],
  },
  {
    group: "Watch the clock",
    items: [
      "At 35:00, check your word count — keep writing if the ending isn't done yet.",
      "Leave the last minute to quickly re-read and fix any obvious mistakes.",
    ],
  },
];

export const WRITING_DURATION_SECONDS = 35 * 60;
export const WRITING_TARGET_WORDS = 450;
