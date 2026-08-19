# ICAS Maths Simulator

A timed, multiple-choice practice exam simulator for ICAS Mathematics, built with Next.js. Currently covers Year 5 (Paper C) with two real transcribed past papers (2017, 2018) plus a short original sample paper, and is structured to scale to more year levels and subjects later.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS 4** — the app itself
- **Supabase** — data hub for attempt history, so results can be recalled later instead of only living in the browser. A dedicated project (`icas-maths`) is already provisioned and connected.
- **Vercel** — intended deploy target
- **GitHub** — intended source host

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How content is structured

Each paper is a JSON file in [`src/data/papers/`](src/data/papers/), matching the shape in [`src/lib/types.ts`](src/lib/types.ts):

- `subject`, `yearLevel`, `paperCode`, `title`, `year`, `timeLimitMinutes`
- `questions[]` — each with `prompt`, optional `imageUrl` / `table`, `options` (for multiple choice), `correctAnswer`, and an `explanation`

Diagrams live in `public/questions/<paper-id>/` as SVGs (they use `currentColor` so they automatically match light/night mode).

To add a new paper: create a new JSON file in `src/data/papers/`, add any diagram SVGs it needs, then register it in [`src/lib/papers.ts`](src/lib/papers.ts).

### Important note on the real ICAS content

`icas-2017-paper-c.json` and `icas-2018-paper-c.json` are transcribed from real UNSW Global ICAS past papers you provided in `Properties/`. The questions are digitized for your own private practice use — the diagrams have been **redrawn as original, simplified SVGs** rather than copied from the source booklets, both to keep the repo lightweight and because the original artwork is UNSW Global's copyrighted material.

Even so, the question text itself is closely derived from copyrighted papers. This repo is public by choice; if that ever changes, either make the repo private or strip the `icas-*-paper-*.json` files (and their matching `public/questions/` diagrams) first.

**2018 Paper C answer provenance**: the answer-key photo we had only covered questions 1–25. Those 25 are taken directly from the official UNSW Global answer key. Questions 26–40 have no official key available, so those answers were worked out directly (clean arithmetic for most; a handful of purely visual/spatial puzzles — Q26, Q30, Q33, Q36, Q40 — are best-effort and flagged as such in their `explanation` field). If you're able to find the missing second page of that answer key, those five can be corrected against it.

The raw source PDFs in `Properties/` are git-ignored on purpose (see `.gitignore`) — they should never be committed, public repo or not.

## Supabase setup

A dedicated Supabase project (`icas-maths`, ref `dguqznqupvawlyxkwiwi`) is already provisioned, with the `attempts` table from [`supabase/schema.sql`](supabase/schema.sql) live. Locally, `.env.local` (git-ignored, not committed) holds the connection details — copy `.env.example` if you ever need to recreate it.

The app still works fully without Supabase configured (attempt history just stays in that browser's local storage), so this is only load-bearing for cross-device history.

To manage the database from a terminal: `npx supabase login`, then `npx supabase link --project-ref dguqznqupvawlyxkwiwi`, then `npx supabase db query --linked "..."`.

## Deploying

Source: [github.com/Namanux/ica-maths](https://github.com/Namanux/ica-maths)

1. Import the repo into [Vercel](https://vercel.com/new).
2. Add the two `NEXT_PUBLIC_SUPABASE_*` env vars (from `.env.local`) in the Vercel project settings.
3. Deploy.

## Roadmap ideas

- More Year 5 papers (transcribe additional years from `Properties/`)
- Year 6 (Paper D) once Year 5 is solid
- Per-topic breakdown in the results screen
- Account-based history (Supabase Auth) instead of local-storage-only
