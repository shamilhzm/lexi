# The full pass — coverage ledger

A deliberate, multi-session audit of every part of Lexi: the corpus card by card, every
surface by hand, and the pedagogy against named principles. Started 2026-08-21.

This file is the **ledger**, not the findings. Findings that are fixed go to
[CHANGELOG.md](CHANGELOG.md); findings still open go to [BACKLOG.md](BACKLOG.md);
mistakes made along the way go to [LESSONS.md](LESSONS.md). What lives here is *what has
been covered, by what method, and what has not* — so a session can be resumed by reading
one file instead of re-deriving where the last one stopped.

---

## The method, and why it is not "tap every card"

The obvious reading of "go through every card" is to drive the app 6,627 times. That is
the wrong instrument and it does not fit: at roughly three tool calls a card it is some
twenty thousand calls, and it is *also* the weakest way to find content defects. The
`alle` bug surfaced in the fifth card of a hand-played session, which says the density is
high enough that hand-sampling would take a very long time to exhaust.

So the pass runs on three tracks, and only one of them is by hand:

| track | instrument | what it can decide | coverage |
|---|---|---|---|
| **Corpus** | scripts over all 6,627 cards | anything decidable from the data | 100% per check |
| **Surfaces** | iOS Simulator + browser, by hand | layout, gesture, copy, reachability | 100% (~12 routes) |
| **Pedagogy** | named principles vs. the built behaviour | whether a design serves learning | per principle |

**The standing rule, from LESSONS:** any check that fires on thousands of rows is assumed
to be a bug in the check until three hits are hand-verified. This session that rule paid
out five times — see the withdrawals below. A count in this file that is not marked
*hand-verified* has not earned belief yet.

---

## Corpus track

### Done

| check | population | result | where |
|---|---|---|---|
| Cloze answer leaks through capitalisation | 5,684 cloze-eligible | **261 found → 0**, hand-verified, fixed | CHANGELOG 2026-08-21 |
| Plural drill asks unanswerable / shape-leaking questions | 3,200 nouns with a plural | **399 found → 0**, all hand-verified, fixed | CHANGELOG 2026-08-21 |
| Gender drill distractors | all gendered nouns | **clean by construction** — three fixed buttons, no pool | — |
| Gloss/example describe different lexemes | 6,516 word cards | **1 confirmed (`alle`), class size unknown** | see Open, below |
| Conjugation drill: thin option sets, ambiguous items, shape leaks | 34,348 simulated items over 1,108 verbs | **0 / 0 / 0** — clean once the pad is simulated | — |
| Conjugation drill: is the engine handed a lemma? | 1,108 conj-eligible verbs | **3 printing invented German + 57 pronoun-less**, hand-verified, fixed | CHANGELOG 2026-08-21 |

### Next, in priority order

1. **The remaining seven drill generators**, for the leak classes the cloze and plural
   drills had — *shape*, *case*, *length* — plus the two the conj audit added:
   *fewer than four options* and *a distractor that is also correct*. Still to do:
   `case`, `order`, `transform`, `separable`, `reflexive`, `recall`, `dictation`.
   The conj audit's harness is the template; note it had to simulate the **pad**
   fallback before its numbers meant anything (first run reported 1,588 thin items;
   the true figure is 0).
2. **The conjugator itself.** `conjugate('wohlfühlen')` and `conjugate('vorbereiten')`
   return `separable: null` and would render «wohlfühle». Found underneath the conj gate
   fix; filed in BACKLOG under the separable-reflexive item.
3. **Sense/example mismatch at scale.** The `alle` class. No cheap heuristic exists
   (a broken one is recorded in LESSONS); needs either a real sense inventory or a
   sampled hand-audit with a stated confidence interval, not a fabricated count.
4. **IPA** — 95.8% present; the 4.2% absent, and whether the present ones are right.
5. **Definitions** — 809 warnings currently, dominated by *noun without plural* (472)
   and *no ipa* (275).

---

## Surfaces track

Routes come from `src/route.ts`, enumerated from the router rather than from memory
(LESSONS: a sweep is only as wide as its route list): `today · progress · library ·
games · session · placement · interests · profile · brain · exam · print · read`.

| surface | walked | at | notes |
|---|---|---|---|
| `today` | ✅ | 320 / 375 / 402pt, iOS Safari | first-run and populated states |
| `progress` | ✅ | 320 / 375 / 402pt | treemap; FAB invariant tested at full scroll |
| `library` | ✅ | 320 / 375pt | grammar accordion opened |
| `session` | ✅ | 402pt, iOS Safari | 10-card first run + a 20-card review, flip + cloze + recap |
| `games` | ⬜ | | |
| `placement` | ⬜ | | |
| `interests` | ⬜ | | |
| `profile` | ⬜ | | |
| `brain` | ⬜ | | three.js scene, 487 kB chunk |
| `exam` | ⬜ | | six papers A1–C2, the largest untouched surface |
| `print` | ⬜ | | |
| `read` | ⬜ | | |

**Not yet reached, and named so it is not mistaken for passed:** the typed drill with the
keyboard raised — and with it the `UmlautBar`, which `GrammarDrill.tsx:360` renders inline
in normal flow *below* the input, where iOS routinely leaves it behind the keyboard.
Also: standalone-PWA safe areas, landscape, Dynamic Type at accessibility sizes.

**Hardware-only, cannot be settled in a simulator:** real haptics, 7-day ITP eviction, the
HD voice download on a cellular connection, and any gesture question — see the withdrawal
below.

---

## Pedagogy track

Not started. The intent is to name the principle first and then ask what the app does
about it, rather than reverse-engineering a rationale from what exists. Candidates:
retrieval practice, spacing, interleaving, desirable difficulty, the generation effect,
the testing effect, dual coding, and Swain's output hypothesis (already the frame for
BACKLOG's *Extended production*).

---

## Withdrawn this session

Kept here because a ledger that only records finds is a ledger that flatters itself.

- **"The card swallows vertical scroll."** It does not. `touch-action` is `pan-y` and
  Motion never calls `preventDefault` on a vertical gesture — proved with a controlled
  instrument after a matched-control simulator run had convinced me otherwise.
- **"The FAB traps interactive content."** It does not. `pb-20` already guarantees the
  invariant, and at full scroll nothing interactive remains under it on any route.
- **"665 cards have a gloss/example mismatch."** A broken stemmer. Twelve hand-checks,
  twelve false positives.
- **"Nouns must be unaffected by the cloze fix."** Too narrow — multiword noun phrases
  beginning with a lowercase adjective are genuinely raised sentence-initially.
- **A phantom adjective regression** (0.955 → 0.945) caused by the reader probe's three
  samples sharing one RNG stream. Fixed; each class now has its own seed.
- **"1,588 conjugation items render fewer than four options."** They do not. The
  simulation stopped before the *pad* fallback the real item runs when same-tense persons
  dedup below three. With the pad: **0**.
- **"2 conjugation cards print invented German."** Three do. The corruption heuristic
  missed `sich wenden an` → «gewenden at`». Replaced with a decidable rule — *after
  stripping `sich`, does the term still contain a space* — which needs no judgement.

---

*Maintenance: update the tables in place as tracks advance. This file answers "where did
we get to"; it should never accumulate findings that belong in the three files above.*
