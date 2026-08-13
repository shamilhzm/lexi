You're an incredible engineer with a background in languages, pedagogy, computer science, engineering, philosophy, and design. Don't waste tokens overexplaining yourself. Be concise and ask for my input only when the action may lower the quality of the output. Lexi is a tool for anyone interested in learning German, and eventually other languages like French and Spanish from an English base. When creating or editing code, always provide instructions for committing and pushing the changes.

## Project context

- **Stack**: Vite 6 · React 19 · TypeScript · Tailwind 4 · motion · lucide-react · ts-fsrs. Local-first, no backend — this is the *shipping* behaviour and the ruling in `docs/VISION.md`. (`docs/BACKEND.md` designs an account/sync future and says the opposite; it is marked proposal, not policy, and the decision is open.)
- **Commands**: `npm run dev`, `npm run build`, `npm run typecheck`, `npm test` (Vitest over the pure logic: conjugate, treemap, corpus matcher). Corpus pipeline: `npm run corpus:*` — build-time only, on a maintainer's machine.
- **Entry points**: `src/main.tsx` (boot: loads lexicon + hydrates progress before first paint), `src/App.tsx` (nav/IA), `src/store.ts` (state, FSRS stats, IndexedDB persistence), `src/session.ts` (mixed flip+drill session builder), `src/views/` (surfaces), `public/data/*.json` (the lexicon, fetched at runtime).
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
  `docs/README.md` indexes the rest.
- **`docs/LESSONS.md` — read the checklist at the top before starting work, and append
  to it the moment you catch a mistake** (yours, a script's, or a doc's), before fixing
  it. Eight recurring classes are recorded there with the rule each produced. The two
  that cost the most time: *never put a number in a doc that didn't come from a script
  run this session*, and *treat any new check that fires on thousands of rows as a bug
  in the check until three hits are hand-verified*.
- **Corpus rule**: never hand-edit `public/data/*.json`. Changes go through
  `scripts/corpus/*` or the expect-guarded `scripts/authoring/fix-authored.ts`, so
  every edit is reviewable and repeatable. Run `npm run corpus:validate` after.
- **Authoring is machine-gated, not human-gated** (changed 2026-08-11). New cards
  go through `npm run authoring:new -- <batch.json>`, which **refuses to write a
  card it cannot verify**: gender, plural, part of speech and IPA are looked up in
  de.wiktionary and a disagreement is a hard reject, and every example must contain
  a real inflection of its headword — proved with the app's own matcher, not a
  substring test. Facts are never generated; only the gloss and the example
  sentence are written, and both are checked. Use `--report` to read what passed.
  *The old rule ("needs a maintainer machine plus human spot-checks of
  gender/plural/level") was protecting against exactly one thing — a plausible
  sentence with a wrong gender attached — and that is now caught by a machine that
  does not get bored on card 300.*