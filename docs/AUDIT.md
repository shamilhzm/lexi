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
| Gloss/example describe different lexemes | 6,452 cards with examples | **12 hand-verified: 7 fixed, 5 filed.** Concentrated, not diffuse — 36% yield in the zero-overlap band vs 0/18 at random | CHANGELOG 2026-08-24 |
| Conjugation drill: thin option sets, ambiguous items, shape leaks | 34,348 simulated items over 1,108 verbs | **0 / 0 / 0** — clean once the pad is simulated | — |
| Conjugation drill: is the engine handed a lemma? | 1,108 conj-eligible verbs | **3 printing invented German + 57 pronoun-less**, hand-verified, fixed | CHANGELOG 2026-08-21 |
| Conjugator Partizip II vs. the forms the corpus attests | 262 verbs with a Perfekt example | **262 agree · 0 disagree** | — |
| `case` drill distractors | all `caseSafe` nouns | **clean by construction** — four distinct articles per gender from a fixed table | — |
| `order` drill: is the required order the only correct one? | 6,023 order drills | **no — it accepts exactly one**; ruled *not* to narrow the drill, flexibility taught instead | BACKLOG 🟠 |
| `order` drill: do the tiles give away position 1? | 6,020 order drills | **4,565 (75.8%) fixed**; the residual 23.7% are open classes (imperatives, full verbs, adjectives) and are left leaking knowingly | CHANGELOG 2026-08-24 |
| Type-in drills (`transform`, `separable`, `reflexive`, `recall`, `dictation`) | grading path | **no defect** — `canon` → `norm` (folds ä→ae, ß→ss) → edit-distance-1, with a supportive near-miss state | — |
| Noun cards proved only by a **lowercase** token | 6,525 cards with examples · 17,023 examples | **49 found → 0**, on 32 cards, 17 of which had no correct example at all; all hand-read, all defects. The mirror case (88 verbs/adjectives) deliberately not gated | CHANGELOG 2026-08-24 |
| Adjectival nouns: headword and plural | the 12 in the corpus | **2 malformed → fixed · 4 duplicated → filed**; the rest follow the `der/die X` convention | CHANGELOG 2026-08-24 |
| Verbs the conjugator declines to inflect | 1,212 verb cards | **60 (4.9%)** — pattern cards and disambiguated terms, all correctly `reliable: false` and never drilled | CHANGELOG 2026-08-24 |

**All eleven drill modes have now been swept.** Two were clean by construction (`gender`,
`case`), four were broken and are fixed (`cloze`, `plural`, `conj`, and `order`'s casing
leak), five type-in modes grade soundly. `order` keeps one open half — accepting a valid
alternative arrangement — which was ruled a thing to *teach* rather than design around.

### Next, in priority order

1. **`order`, still partly open · 🟠.** The casing leak is fixed and `Das Vorfeld` now
   teaches the freedom, but the general builder still accepts one arrangement. A
   conservative fronting chunker was prototyped and rejected (3 of 8 suggestions valid).
   Doing it properly needs constituent parsing, or the corpus recording frontable
   constituents at authoring time — see BACKLOG.
2. **Work the sense band down · 🟠.** `npm run corpus:sense` ranks the 698 cards whose
   gloss shares no word with any of its example translations. It is a *reading order*,
   not a detector — but it yields ~36% against ~0% at random, so it is the instrument
   this class needed. 33 read so far; the rest are unread.

   > The five defects it filed for new **examples** are fixed (2026-08-24), and reading
   > them together is what produced the decidable noun-case rule in the table above —
   > which then found 49. **The lesson for the rest of the band: read the filed items
   > as a set before fixing them one at a time.** A shape that three of five share is
   > worth more than the five.
3. **The 88 remaining case hits · 🟡 — a reading list, not a fix list.** Verb and
   adjective cards proved only by a capitalised token mid-sentence. Most are ordinary
   nominalisations («beim Tanzen», «bei Rot») and must be left alone; a few are genuine
   drift (`wild` → «Seid ihr Wilde?»). Nothing mechanical separates them, which is why
   this half is not gated. Filed in BACKLOG.
4. **IPA** — 95.8% present; the 4.2% absent, and whether the present ones are right.
5. **Definitions** — 806 warnings currently, dominated by *noun without plural* (472)
   and *no ipa* (275).
6. **The `exam` surface** — six papers A1–C2, and the largest thing neither the corpus
   scripts nor the drill audit can reach. Entirely unwalked.

### Source pages ingested

Textbook and reference pages worked through by hand, with what each one changed. Kept
because the useful unit is the *page*: checking its vocabulary against the corpus before
writing anything is what stops a second `die Beziehung` being authored.

| source | checked | already had | outcome |
|---|---|---|---|
| *Neue Heimat* B2, Modul 1 (chapter opener + Mittelfeld) | 51 headwords | 37 | 12 cards · 2 grammar points · the `government()` matcher fix |
| B2 „Missverständliches“ + Dreyer §14 *Negation mit nicht* | 66 headwords | **40** | 12 cards · `Die Stellung von „nicht“` +10 exercises and 4 new rules · new B2 point `Verneinung durch Wortbildung` |

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
- **A fronting chunker, prototyped and thrown away.** It was meant to compute the valid
  alternative word orders so the builder could accept them; on eight sampled sentences
  only three of its suggestions were grammatical. It fronted constituents out of
  W-questions, across a coordinating *und*, and out of the middle of a prepositional
  phrase. Each sample batch found a new invalid class — and accepting a wrong order is
  worse than rejecting a right one, so it is not shipped and not counted.
- **"`auflösen` prints «geauflöst» in the drill."** It does not. Every measurement behind
  that ran the conjugator **unprimed**, and `splitPrefix` needs a root lexicon seeded from
  the corpus at boot. One of the five reported instances (`gegenüberstellen`) was real.
  The same error made the reliability gate look broken when it was working — so two good
  cards were held out of a batch for no reason.
- **"64 order drills have a valid alternative the drill rejects."** Six of ten hand-checks
  were genuine; the other four were the probe mangling the sentence. The finding survives
  and is in fact *larger* than 64 — but that number is not it.
- **"1,588 conjugation items render fewer than four options."** They do not. The
  simulation stopped before the *pad* fallback the real item runs when same-tense persons
  dedup below three. With the pad: **0**.
- **"137 examples teach a different word than their card."** 49 do. The check was
  written over both halves of one idea and only one half is decidable: lowercase
  *disproves* a noun, but capitalisation proves nothing about a verb, because
  nominalisation is available to every part of speech. The 88-hit half is mostly
  correct German. See LESSONS, class 2.
- **"2 conjugation cards print invented German."** Three do. The corruption heuristic
  missed `sich wenden an` → «gewenden at`». Replaced with a decidable rule — *after
  stripping `sich`, does the term still contain a space* — which needs no judgement.

---

*Maintenance: update the tables in place as tracks advance. This file answers "where did
we get to"; it should never accumulate findings that belong in the three files above.*
