---
name: lexi-corpus-edit
description: The working order for changing Lexi's corpus in public/data/*.json, covering adding cards with authoring:new, repairing a field with fix-authored, releveling, merging or renaming cards, and landing the batch through corpus:validate. Use it whenever a task would change vocab.json, cards.json, provenance.json or freq.json. That includes "add these words", a course-book or class word list, a wrong gloss, plural, gender, IPA or example, a duplicate card, or a card at the wrong level, even when the user never says "corpus".
---

# Changing the corpus

Never edit `public/data/*.json` by hand. Every change goes through a script so it can be
reviewed and replayed. `fix-authored`'s expect-guard is what lets a batch be re-run, or
two batches overlap, without one overwriting the other.

## Pick the tool

| To… | Run | Behaviour |
|---|---|---|
| add new cards | `npm run authoring:new -- <batch.json>` | Each card is gated by `scripts/authoring/verify.ts` (de.wiktionary for gender, plural, part of speech and IPA; the app's matcher for examples). A failing card is printed, not written. |
| repair a field on a card | `npm run authoring:fix -- <batch.json> --dry`, then without `--dry` | Every row states the value it expects to find. A mismatch is refused. |
| fill an empty field | `npm run authoring:apply` | Fill-only. It never overwrites. |
| keep a fact the gate can't verify (no de.wiktionary page) | a row in `scripts/authoring/verify-rulings.tsv` | It must cite a source somebody actually consulted. |

Facts are never generated. Write only the gloss and the example sentence, and the gate
checks both.

## The order, and why each step is there

1. **Copy `vocab.json` aside before any write.**
   `cp public/data/vocab.json <scratchpad>/vocab.before.json`. `new-cards.ts` only
   appends, so there is no undo. `git checkout` returns to the last *commit*, not the
   last good state, and wipes the session's earlier fixes along with the mistake.
2. **Report first:** `npm run authoring:new -- <batch.json> --report`. Read every card,
   not just the pass count. The gate can copy the right field from the right page and
   still answer the wrong question:
   - a plural that belongs to another sense (*der Handel* nearly got *die Händel*,
     which is the plural of "quarrel");
   - the IPA of the inseparable verb when the card means the separable one (or the
     reverse) on a page that has both;
   - a gloss for the wrong sense (*wiederholen* was glossed "bring back" for years).
3. **Read the rejections.** Each message names its reason. Fix the batch and run it
   again; it is not all-or-nothing. If the gate rejects a card, check whether the shipped
   corpus already holds cards it would also reject. If it does, the gate is asking the
   wrong question, not the card being wrong.
4. **Write:** the same command with `--write`.
5. **Land it:**
   ```bash
   npm run corpus:split && npm run corpus:validate -- --strict && npm run corpus:freq && npm run corpus:ownership && npm test
   ```
   - `split` regenerates `cards.json` and `detail/`, the files the app actually loads.
   - `validate --strict` is what CI runs. Commit only on a PASS.
   - `freq` recomputes ranks. Stale ranks fail silently.
   - `ownership` catches a new card taking inflected forms from its neighbours'
     examples. The gate checks only a card's own examples.
   - Several tests are derived from the corpus and go stale without a sound.

## Moving, renaming, releveling or merging a card

This is a schedule migration. Add `ID_MAP` entries in `src/data/idmap.ts`, or a
learner's FSRS history silently points at nothing. Four files hold a card id:
`vocab.json`, `provenance.json`, `freq.json` and `idmap.ts`. Never delete a learner's
FSRS rows because a card moved.

## Finding gaps from a word list

Before comparing a list against the corpus, strip government notation
(`hinweisen auf + A`), reflexive `sich` and the article on both sides. Otherwise the
comparison invents absences. A course book's word list is a summary of the book. To
measure a book's running text against the corpus, use `npm run corpus:textcov`.

## Checks you write along the way

- **German regex:** no `\b`, which treats *ä ö ü ß* as word boundaries. Anchor with
  `(?<!\p{L})` and the `u` flag, and never compile data into a pattern.
- **A check that fires on thousands of rows** is a bug in the check until three hits
  have been verified by hand.
- **Numbers in docs** (CHANGELOG, BACKLOG) come from a script run in this session, never
  carried over from another doc.
- **Proving a new check fires:** inject the defect into a *copy* of the data file, never
  into the shipped one.

## Hand-off

Commit and push are the owner's to do unless they approve it in this turn. End with the
commands:

```bash
git add public/data scripts/authoring docs/CHANGELOG.md
```
```bash
git commit -m "<what the batch adds or fixes>"
```
```bash
git push origin main
```

Pushing `main` deploys production. Use the `lexi-deploy` skill before that push.
