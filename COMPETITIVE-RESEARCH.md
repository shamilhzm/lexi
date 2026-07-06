# Competitive Research — ideas for Lexi (July 2026)

Lexi already has a strong, unusual core: FSRS scheduling (`ts-fsrs`), a unified session that
interleaves flip cards with gender/plural/conjugation/cloze drills, word **mining** from pasted
German, an AI tutor (speaking + writing with CEFR feedback), semantic maps, a market/treemap
"Explore" metaphor, a placement test that seeds known words, and a local-first, open-source,
terminal aesthetic. This note surveys the apps closest to what Lexi does and pulls out the ideas
worth borrowing — filtered through Lexi's identity, not copied wholesale.

---

## What the neighbours do well

**Anki + FSRS.** The same algorithm family Lexi already uses. Its headline power feature is a
user-set **desired retention** target (0.90 is the accepted sweet spot): dial it and FSRS trades
review volume against how much you remember, along an "efficiency frontier" where higher retention
costs exponentially more reviews. FSRS also handles long gaps gracefully and avoids SM-2's "ease
hell." Anki now exposes per-deck retention and workload/retention graphs.

**LingQ + Migaku.** The immersion/mining camp. You **import any content** — articles, ebooks,
YouTube/Netflix subtitles, webpages — and read it in an interactive reader where **known words are
colour-coded** (unknown = blue, known = white) and every unknown word is one tap from a definition
and a saved vocab item ("LingQ"). They surface a **known-word count** and the **% of unknown words
per text** so you can pick material at the right level. Migaku adds one-click card creation with
audio/image and click-a-word-to-hear-it.

**Clozemaster.** Vocabulary **in context via cloze** (fill-the-blank in real sentences), ordered by
**word frequency**, answered by multiple choice or typing, wrapped in light points/scoring. The
thesis: mass exposure to words inside sentences beats isolated flashcards.

**Lingvist.** An adaptive engine whose standout is the **Knowledge Mapping Engine**: during
placement it predicts which words you already know (reportedly ~90% accurate) and **switches those
off**, so you only spend time on genuinely new vocabulary. New words appear frequently, mastered
ones stretch out.

**Seedlang** (German-specific, the closest peer). **Video-clip flashcards** of native speakers
saying real sentences, with **fully interactive translations** — click any word in a sentence and
get its translation *plus* the relevant grammar (gender, plural, case). Each card has a discussion
thread; a Patreon-backed community and monthly meetups sit underneath.

**Memrise / Duolingo.** The motivation and immersion layer. Memrise leans on **native-speaker video
clips** and a subtle "garden" growth metaphor; Duolingo on **XP, leagues, and streaks**. Both added
**AI conversation practice** (scenario chatbots — order coffee, ask directions) in 2025. Memrise's
current model is "Learn → Immerse → Communicate."

---

## Ideas Lexi can benefit from (prioritized)

1. **Desired-retention control (from Anki/FSRS).** Lexi already runs `ts-fsrs`; expose a retention
   target in Settings (e.g. 85 / 90 / 95%) with a one-line workload hint ("~X reviews/day"). Nearly
   free to build, genuinely useful, and perfectly on-brand for the terminal/power-user identity —
   this is the single highest leverage-to-effort idea here.

2. **A reader with known-word colour-coding + tap-to-mine (from LingQ/Migaku).** Lexi already mines
   pasted text; the missing half is *reading* it back. Render mined/imported text with words tinted
   by FSRS status (new / learning / known), each tappable for gloss + gender/plural and one-tap
   "add to deck." This directly reinforces Lexi's headline **Known** metric and turns Mining from a
   one-shot import into a place you return to.

3. **Interactive example sentences on cards (from Seedlang).** Card backs already show example
   sentences. Make the words in them tappable → quick gloss + gender/plural/case, and "mine this
   word." Small, high-delight, and reuses the mining + word-data you already have.

4. **Frequency-aware new-card ordering (from Clozemaster/Lingvist).** `firstRunIds` currently sorts
   new cards by CEFR band; add word-frequency as a secondary sort so the *most useful* words in a
   band surface first. Cheap if a frequency signal exists in the data (or can be approximated).

5. **Tutor scenario presets (from Memrise/Duolingo AI).** The AI tutor exists; add a small menu of
   role-play scenarios (Bürgeramt, café, apartment viewing, small talk) as seeded prompts. Cheap,
   and it makes an existing feature far more discoverable and sticky.

6. **Placement that pre-seeds *likely*-known words (from Lingvist's KME).** Placement already seeds
   words you recognise; a lighter version could also pre-mark high-frequency words below your level
   as known, so the market reflects reality faster without testing every one.

7. **Example-sentence audio (from Seedlang/Memrise).** Lexi has TTS (incl. Piper HD). A "listen to
   the sentence" affordance on the card back adds listening practice at near-zero content cost
   (native video is the premium version, but out of scope for an open-source tool).

---

## What to avoid (identity guardrails)

Duolingo-style **social leagues and aggressive streak-shaming** would fight Lexi's calm,
professional terminal identity. Lexi's own metaphors already cover motivation more distinctively:
the **market/treemap** as a progress portfolio, the **Known** headline number, and the new
**milestone moments** in the recap. Keep motivation intrinsic and personal (goals, the exam
countdown, "Known added this week") rather than competitive. Native-speaker *video* is where the
paid apps out-spend an open-source project — lean on TTS + interactivity instead of trying to match
their content libraries.

**Suggested next build:** #1 (desired-retention control) as a quick win, then #2 (the reader) as the
next flagship feature — it's the natural evolution of Mining and the biggest differentiator against
everyone except LingQ.

---

## Sources

- Seedlang review — [YourDailyGerman](https://yourdailygerman.com/seedlang-review-great/), [FluentU](https://www.fluentu.com/blog/german/best-apps-for-learning-german/)
- Clozemaster — [clozemaster.com](https://www.clozemaster.com/), [Cloze tests & SRS](https://www.clozemaster.com/blog/cloze-tests-spaced-repetition-faster-language-learning/)
- LingQ — [LingQ review](https://www.lingq.com/blog/lingq-review/), [alllanguageresources](https://www.alllanguageresources.com/lingq-review/)
- Lingvist — [Course Wizard / KME](https://lingvist.com/blog/how-to-memorize-vocabulary-fast-with-course-wizard/), [spaced repetition](https://lingvist.com/blog/spaced-repetition-in-learning/)
- Anki FSRS — [FSRS explained](https://studycardsai.com/blog/anki-fsrs-algorithm), [Optimal retention (wiki)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-optimal-retention)
- Memrise vs Duolingo (2026) — [univext](https://univext.com/en/blog/367/duolingo-vs-memrise-2026), [enighub](https://enighub.com/memrise-vs-duolingo/)
- Migaku / sentence mining — [Migaku sentence-mining guide](https://migaku.com/blog/language-fun/sentence-mining-guide-learn-vocabulary-faster), [BritVSJapan](https://www.britvsjapan.com/sentence-mining-languages-with-migaku-and-anki-full-guide-to-migaku/)
