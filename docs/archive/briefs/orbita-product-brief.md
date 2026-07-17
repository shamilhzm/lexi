# Orbita — Product Requirements Brief

A cross-platform mobile language-learning app that teaches **vocabulary and grammar together** across the full CEFR range (A1–C2), wrapped in a space-exploration progression: master concepts → earn ship parts → unlock the next galaxy.

This brief is the build spec. A companion `orbita-style-brief.md` defines the visual system; screen and component names here map directly to it.

---

## Recommended stack (advisory — swap if you prefer)

- **Expo + React Native + TypeScript.** One codebase, iOS + Android.
- **State:** Zustand. **Data/offline:** SQLite via `expo-sqlite` with Drizzle ORM. The app must work fully offline once content is downloaded; learning data is local-first and syncs opportunistically.
- **Scheduling:** `ts-fsrs` (FSRS spaced-repetition algorithm). Do **not** hand-roll an SRS.
- **Motion:** `react-native-reanimated` v3 + `moti` for UI; **`@shopify/react-native-skia`** for the galaxy map and starfield (custom canvas, performance-critical).
- **Audio:** `expo-av`. Pronunciation is server-generated TTS cached on device (see Open Decisions).
- **Auth/sync (post-MVP):** any managed backend (Supabase fits the local-first model).

---

## Goals

1. Teach grammar with the same rigor and polish vocabulary apps already give words.
2. One unified daily practice loop that interleaves words **and** grammar, scheduled by recall strength.
3. A progression system (ship + galaxies) that makes daily review feel like advancement, not a streak to defend.
4. Fully usable offline; fast; works on a mid-range phone.

## Non-goals (MVP)

Speech recognition / pronunciation scoring; live tutors or chat; social feed / friends; user-generated public decks; web app. Single launch language: **German** (architecture must be language-agnostic, but only German content ships first).

---

## Domain model

The learnable unit is a polymorphic **Concept**.

- **Concept** — `id, type ('word' | 'grammar'), cefr (A1…C2), starSystemId, title, prerequisites: ConceptId[]`
- **Word** (extends Concept) — `lemma, partOfSpeech, gender/article (der/die/das | null), ipa, translations: string[], exampleSentences: {text, translation}[], imageUrl, audioUrl, synonyms[], antonyms[], collocations[]` (mirrors the rich word card: headword, IPA, translations, definition, example, synonyms/antonyms/collocations, illustration).
- **GrammarPoint** (extends Concept) — `summary (one-line), ruleMarkdown (the plain-language explanation), exampleSentences[], exerciseTemplates: ExerciseTemplate[]`. Grammar points carry no illustration; they carry a rule and exercises.
- **ExerciseTemplate** — `kind (see catalog below), prompt, payload (kind-specific JSON), answer, distractors[]`
- **StarSystem** — a topic cluster (e.g. "Articles & gender", "Present tense of sein/haben", "Basic time"). `id, galaxyCefr, title, blurb, conceptIds[], orderIndex`. Completing a system = mastering its concepts to threshold; each completed system awards one **ship part**.
- **Galaxy** — one per CEFR level (A1…C2). `cefr, title, starSystemIds[], requiredPartsToWarp`. Assembling all of a galaxy's parts unlocks warp to the next galaxy and upgrades the ship to the next visual tier.
- **ReviewState** — per `(userId, conceptId)`: full FSRS state (`stability, difficulty, due, lastReview, state: new|learning|review|relearning, reps, lapses`).
- **UserProgress** — `currentGalaxy, unlockedGalaxies[], partsEarned: {galaxyCefr: count}, shipTier, cosmetics, placementResult`.

---

## Content: words vs. grammar

**Words** behave like a best-in-class flashcard app (recognition, production, listening, matching, typing).

**Grammar is the differentiator.** A GrammarPoint opens to a **rule card** (markdown explanation + worked example sentences, with audio and an inline translate toggle), then drills the learner through interactive exercises drawn from its templates. Both words and grammar flow through the **same** scheduler and the same session.

### Exercise type catalog (build each as a self-contained widget)

Vocabulary:
1. **Recognition** — show target-language card, reveal translation.
2. **Production** — show native prompt, recall target term.
3. **Listening** — play audio, identify the word.
4. **Match grid** — tap-to-pair target ↔ native (5–6 pairs; correct pair turns green and locks).
5. **Multiple choice (translation)** — 1 of 4.
6. **Multiple choice (term)** — 1 of 4.
7. **Type the term** — free text with diacritic-tolerant grading (`ß/ss`, `ä/ae` accepted; near-miss feedback).

Grammar:
8. **Rule card** — read explanation + examples (a "teach" step, not graded).
9. **Cloze / fill-in-the-blank** — choose or type the correct form in a sentence.
10. **Conjugation drill** — given infinitive + person + tense, produce the form.
11. **Case / article selection** — pick der/die/das, den/dem/des, or preposition+case.
12. **Sentence builder (word order)** — drag word tiles into the correct order (must handle German V2 and verb-final subordinate clauses).
13. **Transformation** — present→past, statement→question, singular→plural, active→passive.
14. **Error correction** — tap the wrong word, supply the fix.
15. **Multiple-choice grammar** — pick the grammatically correct option.

Grading returns a 4-point recall grade (`Again / Hard / Good / Easy`) that feeds FSRS — for binary widgets, map correct→Good, incorrect→Again, with Hard/Easy surfaced where a self-rating UI is appropriate (rule cards, typed answers).

---

## Learning engine

