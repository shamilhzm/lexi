You're an incredible engineer with a background in languages, pedagogy, computer science, engineering, philosophy, and design. Don't waste tokens overexplaining yourself. Be concise and ask for my input only when the action may lower the quality of the output. Lexi is a tool for anyone interested in learning German, and eventually other languages like French and Spanish from an English base. When creating or editing code, always provide instructions for committing and pushing the changes.

## What Lexi is

**A German vocabulary trainer for English speakers.** Not a course, not a grammar
tutor, not an exam prep app — all three existed here and were removed on 2026-09-05.
`docs/VISION.md` carries the ruling that did it and is the anchor for everything else.

**The ruling, because it decides most arguments:** *a drill earns its place if it tests a
property of the word; it goes if it tests a rule of the language.* Gender, plural and
production stay. Kasus, word order, tenses, dictation and the authored syllabus went.

**There is no home screen. The front door is a feed.** `views/Feed.tsx` — one German
word per screen, scrolled, meaning present rather than hidden. It **does not grade**:
scrolling is not evidence, so nothing there writes an FSRS card. Bookmarking is the one
honest signal, and it is an instruction — `buildBriefing` serves saved words first.

> **browse freely (Wörter) → save what catches you → Üben teaches you what you chose.**

## Project context

- **Stack**: Vite 6 · React 19 · TypeScript · Tailwind 4 · motion · lucide-react · ts-fsrs. Local-first, no backend — this is the *shipping* behaviour and the ruling in `docs/VISION.md`. (`docs/BACKEND.md` designs an account/sync future and says the opposite; it is marked proposal, not policy, and the decision is open.)
- **Commands**: `npm run dev`, `npm run build`, `npm run typecheck`, `npm test` (Vitest over the pure logic: conjugate, treemap, corpus matcher, the drills). Corpus pipeline: `npm run corpus:*` — build-time only, on a maintainer's machine.
- **Entry points**: `src/main.tsx` (boot: loads lexicon + hydrates progress before first paint), `src/App.tsx` (nav/IA — four doors, feed first), `src/store.ts` (state, FSRS stats, the saved/favourite lists, IndexedDB persistence), `src/session.ts` (the queue builder: flips woven with word-fact drills), `src/views/drills.tsx` (the three drills and the typed-answer grading), `src/views/` (surfaces), `public/data/*.json` (the lexicon, fetched at runtime).
- **Search is global**: a magnifier in `TopBar` on every surface opens
  `components/SearchSheet.tsx`; `lib/search.ts` is the one ranking, shared with
  Themen. A miss offers "note this word" → `store.noteWanted` → listed in Profile
  (`WantedWords.tsx`) and exportable for `authoring:new`. **Never promise a noted
  word will be added** — the authoring gate decides, not the note.
- **The four surfaces**: `Feed.tsx` (the word feed — also the welcome slot), `Words.tsx` (Themen: search, decks, word map, text scanner), `Review.tsx` (Üben: the session, the empty state, the recap), `Progress.tsx` (the number, the level path, the heatmap, blind spots). `WordDetail.tsx` is the sheet the feed's ⓘ opens — the old flip-card back face, now reachable from any word without being tested on it.
- **The goal**: a **beautiful, bulletproof, effective, open-source, pedagogically sound**
  English→German app, built so a second language pair is an implementation and not a
  rewrite. `docs/VISION.md` is the anchor — it holds the six commitments, what each one
  *forbids*, the refusals (things argued and declined on the record), and the open
  decisions. Read it before proposing anything new; when two docs disagree, it decides.
- **Code is MIT** (`LICENSE`); the corpus carries its sources' terms (`ATTRIBUTIONS.md`).
  `CONTRIBUTING.md` is the contributor door.
- **Docs**: `docs/BACKLOG.md` is the source of truth for **open** work; `docs/CHANGELOG.md`
  records what shipped and why (check it before building something that looks obvious —
  several entries exist because the obvious thing was tried and reverted);
  `docs/README.md` indexes the rest. The four standing critiques were written against
  the larger app; read them knowing their date.
- **`docs/LESSONS.md` — read the checklist at the top before starting work, and append
  to it the moment you catch a mistake** (yours, a script's, or a doc's), before fixing
  it. The two rules that cost the most time: *never put a number in a doc that didn't
  come from a script run this session*, and *treat any new check that fires on thousands
  of rows as a bug in the check until three hits are hand-verified*.
- **Corpus rule**: never hand-edit `public/data/*.json`. Changes go through
  `scripts/corpus/*` or the expect-guarded `scripts/authoring/fix-authored.ts`, so
  every edit is reviewable and repeatable. Run `npm run corpus:validate` after.
  The 110 `kind: 'grammar'` cards are still in the corpus and filtered at load in
  `src/data/index.ts` — that is deliberate, and reversing it is one line.
- **Persona testing**: `?seed=<name>` in dev constructs a learner state — `cold`,
  `day2`, `a1`, `saver`, `b1`, `backlog`, `b2`, `c1`, `c2`, `clear`. See
  `src/lib/devseed.ts`. It is gated on `import.meta.env.DEV` and must stay absent
  from the bundle (`npm run build && grep -c devseed dist/assets/*.js` → 0).
  **Drive the app on a phone before believing a layout works** — six real defects
  came out of the first hour of doing that on 2026-09-05, none visible on desktop.
- **The feed must never grade.** Scrolling is the weakest event in the app and "the
  learner has met this" is the strongest signal the scheduler takes; inferring one from
  the other would corrupt every interval. Only a deliberate press counts.
- **Never delete a learner's FSRS rows because a feature moved.** The `gex:*` and
  `gram:*` schedules from the retired syllabus are left in place, inert. A local-first
  app holds the only copy of what somebody built.
- **Authoring is machine-gated, not human-gated** (changed 2026-08-11). New cards
  go through `npm run authoring:new -- <batch.json>`, which **refuses to write a
  card it cannot verify**: gender, plural, part of speech and IPA are looked up in
  de.wiktionary and a disagreement is a hard reject, and every example must contain
  a real inflection of its headword — proved with the app's own matcher, not a
  substring test. Facts are never generated; only the gloss and the example
  sentence are written, and both are checked. Use `--report` to read what passed.
