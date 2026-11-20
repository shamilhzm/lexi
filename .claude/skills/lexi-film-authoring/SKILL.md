---
name: lexi-film-authoring
description: Writing or editing a Lexi course film (`src/films/films.ts`) or a course unit (`src/data/course.ts`). Covers beats, narration, the `films.test.ts` contract, linking a film to its unit, regenerating the COURSE.md plan, and playing the film on the simulator. Use it whenever a task touches films, units, the course, Kurs, beat kinds or film narration, or asks to "explain X in a film", even for a one-line wording change.
---

# Writing a film

A film is data, not video: a list of beats that `components/film/FilmPlayer.tsx`
renders. It is learner-paced, it **explains**, and it **never grades**. The beat kinds
are in `src/films/types.ts`, and the table in `docs/COURSE.md`, *Writing a film*, says
where each beat gets its facts. Read both before you add a beat.

## The two rules, and what they prevent

1. **A film never grades.** A guess is a prediction, not evidence, so nothing in a film
   writes FSRS. The player imports nothing from the store except `markFilmSeen`. The
   unit's Üben session is where grading happens.
2. **Facts about words come from the corpus, not from `films.ts`.** A beat names a card
   (`'der Tisch'`, article included). Its gender, plural, gloss and examples are looked
   up at runtime, and pattern counts are measured live by `src/films/measure.ts`. What
   you write by hand is the explanation, plus the grammar sentences in `order`,
   `bracket`, `move`, `say`, `choice` and `chart` beats. No script can verify those, so
   keep them few, short and standard. Where one of the card's own sentences shows the
   point, use an `example` beat instead.

## Writing it

- **Shape:** a `title` first and an `outro` last, 5–10 beats in all, one idea, about two
  minutes.
- **Guess before the answer.** `gender` and `choice` beats hold the film until the
  learner commits.
- **Pattern beats:** the claimed article must be the corpus majority, at ≥ 85% of
  ≥ 15 nouns. Check with `countEnding()` from `measure.ts` before you write the line.
  Don't put the count in the narration: the beat shows it live, and a number typed into
  the text goes stale.
- **Example beats:** `match` has to find a sentence the card really has, and the marks
  have to be in that sentence.
- **A grammar claim:** before stating it as absolute, find the sentence it would mark
  wrong. An over-general teaching rule hands the learner an error.
- **Scaffolding:** a card more than one level below the unit's lowest level is shown in
  the film but not taught in the unit (*Haus* and *Tür* in the compound film).
- **Narration copy** is plain English, one point per line. Don't use em-dash asides,
  "not X but Y" turns or one-line closers. The 2026-11-19 pass
  (`scripts/copy/films-2026-11-19.mjs`) removed them. German sentences keep their
  Gedankenstrich, because there it is correct punctuation.
- **C1 is one line through Beruf and Hochschule.** Never add a track switch. The tests
  check the balance and that no two units of one track come in a row.

## Linking and checking

1. Set `film: '<id>'` on its unit in `src/data/course.ts`.
2. `npm test`. `src/films/films.test.ts` checks the contract: named cards exist; gender
   beats ask only about nouns; plurals exist and start with *die*; traps are in
   `lib/falseFriends.ts`; patterns hold; compounds take the last part's article;
   examples quote real sentences; choices are answerable; the beat count is right; no
   card is taught in two units.
3. `node scripts/course-plan.ts --write` regenerates the plan table in
   `docs/COURSE.md`, so the doc can't drift from `course.ts`.
4. **Play it on the iPhone simulator** (see `lexi-persona-drive`) at
   `#/words/kurs/<level>`. Three layout defects in the first films were found only that
   way: wrapped pairs overlapping, *Weiter* hidden under the tab bar, and a tap freezing
   the slide-in.

## Hand-off

```bash
git add src/films src/data/course.ts docs/COURSE.md docs/CHANGELOG.md
```
```bash
git commit -m "<the film or unit, and the idea it explains>"
```
```bash
git push origin main
```

Pushing `main` deploys production. Use the `lexi-deploy` skill first.
