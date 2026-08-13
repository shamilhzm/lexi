# Competitive position — July 2026

*Supersedes the July 2026 first pass, which surveyed the neighbours but graded Lexi
against a feature list that no longer describes it (it credited an AI tutor, a mining
flow and a Wortkarte that were cut or demoted in the July prune). This version is
reconciled against `src/` at commit `7146bc7` and against what the market actually
looks like now.*

> **Scope note, 2026-08-13.** The **decisions** this document reached (English-base,
> consumer-before-schools, the meter as additive, the refusals) now live in
> [VISION.md](VISION.md), which is the anchor. They are left in place below with their
> arguments intact, because the argument is the valuable part and a decision without its
> reasoning gets re-litigated — but **VISION is authoritative if the two ever diverge.**
> What this file uniquely holds is the *market survey* and its sources.
>
> Card counts below are the July figures and were correct then; the corpus is **6,581
> cards** as of 2026-08-13 after the duplicate merge. Per [LESSONS.md](LESSONS.md)
> Class 1, measure before quoting.

**The argument in one paragraph.** Lexi has quietly built the expensive half of a
product nobody in the category has shipped: an honest, per-lemma, forgetting-aware
model of what one learner knows. It currently spends that model on measuring itself.
The most robust finding in reading-based SLA — the 95–98% lexical coverage threshold —
is a function of exactly that model, and every tool that sells against it today
approximates it badly. Pointing Lexi's knowledge model at real text is not a pivot away
from what Lexi is; it is the only thing that makes what Lexi already is *matter*.

---

## 1. The field, sorted by what they actually sell

Four camps. They rarely compete with each other, which is why "best app" listicles are
useless — they're comparing different products.

### Curriculum + habit — Duolingo, Babbel, Busuu, Memrise, Seedlang

**Selling:** a path, and a reason to open the app. Duolingo runs 56.5M DAU, 12.5M paid
subscribers, $292M in Q1 2026 revenue, and published **20,500 course units in one
quarter** using AI. This is a content budget no solo product will ever approach.

**But the category leader is visibly straining.** DAU growth decelerated from 49% to
21% year-over-year; the stock is ~80% off its May 2025 peak. The April 2025 "AI-first"
memo produced a backlash severe enough that paying users described the lessons as "AI
slop," deleted year-long streaks in protest, and the company wiped its social presence
and reversed the strategy within weeks — then reversed the reversal's framing again in
April 2026. The lesson is not "AI bad." It is that **the marginal generated unit stopped
carrying credibility**, and the audience noticed faster than the company did.

**The structural weakness, across all of them:** they plateau. This is the single most
consistent complaint in the entire category — the beginner material is excellent, the
intermediate material is a cliff, and nothing in the product model helps you cross it.
The learner has also never owned anything: after two years of Duolingo you have a
streak, not a lexicon.

Seedlang is the closest German-specific peer and the best of this camp: native-speaker
video-clip flashcards, fully interactive translations (tap any word for gloss *plus* its
gender/plural/case), a discussion thread per card, and the *Easy German* YouTube
audience underneath it. It works best from A2 up. Its moat is filmed content — the exact
axis Lexi should never contest.

### Immersion & mining — LingQ, Migaku, Readlang, Language Reactor, Trancy

**Selling:** your own content, plus a dictionary, plus a counter. LingQ ~$13.99/mo,
40+ languages, one polished app, dated interface. Migaku ~$5/mo per add-on, deep Anki
integration, Netflix/YouTube/manga mining, steep setup.

This camp has **the right pedagogy** — comprehensible input is not controversial — and
**two structural flaws Lexi can exploit directly:**

1. **The headline metric is knowingly false.** LingQ counts word *forms*, so "man,
   man's, men" is three known words and "I, me, mine" is three more. Their own staff
   defended it by comparing the counter to *"the mechanical rabbit at a dog race"* —
   not a real rabbit, but the dogs run. It is a motivational instrument dressed as a
   measurement, and its users argue about it constantly in LingQ's own forums.
2. **There is no pedagogy underneath.** They hand you a text and get out of the way.
   No scheduler making decisions, no grammar remediation, no notice that you keep
   missing the dative. Migaku's answer to this is "export to Anki" — i.e. go and build
   the teaching system yourself.

### AI conversation — Langua, Speak, Praktika, TalkPal

**Selling:** output with feedback, which is the one thing flashcards genuinely cannot
give you. Praktika claims 20M+ learners; TalkPal covers 57 languages.