- **Scheduler:** FSRS via `ts-fsrs`. Every Concept (word or grammar) has one ReviewState.
- **Orbital-decay framing (presentation only, do not change the math):** mastered concepts visually "drift" on the map as they approach `due`; a review "re-stabilizes the orbit." A concept past due is "decaying" (signal coral). This is a skin over FSRS due dates.
- **Daily session composition:** interleave **due reviews** with **new concepts** from unlocked-but-incomplete star systems. Default cap **20 items/session** (tunable). New items are gated by prerequisites (don't introduce a grammar point before its prerequisite concepts have entered review). Reviews always take priority over new when the cap binds.
- **Mastery threshold (per concept):** FSRS `stability ≥ 21 days` AND `reps ≥ 3` (tunable). **System complete** when ≥ 90% of its concepts are mastered.
- **Session UX:** progress bar (e.g. `8/52`), per-card audio, undo last answer, end-of-session summary (new learned, reviewed, stabilized, decaying).

---

## Progression system

- **Placement flight:** a short adaptive quiz (~10–15 items, escalating CEFR) on first launch that sets `currentGalaxy` and seeds ReviewState for items the learner already knows. Skippable → defaults to A1.
- **Galaxies = CEFR levels** (A1, A2, B1, B2, C1, C2). The learner sees a **galaxy map** (see style brief): the current galaxy's star systems orbit a central star; locked galaxies are visible but dimmed/distant.
- **Star systems = topic clusters.** Mastering a system awards **one ship part**.
- **Ship + parts:** each galaxy defines `requiredPartsToWarp` (= number of star systems in it). Earn all parts → **warp** unlocks → travel to next galaxy → ship visually upgrades to the next tier. Parts are both functional (warp gate) and cosmetic (the ship visibly grows).
- **No punitive streaks.** Surface "concepts decaying" gently as a nudge, never a guilt mechanic (see wellbeing-friendly framing in style brief: decay is correctable, not failure).

Recommended A1 seed (tunable): ~8–10 star systems (e.g. Greetings & farewells, First words, Numbers, Basic time, Articles & gender, sein/haben present, Regular present tense, Personal pronouns, W-questions, Negation). Each system ~12–25 concepts mixing words and grammar.

---

## Screens & information architecture

Bottom tab bar (5): **Map · Practice · Add · Explore · Profile**.

1. **Galaxy Map (home)** — the spatial progression view; central star + orbiting star systems for the current galaxy; tap a system → system detail; warp affordance when unlocked; ship visible. Replaces a generic dashboard. (Conceptual successor to the radial CEFR map.)
2. **System Detail** — system blurb, concept list (words + grammar, with mastery state), "Start session" CTA.
3. **Learning Session** — full-screen card/exercise flow rendering the 15 widget types; progress bar; audio; undo; summary.
4. **Concept Detail** — word: full entry (IPA, translations, definition, example, synonyms/antonyms/collocations, illustration, audio, learning stats). Grammar: rule card + examples + "practice this" + stats.
5. **Hangar / Ship** — view the ship, parts earned, parts remaining to next warp; tap a part to see which system earned it. The reward gallery.
6. **Explore / Catalog** — browse all star systems and galaxies; Word of the Day; jump into any unlocked content. Search by term (target or native).
7. **Add Term** — user adds a custom concept (word) into a personal system; auto-fetch translation/IPA/example/illustration where possible (flag AI-generated content; see Open Decisions).
8. **Profile / Settings** — language, daily goal, session size, learning-card-type toggles (which exercise kinds may appear, per the vocab/grammar catalog), audio on/off, reduce-motion, theme, account.

---

## MVP scope & acceptance criteria

**P0 — must ship**
- Offline German content for the full A1 galaxy (all star systems, words + grammar with rule cards and exercises).
- FSRS scheduling; daily interleaved session; mastery + system-completion logic.
- All 15 exercise widgets functional and graded.
- Galaxy map for A1 with orbiting systems; system detail; concept detail.
- Ship + parts: earn a part on system completion; warp to A2 when A1 complete (A2 may ship as a stub galaxy initially).
- Placement flight.
- Settings with exercise-type toggles, audio, reduce-motion, theme.
- Acceptance: a new user can complete placement, run a daily session mixing new + due items, see a concept move new→learning→review, complete a star system, watch a ship part get awarded, and have all of it persist across an app restart with no network.

**P1**
- Full A2–B1 content. Word of the Day. Custom term add. End-of-session summary stats. Audio for all concepts. Warp animation + level-up celebration polished.

**P2 / later**
- B2–C2 content. Account + cloud sync. Additional languages. Pronunciation practice. Public/shared decks.

---

## Out of scope (restate to prevent creep)
Speech scoring, multiplayer/social, web client, in-app store, non-German content at launch.

## Open decisions (need a call before/early in build)
1. **TTS source** — provider TTS at build time baked into content packs, vs. on-device TTS, vs. runtime API. Affects offline behavior and cost. *Recommendation: pre-generate audio into content packs.*
2. **Illustrations** — AI-generated per-word art (as in current reference apps) is content-pack heavy. Decide art pipeline + the "translations/images are AI-generated, report-error coming" disclaimer placement.
3. **Content authoring** — how A1–C2 content is authored/QA'd (CEFR alignment is the product's credibility). Likely a separate content pipeline, not in-app.
4. **Monetization** — free A1–A2, paid B1–C2 + unlimited sessions is the assumed model; confirm before gating logic is built.
5. **Gamification tuning** — confirm session cap (20), mastery threshold (stability ≥ 21d, reps ≥ 3), and parts-per-galaxy = systems-per-galaxy.
