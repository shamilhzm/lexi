# Lexi — Product Roadmap & Freemium Strategy

*Written from the seat of the product owner: what turns a clever demo into something a
learner happily pays €5 to support.*

---

## The bet

Lexi already has two things most language apps never earn: **a striking first impression**
(the dictionary-market treemap is unlike anything in the category) and **a serious corpus**
(5,213 A1–C2 cards with real FSRS scheduling). That combination earns *attention*. To earn
*money*, every feature below converts that attention into a felt sense of progress toward a
real goal — passing a Goethe/telc exam, holding a conversation, reading a novel.

**Monetization model: open-core + supporter.** The core app stays free and open-source
forever (this is the trust anchor, and it's the right thing to do). **Lexi Pro** is a €5/month
"supporter" tier — framed as *funding the project*, not unlocking a paywalled hostage. Pay-what-
you-want above €5, free for students and anyone who genuinely can't pay. People don't pay €5 to
remove a limit; they pay €5 when an app has *already changed their week* and asking for support
feels fair. The features below are sequenced to create that "already changed my week" moment as
early as possible.

> Rule of thumb used throughout: **Free must be genuinely great** (so people evangelize), and
> **Pro must feel like a personal tutor** (so people pay).

---

## The 10 features that make people pay

### 1. AI tutor for speaking & writing  ⭐ *the flagship*
Speak or type a response to a prompt ("Beschreibe deinen Arbeitsweg"); get instant, CEFR-rated
feedback — corrections, why it's wrong, and a more natural phrasing — plus a follow-up question
so it becomes a *conversation*.
**Why it wows:** this is the thing learners can't get from flashcards or from a textbook, and the
single most "worth paying for" capability in language learning. It's the difference between
*studying* German and *using* it.
**Tier:** 3 free exchanges/day · unlimited + voice in Pro.

### 2. Sentence mining — *your* German, not ours
Paste any article, song lyric, YouTube subtitle, or PDF. Lexi finds the words you don't know
yet, auto-enriches them (article, plural, IPA, gloss, example), tags them to the right sector
and CEFR level, and drops them straight into your review queue.
**Why it wows:** it turns Lexi from "someone's word list" into *the learner's own lexicon*,
built from the content they actually care about. This is the strongest retention and
word-of-mouth driver in the whole roadmap.
**Tier:** 20 mined words/month free · unlimited + share-sheet/browser import in Pro.

### 3. Exam mode — Goethe / telc / TestDaF simulator
Pick your target certificate and date. Lexi runs timed, calibrated mock sections across all four
skills, scores them, and shows a **readiness gauge** ("B1 readiness: 78% — weakest: Konjunktiv II").
**Why it wows:** most paying learners have a *deadline and a fee at stake* (a Goethe exam costs
€150–290). An app that credibly predicts "you're ready" is worth far more than €5 to them.
**Tier:** one practice section free · full simulator + predicted score in Pro.

### 4. The daily briefing — "markets open"
A one-tap daily session auto-assembled from what's due (FSRS), your weakest sectors, and a
streak-safe minimum — with smart **push reminders** (the PWA already supports this) and an
optional exam-countdown that back-plans your workload.
**Why it wows:** removes the "what should I study today?" decision that kills habits. It makes
Lexi the app you open *first*, every morning, on the train.
**Tier:** manual daily session free · adaptive plan, reminders & exam back-planning in Pro.

### 5. Speak it back — pronunciation & shadowing
Beyond today's text-to-speech: native-quality neural voices, slow-motion replay, minimal-pair
drills (*Kiste/Küste*), and a **shadowing mode** where you record yourself and see your waveform
against the model.
**Why it wows:** pronunciation is where self-learners feel most insecure and most underserved.
Hearing measurable improvement is deeply motivating — and very shareable.
**Tier:** standard TTS free · neural voices + shadowing/scoring in Pro.

### 6. Grammar gym — interactive drills
Lexi already carries 76 grammar points; turn each into interactive exercises (cloze, case &
article, sentence builder, error-spotting) and **auto-trigger remediation** when you keep missing
a word's gender or a verb's case.
**Why it wows:** vocabulary without grammar plateaus fast at B1→B2. Drills that target *your*
specific mistakes feel like a tutor who's paying attention.
**Tier:** core drills free · adaptive remediation + full B2–C2 bank in Pro.

### 7. Conjugation & declension trainer
A dedicated paradigm trainer: verb tenses (the data already has conjugations), noun plurals,
adjective endings, and the full case table — each drilled on its own SRS track, with an
**irregular-verb bootcamp**.
**Why it wows:** these are the exact mechanical skills exams test and conversations expose. A
focused, gamified trainer here is a concrete, demonstrable competence gain.
**Tier:** present tense + top verbs free · all tenses, declensions & bootcamp in Pro.

### 8. Progress analytics & forecasting
A real dashboard on top of the market: retention curves, words/day, sector heat over time, and a
**forecast** — "at your current pace you'll reach B2 around 14 March." Plus a weekly recap.
**Why it wows:** the market view already hints at this; making progress *legible and predictive*
is intrinsically motivating and gives the supporter tier a tangible "look how far I've come."
**Tier:** current stats free · trends, forecasting & weekly email recap in Pro.

### 9. Memory boosters — mnemonics, images & word families
Each card gains a memory image, collocations, a word-family map (already partly in the Word Map),
and **AI-generated mnemonics personalized to your interests** ("der/die/das" hooks, vivid stories).
**Why it wows:** the difference between rote and *sticky*. Personalized mnemonics are a small
delight that compounds — and a clean, defensible Pro perk.
**Tier:** examples & word families free · personalized mnemonics & images in Pro.

### 10. Your lexicon, everywhere — sync & shareable decks
Local-first stays free. Pro adds **encrypted cross-device sync**, backup/restore, and the ability
to **publish and subscribe to community decks** ("B1 medical German", "Berlin slang").
**Why it wows:** peace of mind (never lose your streak/cards) plus a network effect — shared decks
make Lexi better the more people use it, and give supporters a way to contribute, not just consume.
**Tier:** single-device + export free · sync, backup & community decks in Pro.

---

## How free and Pro split

| | **Free (forever)** | **Lexi Pro — €5/mo, PWYW, free if you need it** |
|---|---|---|
| Full A1–C2 lexicon & market | ✅ | ✅ |
| FSRS review, decks, word map | ✅ | ✅ |
| Offline PWA, TTS, daily session | ✅ | ✅ |
| AI speaking/writing tutor | 3/day | Unlimited + voice |
| Sentence mining | 20/mo | Unlimited + import tools |
| Exam simulator | 1 section | Full + predicted score |
| Adaptive plan, reminders, analytics, sync | — | ✅ |

---

## Sequencing (impact × effort)

**Ship first — the "changed my week" trio**
1. **Daily briefing (#4)** — cheap, habit-forming, makes everything else stickier. Mostly built.
2. **Sentence mining (#2)** — the single biggest differentiator and retention driver.
3. **Grammar gym (#7) + conjugation trainer (#7)** — reuses data you already have; fast to ship.

**Then the paywall-justifiers**
4. **AI tutor (#1)** and **exam mode (#3)** — the two features people will actually open their
   wallet for. Higher effort (LLM + scoring), highest willingness-to-pay.

**Then the delight & moat**
5. **Analytics/forecasting (#8)**, **pronunciation/shadowing (#5)**, **mnemonics (#9)**,
   **sync & community decks (#10)** — deepen retention and create a network effect.

**The conversion moment to engineer:** a learner mines a German article they care about (#2),
studies it in their morning briefing (#4), and a week later sees the forecast say "B2 by March"
(#8). *That's* when the "Support Lexi — €5" prompt lands, and it feels like gratitude, not a toll.

---

*Lexi stays free and open-source at its core. Pro funds the servers, the voices, and the time —
so the free tier can keep getting better for everyone.*