**But this camp is commoditizing in real time.** It is a wrapper over a frontier model,
so breadth is cheap and depth is the only defensible thing — and reviewers already
describe the budget tier as robotic voices, over-simple sentences, and "extremely
limited" feedback. Critically: **none of them know what you know.** Every conversation
starts with a stranger. There is no reason the tutor should use the words you learned
on Tuesday, and it doesn't.

### SRS power tools — Anki (+FSRS), RemNote

**Selling:** the best scheduler that exists, and total control. FSRS is state of the
art and Lexi already runs it. The cost is famous: you build all the content yourself,
and "if you want a beautiful interface, you have to learn basic CSS."

### The free tier that beats most paid products

Worth naming honestly: **DW's Nicos Weg** is a complete, free, professionally-produced
A1–B1 German course that reviewers say "rivals and often surpasses many paid
resources." Its weakness is precisely Lexi's strength — *"there's no spaced repetition,
so vocabulary doesn't stick unless you export it somewhere else."* That sentence is a
product brief.

---

## 2. What Lexi already does better than anyone

Not "differentiators we could claim." Things in `src/` today that the field does not
have.

**1. The scheduler shows its work.** `session.ts` makes five distinct pedagogical
decisions per session and every item carries a `reason`; `WhyThisCard` renders one line
for it, and `whyLine` is a pure, unit-tested function. Nobody else does this. Duolingo
*won't* (it would expose how arbitrary the path is). Anki *can't* (it has no pedagogy to
explain — only an interval). LingQ has nothing to show. This is an architectural
advantage, not a content one, which means **no budget can buy it away.**

**2. The vocabulary→grammar loop.** Learn *obwohl* and the Konzessivsätze exercise
arrives three items later. Miss three genders in thirty days and *Artikel & Genus* is
pulled in, easiest-first per Processability Theory. Both capped, both self-limiting once
FSRS schedules the point out. This is better pedagogy than anything in the consumer
tier, and it shipped in July.

**3. An honest number.** `Known` means "reached FSRS Review state," per lemma, ratcheted
so a later lapse can't retract it, and measured across all levels so narrowing the CEFR
filter can't manufacture one. It is the exact opposite of the mechanical rabbit. This is
a moral position that happens to also be a market position.

**4. Grounded generation.** `caseSafe` excludes n-Deklination masculines wholesale;
genitive frames are restricted to feminines; `canTransform` excludes separable and
reflexive verbs whose bare finite form would produce a wrong fragment; *während* was
dropped from genitive frames because "während der Lampe" is nonsense. Drills are
constructed from verified corpus facts, never generated at runtime. In a market where
the leader's paying customers just revolted over generated content, **"nothing in this
app was improvised" is a positioning line with teeth.**

**5. DSGVO by architecture.** Local-first, no accounts, nothing leaves the device,
open corpus with recorded licences. For the German market specifically this eliminates
the data-processing agreement, the parental-consent letter and the works-council
conversation. As `SCHOOL-PITCH.md` correctly notes: *no competitor with a teacher
dashboard can say this.* Only Anki and Language Transfer are comparable, and neither is
a German course.

**6. Craft.** The two-rooms rule, hue discipline, "an entrance must never leave content
invisible if it doesn't run," 44×44 targets, `lang="de"` on every German string. LingQ's
own reviewers call its interface dated; Anki's is a meme. This reads instantly.

---

## 3. Where Lexi is weak — the honest list

**1. It has no input.** This is the big one. Lexi teaches words in isolation and in
authored example sentences, and then stops. A learner can reach 2,000 Known and still
have no idea whether they can read a Spiegel article — which is the only question they
actually care about. The app builds a precise knowledge model and spends it entirely on
describing itself.

**2. It has almost no output.** The `order` and `transform` drills are real production
work and were the right call, but they are mechanical transformations, not
communication. No writing, no speaking, no feedback on either.

**3. The corpus is the bottleneck.** BACKLOG has "grow toward ~10k" as ongoing work.
This is the one axis where Lexi competes on a dimension it cannot win — content volume.
Meanwhile Duolingo shipped 20,500 units in a quarter. *(The "hand-gated" half of this
finding expired 2026-08-11: authoring is now machine-gated, and refuses to write a card
it cannot verify. The volume problem stands; the throughput ceiling moved.)*

**4. Nothing new ever arrives.** Streak, goal line, market, milestones — every return
mechanism is self-referential. There is no *new thing in the world* in the app on
Tuesday that wasn't there on Monday.

