# Lexi — Backlog

The one prioritised list of **open** work, reconciled against the actual `src/`, so
it overrides anything in the older strategy docs. Shipped work and the reasoning
behind it live in [CHANGELOG.md](CHANGELOG.md).

Effort key: **XS** <½ day · **S** ~1 day · **M** a few days · **L** 1–2 weeks.
Each item lists *Why · Do · Done-when · Touches*.

Where a number appears (1,021 duplicate cards, 1,493 flagged definitions) it came
from a script in `scripts/corpus/`, not an estimate. Re-run the script before
trusting it — the last four times a count was guessed here it was wrong by a third.

> **Consolidated 2026-08-04.** Four parallel branches were merged into one history
> (see the CHANGELOG entry). This file was rebuilt from both surviving backlogs —
> the Atlas/personas list on `main` and the open-work list on the stranded branch —
> with everything closed moved to the CHANGELOG and the duplicates folded together.
> Three pairs of items turned out to be the same item written twice: corpus growth,
> the mobile pass, and the reader. They are now one each.

---

## The 2026-08-05 quality pass — every card, every screen, every action

*Method: a new `npm run corpus:audit` over all 7,389 cards; a DOM harness run against
all five routes at 1280px and 375px in both themes; and the session loop driven
end-to-end. Numbers are measured, not estimated. **Two of my own audits were wrong
first** — see the "checks that were tried and removed" block at the top of
`scripts/corpus/audit.ts`, and the contrast note below — so treat any new check that
fires on thousands of rows as a bug in the check.*

### What is clean, stated so nobody re-audits it

- **Contrast passes everywhere**, light *and* dark, on all five routes. An initial run
  reported six dark-theme failures including one at 1.0:1; every one was an artifact of
  toggling `.dark` at runtime and measuring mid-transition, or of measuring the
  off-screen sidebar. Re-measured on-screen after settling: **zero**.
- **Every control has an accessible name** on every route. Zero unnamed.
- **No horizontal overflow** at 375px on any route.
- **No console errors** anywhere in the walk.
- **The session loop is correct.** Grade advances the counter and the headword; undo
  rewinds both; skip advances without grading; flag and mute are present and labelled.
  The card is a real focusable control (`role="button"`, `tabIndex 0`, `aria-label`).
- **Examples**: 0 cards under two examples, 0 leading with a scrape.
- **Corpus audit: 0 errors** across all 7,389 cards — no article/gender mismatch, no
  unknown sector, no untranslated example, no markup leaking into a field.

### 🟠 Cards that are inflections of each other — measured 2026-08-15

**Now #3 merged terms that were *identical*. These are terms that are forms of one
another, which a term-equality check cannot see** — so they survived the 874-group
merge and they make the index ambiguous: two cards claim the same surface form, and
first-wins picks one.

Measured over 16,979 example rows: **236 (1.39%)** of examples fail to resolve their
own headword because another card claimed the token. 173 distinct collisions, in four
shapes:

| shape | examples |
|---|---|
| singular and plural as separate cards | `der Handschuh` / `die Handschuhe` · `die Schuld` / `die Schulden` · `die Emission` / `die Emissionen` |
| verb and its participle-adjective | `erlauben` / `erlaubt` · `verbieten` / `verboten` · `verletzen` / `verletzt` · `belegen` / `belegt` |
| noun and verb of one stem | `die Folge` / `folgen` · `die Spende` / `spenden` · `duschen` / `die Dusche` |
| reflexive and plain variant | `erinnern` / `sich erinnern` · `der Vorgesetzte` / `der/die Vorgesetzte` |

