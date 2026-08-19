# ICAS Maths Simulator

A timed, multiple-choice practice exam simulator for ICAS Mathematics, built with Next.js. Currently covers Year 5 (Paper C) with one real transcribed past paper plus a short original sample paper, and is structured to scale to more year levels and subjects later.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS 4** — the app itself
- **Supabase** *(optional)* — data hub for attempt history, so results can be recalled later instead of only living in the browser
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

`icas-2017-paper-c.json` is transcribed from a real UNSW Global ICAS past paper you provided in `Properties/`. The questions are digitized for your own private practice use — the diagrams have been **redrawn as original, simplified SVGs** rather than copied from the source booklet, both to keep the repo lightweight and because the original artwork is UNSW Global's copyrighted material.

Even so, the question text itself is closely derived from a copyrighted paper. Two things to keep in mind:

1. **Keep the GitHub repo private** if it contains this file, or strip/replace it before making the repo public.
2. The raw source PDFs in `Properties/` are git-ignored on purpose (see `.gitignore`) — they should never be committed.

## Supabase setup (optional)

The app works fully without Supabase — attempt history is kept in the browser's local storage either way. If you want history to persist beyond one browser (e.g. to check progress from another device later):

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your project's API settings.
4. Restart `npm run dev`.

## Deploying

1. Push this repo to GitHub (**private**, per the note above, unless you remove the real-paper content first).
2. Import the repo into [Vercel](https://vercel.com/new).
3. If using Supabase, add the two `NEXT_PUBLIC_SUPABASE_*` env vars in the Vercel project settings.
4. Deploy.

## Roadmap ideas

- More Year 5 papers (transcribe additional years from `Properties/`)
- Year 6 (Paper D) once Year 5 is solid
- Per-topic breakdown in the results screen
- Account-based history (Supabase Auth) instead of local-storage-only