**5. "Eventually French and Spanish" is a hope, not an architecture.** Function words,
conjugation, umlaut folding, adjective de-inflection, and the capitalised-noun entity
heuristic are all German-specific and all load-bearing.

**6. No distribution, no business model.** The €5 supporter tier is parked with no
infra; the share card is the entire growth strategy.

---

## 4. The gap in the market — and why it is Lexi-shaped

The most replicated finding in reading-based SLA is the **lexical coverage threshold**:
learners need ~95% of the running words in a text for minimally adequate comprehension
and ~98% for comfortable reading (Hu & Nation; replicated by Kremmel et al. 2023). 95%
coverage takes roughly 3,000 word families; 98% takes 8,000–9,000. This number decides
whether a text teaches you or defeats you. It is the load-bearing fact under the entire
comprehensible-input industry.

**Every tool that sells against it today approximates it badly:**

| Tool | How it estimates "can I read this?" | The flaw |
|---|---|---|
| Lenguia's frequency checker | colour-codes words by **generic CEFR band** | has nothing to do with *you* |
| LingQ | **% unknown** from the word-form counter | inflated by design; "known" is a self-declared click, not evidence |
| Graded readers, Nachrichtenleicht, *Langsam gesprochene Nachrichten* | a **population average** for a level | a good guess about a stranger |
| Migaku / Language Reactor | doesn't try — mines whatever you're already watching | you find out it's too hard by failing at it |

**Lexi is the only product in the category positioned to compute this honestly**,
because it already holds all four required pieces:

- **A per-lemma retention model.** FSRS state *is* a forgetting-aware estimate of what
  you know right now. Nobody else's "known" is evidence-based.
- **A German lemma matcher.** Tokenises German, resolves inflections (verb paradigms,
  dative plurals, adjective de-inflection, umlaut fallback) to their lemma card, and
  classifies function words and proper nouns. *(Was exiled to build-time when this was
  written; **ported back app-side 2026-08-04** and now lives at `src/lib/matcher.ts`,
  which `scripts/corpus/lib.ts` imports — one implementation, so the meter and
  `corpus:coverage` cannot disagree about what "known" means.)*
- **Frequency ranks.** `freqRank` already ships in `public/data/provenance.json` for
  1,986 cards and comes from Leipzig lists the pipeline already loads — extending it to
  all 7,464 is a build pass, not a research project.
- **A session builder that accepts an explicit id list.** `Target` already has
  `{ kind: 'custom'; ids: string[] }`.

The hard half is built. What's missing is pointing it at a text.

---

## 5. The recommendation

**Not a pivot. A completion — plus one real change of goal that is genuinely yours to
approve or reject.**

### The flagship: the comprehension meter

Point Lexi at any German text — pasted, or saved from a URL — and it tells you the
truth:

> **You know 94% of the words here.** 31 unknown, 12 of them worth learning.
> That's just under comfortable. **Learn these 12 → 98%.**

One tap puts those twelve into tomorrow's session as a `custom` target carrying a new
`SessionReason` — `{ kind: 'unlock', text: 'Der Spiegel: Wohnungsmarkt' }` — so the
scheduler shows its work here too: *"because you want to read this."* Then the text
stays in a small library, and **its meter moves as you study.** That is the return loop
the app currently lacks, and it is the only one that isn't self-referential.

Why this specific feature, and not a reader like LingQ's:

- **It is the honest inverse of the mechanical rabbit.** LingQ's number goes up to feel
  good. Lexi's would go up *only when a real text became more readable*. Same category,
  opposite epistemics — and a competitor cannot copy it without repudiating their own
  headline metric.
- **It makes the corpus bottleneck stop mattering.** Unknown words arrive from the
  learner's own text instead of from Lexi's word list. Content scales without a
  maintainer for the first time in the project's life.
- **It gives every other feature a purpose.** The treemap stops being "how much of our
  list have you eaten" and starts being "the territory between you and the things you
  want to read." The goal line gets a better unit than a percentage. Known becomes
  spendable.
- **It reuses everything.** Matcher: written. FSRS state: written. freqRank: shipping.
  Custom targets: written. `WhyThisCard`: written.
- **It strengthens the school pitch rather than competing with it.** "Your students can
  demonstrate they can read chapter 7's text" is a far better teacher artefact than a
  word count, and textbook-chapter alignment becomes *paste the chapter* instead of
  *hand-author a deck*.

