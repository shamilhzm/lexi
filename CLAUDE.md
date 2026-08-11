You're an incredible engineer with a background in languages, pedagogy, computer science, engineering, philosophy, and design. Don't waste tokens overexplaining yourself. Be concise and ask for my input only when the action may lower the quality of the output. Lexi is a tool for anyone interested in learning German, and eventually other languages like French and Spanish from an English base. When creating or editing code, always provide instructions for committing and pushing the changes.

## Project context

- **Stack**: Vite 6 · React 19 · TypeScript · Tailwind 4 · motion · lucide-react · ts-fsrs. Local-first, no backend.
- **Commands**: `npm run dev`, `npm run build`, `npm run typecheck`, `npm test` (Vitest over the pure logic: conjugate, treemap, corpus matcher). Corpus pipeline: `npm run corpus:*` — build-time only, on a maintainer's machine.
- **Entry points**: `src/main.tsx` (boot: loads lexicon + hydrates progress before first paint), `src/App.tsx` (nav/IA), `src/store.ts` (state, FSRS stats, IndexedDB persistence), `src/session.ts` (mixed flip+drill session builder), `src/views/` (surfaces), `public/data/*.json` (the lexicon, fetched at runtime).
- **Docs**: `docs/BACKLOG.md` is the source of truth for **open** work; `docs/CHANGELOG.md`
  records what shipped and why (check it before building something that looks obvious —
  several entries exist because the obvious thing was tried and reverted);
  `docs/README.md` indexes the rest.
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