> ✅ **The singular/plural shape is ruled *and merged*, 2026-08-15.** The mechanism
> exists now: `npm run corpus:forms`, over `scripts/corpus/form-rulings.ts` — a
> noun-to-noun detector plus a hand-written ruling for every pair it finds, read by
> the merge pass *and* by `corpus:validate` so the list can reach zero and stay
> there. **20 collisions, 13 merged, 7 kept; 6,626 → 6,613 cards.** See the CHANGELOG.
>
> The 11 plural merges landed as ruled. Two more pairs came out of the same detector
> and needed their own shape — **`der`/`das Joghurt`** and **`der`/`das Burnout`**, one
> lemma whose article varies by region, filed twice with an identical gloss and an
> identical definition. **`der`/`die Bekannte` is kept**: the cards say "acquaintance
> (male)" and "acquaintance (female)", which is the `der Lehrer`/`die Lehrerin` pair
> this file wants more of.
>
> Two things the dry run caught before anything was written, both now per-row rulings:
> a **gloss union is wrong for this shape** (the retired card is the keeper's plural,
> so unioning gave "shoe; shoes", "glove; gloves", "muscle; muscles" — only `das Datum`
> → *"date; data"* earns a change), and a **definition does not always travel** (`die
> Daten`'s defines the plural and stays behind; `die Kenntnisse`' is *better* than the
> keeper's enumeration and moves onto it).
>
> **A merge can be a relevel.** `die Kenntnisse` was A2 and its singular B1, so the
> keeper takes the **lower** level — merging upward takes a word off a learner who has
> it. That is a second id change, and `voc:B1:die Kenntnis` → `voc:A2:die Kenntnis` is
> in `ID_MAP` with two prior entries re-pointed to follow it.
>
> Measured on one probe before and after: example rows whose own card does not claim
> them **435 → 411** of ~16,200; distinct cards losing their token **195 → 184**. Those
> are this session's numbers on this session's probe, not the 236/173 above — a
> different definition, so compare the delta and not the level.

**Three shapes are still open**, and they are the reason this item is not closed: the
verb/participle-adjective pairs (*erlauben*/*erlaubt*, *verbieten*/*verboten*), the
noun/verb-of-one-stem pairs, and the reflexive variants. *Not* all of these should
merge — a participle that has become an adjective in its own right is arguably a card
worth having, where a plural filed as a separate noun almost never is. **Each shape
needs its own ruling**, which is why this was never one `corpus:dupes` run. The
machinery is now built for all of them: add rows to `FORM_RULINGS` and widen the
detector one shape at a time, with `corpus:validate` refusing anything unruled.

⚠️ **The 236 is a ceiling, and the probe's history is why.** A first pass reported
**615** by counting multiword cards — `Rad fahren` "losing" to `das Rad`, `die
künstliche Intelligenz` to `künstlich` — where the matcher resolving a component is
correct and the probe's expectation was wrong. Excluding multiword headwords halved
it. Assume more of the same before trusting the figure.

**Do.** Rule the next shape (the participle-adjectives are the largest), widen
`findFormCollisions` to see it, add the rows, run `npm run corpus:forms -- --write`.
**Done-when.** A card's own example resolves to that card. ✅ *`corpus:validate` grows a
check for a card whose surface form another card already claims* — done 2026-08-15, and
it errors on an unruled collision **and** on one ruled `merge` that is still present,
so an invariant cannot survive as a sentence the way the Visum one did.
**Touches.** `scripts/corpus/form-rulings.ts`, `merge-forms.ts`, `validate.ts`,
`public/data/`.

### 🟠 The matcher and verbs — re-measured 2026-08-15, and no longer the headline

> ✅ **Re-measured 2026-08-15 — largely fixed, and no longer blocking Phase 1.**
>
> All three cited defects now resolve correctly: `weiß` → **wissen**, `rufe` (in *Ich
> rufe dich an*) → **anrufen**, `Gib` → **geben**. The headline rate is **6.4%**, not
> 21.6% — 1,077 of 16,883 example rows.
>
> And most of that 6.4% is not a matcher defect. Sampling the misses: `der Kopf` taught
> with *«Kopfschmerzen»* (the headword is genuinely absent — the separate content
> defect below), `Rad fahren` with *«fahre ich Rad»* (a separated multiword), and terms
> whose surface form carries notation the probe has to strip — `verzichten auf + A`,
> `das Gericht (Essen)`, `der/die Abgeordnete`. **The probe was wrong about several of
> its own hits**, which is this file's own standing warning.
>
> Left standing as 🟠 rather than closed: the remaining verb (424) and phrase (307)
> rows deserve a proper classification pass before anyone claims a number. **What is
> settled is that this no longer blocks Now #2 Phase 1.**

**Two hand-verified instances, 2026-08-20 — the authoring gate is where this now bites.**
Writing `auflösen` through `authoring:new`, the verifier rejected both examples because
the matcher could not prove the headword was present:

| Sentence | Form | Matcher |
|---|---|---|
| Vor dem Umzug hat sie ihre Wohnung **aufgelöst**. | separable participle | no match |
| Sie **löst** ihre Wohnung **auf**. | separated finite | no match |
| Wer auswandert, muss die Wohnung **auflösen**. | infinitive | matches |

Not a new defect — it is the same separable-verb gap the re-measure above sampled as
*`Rad fahren` / «fahre ich Rad»*. What is new is the cost: **the gate silently pushes
every separable verb's examples toward the infinitive**, which is the one frame a learner
least needs to see, because it is the frame where the prefix never moves. Any fix here
should be checked against the shipped examples for separable verbs, not just the probe.

### 🟢 Pattern cards are invisible to the matcher — fixed 2026-08-20, 0 → 88.6%

> ✅ **Shipped the same day it was filed.** `government()` in `matcher.ts` now splits a
> governed term into lemma + required preposition, conjugates the lemma, and matches only
> when the preposition is genuinely in the clause. **39 of 44 (88.6%)**, up from 0 of 44.
> The reader probe's verb rate went **0.936 → 0.941**; plural, adjective and closed-class
> unchanged; `corpus:validate` PASS, 0 errors.
>
> Three causes had to be fixed, not one, and only the first was obvious: the lookup key,
> then contractions (*«hängt **vom** Anlass ab»* carries `von` but no token spells it),
> then the search window — a separable particle only ever lands *after* its verb, but a
> governed preposition precedes it in every Perfekt and every modal clause
> (*«hat sich **in** sie verliebt»*). The pattern check also had to be ranked **above** the
> separable check, or plain `abhängen` won *hängt* on the particle alone.
>
> **The 5 that remain are multiword lemmas** — `Rücksicht nehmen auf + A`,
> `Heimweh haben nach + D`, `typisch sein für + A`, `einverstanden sein mit + D`,
> `fasziniert sein von + D`. Which of the two words carries the inflection is not
> decidable from the string, so `government()` declines them by design rather than
> guessing. Fixing them properly means a real multiword index, not a regex.
>
> **Content follow-up, XS, not done.** Five *plain* cards turned out to carry examples
> that are pattern sentences — `verzichten` [B1] teaches «verzichtet sie **auf** Fleisch»,
> and likewise `bitten`, `teilnehmen`, `gelangen`, `verfügen`. Their examples now
> correctly highlight the pattern card instead of themselves. Either give the plain card
> a non-pattern example or accept the overlap deliberately; right now it is neither.

### 🔴 ~~Pattern cards are invisible to the matcher~~ — 0 of 44, measured 2026-08-20

A term is not always a lemma. The corpus deliberately writes government notation into
the headword — `warten auf + A`, `sich verlieben in + A`, `gehören zu + D` — because the
preposition *and its case* are what is being taught. `matcher.ts` derives its verb forms
from `stripArticle(w.term)` (l. 215, 262, 359), so for these cards it conjugates the
string *"verzichten auf + A"*, which yields nothing.

Probed over the shipped corpus — *does a card resolve in its own example?*

| class | resolves | rate |
|---|---|---|
| `verb + prep + case` | **0 / 44** | **0.0%** |
| reflexive `sich …` | 54 / 78 | 69.2% |
| everything else (control) | 6,105 / 6,387 | 95.6% |

The control rate is what makes this readable as a real defect rather than a broken
probe: a probe that could not resolve words would not resolve 95.6% of them. **These 44
cards do not highlight their own headword on their own card**, and are uncountable by
the comprehension meter.

**The decision this needs, before any code.** Indexing the bare lemma is the one-line
fix and it is probably wrong: `warten` and `denken` already exist as A1 cards, so the
bare token would be contested by two cards, and letting *«Ich warte»* resolve to
`warten auf + A` would count a learner as knowing a pattern they have not met. The
honest fix is a **discontinuous multiword match** — verb *and* its preposition present
in the same clause — which is real work. Until then the class should probably be
excluded from the meter's denominator rather than counted as known.

**Blocked on this:** `denken an + A` and `warten auf + A` (this page's own examples,
alongside the already-shipped `sich verlieben in + A`) cannot pass `authoring:new`,
because the gate correctly refuses a card whose example it cannot prove contains the
headword. The batch is parked at `scripts/authoring/batches/b2-mittelfeld-verbprep.json`.
*(Both written 2026-08-20 once the fix above landed.)*

*M · `src/lib/matcher.ts`, then re-run the probe above.*


**The finding that matters most, because it lands on Now #2.** The matcher fails to
resolve the headword in **3,611 of 16,681 example rows (21.6%)**. Verified by hand,
three distinct defects — and two produce *wrong* answers, not missing ones:

| Sentence | Token | Resolves to | Should be |
|---|---|---|---|
| Ich **weiß** es nicht. | weiß | **weiß** (white) | wissen |
| Ich **rufe** dich an. | rufe | **der Ruf** (the call) | anrufen |
| **Gib** mir das Buch. | Gib | *(no match)* | geben |

Stem changes are fine (`nimmt`→nehmen, `fährt`→fahren). What is broken is **strong-verb
homographs, separable verbs, and imperatives** — three of the most common things in
any German sentence. The hard cases by part of speech: **verb 593**, phrase 183,
*empty-`pos`* 107, noun 71.

**Why this is urgent rather than interesting.** The comprehension meter exists to state
one number honestly. A homograph that resolves to the wrong card makes that number too
*high* (knowing the colour *weiß* would count you as knowing *wissen*); a missing
imperative makes it too *low*. Shipping Phase 1 on this matcher ships a dishonest
meter — and "honest" is the entire competitive claim (COMPETITIVE-RESEARCH §5).
**Do this before Now #2 Phase 1.** *S–M · `src/lib/matcher.ts`, `conjugate.ts`.*

### 🟠 Correct verb forms are generated and then thrown away — 85 recovered 2026-08-15

> ✅ **The separable half is fixed.** `SEED_ROOTS` in `conjugate.ts` seeds the known-root
> set with German verb roots the lexicon does not happen to teach, so `aufräumen`,
> `einordnen`, `zurückkehren` and 82 others now split and conjugate correctly. Reading
> all 89 by eye caught four wrong ones (`hervorheben`, `ausweichen`, `abwägen`,
> `vorbereiten`) — the list carries **weak roots only**, and a test pins those four.
> ✅ **Closed 2026-08-15 — zero verb cards are unreliable.** The last 102 were taken
> from de.wiktionary (stems, participle, auxiliary) rather than written from memory,
> with the remaining persons rule-derived; every entry reproduces the dictionary
> exactly. **1,064 of 1,079 verb cards resolve, from 887.** Two known limits: the
> derived du/ihr preterites are rule-based. ✅ **The ambiguous-prefix senses are
> settled** (2026-08-15): read against each card's own gloss and examples, which found
> `umstellen` and `hängen` wrong and `überfahren`/`überholen` already right — the
> dictionary's primary headword shows the rarer sense for those two.
>
> ✅ **The strong verbs** (2026-08-15). Twenty-seven roots joined the
> irregular table; `greifen` alone rescued *ergreifen*, *angreifen*, *begreifen* and
> *aufgreifen*. **962 of 1,079 verb cards resolve, from 887.** All 42 cascaded forms
> read by eye — which caught `gefrieren` inheriting *haben* from `frieren` when it
> takes *sein*. The remaining 117 are the long tail; each needs its own row, and the
> reading discipline above is the cost of adding one.

`conjugate()` marks a verb `reliable: false` when it cannot vouch for its forms, and
the matcher then indexes none of them. That is the right instinct and it is currently
discarding correct German along with wrong German.

**Hand-verified, three hits** (the rule this file sets for believing any new check):

| sentence | headword | resolves? | the generated form |
|---|---|---|---|
| Sie **antwortete** sofort. | antworten | **no** | *antwortete* — correct |
| Er hat sofort **geantwortet**. | antworten | **no** | correct |
| Er **ergriff** die Gelegenheit. | ergreifen | **no** | *greifen* class unknown |
| Wir **kauften** gestern **ein**. | einkaufen | yes | separable path handles it |

So `antworten` — a regular A1 verb — has no inflection a reader can resolve, while
separable verbs are fine because `sepIndex` catches them by another route.

**192 of 1,079 single-word verb cards have a generated form that does not resolve.**
That number is solid. **The split between "the form was wrong" and "the form was right
and discarded" is not** — a first attempt to size it classified `reitete` and
`umziehte` as correct weak German alongside `antwortete`, because a stem+`te` shape
test cannot tell a weak verb from a strong one. That is the same limitation that makes
`conjugate()` give up in the first place, so **the split needs a strong-verb list, not
a cleverer regex** — and quoting a number from the regex would have been wrong in the
flattering direction.

**Do.** Add the strong/irregular verb list (the ~200 that matter), so `conjugate` can
mark the weak ones reliable instead of refusing wholesale. **Done-when.** `antwortete`,
`geantwortet` and `ergriff` all resolve; no verb gains a form the list does not
license; `corpus:validate`'s reader probe does not regress.
**Touches.** `src/lib/conjugate.ts`, `src/lib/matcher.ts`.

### 🟠 Real content defects

- **Cards whose example does not contain the word** — not an inflection the matcher
  missed, the word is simply absent. `das Pferd` is taught with *"Meine Tochter möchte
  gern reiten lernen."*; `die Uhr` with *"Können Sie mir sagen, wie spät es ist?"*;
  `das Stück` with *"Ganz geschwinde, eins, zwei, drei"*. Thematically adjacent,
  lexically useless.
  > **Re-measured 2026-08-15, and the count is still not trustworthy.** A substring
  > probe over 16,979 example rows reports **270 (1.59%)**, down from 516 on the first
  > pass once reflexive markers (`sich vorstellen`), slashed genders
  > (`der/die Verwandte`), parenthetical disambiguators, umlaut comparatives (`öfter`
  > ← *oft*), split separables (*"Mein Kopf tut weh"* contains **wehtun**) and
  > hyphenated ellipsis (*"Vor- und Nachnamen"* contains **Vorname**) were excluded.
  >
  > **What is left still over-reports**, and structurally so: a substring test cannot
  > span a strong-verb vowel change, so *verbieten* «Kaffee **verboten**» and *wissen*
  > «ich **weiß**» are counted as absent when they are present. **270 is an upper
  > bound, not the number.** Sizing it properly needs the matcher rather than a
  > substring — and the matcher's own homograph handling is what mis-resolves `weiß`
  > in the first place, so the two problems are the same problem.
  >
  > The hand-verified genuine cases so far: `die Uhr`, `das Pferd`, `das Stück` (×2),
  > `der Orangensaft`, `eins`, `telefonieren`, `das Mittagessen`. *S, human-gated.*
- ~~**370 cards carry an empty `pos`**~~ — ✅ **stale, verified 2026-08-15: 0 of 6,517.**
  Fixed at some point since the audit and never struck through.
- **1,493 definitions still flagged** (enumeration 1,064 · bare 363 · repeat 138) and
  **286 cards with no English definition** — unchanged, tracked as Now #5.
- Two singletons: `der Makler` lists itself as a synonym; `Verzeihung` is tagged
  `interjection` but is a noun.

### 🟡 Screens — measured at 375px with a coarse pointer

| Route | controls | <44px | clipped |
|---|---|---|---|
| Today | 18 | **4** | 0 |
| Progress | 31 | **9** | 0 |
| Progress → Decks | 1,197 | **311** | **77** |
| Library | 31 | **0** ✅ | 0 |
| Profile | 61 | **44** | 0 |

- **Library is the proof it can be done** — 31 controls, none under 44.
- **Decks is the worst surface in the app**: 311 sub-44 controls and **77 clipped deck
  subtitles** (e.g. *"Intermediate descriptive adjec…"* at 252px in a 142px box).
- The repeat offenders are the **CEFR filter chips at 31×25** (on both Progress and
  Decks), the **sort chips** (*Urgent* 62×23, *Size* 45×23), and the **Markt/Liste
  toggle** at 68×27 — a handful of shared components, not hundreds of separate fixes.
- **Today's *Start session* is 42px** — the app's primary action, 2px under.
- **Profile's name input is 151×22**, the shortest interactive target in the app.
- **`#/progress/decks` renders no `<h1>`** — the only route with no top-level heading.

---

## The 2026-08-06 grammar audit — comprehensive where it is easy, thin where it sells

*Measured over `public/data/grammar.json`: 131 points, 805 exercises, five widget
kinds (choose 404 · type 147 · error 106 · mc 93 · order 55).*

### What is genuinely good, so it is not "improved" by accident

- **A1–B1 is comprehensive** — 92 of the 131 points, and B1 (40) goes past a
  standard syllabus: Partizip Präsens als Adjektiv, Relativsätze mit Präpositionen,
  Konjunktiv II der Vergangenheit, `je … desto`. This is not the weak part.
- **Interaction variety is better than it looks.** I expected monotony and did not
  find it: **zero** of 131 points use a single widget kind; 53 use three and 60 use
  four. A learner drilling one concept does not get six identical gap-fills.
- **The instructions are adequate.** `error` says "Tap the wrong word", `order`
  says "Tap tiles to build the sentence", `type`/`order` carry a `DrillHeader`
  naming the concept. `choose`/`mc` (62% of all items) carry no instruction and do
  not need one — a gapped sentence over three options is self-evident, at every
  level sampled from A1 *"___ Mann ist groß."* to C2 *"Wer eine Wohnung ungesehen
  mietet, …"*.

> **Exercise depth closed 2026-08-12.** `npm run corpus:genex` took the bank
> **887 → 5,207** (4,320 generated across 35 derivable points; 101 points stay
> authored because their exercises cannot be derived). The interaction-variety
> finding below still stands and is unaffected — generated items are all `choose`,
> so they add depth to points that already had four widget kinds rather than
> flattening them. See the CHANGELOG entry, and in particular the six wrong forms
> the first run produced: the lesson is that a generator bug is four hundred bad
> exercises, so the spot-check is not optional.
>
> **Partly addressed 2026-08-11.** B2 now has 21 points, and the ones added since
> this audit are genuinely new rather than B1 re-treads: Zustandspassiv, the
> position of *nicht*, adversative connectors (dennoch/allerdings/hingegen),
> da-compounds, adjectives with a fixed preposition. `npm run corpus:gex` took the
> bank 835 → 887 exercises. The "11 of 16" count below is the state at the time of
> the audit and is now stale; the *shape* of the finding — B2 is where the money is
> and it was the thinnest real layer — is what stands.

### 🔴 B2 is mostly revision of B1, and B2 is where the money is

**11 of 16 B2 points re-tread a topic already taught at A2 or B1**, several under a
near-identical title:

| B2 point | already at |
|---|---|
| n-Deklination | A2 *and* B1 |
| Genitiv | B1 |
| Plusquamperfekt | B1 (*Plusquamperfekt & nachdem/bevor*) |
| Zweiteilige Konnektoren | B1 (same title) |
| Finalsätze (um … zu / damit) | B1 (*Finalsätze: damit & um … zu*) |
| Passiv · Passiv Perfekt | A2 Passiv Präsens, B1 ×2 |
| Konjunktiv II (Gegenwart) | A2, B1 ×2 |
| Adjektivdeklination | A2 ×3, B1 ×2 |
| Relativsätze | B1 |
| Temporale Nebensätze | B1 ×2 |

So B2 contributes roughly **four new points** — Konnektoren (deshalb/trotzdem),
Textadverbien, Modalpartikeln II, and arguably Verben mit Präpositionen. Goethe B2
is the certificate that gates university admission and many jobs; it is the second
most-taken exam in the category, and it is the thinnest real layer in the bank.
*M, human-gated.*

### ⚠️ Grammar points can only ever be appended — and nothing says so

*Found 2026-08-06 while costing the A1 reassignment below, which is what turned
that item from XS into a migration.*

`lib/grammar.ts:120` mints exercise card ids as **`gex:<level>:<pointIndex>:<exerciseIndex>`**,
where `pointIndex` is the point's **array position within its level**. Those ids are
what every learner's FSRS schedule is keyed on.

So inserting a point anywhere but the end of a level, reordering two points, or
moving one between levels **silently re-points every subsequent schedule at a
different exercise**. No error, no migration, no way to notice: a learner who had
mastered *Perfekt* would find their progress now attached to whatever slid into
that index.

It has never bitten because `corpus:grammar --write` only ever `push`es
(`grammar-supplement.ts:559`), and appending preserves every existing index. That
is load-bearing behaviour that reads like an implementation detail.

**Do (S):** either key exercises on something stable — the point's title, as
`gram:<level>:<title>` cards already are — with `src/data/idmap.ts` carrying the
one-time migration; or, if positional ids stay, assert the constraint in a test
that pins the current point order per level so any insertion fails CI loudly
rather than corrupting schedules quietly. The first is correct; the second is
cheap and would have caught this.

### ~~🟠 Four A1 exam topics are filed at A2~~ — **stale, verified 2026-08-11**

*Modalverben, Trennbare Verben, Imperativ and Perfekt are all in the A1 list today.
The block below is kept because its analysis of the `gex:` id hazard is still live
and still unfixed; the level assignment it describes is not.*

**Modalverben, trennbare Verben, Imperativ and Perfekt** all sit at A2. Goethe A1 /
Start Deutsch 1 tests all four, and Netzwerk/Menschen introduce them in A1.2. The
content exists and is good; the *level assignment* is wrong, and it matters
because the CEFR filter scopes what a learner is shown — an A1-scoped learner
never meets them.

**Re-costed 2026-08-06: not XS.** Moving a point between levels changes its
`gram:<level>:<title>` id (five hardcoded references in `Fundamentals.tsx`:
`TENSE_POINT`, `MODE_REMEDY` ×2, `separable`) *and* shifts the positional `gex:`
index of every later point in **both** levels — see the hazard above. It needs
`idmap` entries and a schedule migration, so **S–M**, and it should wait until
exercise ids are keyed on something stable. Still human-gated on the pedagogy:
whether Lexi follows Goethe's A1 or a stricter CEFR reading is your call, not a
script's.

### 🟡 C1/C2 are 23 points, but the choices are right

Thin, as the critique said. What is there is well chosen — Funktionsverbgefüge,
Nominalisierung ↔ Verbalstil, Passiv-Ersatzformen, Gerundivum, Stilebenen. This is
a volume problem, not a taste problem, which is the better of the two to have.

---

## The 2026-08-11 exam-readiness pass — the corpus has the words and hides them

*Method: the app's own `buildMatcher` run over every German word of the new telc B1
paper, scoped to a corpus filtered to each CEFR level; plus an 82-word probe of the
Start Deutsch 1 / telc A1 core lexicon (form-filling, time, shopping, housing,
transport, everyday health) against the shipped corpus. Numbers are measured.*

### ⚠️ A withdrawn finding, kept because the mistake is the lesson

**What was written here first — "an A1-placed learner reaches 34 of the 82 core A1
words, 41%; Wohnen 1 of 13" — was wrong, and it is worth saying loudly because it
briefly reordered this file.** The probe looked each word up in a `Map` built by
iterating the corpus, so for any term on more than one card it kept whichever copy
came *last* and reported that card's level. **874 terms sit on more than one card**
(Now #3). `der Tisch` exists at A1 *and* B1; the probe saw the B1 copy and concluded
the word was gated. Every alarming row in that table was a duplicate, not a gate.

Measured properly — *does an A1 card exist for this word* — the real figure before
any change was **69 of 81 = 85%**. Bad, not catastrophic.

The lesson is the one already at the top of this file, and I re-learned it the
expensive way: *treat any new check that fires on thousands of rows as a bug in the
check.* A first-wins/last-wins lookup over a corpus with a known duplicate problem
is exactly that bug.

**What this really found is Now #3.** A learner meets `der Tisch` at A1 in *Home*
and again at B1 in *Furniture*, with two FSRS schedules and two sectors. That is the
defect, and it is already ranked. This pass raised its evidence, not its position.

### ✅ The Goethe A1 relevel — done 2026-08-11, and smaller than advertised

`npm run corpus:relevel:a1`, against the published Goethe-Zertifikat A1 / Start
Deutsch 1 Wortliste (657 lemmas, extracted from the official PDF by column position
and committed as `scripts/corpus/data/goethe-a1-wordlist.txt`).

- **162 words promoted to A1** — every one a word the A1 exam examines that had *no*
  A1 card at all. A1 word cards **964 → 1,126**. On the 82-word probe: **85% → 91%**,
  gaining `Formular`, `Termin`, `die Kasse`, `der Balkon`, `E-Mail`.
- **Nothing demoted.** Lexi holding a word at A1 that Goethe omits is not an error,
  and pushing it up would take it from the learner who needs it most.
- **A part-of-speech guard earns its place.** Article-stripped matching let Goethe's
  noun `der Dank` find Lexi's *preposition* `dank`, `das Lokal` find the adjective
  `lokal`, the verb `reisen` find the nominalisation `das Reisen`, and the
  interjection `Achtung!` find the abstract noun `die Achtung` ("respect"). Four
  genuinely B1+ words would have been promoted on the authority of a homograph.
  Goethe prints the article for nouns and omits it otherwise, so the list carries
  the signal to catch all four.
- **A relevel is a schedule migration.** Word ids embed the level
  (`voc:B1:der Tisch`), so 162 `ID_MAP` entries shipped with it — plus **nine
  existing entries re-pointed**, because they aimed at ids this pass moved
  (`voc:A2:Oben` → `voc:A2:oben` → `voc:A1:oben`). Three files hold a card id and
  all three are migrated by the script: `vocab.json`, `provenance.json` (37 rows)
  and the id map; `cards.json`/`detail.json` follow via `corpus:split`.

**Was open here, now closed:** 109 syllabus entries were absent from the corpus.
**52 of the content words shipped 2026-08-11** through the new verified authoring
path — `der Euro`, `das Ticket`, `der Familienname`, `der Geburtsort`, `das Schild`,
`der Kilometer` and the rest. What remains is deliberate: closed-class function
words (`denn`, `kein`, `mehr`, `nichts`, `seit`) that `FUNCTION_WORDS` already
excludes from every count, and a handful of extraction artefacts.

### 🟠 Genuinely absent, and not obscure — verified, and unaffected by the above

`Euro` · `Prozent` · `Ticket` · `Anfang` · `Projekt` · `genug` · `Zustand` ·
`Familienname` · `Geburtsdatum` · `Geburtsort`. You cannot read a German newspaper
or a B1 reading paper without *Prozent* and *Euro*, and the last three are printed
on the A1 answer sheet itself.

**No feminine `-in` forms anywhere.** `der Lehrer` ships; `die Lehrerin` does not,
and neither do Sprecherin, Muttersprachlerin, Besucherin, Kundin, Teilnehmerin. Exam
texts use paired and Binnen-I forms constantly. Cheaper as a *matcher* rule
(derive `-in`/`-innen` from the masculine card) than as several hundred new cards —
which makes it the same fix as the item below.

### 🟠 The comprehension meter's denominator — re-measured 2026-08-15, and mostly already fixed

> **The 83.6% and the ~8 points below are stale, and one of the proposed fixes is
> actively wrong.** Re-measured with the meter's own denominator — the paper walk
> *without* `PAPER_NAMES`, because a learner pasting their own text gets no curated
> name list — the six papers now resolve **92.69%** of content tokens.
>
> | bucket | 2026-08-11 claim | measured 2026-08-15 |
> |---|---|---|
> | grammatical words missing from `FUNCTION_WORDS` | 3.9% | **0** — fixed 2026-08-11 |
> | inflections the matcher drops | 2.5% | **0.21%** (32 tokens, 12 distinct) |
> | proper nouns `isLikelyEntity` misses | 1.4% | **still real** — see below |
>
> ⛔ **Do not implement "tighten `isLikelyEntity` with a capitalised-and-unresolvable
> rule".** German capitalises *every* noun, so that rule reclassifies every unresolved
> common noun as a proper noun. Tried as a measurement here, it swept up `Vorschläge`,
> `Prüferin`, `Moderatorin`, `Einstellungen` and `Lesesaal` — 328 distinct tokens, most
> of them real vocabulary — and would have raised the reported figure by ~2.9 points
> while making it *less* honest. A meter that hides its gaps is the LingQ failure mode
> this feature exists to beat. **The remaining honest option is a bundled list of given
> names and place names** — data, explicit, and incapable of silently absorbing
> vocabulary — which is what the original "a name list" suggestion said before the
> heuristic was offered as an alternative.
>
> ✅ **The inflection bucket is fixed** (2026-08-15). The cause was not missing
> derivation rules but the plural **notations**: `buildMatcher` indexed
> `stripArticle(w.plural)` verbatim, so a card reading `¨-e` contributed the literal
> key `"¨-e"` and its real form was never indexed. **390 cards were indexed under a
> junk key**; 215 now contribute a real plural (`Handys`, `Jacken`, `Geräte`,
> `Speisekarten`, `Kreuzungen`) and 175 correctly contribute none. `pluralForm()` now
> expands all six notations, one test per notation.
>
> **What is left is genuine corpus coverage, not a denominator bug**: 7.10% of content
> tokens are words the corpus does not contain at any inflection — which is item 6
> (grow the corpus), not a meter defect. Phase 1 is no longer blocked on this.

### ✅ Grammar is not the problem, and one item here was stale

Every structure the B1 paper tests has an authored point at or below its level —
weil-word-order, aber/trotzdem/sondern, Akkusativ endings, relative-pronoun case,
`am …sten`, `bei`+Dativ, damit vs. um…zu, verbs with fixed prepositions, `falls`,
Konjunktiv II. **And the "four A1 exam topics are filed at A2" item below is out of
date:** Modalverben, Trennbare Verben, Imperativ and Perfekt are all in the A1 list
today (points 21–24). Nothing in the CHANGELOG records the move, which is its own
small lesson. Struck from Next.

---

## Reported from real sessions — 2026-08-16

- ✅ **You could not tell which build was on the phone.** Settings → **Version** now
  shows the commit and build time stamped into the bundle, plus *Check for updates*,
  which fetches a `version.json` emitted beside the bundle and compares. This is not
  cosmetic: the service worker is offline-first, so a fix that landed and a fix that
  did not looked identical, and every "does it work now?" was answered by reloading
  and guessing. The check bypasses both the HTTP cache and the worker (`no-store`
  plus a cache-busting query) — asking a stale worker whether it is stale is the one
  way to get a confidently wrong answer. *Update now* clears every cache, unregisters
  the worker and reloads; progress is in IndexedDB and is untouched. The stamp is
  emitted at build time rather than committed, because a version constant someone has
  to remember to bump is a version constant that is wrong.


Four things a learner hit on an iPhone in one sitting. Two were the same bug.

- ✅ **The teach card explained the wrong rule.** Two reports: a tile exercise whose
  answer was „Können Sie mir bitte Ihren Namen buchstabieren?“ opened *Wortstellung &
  Fragen* and worked through „Wo wohnst du?“; an **adjective ending in the Dativ**
  opened *Akkusativ* and worked through „Ich kaufe ___ Apfel → den“. One cause:
  `IntroCard` was keyed on `item.type`, so it could only ever show
  `MODE_REMEDY[mode][0]` — one static point per drill kind. **This is the third
  instance of a bug `TENSE_POINT` and `CASE_POINT` were each written to fix**, and it
  survived because the teach card lived a layer above the items that know their own
  target. It renders from `DrillHeader` now, off the item's own `pointRef`, and the
  exam gate moved with it. `orderPoint()` was added in the same pass so word-order
  items resolve a rule from the *sentence* (modal → Modalverben, subordinator →
  Nebensätze, W-word → Fragen) instead of always Wortstellung.
- ✅ **The drill-type pill overlapped the drill label.** The pill is `-top-2.5` — 10px
  above the card — and the header left exactly `mb-2.5`, 10px. Their edges met, so a
  long label ("Word order (sentence builder)") rendered under it. Measured live: pill
  top 320, card top 330. `mb-4` clears it with 6px to spare.
- ✅ **You can now choose what a session contains.** *"Sometimes I just want to
  casually flick through new words"* — Settings → **What's in a session**. Every drill
  is a toggle, plus *Everything* / *Flip cards only*. Stored as the **excluded** set so
  a drill added later is on by default rather than silently missing. Governs sessions
  only: opening a drill from Grammar still drills it, because there you asked by name.
  ⚠️ Grammar *exercise cards* are not drills — they are scheduled cards of their own —
  so the first implementation still served them under "flip cards only". Caught by
  driving a real session (twelve flips, then two grammar cards); they are on the same
  switch now.
- ✅ **A wrong typed answer could not be read back.** On a dictation card the answer
  field is a single-line `<input>` at `text-xl`, so „Ich besuche meine Eltern jeden
  Sonntag.“ overflowed and rendered as „Ich besuche meine Eltern jet“ — and the field
  is `disabled` after grading, still clipped, at exactly the moment the learner is
  comparing their attempt with the answer. *"I can't even see what I wrote to know
  which part I wrote incorrectly."* A wrong answer now reads back in full, wrapped,
  with the diverging words marked (`typedDiff`, 8 tests). Word-level, not character:
  in a dictation the unit of error is a word or an ending. Compared through **`norm`,
  the grader's own fold** — marking „moechte“ red would contradict the grade the
  learner was just given, and `spellingDiff` teaches that difference in words.
- ✅ **The HD voice never worked — on any device — and the CDN was why.** Reported as
  stuck at "Downloading… 100%". The timeout added to make that legible reported
  *"downloaded but could not play"*, which moved the search from the network to
  synthesis. Running `predict()` by hand produced the console line that settles it:
  **`Error: [unenv] fs.readFile is not implemented yet!`** — esm.sh serves
  `@diffusionstudio/vits-web` through a Node-polyfill shim, `predict()` reaches it, and
  the throw never rejects the promise the app awaits. It hung rather than failed, which
  is why this read as a slow download and then as an iOS permission problem.
  Measured side by side, same version and voice: **esm.sh still "predicting" after 65s;
  jsDelivr's `+esm` returned a 63,532-byte WAV in 2.56s.** Verified afterwards through
  the app's own `ensureHdVoice` + `speakHd`: completes in 6.9s. A test pins the CDN so
  it cannot be swapped back for tidiness, and the first-synthesis timeout went 45s → 2
  min, because 6.9s on a desktop is minutes on a phone.
  > ⚠️ **The first fix was for the wrong cause.** iOS's audio-gesture rule was the
  > diagnosis — plausible, documented, and not it. `primeAudio()` stays as a precaution
  > and earned no evidence. See LESSONS: instrument before fixing the likeliest cause.

## Now

Ordered. The reasoning for the order is in each *Why*; the short version is that
**#1 unblocks eight items that are written but unproven**, and it costs a day.

### 1. The real-device pass · S · 📱 — *do this first*

**Why.** Not because it is the most valuable item, but because it is the cheapest
way to stop lying in this file. Eight items across the Fifty are **written,
plausible, and unverified on hardware**, and they cannot be called done from a
browser: the 44px touch targets (gated on `any-pointer: coarse`, which no desktop
viewport reports), the "Tap the card" hint, safe-area insets in standalone PWA
mode, Dynamic Type at the largest accessibility sizes, iOS storage eviction after
7 days of ITP, `haptic()` and the WebAudio blips (iOS needs a gesture to unlock
audio), the keyboard covering typed drills, and the HD voice's ~25 MB download on
a mobile connection. Every one of them is currently a claim.

The audit that produced the Fifty said this out loud and it is still true: the
iOS Simulator was unavailable (host had Command Line Tools only, no `simctl`), so
every "mobile" finding to date is a 375×812 *browser* viewport that reports
`(hover: hover) and (pointer: fine)`.

> **Partly done 2026-08-05 — and the premise was wrong.** The audit recorded that
> "no browser viewport reports `hover: none`", which is what made these items
> unverifiable and parked them behind hardware. That is true of *resizing* a window
> and false of **device emulation**: at the mobile preset the browser reports
> `any-pointer: coarse`, `hover: none`, `pointer: coarse`, `maxTouchPoints: 5`. So
> the touch-gated CSS was measurable all along. What that produced:
>
> - ✅ **`.tap-44` confirmed working.** All five gated controls measure ≥44 with a
>   coarse pointer active (sidebar rows 223×44, *Start session* 219×44, profile
>   223×48). Previously unprovable — the rule had never once fired in a test.
> - ✅ **A real bug, fixed.** `.desk-in` scaled from `.985`, and a stalled entrance
>   sits on its `from` frame — so every 44px control in the session rendered at
>   **43.34px** while its CSS said 44. See the DESIGN.md §7 corollary; the rule now
>   forbids scaling a subtree that holds sized targets, guarded and mutation-checked.
> - ❌ **The `.tap-44` pass never reached the content surfaces**, which is where the
>   audit's "16 to 69 controls under 44px" actually lives. Measured with a coarse
>   pointer, still open (below).
>
> **First run on real iOS, 2026-08-05.** Xcode 26.6 + the iOS 26.5 runtime are now
> installed; Lexi has been loaded in Safari on a booted **iPhone 17 Pro** simulator
> for the first time. Two findings confirmed against the real renderer:
> - ✅ **#30 confirmed, and understated.** The three stacked control rows are exactly
>   as described (Markt/Liste · the six CEFR chips · *Study all*) — and the treemap
>   does not begin until roughly **half the viewport** is spent, against the audit's
>   "~200px". Screenshot evidence, iPhone 17 Pro, Safari.
> - ✅ **#31 confirmed.** The play FAB sits directly on the treemap and **truncates
>   the tile label underneath it** ("Work & Eco…"), so it is a legibility bug as well
>   as two interactive things sharing pixels.
> - The bottom nav clears Safari's toolbar with no overlap in browser mode.
>
**Driven on the simulator, 2026-08-05 (tap + swipe, iPhone 17 Pro / iOS 26.5).**
- ✅ **The touch affordance is right on real iOS.** The session coach marks read
  **"Tap the card to flip it"**, not "Space to flip". This is the item the audit
  explicitly could not settle; settled.
- ✅ **The first-sight grade scale renders correctly**: two buttons (*Still learning*
  / *Got it*) with their interval previews (1 min / 10 min), and the first-sight
  line beneath. The four-grade scale correctly does not appear for an unseen card.
- ⚠️ **#32 sharpened, and a claim of mine withdrawn.** On first run the coach marks
  wrap to **three lines** at 402pt and push the grade buttons below the fold. I first
  wrote that this made grading impossible; **that was too strong and is withdrawn.**
  The outer session wrapper (`h-[100dvh] overflow-y-auto`) *does* scroll —
  `scrollHeight` 722 against `clientHeight` 640 — and swiping **off** the card
  scrolls the buttons into view. What is true: on first run the primary action
  starts below the fold, and it is the coach marks that put it there.
- ❓ **The card may swallow vertical scroll — needs a real finger.** A vertical swipe
  *starting on the flip card* scrolled nothing in the simulator, twice; the identical
  swipe starting on the session header scrolled fine. The card is a framer-motion
  `drag="x"` surface carrying `touch-pan-y`, which *should* permit vertical panning,
  and the card covers most of the screen — so if this reproduces under a real finger
  it means the natural scroll gesture is dead across the primary surface. **Not fixed,
  deliberately**: synthetic swipes and iOS's real touch-axis arbitration are not the
  same thing, and a speculative fix to the grading gesture is not worth the risk.
  Confirm on hardware first.

> ⛔ **The ceiling, now that the toolchain is clear.** `sudo xcode-select -s
> /Applications/Xcode.app/Contents/Developer` was run and the live panel works. What
> no simulator can settle: **real haptics**, **7-day ITP storage eviction**, **true
> network conditions for the ~25 MB voice**, and **real touch-axis arbitration** (the
> open question directly above). Those want a physical handset.

> ### ✅ The touch-target sweep — closed 2026-08-15
>
> **Re-measured every interactive control on all six routes at 375×812 with a coarse
> pointer live, and the session surface card-by-card. Zero controls now under 44px
> without a hit area.** Two remained and both are fixed with the existing `.tap-hit`
> halo — the ink is untouched, only the target grows:
>
> | control | ink | hit area |
> |---|---|---|
> | *Where this came from* | 131×13 | 131×**44** |
> | first-sight *Got it* | 35×15 | **44×44** |
>
> **The speaker buttons were already fixed** and the 2026-08-05 row above is stale:
> they draw at 24×24 and already carry a working 44×44 halo. Verified by hit-testing
> rather than measuring — `elementFromPoint` at each halo edge returns the button.
>
> **One left deliberately.** *Hear the example* — the example **sentence** as a play
> button — is 176×24 with no halo, and stays that way. The 24×24 speaker icon beside
> it fires the *identical* action and already meets 44×44, so the sentence is a bonus
> affordance, not the only route to that function. Growing it would claim a 176×44
> band of the flip card and steal taps from the flip gesture for no accessibility
> gain.
>
> **Today's row above is stale too**: *Start session* is `hidden sm:flex` — it does
> not render at 375px at all, and already carries `.tap-44` for where it does. The
> time-budget chips, *Paste a list* and the KPI chip no longer exist in `Today.tsx`.
>
> ⚠️ **The 43.34px reading was almost re-reported as a live bug.** Measuring the
> session found every 44px control at 43.34 — the exact `.desk-in` signature, with
> `.card-in` still carrying `scale(.985)` where `deskin` had long since been reduced
> to a pure translate. It is **not** live: `document.timeline` advanced 0ms over 600ms
> of real time in the automated browser, so every CSS animation — including a probe
> element created on the spot — sat frozen on its `from` frame. Neutralising
> animations put every control back at 44. *The hazard in `@keyframes cardin` is real
> and still violates the DESIGN §7 rule; what is not real is the measurement.*
>
> No horizontal overflow at 375px on Today or in the session (`scrollWidth` 375).

**Do.** Install Xcode (for the Simulator) or attach a real handset, then run a full
session on a real iPhone *and* a real Android, in the browser and installed, at
default and largest text sizes, in both themes, offline after a cold start.
Specifically check: safe areas (notch, Dynamic Island, home indicator) on the
session surface and bottom nav; the `UmlautBar` sitting above the keyboard rather
than behind it; that a 90px horizontal swipe (`SWIPE_PX`) never fires during a
vertical scroll of a long C1 reveal; one-handed reach on the grade buttons;
landscape; and the 320px floor, where the Library's rule `pairs` render in a
three-column grid that already wraps at 375px.

**Done-when.** A full session — flip, every drill type, recap — is comfortable
one-handed on a 375px phone with the keyboard up, installed and offline; no
horizontal scroll at 320px; and each of the eight claims above is either confirmed
or has a bug filed under it.
**Touches.** `src/index.css`, `views/Review.tsx`, `components/BottomNav.tsx`,
`components/UmlautBar.tsx`, `views/GrammarDrill.tsx`.

### 2. The comprehension meter — the flagship · L (decided 2026-07-27)

**Why.** From the competitive pass ([COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md)):
Lexi builds an honest per-lemma knowledge model and spends it entirely on describing
itself. The 95–98% **lexical coverage threshold** (Hu & Nation; Kremmel et al. 2023) is
the most robust finding in reading-based SLA, and every competitor approximates it
badly — Lenguia scores text by generic CEFR band, LingQ by an admittedly inflated
word-form counter its own staff calls *"the mechanical rabbit at a dog race"*, graded
readers by a population average. FSRS state **is** a forgetting-aware per-lemma model,
which makes Lexi the only product in the category able to compute the number honestly.
It is also the first feature that makes the corpus bottleneck stop mattering: unknown
words arrive from the learner's own text instead of the hand-gated word list.

**Scope ruling (2026-07-27).** *Additive.* Known and the market **stay the headline**;
the meter is a new first-class surface, not a replacement identity. The full reframe was
argued and declined — see the ruling block in COMPETITIVE-RESEARCH §5.

> **Reconciled 2026-08-04.** A reading surface already shipped on the stranded
> branch — **Lesen** (`lib/reader.ts`, `components/ReadingList.tsx`, surfaced on
> Today): sentences you can almost read, drawn from the existing corpus. It is a
> genuine down-payment on this item and it does the **retrieval** half. What it does
> not do is the **measurement** half — report coverage against the 95/98 bands for a
> text the learner brings. Build Phase 1 *on* Lesen rather than beside it, or the app
> ends up with two reading surfaces that disagree.

**Phase 0 · prerequisites (S).** Land these first; each is independently defensible.
- ~~Port `buildMatcher` back app-side.~~ ✅ **2026-08-04.** Now `src/lib/matcher.ts`;
  `scripts/corpus/lib.ts` imports the app's copy. One implementation, so the meter and
  `corpus:coverage` cannot disagree about what "known" means. `corpus:selftest` 39/39
  and `corpus:validate` PASS through the moved module.
- ~~Order fresh cards by frequency *within* a CEFR band.~~ ✅ **2026-08-04.** Band is
  the outer sort, frequency the tiebreak, in both `firstRunIds` and the fresh-card fill
  in `buildBriefing`. New `src/lib/freq.ts` + `public/data/freq.json` (49 KB, emitted by
  `npm run corpus:freq` from the ranks provenance already carries). Unranked cards keep
  corpus order behind the ranked ones; a missing or failed `freq.json` degrades to the
  old behaviour rather than failing to boot. 11 tests, mutation-checked.
- **Extend `freqRank` to all cards · S, maintainer machine.** Still open, and now the
  only thing limiting the ordering above: ranks cover **1,986 of 7,389 cards (27%)** —
  the rest predate the provenance log. Not a random 27% either, since those cards were
  *discovered through* the frequency list, so today's ordering is mildly
  self-fulfilling. The ranks come from the Leipzig lists `build.ts` already loads, but
  filling them means a `corpus:build` run, which is human-gated (CLAUDE.md) and needs
  the network-enabled maintainer machine. **When it lands, re-run `npm run corpus:freq`
  and nothing else has to change** — the app side is finished and coverage-agnostic.

> ✅ **Phase 1 shipped 2026-08-15, both halves.** `src/lib/coverage.ts` (14 tests) —
> coverage against the 95/98 bands with counts, the ranked unlock set,
> `unlocksToReach`, and `{ kind: 'unlock'; text }` on `SessionReason` with a
> `whyLine` case. `src/views/Read.tsx` on `#/read`, reached from inside Lesen —
> paste, measure, read back with known/learning/new tinting, tap for gloss, and one
> tap into a session that says *"because you want to read …"*. Verified end to end
> in the browser.
>
> ✅ **Converged 2026-08-15.** Measured first: over 32,713 tokens the matcher
> resolved **2,076 (6.3%)** the reader did not, all of them words Lesen was calling
> unknown. Done as a *fallback* rather than a swap, because the two disagree on 520
> of the 22,861 both resolve and on the capitalised ones the reader is right —
> `Essen` is the meal, `Morgen` the morning, which the matcher cannot see. The maps
> answer first; the matcher catches the rest. `src/lib/appMatcher.ts` now holds the
> single shared instance.

**Phase 1 · the meter (M).** Paste (or save a URL's text) → annotate via the matcher →
report coverage against the 95/98 bands, honestly and with the count, not just a
percentage. Then: *"the N words that get you over the line"*, ranked by frequency ×
recurrence in this text, one tap into the session as a `{kind:'custom', ids}` target
carrying a **new `SessionReason`** — `{ kind: 'unlock'; text: string }` — with a
`whyLine` case, so the scheduler shows its work here too ("because you want to read
this"). Plus the read-back view: known/learning/new tinting from FSRS state, tap for
gloss + gender/plural, tap to add.
**Done-when.** A pasted text reports a coverage figure that matches a hand count; the
unlock set demonstrably raises it on re-check after those cards reach Review; `whyLine`
has a tested `unlock` case; proper nouns and function words are excluded from the
denominator the way `isNeutralWord`/`isLikelyEntity` already decide.

> ✅ **The saved-texts half shipped 2026-08-15.** `savedTexts`/`saveText`/`removeText`
> in the store (body stored, not ids, so the meter is live), and the shelf in
> `views/Read.tsx` — each text with its current figure, recomputed on every store
> change. Verified end to end: grading in an unlock session moves the shelf without
> re-pasting. **Still open in this phase: listening**, and the licensing question
> below is unchanged — nothing bundled, learner text only.

**Phase 2 · the library that returns (M).** Saved texts, each with a **live meter that
moves as you study** — the app's first return mechanism that isn't self-referential.
Listening is *plumbed* here — `lib/audio.ts` and the Piper HD voice both ship — but human
audio covers **10 of 7,389 cards (0.14%)**, so in practice this still means synthesis.
⚠️ **Licensing:** ship learner-pasted text and learner-saved URLs only. Do not bundle a
feed of someone else's journalism — DW's *Langsam gesprochene Nachrichten* is the
obvious fit and is **not** automatically redistributable. Check terms before any
bundled content. (The Tatoeba audio allow-list in `corpus:audio` is the precedent for
how carefully this needs doing.)

**Phase 3 · output, narrowly (M).** Not a chatbot. *"Write one sentence using these
three words"* with grounded, mostly-deterministic checking, reusing `norm`, the
`editDistance1` near-miss grading that now ships, and the hint ladder. Local-first
survives. On-device WebGPU (a ~1B model is fine for a <100-token correction, useless
for conversation) is an implementation option here, not a strategy — see the refusals
list in COMPETITIVE-RESEARCH §5.

**Touches.** New `src/lib/matcher.ts` (moved), `src/lib/reader.ts` (extend),
`src/lib/coverage.ts` (new), `session.ts` (`SessionReason`, `whyLine`), `store.ts`
(saved texts), `scripts/corpus/build.ts` (freqRank fill).

### 3. ~~Cross-level duplicate cards~~ · ✅ done 2026-08-11

> ✅ **Closed 2026-08-11.** All 874 groups merged across two passes — **7,394 →
> 6,264 cards, 0 terms left on more than one card.** The second pass rejected the
> first pass's own framing: the question is not "is this a homograph?" but "should
> one German word have two cards?", and the corpus already answered it (`die Bank`
> is one card glossed "bank; bench"). So senses are **unioned** onto the keeper —
> `der Zug` is now one A1 card reading *"train; move / turn"* — instead of a second
> sense living on a card the learner met and re-learned separately.
>
> **The matcher improved enormously and for free.** `corpus:validate`'s reader
> probe, with `matcher.ts` untouched, went from **verb 0.75 · plural 0.84 · adj
> 0.84** to **verb 0.97 · plural 0.995 · adj 0.935**. Duplicates were shadowing each
> other in a first-wins index, so a token resolved to whichever copy came first —
> often the one with no plural recorded. This was also the mechanism behind the
> withdrawn A1 measurement above.
>
> *Left over:* **287 merged groups had disagreeing sectors** and kept the lowest
> copy's, flagged in `dupe-rulings.tsv` for `corpus:resector`. `die Handschuhe` now
> sits in *Skiing and snowboarding* rather than *Clothing*. 14 sectors emptied
> entirely and were dropped.
>
> **It came back on 2026-08-14, and the zero is now enforced.** A gender correction
> renamed `die Visum` to `das Visum` — a term the corpus already held at B1 — and
> `corpus:validate` returned **PASS**, because its dupe check is keyed on
> `(level, term)` and cross-level duplication was invisible to it. The end state of
> this item lived only in the sentence above. `corpus:validate` now errors on a term
> appearing at two levels, `merge-dupes.ts` writes `idmap.ts` rather than printing it
> to be pasted by hand, and `dupe-rulings.tsv` is cumulative. **6,581 → 6,580 cards.**

**Why.** **874 terms sit on more than one card; 1,021 cards are redundant — 14% of
the corpus.** The 2026-08-11 pass raised the evidence for this item and, briefly,
mistook it for a levelling problem: `der Tisch` is at A1 in *Home* and at B1 in
*Furniture*, `der Zug` at A1 in *Town & travel* and B1 in *Games*. `die Miete` exists at A1, A2, B1 *and* B2; `die Haltestelle` three
times. Each copy carries its own FSRS schedule, so a learner meets and re-learns
the same word up to four times. This is exactly the defect the capitalisation pass
fixed for 62 cards while a thousand more sat untouched. It also inflates every other
content programme: 75 duplicate groups still have a copy awaiting a definition, so
that authoring would be done two and three times over.
**Do.** Triage by group, never in bulk. Some pairs are genuine homographs — `der See`
/ `die See` differ by article and so do not collide on term, but check for others
before assuming. Keep the lowest level, fold the rest through the existing `casefix`
id-map path so schedules survive the merge (`store-idmap.test.ts` guards that the
schedules actually travel). Record a reason per group the way `case-rulings.tsv` does.
**Done-when.** Every duplicate group is merged or carries a written reason;
`src/data/idmap.ts` covers every retired id; tests still green.
**Touches.** `scripts/corpus/`, `public/data/vocab.json`, `src/data/idmap.ts`.
> **Do this before item 5.** Otherwise a share of those definitions gets authored
> more than once.

### 4. The Atlas, pass 2 — composition and continuity · M

**Why.** The five P0s are closed (CHANGELOG, July 28 + 31). What remains is the
diagnosis the twelve personas actually returned: the aesthetic promises density,
precision and liveness, and the implementation still ships sparseness and
compression in places. These are the ranked survivors, and they are mostly *layout*,
which is why they group into one pass rather than fifteen tickets.

**Composition — measured 2026-08-16, and the three headline findings did not survive
it.** All three were re-measured at 1280px before any of them was built, on the
principle this file has re-learned five times this month. None is what it says.

- ~~**Break the single-column stack (#19 · M · P1).** Six identical rounded rectangles
  at one width on a 1280px screen, each with 40–60% empty space to its right.~~
  ⚠️ **Measured: of the nine cards on Today, six use 95–98% of their width.** Only
  three are sparse, and each for a reason: the Brain hero (70% — a canvas, where the
  space *is* the artwork), the goal line (71% — a deliberately small card, redesigned
  earlier today so the commitment leads), and *My class list* (51%). "Six rectangles
  at 40–60% empty" is not the state of this surface. A two-column pass would be
  redesigning six cards that already fill their column.
- ~~**The desk is letterboxed on desktop (#22 · S · P1).** DESIGN.md §8 promises
  full-bleed; an ~800px column in a 1280px viewport is not that.~~
  ⚠️ **Measured: the column is 640px, not ~800 — and the desk carries no chrome at
  all** (no top bar, no bottom nav, no ticker; verified in the running app). §8's
  table contrasts *chrome* with *no chrome* — "the terminal: mono, cool, hairlines,
  nav, ticker" against "full-bleed, no chrome at all" — it does not promise that the
  card spans the viewport. The desk satisfies what §8 actually says, and a
  viewport-wide flashcard would contradict the same section's "one object".
- ~~**The card becomes a lexicon entry (#21 · M).**~~ ⚠️ **Substantially already
  shipped, and never struck.** The front carries **POS · level · sector · headword
  with gender ink · IPA · citation**; the back is flush-left with headword, POS ·
  level · field, definition, the German definition layer, examples and synonyms —
  its own source comment already calls it "an entry you read". The dead space inside
  the front measures **169px, not ~250**, and it is symmetric (85 above, 85 below)
  because the front is *centred on purpose*: §8 wants one object. The only thing
  genuinely absent is IPA on the *back* face, which is XS and not what this item says.

**What this costs, stated plainly:** a day of composition work was queued against
three findings that measure fine. The pattern is now five-for-five this month — see
LESSONS class 1. **Nothing else in this section should be built before it is
re-measured.**
- ~~**Content clips at both widths (#5 · S · P1).**~~ **Swept 2026-08-16 across all
  ten hash routes at 1280 and 375 — one real, one artifact, one unreproduced.**
  - ✅ **Deck names were cut mid-word.** `line-clamp-2` fixed the multi-word case in
    an earlier pass and could not fix a name that is a **single word wider than the
    column**: with nowhere to wrap, the clamp's `overflow: hidden` cut it with no
    ellipsis. At 1280px *Communication* rendered as "Communicat" (113px of word in a
    92px box); *Administration* and *Relationships* the same. `break-words` on the
    name. **Horizontal cuts on Decks: 3 → 0** at 1280, 0 at 375.
  - ⚠️ **"Today overflows its own column by 8px" is an artifact.** The offender is a
    single control — the *recognised · streak* chip — carrying `px-2 py-1 **-mx-2**`,
    the ordinary optical-alignment trick: pad for the 44px hit area, negate the margin
    so the text still lines up with the column edge. Nothing is clipped and the
    document does not scroll horizontally at either width. **The tell was in the
    original numbers**: 999>991 and 350>342 are *both exactly 8px*, and a layout bug
    scales with viewport while a negative margin does not. A first hypothesis here —
    that the `.live-dot` pulse ring was inflating `scrollWidth` — was tested by
    disabling the ring and **disproved**, which is the only reason the real cause was
    found.
  - ❓ **The Today `text-2xs` line clipping 406→237 was not reproduced** at either
    width. The only `text-2xs` candidate is the backlog burn-down (`… of … backlog
    cleared`), which renders only when `dueTotal > due` — a state this sweep could not
    produce. Unverified rather than struck.
  - *Left as designed:* two deck **subtitles** at 375px still hit `line-clamp-2`'s
    third line (*Intermediate descriptive adjectives*, *Language Acquisition &
    Linguistics*). That is the clamp working — visible ellipsis, full name in `title`.
  - ⚠️ **The sweep's own first two attempts were wrong**, which is the standing warning
    in this file. A "spills past its parent" check reported **350 hits on Decks alone**
    with parent widths of 0 — it was comparing against elements that are not the
    layout container. And a clean run of the corrected check returned *zero clips on
    every route* while `innerWidth` was **0**: the pane was backgrounded, every rect
    collapsed, and the size filter dropped every element before it could be tested. The
    sweep now aborts unless the viewport is real.
- ~~**Mobile Progress spends ~200px on chrome before any map (#30 · S · P1)**~~
  ✅ **Fixed 2026-08-16**, and it was worse than "~200px": measured at 375px the
  heatmap card's header was **200px tall on its own** and the first tile did not
  appear until **465px of an 812px viewport — 57%**. Four control clusters were
  wrapping. The CEFR filter now collapses on a phone to one control that *states*
  the scope ("All levels", "A1–B1"), and the header breaks deterministically into
  two rows instead of however four clusters happen to land. **Header 200 → 125px,
  first tile 465 → 390 (57% → 48%).** Unchanged from `sm:` up. The rest of the 48%
  is the `Progress` h1 and the Headline card, which are *content* — shrinking the
  app's hero number to win pixels is a different trade and nobody has ruled on it.
- ~~coach marks eat 200px of 812 (#32 · XS · P1)~~ ✅ **Fixed 2026-08-16, and the
  number was 2.5× too big.** The block measures **79px**, not 200. The "primary
  action starts below the fold" claim is **false at 375×812 and 402×874** — the
  grade buttons sat 56px and 71px clear. It is true on the **iPhone SE (375×667)**,
  where they ended **7px past the fold** and the session scrolled. Fixed by
  tightening padding and row gaps only (79 → 67px), not type size: "Tap the card to
  flip it" is the one genuinely undiscoverable thing in the app and shrinking it to
  win eight pixels trades away the finding the block exists to deliver. Grade
  buttons now clear the SE fold by 7px. *Still true at 667:* the subordinate
  first-sight line below the buttons is off-screen, and the session scrolls 42px.
- **The FAB overlaps the treemap (#31 · XS · P1)** — **re-confirmed 2026-08-16 and
  deliberately not fixed.** It is real: the 56px *Start today's session* button is
  viewport-anchored above the bottom nav and sits on the map, truncating the tile
  label under it. But every fix on the table trades something the app has already
  ruled on. *Hiding it on Progress* (the rule Today uses) removes the only one-tap
  route to the **scheduled** session from that surface — `Study all` is a different
  action. *Docking it into the nav* is the category error `BottomNav.tsx` rejects in
  its own header comment. *Shrinking the mobile map* so it ends above the FAB makes
  the map ~300px, and the complaint about this surface was that the map was too
  small and too far down. *Auto-hide on scroll* leaves the overlap at rest, which is
  the state the screenshot was taken in. **What it needs is a ruling on which of
  those to spend, not a script** — and a speculative fix to the app's primary action
  is the kind this file has been burned by (see the swipe-gesture note in Now #1).
- **The ticker is clipped, and on mobile it is noise (#28 · S · P2).** Partial "7%"
  against the sidebar edge on desktop; 3.5 items and a mid-word cut at 375px.
- **Empty and first-run states (#29 · S).** First-run Today spends ~60% of a desktop
  viewport on nothing — the one screen where density would reassure.

**Continuity and affordance.**
- ~~**Shared-element continuity, tile → sector (#9 · M · P1).**~~ **Shipped
  2026-08-13.** The group's frame expands from the tapped tile into the sector
  panel. It also produced §7's third correction: a `layout` animation may not
  drive a control, because the transform *is* the mechanism and there is no
  resting frame — so the shared element is inert decoration with a timer backstop.
  See the CHANGELOG.
- ~~**Tile hover/press affordance (#25 · XS · P1).**~~ **Shipped 2026-08-13.**
  Hover was already there (brightness + outline); *press* was not, even though
  `.tile` had declared `transition: filter .1s` since it was written. A tile
  acknowledged the pointer on the way in and went dead under it.
- ~~**The interaction hint sits below the fold (#26 · XS).**~~ ✅ **Fixed 2026-08-16.**
  It lived in the legend row *below* the map, which on a 375×812 phone sits at ~877px
  — off the bottom — and long-press is the only way to study a group directly from the
  map on touch. The phone now carries its own line in the card header; the legend row
  keeps the full sentence from `sm:` up. First attempt put it in the controls row's
  "spare" width, which truncated the hint **and** shrank *Study all* into a two-line
  wrap — the DOM read said unclipped and the screenshot said otherwise, which is the
  argument for looking. It has its own 19px line instead. **First tile 390 → 401**;
  net against the pre-#30 465.
- ~~**The goal line is styled as a footnote (#23 · XS · P1)**~~ ✅ **Fixed 2026-08-16.**
  Measured before: one `text-xs` paragraph — **13px, `--color-dim`**, in a 56px card —
  carrying the only sentence on Today that says what the learner is *for*. The
  commitment now rides its own line at 15px/600 in full-strength ink and the pace is a
  supporting line beneath it; card 56 → 68px, no clipping at 375 or 1280. Still a small
  card on purpose: promoting it to a hero would put it in competition with "cards
  queued", which is the thing you are meant to act on. Hierarchy, not volume.
  > **"Needs a seeded multi-day store" was not a blocker, and calling it one was
  > wrong.** Every input is a storage key. The recipe, for the next item that renders
  > only for an established learner: write `lexi.visits.v1` (≥8 distinct days clears
  > `week1`), `lexi.goal.v1` (`{level, date}`) and `lexi.snap.v1` (two rows with an
  > older date, or `projectedPct` stays null) — **then write `lexi.visits.v1` into
  > IndexedDB as well** (`db 'lexi'`, store `'kv'`, same key) and reload, because the
  > store mirrors visits to IDB and rehydrates over localStorage at boot. Seeding
  > localStorage alone looks like it worked and is silently undone by the reload.
- ~~**"+ 4 drills targeting your blind spots" is red (#24 · XS · P1)**~~ — ✅ **stale,
  verified 2026-08-16.** `Today.tsx:290` renders it `text-amber`, and `--color-amber`
  is Atlas blue (`#1d6a8c` light / `#63b3d4` dark). Nothing on that line is red. Fixed
  at some point and never struck through — the same shape as the empty-`pos` item.

**Also here, cheaply.**
- **Category hue per theme group (#20 · M).** Fill encodes magnitude; hue should
  encode identity, consistently across map, decks, cards and stats.
- **Retire the `--color-amber` misnomer (#27 · XS).** A token named amber holding
  Atlas blue, having previously held cyan. Rename with a codemod.
- **Gender ink and CEFR ink share values — the contrast pass is done, and it is five
  collisions, not one.** This item recorded `--color-der` == `--color-a1`. Measured
  2026-08-16 by `src/lib/palette.test.ts`, which parses `index.css` and compares the
  ramps: **light has three** (`der`=`a1` #2d5be3, `die`=`c2` #be185d, `das`=`b1`
  #0f766e) and **dark has two** (`der`=`a1`, `das`=`b1`; dark lifts `die` and `c2` 45
  apart, which is why counting in one theme got it wrong).
  **Severity is lower than it reads, and that is measured too.** Neither ink is ever
  the only signal — `genderColor`'s contract in `lib/ui.ts` is "the article itself is
  always spelled out beside it", and a CEFR badge renders "A1" as text. So this is
  polish, not ambiguity.
  **What it still needs is the ruling, not the measurement:** which ramp moves. Gender
  follows the blue/pink/green convention DaF materials use; CEFR has its own
  documented order (blue → teal → violet → fuchsia → coral) and its own invariant
  against the status colours. The test now enumerates the five so a **new** collision
  fails the build while these stay visible, and it also pins contrast ≥3:1 for every
  ink and mutual distinctness within each ramp — all of which pass today.

**Done-when.** The desk is full-bleed; no measured clip remains; the treemap
drill-down transforms rather than cross-fades; one documented motion scale applied.
**Touches.** `App.tsx`, `index.css`, `views/{Progress,Markt,Review,Today}.tsx`,
`components/CountUp.tsx`, `lib/ui.ts`, `docs/DESIGN.md`.

### 5. The definition programme · L, human-gated

Two items that were tracked separately and are one queue.

**5a. Definitions that discriminate senses, not enumerate translations.**
**Why.** `def` is largely raw sense-listing rather than a definition.
`corpus:definitions` reports **1,493 cards** across three kinds: *enumeration* (1,064 —
"railway depot, railroad station, railway station, train station"), *bare* (363 — a
lone synonym), *repeat* (138 — "to eat; to eat; to dine"). A list of translations only
says what else the word could be called, which the `en` gloss already did.
**Do.** `corpus:definitions --write` emits batches; author worst-class-first and apply
through `fix-authored.ts`, which refuses a replacement that merely repeats the gloss.
A1 and A2 are the most-seen and are already down to 15.6% / 24.5% flagged.
**Watch for sense bugs, not just style** — this pass has already turned up `der See`
defined as "sea, ocean" (that is *die* See), `das Fleisch` as "flesh", `billig` as
"appropriate, meet, fair" (the archaic sense), and `mir` carrying the definition of an
oriental carpet.
**Done-when.** `repeat` and `bare` at zero; `enumeration` trending down and no longer
concentrated below B1.

**5b. Finish the English definitions the German migration displaced · S.**
**Why.** A card with no `def` renders no definition block at all below B2 — the biggest
single hole in the app's core artefact.
> **Re-measured 2026-08-16, and the recorded figure was wrong in the bad direction:
> not 286 but 455** (A1 67 · A2 54 · B1 154 · B2 103 · C1 74 · C2 3). The corpus grew;
> the number did not follow it.
>
> ✅ **A1 is at zero, 2026-08-16.** All 67 authored and applied through
> `fix-authored.ts`. **455 → 388**, and the flagged total did *not* move (1,213 before
> and after) — none of the 67 landed back in `bare`, `enumeration` or `repeat`, which
> is the check that matters: adding definitions must not add defects.
>
> ⚠️ **The largest bucket had no authoring path.** `corpus:definitions` reported the
> missing cards "as a queue" and emitted batches only for the *flagged* classes, so the
> worst group was the one you could not work on. It now emits `missing-<LEVEL>-NN.json`,
> ordered lowest level first, carrying `defDe` and the first example as **sense
> evidence** — a German definition says which homograph the card is about, which is
> what an author needs and what a bare gloss cannot supply.
>
> ⚠️ **Three of my own definitions were rejected by the corpus's own gate**, all the
> same way: an English definition that *quotes a bare German article* reads as German
> to `isGermanDefinition`, so "…the grammatical gender of der words" and "in the plural,
> die Daten, …" are hard errors. The rule for authors: name the article as *masculine
> article*, never as `der`. The check is right and caught all three before they shipped.
> ✅ **A2 done, 2026-08-16** — 53 of 54, flagged total again unmoved at 1,213.
> **455 → 335** overall; A1 0 · A2 1 · B1 154 · B2 103 · C1 74 · C2 3.
>
> ✅ **Fixed 2026-08-16 — the card, not the definition.** `npm run corpus:cardfix`,
> a new expect-guarded pass for a card whose *identity* is wrong. `voc:A2:der Somit`
> → **`voc:A2:somit`**, `pos: adverb`, gender and plural cleared, glossed
> "thus, therefore", with a definition. `ID_MAP` carries the schedule. **Cards with
> no English definition: 0.**
>
> **And the check that would have caught it:** a *noun filed in a sector reserved for
> another part of speech*. ⚠️ The obvious wider version was measured first and thrown
> away — "sector is a POS sector that disagrees with `pos`" fires on **65 cards of
> which ~64 are correct** (`die Zahl` is a noun in *Numbers*, `doch` a particle in
> *Adverbs*, 44 phrases sit in *Useful Phrases*). Narrowed to nouns in Core verbs /
> Adverbs / Adjectives / Connectors it found exactly one more — `das Gegenteil`, a
> noun filed under **Core verbs**, now in *Abstract* beside `die Ursache` and
> `die Folge`. Both fixed, the check ships as an error at zero, proved firing.
>
> *The original finding, kept because it is the reason the pass exists:*
> 🔴 **The 54th was a broken card, and the definition pass is how it surfaced —
> exactly what this item's "watch for sense bugs, not just style" warning predicts.**
> `voc:A2:der Somit` is glossed **"somite"** (the embryology term) with noun facts
> attached — `gender: der`, `plural: die Somite` — while **its sector is `Adverbs`**
> and both its examples are the adverb *somit*, correctly translated "therefore" and
> "thus". A frequency-list adverb that collected a homograph's noun facts at build
> time. Left undefined deliberately: writing a definition would have papered over it.
> *Done exactly that way,* through `corpus:cardfix`.
>
> Two smaller `defDe` defects found beside it, both harmless to the English pass:
> `voc:A2:fallen` carries an **English** gloss list in its German-definition field, and
> `voc:A2:mintgrün`'s `defDe` describes a garment wrapped round the body — it belongs
> to another word entirely. ⚠️ I tried to add a `corpus:validate` check for "English in
> `defDe`" and **withdrew it**: keyed on German function words it found 1 card, and
> that one was a false positive (*„an einen Zugang montierte Schließvorrichtung"* is
> good German) while `fallen`'s genuine English list slipped through on the word *in*.
> Wrong in both directions on its first run, so it was not shipped.

> ✅ **B1 done, 2026-08-16 — and with it every level below B2.** 154 authored.
> **455 → 181** overall: A1 0 · A2 1 · B1 0 · B2 103 · C1 74 · C2 3. The flagged total
> has now not moved through **274 definitions** (1,213 before the first batch and
> after the last), which is the check that matters: new definitions are not becoming
> the next batch's defect.
>
> **This is the line worth reaching first.** `defDe` is shown from B2 up, so a card
> with no `def` rendered nothing at all *specifically* for A1–B1 learners — the ones
> with no fallback. That population is now covered.
>
> ✅ **Sized and cleared 2026-08-16 — by reading all 302, because no proxy works.**
> **23 cards** carried a `defDe` describing a different word or a different sense, or
> English prose outright. All cleared through `corpus:cardfix`; **302 → 279** cards
> carry a German definition, and the ones that remain were each read against their own
> gloss.
>
> **Cleared, not rewritten.** A card with no `defDe` simply does not show the German
> layer — already true of 6,200 others — and showing nothing beats showing a definition
> of another word. Authoring replacement German for advanced learners is a different
> job with a different bar.
>
> **How it was sized matters.** Two cheap proxies were tried and both were wrong in
> both directions (a marker test found 1 card and that one was a false positive, while
> the genuinely English `fallen` slipped past on the word *in*). The population was 302,
> which is small enough to read — so it was read. `corpus:validate` now errors on
> English prose in `defDe` via a **stopword-ratio** test, which survives both failure
> modes; it is a floor, not a sweep, and the one known miss (`die Währung`, half English
> and half German) is pinned in a test saying so.
>
> *The original finding, kept:*
> 🔴 **`defDe` frequently describes a different sense from the card's own gloss** — a
> new finding, and a real one, because that field is *shown* to B2+ learners. The
> German definitions were imported by headword and took whichever sense came first:
> `packen` (to pack) carries the definition of *Packen*, a bundle; `umgehen mit`
> (to handle) carries one about washing up; `sorgen für` (to provide for) carries
> *sich sorgen*, to worry; `sinnvoll` carries "geistig rege"; `die Resilienz` and
> `die Trennung` carry the materials-science senses; `die Vorstellung` the mental-image
> one where the card means a performance; `die Alp` the nightmare-demon sense where
> the card means an alpine pasture; `der Abgeordnete` a definition reading
> *weibliches Mitglied*. Two hold **English**: `voc:A2:fallen` and `voc:B1:betreten`.
> *Not sized* — spotted while authoring, so this is a lower bound on a class, not a
> count. Sizing it needs a check that compares `defDe`'s sense against `en`, which is
> harder than it sounds; the naive version is below.

> ✅ **B2, C1 and C2 done, 2026-08-16 — the queue is empty.** **455 → 1.**
> 6,503 of 6,504 word cards carry an English definition, and cards reading as *real*
> definitions went **4,836 → 5,290**. The flagged total did not move once across all
> **454**: 1,213 at the start and 1,213 at the end.
>
> **The remaining 1 is `voc:A2:der Somit`**, the broken card above — left undefined on
> purpose, because a definition would hide it. Closing this item to a true zero means
> fixing that card, not authoring a 455th definition.

**Do.** ✅ Nothing — this sub-item is finished bar the broken card. What remains under
**5a** is the flagged 1,213: `repeat` (113) and `bare` (285) are the two the audit wants
at zero, then `enumeration` (872).
**Done-when.** `corpus:definitions` reports 0 cards with no English definition.

**Touches.** `scripts/authoring/batches/def/`, `public/data/vocab.json`.

### 6. Grow the corpus toward ~10k + rebalance A1/A2 · M, ongoing

**Why.** Distribution is B1-heavy — backwards for early reading — and core
high-frequency lemmas are still missing.
> ✅ **The human gate is gone, 2026-08-11 — replaced, not deleted.**
> `npm run authoring:new -- <batch.json>` refuses to write a card it cannot
> verify: gender, plural, part of speech and IPA are read from de.wiktionary and a
> disagreement is a hard reject; every example must contain a real inflection of
> its headword, proved with the app's own matcher rather than a substring test.
> Facts are never generated — only the gloss and the sentence are written, and both
> are checked. The rule it replaces was guarding against a plausible sentence with
> a wrong gender attached, which a machine now catches on card 300 as reliably as
> on card 3. First batch: **52 A1 cards, 0 rejected after three real defects the
> gate caught** (see the CHANGELOG).
**Do.** `corpus:coverage` → build A1/A2 batches → `corpus:validate --strict` → review
the diff → commit, in reviewable batches. Close the top-frequency gaps first.
**Source material:** `reference/DaF Wortschatz/` — 69 page-mapped scans of a complete
A1–B1 Lektionswortschatz (Lektion → Feld → Wortart); see its `MANIFEST.md`.
`IMG_4850` is the irregular-verbs appendix — feed it to the conjugation engine's
known-verb checks.
> **The extraction rules** used to live in `archive/COHESION-PLAN.md`, deleted in the
> July tidy and recoverable from git history only. They are: entries are *selected and authored* in the book's style, never
> transcribed wholesale; level is the book's placement, honesty-bumped where DaF runs
> ahead of CEFR; nouns map to existing sectors, verbs and adjectives fall to POS
> defaults. Recorded here because the file they were in is gone.
> *Still open from the DaF passes:* L19–L30 (B1 scans), ~197 A2 book lemmas below the
> frequency scan or without examples, and C1/C2 register.
**Done-when.** ≥95% of the top ~2,000 lemmas per level; A1/A2 filled; validate green;
load size still acceptable.
**Touches.** `scripts/corpus/*`, `public/data/*.json`.

---

## Next

**Games, and the navigation that has to come first.** *Decided 2026-08-12 with the
user; none of it is built.*
- ~~**Top-bar navigation · S**~~ **Shipped 2026-08-12.** `TopBar.tsx` replaces the
  240px rail with a 55px bar; the content column gained 240px on a laptop. The
  mobile drawer went with it — its focus trap, Escape handler and `inert` dance no
  longer have to be right because they no longer exist, and tabbable controls
  before `#main` went 7 → 3 on a phone. Destinations stay in `BottomNav` under the
  thumb; the profile is on the bar at every width. See the CHANGELOG.
- ~~**Typing race · M.**~~ **Shipped 2026-08-12.** `#/games` → Tipprennen. Three
  sentences from the learner's own cards, two fixed-pace rivals, case- and
  umlaut-strict. The WPM figure carries its disclaimer on the finish screen rather
  than in a help page. Digraphs (`ae` for `ä`) are accepted, counted, and named at
  the finish as the spelling errors they would be in the exam.
- **Connections · M.** Sixteen tiles, four groups of four. German gives the format
  better categories than English does: four nouns sharing a gender, four verbs
  sharing a separable prefix, four false friends, four in a semantic field — and the
  trap tile that plausibly belongs to two groups is exactly how gender and false
  friends actually bite. *Open question:* whether the groups are generated from the
  corpus (which can guarantee the facts but not that a category is *interesting*) or
  authored. The exercise generator's six-bug run is the argument for authoring the
  categories and generating only the members.
- **Artwork and animation pass · S–M.** *First pass shipped 2026-08-13* — it went
  to the two things DESIGN.md §7 had already reasoned out and marked "not yet
  built" (continuity, and the data-change rule on Today's headline) plus the press
  affordance, rather than to a list of my own. **Still open:** the treemap tile's
  percentage snaps while its colour animates — the remaining half of the
  data-change rule; and `Illustration` exists per sector but appears only in the
  hover card and the list view, so the artwork half of this item is genuinely
  untouched.

**The study loop.**
- **Show the queue shape · S** (#15). A progress rail distinguishing due from fresh
  from drill, so "246 left" becomes a thing with an end you can see.
- **Interleave the drill types visibly · S** (#11). A session can run 20+ flips before
  a drill. Surface the mix ("14 cards · 4 drills") *before* it happens, not only after.
- ~~**Blind spots rank by raw count, not rate · S · P1** (#10).~~ ✅ **Shipped
  2026-08-16.** "Divide by attempts" needed a numerator the app was not recording:
  `logMiss` fired only on failures and the review ledger carries `{id, grade, at}`
  with no tag, so **no attempt count existed anywhere**. New `logAttempt(tag)` at all
  four graded sites (flip drills, grammar exercises, Fundamentals, grammar cards),
  persisted beside the miss log; `missStats` now reports `attempts` and `rate` and
  ranks on rate. Verified live: 70%-of-10 now outranks 20%-of-40, where raw count had
  it the other way round.
  **The care is all in the fallback.** A rate off two attempts is noise, and every
  learner who existed before this has misses with no denominator at all — both keep
  count ordering (`MIN_ATTEMPTS = 6`, `rate: null` meaning *not measured*, never 0%),
  so no existing list reorders until real evidence accumulates. The row shows
  "70% of 10" where measured and "25×" where not, and the bar draws **neutral** for
  unmeasured rows: sized by count on the same red scale, a legacy tag with the largest
  raw count rendered full-width at the *bottom* of a list ordered by rate — caught by
  looking at it rather than at the numbers.
- **The circuit breaker should offer a *softer* item, not just an exit · S** (#18).
  After four misses the kindest move is an easy win, not a door.
- **Undo should be reachable after the card leaves · XS** (#12). *Previous card* exists
  at 43×43 in the chrome; nobody finds it in the half-second they want it. (The undo
  *logic* bug — a rewound review still feeding `reviewedToday()` — is fixed.)
- **Grade from the front face without flipping · XS** (#13). A power user who knows the
  word shouldn't need the flip round-trip.
- **Typed answers need mobile keyboard hints · XS · 📱** (#16). No `autocapitalize`,
  `autocorrect`, `spellcheck` or `enterkeyhint` on the answer input. iOS will
  autocapitalise and autocorrect German, then mark the learner wrong for it. *Fold into
  item 1.*
- **Reduce the session chrome · S.** DESIGN.md promises the session is "full-bleed, no
  chrome at all"; it renders inside a card with a header, a chip, four icon buttons and
  a progress bar. Move flag / sound / undo / skip behind one overflow control. Pairs
  with the reach work in Now #1 and the letterboxing in Now #4.

**Legibility of the machine.**
- **Make the scheduler's reasoning visible from outside a session · S · P1** (#50).
  `WhyThisCard` is the app's genuine moat and its strongest word-of-mouth asset, and it
  is invisible unless you are three cards deep. The single cheapest thing on this list
  that changes how the product is *described*. Confirmed still session-only 2026-08-04.
- **Search across the 128 concepts · S · P1** (#38). No way to find *Konjunktiv* without
  expanding levels and scrolling. Confirmed still absent 2026-08-04.
- **Name the session's best moment on the card, not just the recap · XS** (#46).
  "Comeback of the day" exists and fires where nobody is looking.
- **The recap doesn't celebrate drill work distinctly · XS** (UX-PATHS H2). Flips and
  recall are reported; the interleaved drills — the harder half of the session — are
  folded into the same count. *Folded in from UX-PATHS.md when it was retired 08-13.*
- **The first-run hero doesn't acknowledge a retry · XS** (UX-PATHS S2). Abandoning the
  guided first run mid-placement correctly returns to the hero next launch, but it
  reads as a fresh start rather than "pick up where you left off." *Same source.*
- **Tokenizer: split fused paste artifacts · XS.** Pasted headlines and HTML sometimes
  concatenate two words with no separator ("TriumphBei"). A camelCase-boundary split
  (lower→Upper) is near-zero risk in German, which has no intra-word case transitions —
  and it becomes wrong the moment a second language pair lands, so gate it behind the
  per-language interface rather than hardcoding it. *Rescued from ROADMAP.md when it
  was retired 08-13.*
- **Finishable things · S** (#47). A fully-known sector is finite and earned; DESIGN.md
  §8c calls this out and only the recap ever mentions it.
- **Weekly arc · S** (#48). A seven-day view — words added, retention, the goal line's
  slope. Daily is too granular, "since forever" too coarse.

**Content and pedagogy.**
- **🟠 Separable reflexives now have no drill at all · S.** *Created deliberately
  2026-08-21, by the conj fix — filed rather than left silent.* `conjDrillable` excludes
  reflexives from the conjugation drill, because `conjugate` strips `sich` and the drill
  was printing the bare finite form («fühle» for *sich fühlen*) as the answer. That is
  right, and `ReflexiveItem` is where reflexives belong — except `isReflexive` also
  requires `!c.separable`, so the **nine to eleven separable ones** (`sich vorstellen`,
  `sich ausruhen`, `sich aufregen`, `sich einleben`, `sich einschreiben`, `sich einsetzen`,
  `sich anpassen`, `sich zurechtfinden`, …) fall through both gates. *A card losing
  coverage is a smaller harm than a card teaching wrong German, which is why the trade was
  taken — but it is not nothing.* **Do:** relax `isReflexive`'s `!separable` and teach
  `buildReflexive` the split frame — «ich stelle **mich** vor», «ich ruhe **mich** aus» —
  which is the pronoun *and* the moving prefix in one item, and is arguably the better
  drill than either half. **The conjugator bug below sits underneath it and must be
  fixed first**, or the new drill would teach the wrong forms.
  *M · `src/views/Fundamentals.tsx`, `src/lib/conjugate.ts`.*
- **🔴 The conjugator builds an impossible Partizip II for some prefixed verbs — two
  shipped cards print one as the correct answer · S.** *(2026-08-21.)* `conjugate`
  fails to identify the prefix on certain verbs, returns `separable: null`, and then
  glues `ge-` onto the front of the whole word, where German puts it inside or omits
  it. **Five hand-verified, with five hand-verified controls so this reads as a real
  class and not a broken probe:**

  | verb | conjugator | correct | in the corpus? |
  |---|---|---|---|
  | `auflösen` | **geauflöst** | aufgelöst | ✅ **and conj-eligible today** |
  | `gegenüberstellen` | **gegenüberstellt** | gegenübergestellt | ✅ **and conj-eligible today** |
  | `wohlfühlen` | **gewohlfühlt** | wohlgefühlt | ✅ (reflexive, so no longer drilled) |
  | `aushändigen` | **geaushändigt** | ausgehändigt | not yet — held out of a batch because of this |
  | `überreichen` | **geüberreicht** | überreicht | not yet — same |

  *Controls, all correct:* `abschreiben` → abgeschrieben · `ankommen` → angekommen ·
  `vorbereiten` → vorbereitet · `gehen` → gegangen · `geben` → gegeben. **So it is not
  a blanket failure of prefixed verbs**, which is what makes it worth isolating rather
  than rewriting the engine.

  ⚠️ **The class size is unknown and a regex will not find it.** A prefix-shaped string
  is not a prefix: a check keyed on `/^(ab|an|auf|…)/` flags `antworten`, `teilen`,
  `herrschen`, `einigen`, `beißen` and every verb whose *stem* merely starts with those
  letters, and one keyed on `/^(be|ge|ver|über|…)/` flags `gehen`, `geben`, `gewinnen`.
  Sizing this needs a real morphological source, not string matching — see LESSONS.
  *Do:* fix detection, then re-run the two held-back cards through `authoring:new`.
  *S · `src/lib/conjugate.ts`.*
- **`der Vorsitzender` is a malformed adjectival-noun headword · XS.** *(2026-08-21.)*
  The card is `voc:B1:der Vorsitzender` with `plural: "die Vorsitzende"` — both halves
  inverted. *Vorsitzender* is the strong form used **without** an article (*ein
  Vorsitzender*); with the definite article it is *der Vorsitzende*, and the plural is
  *die Vorsitzenden*. Found because `authoring:new` refused a `der Vorsitzende`
  candidate as a near-duplicate of it. The whole adjectival-noun class deserves one
  pass — `der Bekannte`, `der/die Verwandte`, `der Beamte` share the pattern, and
  `Bekannter` already resolves to the adjective `bekannt` rather than to its own card.
  *XS · `fix-authored.ts` sense row, then check the class.*
- **370 word cards carry an empty `pos` · XS–S.** Invisible today, but it is the same
  latent gap that produced the capitalisation mess: a card with no part of speech
  cannot be classified by any rule, so it silently opts out of the drills, the family
  index and half the validators. *Do:* infer where the article makes it unambiguous, rule
  on the rest by hand as `case-rulings.tsv` does.
- **The remaining C2 stylistic points · S, hand-authored.** Register, ellipsis and
  Ausklammerung were deliberately deferred from the grammar pass as judgement-heavy and
  a poor fit for auto-drilling. *Stilebenen* shipped; the other two have not. (Every
  other gap in the mastery pass now has a point with ≥5 exercises.)
- **C1/C2 register depth · L, human-gated** (#37). Confirmed by the two most credible
  personas. The promise "grows with you A1–C2" thins exactly where it is hardest to keep.
  > **The *exercise* half closed 2026-08-13.** C1 86 → 204 items, C2 70 → 174; both
  > levels now carry a higher minimum per point than A1–B2 do. What remains under this
  > item is **vocabulary and register depth**, not drill volume: 761 word cards across
  > C1+C2, and no collocation or register field on any of them (#45).
- ~~**The thin layer is A1–B2**~~ · ✅ **closed 2026-08-13.** The bank's *means* had
  looked healthy because `corpus:genex` generated 50+ items for 29 derivable points;
  the medians were A2 **8**, B1 **6**, B2 **6**, and **76 of 113 points at A1–B2 held
  fewer than twelve exercises** against zero at C1/C2. All six levels are now clear —
  **0 thin points in the whole syllabus**, minimum 12, bank 5,207 → **6,130**. See the
  CHANGELOG entries of 2026-08-13.
- **Register and collocation on C1+ cards · M** (#45). Synonyms exist but aren't
  differentiated by register, which is most of what C1 vocabulary work *is*.
- ~~**Exam alignment without an exam simulator · M** (#43).~~ **Shipped 2026-08-11** —
  and it turned out to want the simulator after all. `#/exam` is a full telc Deutsch
  B1 paper in telc's own format and weighting, with the oral rehearsed against model
  answers at A2/B1/B2. See the CHANGELOG entry. *Still open under it:* the weakest-part
  readout on the result screen is per **subtest**, not per grammar concept — "your
  weakest area for B1 is Kasus" needs the miss log joined to the paper's items, which
  wants item-level grammar tags the paper does not yet carry. *S, and worth doing.*
- ~~**More papers · M each, authoring not building.**~~ **Shipped 2026-08-12** — all six
  levels now have a paper: telc B1, Goethe A1, A2, B2, C1 and C2. The prediction that
  they would only need the German was half right; each one also found something the
  engine had hard-coded from telc, and the last two found four scoring bugs. See the
  CHANGELOG entries for 08-11 and 08-12. *Still open under it:* Goethe's own **B1**
  differs from telc's in format and would be a second `provider` at the same level —
  the first case the paper registry has of two papers competing for one CEFR row, and
  the level picker currently assumes at most one full paper per level. *S.*
- **Second papers per level · M each** — every level ships exactly one, so a learner who
  sits it has spent it. The engine takes a second without changes (`PAPERS` is a list
  and `loadPaper` is keyed by id); what is missing is the German and a UI that offers a
  choice rather than a single card. Worth doing for B1 and B2 first, where people
  actually resit.
- **Heritage / uneven-profile learners · M** (#41). Placement assumes ignorance is
  uniform. Yusuf tests C1 on vocabulary and B1 on orthography and the app has one number
  for him. Skill-scoped drills rather than level-gated ones.
- **A maintenance mode for the arrived · S** (#42). At C2 the value inverts: low-volume,
  high-interval, rare vocabulary. FSRS is already excellent at this; the app never
  offers it as a shape.
- **Textbook-chapter decks · M** (#44). Netzwerk, Menschen, Schritte, Begegnungen.
  Becomes cheap once the comprehension meter lands — paste the chapter.
- **Discourse-level cloze · S–M.** Gaps are single words in single sentences; B2 needs a
  paragraph with the connectors removed. Blocked on having paragraphs — Lesen ships
  sentences — so it needs a short authored text set, or Now #2 Phase 2.
- **Reading-first mode above B2 · M.** Lesen exists; this is the surface around it —
  fewer numbers, longer texts, marginal glosses.
- **Listening, phase 2 · M — and phase 1 is thinner than it sounds.** Phase 1 shipped the
  licensing/fetch/cache layer and made the example
  audible. Phase 2 is the *mode*: a listen-first card where the prompt is the sound.

**Platform and reach.**
- **`ID_MAP` is on the boot path and grows without bound · XS–S.** Noticed
  2026-08-11: the two corpus passes that day took it from 159 entries to 920, and
  the main JS bundle from 694 KB to 719 KB — it is imported by `store.ts`, so every
  learner downloads every id the corpus has ever retired, forever. It is also
  append-only by design (that is what makes a schedule survive), so this only goes
  one way. *Do:* move it to a fetched JSON beside `freq.json`, or compact it once
  the app can be sure no live device still holds a pre-compaction schedule — which
  needs a stored schema version, so probably the former.

- **Performance budget · M · P2** (#49). `vocab.json` is ~5MB and the build warns above
  500kB (currently 630kB JS). Awwwards jurors test on real devices; so do learners on
  3G. Split the corpus by level and fetch on demand.
- **Storage durability re-check on iOS · S · 📱** (#36). `navigator.storage.persist()`
  ships; nobody has confirmed it survives 7 days of ITP on a real iPhone. The failure
  mode is total, silent data loss. *Fold into item 1.*
- **Web Push for installed PWAs · M** (#34). The deliberate day-2 return mechanism,
  still undecided. A local notification from the existing reminder watch is the
  serverless version.
- **Home-screen widget / Live Activity · M · 📱** (#35). "3 due" on the lock screen is
  the highest-leverage retention surface a local-first app can own without a backend.
- **Share and arrival readiness · S each.** The OG image still points at
  `/icon-512.png` with `twitter:card: summary`, so a shared link unfurls as a small
  square: render a real 1200×630 hero (reuse the canvas in `lib/sharecard.ts`) and
  switch to `summary_large_image`. Add a first-visit landing for link arrivals.
- **Illustration artwork — match the reference style · M.** The curated line-art layer
  that replaced emojis (`lib/illustration.tsx`, 54 concepts + a group-emblem fallback)
  is a solid first pass that does not match the intended look, and is **disabled**
  behind `SHOW_ILLUSTRATIONS = false`. ⚠️ The reference screenshots live in the
  gitignored `reference/` folder on the maintainer's machine — **pin the target style
  somewhere durable before starting, or this item cannot be picked up by anyone else.**

**Validation.**
- **Run the *real* friend session · S.** The flagged-cards list, typo tolerance and the
  day-2 habit anchor all shipped; what no simulation supplies is a person. *Do:* sit a
  real beginner down with it and record what the twelve personas got wrong. **That delta
  is the deliverable**, not the session notes. Every finding in this file above the
  "real-device" line came from a simulation or a DOM audit; none came from a learner.

---

## Later / needs a decision before it can be built

- **Extended production · L, part research** (#40, Swain). Diktat is the only writing,
  and it works *because* the target is known to the character. Free composition cannot
  be graded honestly without a model, and a drill that marks correct German wrong is
  worse than no drill. Decide the shape before building anything. Overlaps Now #2
  Phase 3, which is the narrow, deterministic version.
- **Billing / €5 supporter tier.** No infra; the Support link (→ GitHub) and any Pro
  gating wait on this. ⚠️ The freemium split this used to depend on lived in
  ROADMAP.md, retired 2026-08-13 because its two headline paid features (the AI tutor
  and the mining flow) were cut or re-scoped — so a tier has to be re-derived from what
  the app actually is now, not recovered. See [VISION.md](VISION.md) § open decisions.
- **B2B / Sprachschule.** Sequenced deliberately **after** consumer
  (COMPETITIVE-RESEARCH §5–6). Most of [SCHOOL-PITCH.md](SCHOOL-PITCH.md)'s gap list
  isn't built.

---

## Decisions required — not build items

- ~~**Commit out loud to "English-base learners"**~~ — **settled 2026-07-27.** Lexi is
  English-base, said out loud in the root README and the first-run hero. The German
  definition layer (`defDe`, shown from B2) is the deliberate exception, gated on the
  *learner's* level rather than the card's, and `showsGermanDefs` exists so the rule is
  testable on its own.
- ~~**The name and the aesthetic**~~ — **settled 2026-07-28.** The terminal was retired
  for the Atlas; the fintech reading goes with it. See [DESIGN.md §1](DESIGN.md).
- **Bundled reading content.** Open. Phase 2 of the meter wants a feed, and the obvious
  fit (DW's *Langsam gesprochene Nachrichten*) is not automatically redistributable.
  Decide whether Lexi ever ships someone else's text, or stays strictly
  learner-supplied. The Tatoeba audio allow-list is the precedent for doing it properly.

---

## Parked decisions — revisit deliberately, don't drift into

- ~~**Paper card faces.**~~ **Closed 2026-07-26: tried, and reverted.** Shipped
  2026-07-25 scoped to the flip faces and the two exercise surfaces; removed a day
  later, for two measurable reasons. `.paper` was authored as a *standalone whole-app
  theme*, so nesting it nested its accent — the brand hue swung 189° → 36° and every
  accented element inside a card inverted cyan→brown on entry. And it worked in one
  theme only: the cream card scored 18.4 contrast against the dark room and **1.07**
  against the light one, where it read as a stain rather than an object. The card is now
  distinguished by **material** inside one unchanging palette. The rule it produced — *a
  nested scope may change ground and ink, never the brand hue* — is in
  [DESIGN.md](DESIGN.md).
- **AI tutor.** Cut, and cut *on the record* rather than by omission: the
  conversation-app camp is commoditizing, needs a backend and keys, and breaks the
  DSGVO-by-architecture story that is Lexi's best B2B asset. `lib/ai.ts` and the
  OpenAI-compatible client stay for **build-time corpus enrichment**
  (`scripts/corpus/enrich-llm.ts`). The in-app "AI provider" widget is gone; its
  `store.ts` accessors (`aiConfig` / `setAiConfig` / `apiKey` / `setApiKey`) linger
  unused and can be deleted once a tutor is definitively off the table.
- **The Reader/Mine flow.** Un-parked 2026-07-27 and re-scoped as Now #2; see there.

---

*Maintenance: when an item ships, move it to [CHANGELOG.md](CHANGELOG.md) with the
reasoning intact — this file holds only what is still open.*