### The change of goal — **decided 2026-07-27: additive, not a reframe**

> **Ruling.** Build the meter as a first-class surface; **Known and the market stay
> the headline.** The full reframe below was argued for and *not* taken. Record of the
> trade: the treemap keeps top billing because it is the app's most distinctive asset
> and the thing personas actually reacted to; the accepted cost is that Lexi continues
> to lead with a measurement of itself rather than with what that measurement buys.
> Revisit if the meter proves it carries more motivation than the market does — that
> is now an empirical question, and the meter is the instrument that answers it.

The rejected framing, kept because the argument may become right later:

Lexi's implicit goal today is **coverage of a corpus** — the treemap, the sectors, the
percentage. I want to argue it should become **comprehension of real text**, with the
corpus demoted from the destination to the means.

That reframes the product's own sentences:

| Today | Proposed |
|---|---|
| "Known: 1,847" | "You can now read: *these three things*" |
| the treemap is the identity | the treemap is an instrument panel |
| a session is "what's due" | "what's due, plus what unlocks what you want to read" |
| progress is a percentage of our list | progress is texts crossing 95% and 98% |

**The cost was the deciding factor:** the treemap is the most distinctive visual asset
the app has, it is the thing personas actually reacted to ("it's like my words are a
city"), and the reframe demotes it from the headline. That trade was declined. What
carries forward from this section is the *vocabulary*: a session may now be "what's due,
plus what unlocks what you want to read," and progress may now be reported as texts
crossing 95% and 98% — **alongside** Known, not instead of it.

### Sequencing

**Phase 0 — good regardless of the decision (days).** *Two of three shipped 2026-08-04;
see BACKLOG Now #2 for the live status.*
- ~~Port `buildMatcher` back app-side.~~ ✅ `src/lib/matcher.ts`.
- ~~Order new cards by frequency within a CEFR band, not just by band.~~ ✅
- Join `freqRank` onto every card in the build. **Still open** — ranks cover 27%, and
  because those cards were *discovered through* the frequency list, today's ordering is
  mildly self-fulfilling. Needs a `corpus:build` run on the maintainer machine.

**Phase 1 — the meter (weeks).** Paste → annotate → coverage verdict against the 95/98
bands → "the N words that get you over the line" → into the session with an `unlock`
reason. Read-back view with known/learning/new tinting, tap for gloss + gender/plural.

**Phase 2 — the library that returns (weeks).** Saved texts, each with a live meter.
Audio is nearly free here: TTS (incl. Piper HD) already exists, and listening is the
most-neglected skill in every SRS app. *Licensing caution:* start with the learner's own
pasted text and their own saved URLs. Do not ship a bundled feed of someone else's
journalism without checking terms — DW's material in particular is attractive and not
automatically redistributable.

**Phase 3 — output, narrowly (weeks).** Not a chatbot. *"Write one sentence using these
three words"* with grounded, mostly-deterministic checking, reusing `norm`, near-miss
grading and the hint ladder. Local-first survives.

### What to refuse, and why

- **AI conversation.** Commoditizing, needs a backend and keys, breaks the DSGVO story,
  and six better-funded competitors are already there. *Revisit only* as on-device
  WebGPU: quantized sub-2GB models are genuinely interactive in 2026, and a 1B model is
  fine for "correct this one sentence" (<100 tokens) while being useless for
  conversation (500+ tokens takes minutes, and mobile is painful). That is a Phase-3
  implementation detail, not a strategy.
- **Content volume.** You lose. Do not enter.
- **Leagues, social, streak-shaming.** `DESIGN.md` already forbids this and is right —
  the backlash data says the category is moving *away* from it.
- **The multilingual refactor, speculatively.** Do it when a second language is actually
  being built. Note in passing that the meter is the *most* portable feature Lexi could
  own: text is language-agnostic, and only the matcher is German.

---

## 6. The other two decisions — both settled 2026-07-27

### B2B: consumer first, school second ✅

`SCHOOL-PITCH.md` contains the strongest distribution insight in the repo — one DaF
teacher is thirty students, and *"no competitor with a teacher dashboard can say this"*
about DSGVO is a true and time-limited moat. Its gap list (class report, curriculum
decks, assignability, psychometric placement, a real pilot) is roughly six months of
unglamorous work plus a school relationship, and the guarantee is only signable after a
pilot.

**Decided: consumer first.** The meter makes the school pitch materially better — "your
students can demonstrate they can read chapter 7's text" beats a word count, and
textbook alignment becomes *paste the chapter* rather than *hand-author a deck* — while
the school work does nothing for the consumer product until it is finished. SCHOOL-PITCH
stays live, not parked; it is sequenced behind Phase 1–2, and its gap list should be
re-read *after* the meter ships, because the meter closes two of its rows for free.

### Gloss language: English-base, said out loud ✅

S10 (Tomasz, Polish native learning German through English) is closed. **Lexi is for
English speakers learning German**, and this is now stated in the root `README.md` and
in the first-run hero rather than left implicit in the corpus. A gloss-language layer is
not scoped and not promised. The reason for saying it rather than merely being it: the
corpus is English-glossed to the last card, so a learner whose English is itself an L2
pays a double-translation tax on every item — better they learn that in the first ten
seconds than in week three.

*(Note for a future multilingual pass: this decision is about **gloss language**, not
target language. Adding French or Spanish from an English base stays open, and the
meter is the most portable feature Lexi could own — text is language-agnostic and only
the matcher is German.)*

---

## Sources

Market & incumbents — [Duolingo Q1 2026 results](https://www.stocktitan.net/sec-filings/DUOL/8-k-duolingo-inc-reports-material-event-6974ab47316e.html) · [Q1 2026 transcript](https://www.fool.com/earnings/call-transcripts/2026/05/04/duolingo-duol-q1-2026-earnings-transcript/) · [AI-first backlash](https://www.customerexperiencedive.com/news/duolingo-ai-first-consumer-backlash-lessons/757133/) · [backlash didn't dent growth](https://techcrunch.com/2025/08/07/the-backlash-against-duolingo-going-ai-first-didnt-even-matter/) · [the 2026 reversal](https://edumo.io/blog/duolingo-ai-reversal-language-teachers) · [language-learning market size](https://www.gminsights.com/industry-analysis/language-learning-market)

Immersion camp — [LingQ vs Migaku](https://inputdojo.com/compare/lingq-vs-migaku) · [LingQ's own forum on the inflated counter](https://forum.lingq.com/t/opinion-on-lingqs-word-counting-system/21087) · ["the mechanical rabbit"](https://www.lingq.com/en/forum/ask-steve/counter-words-inflated/) · [Language Reactor / Migaku / Trancy compared](https://lexpresso.io/blog/language-reactor-vs-migaku-vs-trancy-vs-lexpresso/)

AI tutors — [best AI speaking apps 2026](https://lingtuitive.com/blog/best-ai-language-learning-app/) · [Talkpal vs Langua](https://www.borderset.com/blogs/posts/talkpal-vs-langua-best-ai-language-learning-app-2026) · [Talkpal review](https://languatalk.com/blog/talkpal-review/)

German-specific — [17 German apps tested (Seedlang, Nicos Weg)](https://www.fluentu.com/blog/german/best-apps-for-learning-german/) · [best German apps 2026](https://www.learngermanwithgames.com/blog/best-apps-to-learn-german) · [easy German news sources](https://www.lingoda.com/blog/en/easy-german-news/) · [Goethe-Institut exam training](https://www.goethe.de/en/spr/prf/ueb/pb1.html)

Pedagogy — [Hu & Nation replication, Kremmel et al. 2023](https://onlinelibrary.wiley.com/doi/10.1111/lang.12622) · [Schmitt et al., % of words known and comprehension](https://www.lextutor.ca/cover/papers/schmitt_etal_2011.pdf) · [lexical coverage in L2 processing](https://academic.oup.com/applij/article/45/6/953/7841943) · [why input must be 95–98% comprehensible](https://gianfrancoconti.com/2025/02/27/why-the-input-we-give-our-learners-must-be-95-98-comprehensible-in-order-to-enhance-language-acquisition-the-theory-and-the-research-evidence/) · [input vs output](https://voices.uchicago.edu/triplehelix/2025/05/20/effective-language-learning-focus-on-input-or-output/) · [deliberate practice framework for L2](https://tesl-ej.org/wordpress/issues/volume29/ej115/ej115a5/)

Feasibility — [in-browser LLMs 2026](https://wowdata.science/browser-native-agents-llms-in-browser-ai-guide-2026/) · [Transformers.js + WebGPU](https://huggingface.co/docs/transformers.js/en/guides/webgpu) · [existing generic text-difficulty checker](https://www.lenguia.com/tools/word-frequency-checker)
