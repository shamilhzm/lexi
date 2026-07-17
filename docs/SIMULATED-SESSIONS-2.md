# Lexi — Simulated Sessions II: nine personas, and the next ten things
*(July 2026 · companion to [SIMULATED-SESSION.md](SIMULATED-SESSION.md); same
method, same honesty clause: this validates flows and copy, not feelings. Every
finding below is traced to actual code, not to hope.)*

Each persona is an instrument pointed at one untested axis of the product.

---

## S3 · Miriam — six weeks away, comes back guilty

*32, learned daily for two months, then a project ate her life. iPhone, installed.*

Opens the app braced for punishment. The due cap (shipped) means she sees "312
reviews waiting in total — today serves the oldest 60" — honest and bounded. But
two things still read as punishment: her **streak shows 0** — forty-one days of
work erased by one number — and clearing the backlog is a **week-long grind with
no visible burn-down**: tomorrow says 252, but nothing frames that as *progress
through something finite*.

- **F: Streak zeroing after a life event is the classic guilt mechanic we swore
  off.** Best practice (and Duolingo's single most-cited retention feature) is a
  grace mechanism. A "longest streak" memory + a comeback framing ("back after 6
  weeks — your 41-day record is safe") costs nothing algorithmically.
- **F: The backlog needs a burn-down** — "312 → 252 → 190…" as a shrinking bar
  turns a week of grinding into a week of winning.

## S4 · David — the Anki power user, arms crossed

*29, 40k Anki reviews, came to scoff. Desktop.*

Finds FSRS via `ts-fsrs` and a desired-retention control — nods, impressed. Then
grades a card and stops: **the buttons don't say when the card comes back.**
Anki shows the scheduled interval on every answer button; that preview is how
power users learn to *trust* the scheduler instead of second-guessing it. He
also looks for a stats page — review counts, recall trend, workload forecast —
and finds only Today's KPIs. Verdict: "nice, but it hides the machine."

- **F: Interval preview on grade buttons** ("Got it · 3d"). FSRS computes it
  anyway; showing it converts the scheduler from magic to machinery. Cheap,
  differentiating, perfectly on-brand for a terminal.
- **F: No stats surface.** Reviews/day, recall trend, 7-day due forecast, Known
  growth curve — four small charts and the terminal identity earns its name.

## S5 · Priya — four minutes on the U-Bahn

*26, commuter. Phone, installed, tunnel Wi-Fi.*

Offline works (SW + cached lexicon) — quietly excellent. But Today offers one
thing: a 20-card session. She has time for eight, does them, gets pulled away —
and tomorrow the session rebuilds from scratch; her position is gone (known,
UX-PATHS F5). There is **no session shape for the minutes she actually has.**

- **F: "Quick 5" alongside Start session** — same queue, first five, honest
  recap. The habit that survives is the one that fits the smallest real moment.
- **F: Same-day resume** (persist queue ids + position) graduates from "texture"
  to prerequisite the moment sessions meet real commutes.

## S6 · Karl — 68, iPad, large system font

*Retired engineer, learning for a Germany trip with his granddaughter.*

Every text size in the app is a hard-coded pixel value (`text-[13px]`…): his
OS-level large-text preference **does nothing**. He can't find how to grade —
swipe is invisible and the tap-to-flip/button relationship takes him a minute
(he gets there; the buttons save him). Drag on the sentence builder is
tap-based ✓. Reduced motion is respected ✓.

- **F: The type ramp ignores OS font scaling.** Move the ramp to rem with a
  root scale, or add an in-app text-size setting. This is the difference
  between "my dad can use it" and "my dad politely stopped."
- **F: First-session coach marks** (one-time, three tooltips: flip / grade /
  skip) would have saved his first confused minute. Show once, never again.

## S7 · Sofia — 14, has Duolingo, judges apps in 90 seconds

*School German, phone-native, streak culture.*

The treemap genuinely lands ("it's like my words are a city"). But answering
correctly *feels* like a spreadsheet: haptic tick, color change, silence. No
sound, no motion payoff, recap is a stat block. She respects the lack of a
guilt-owl; she misses the *juice*.

- **F: A feel layer** — optional, subtle: correct-answer tick sound, a 200ms
  card settle, a recap that counts up (CountUp exists!) and names the best
  moment ("hardest word you got: *trotzdem*"). Juice ≠ gamification; it's
  feedback density. Keep it off-by-default on reduce-motion.

## S8 · Mehmet — Goethe B1 in six weeks

*35, exam booked, €229 paid. The most motivated user Lexi will ever meet.*

Sets level filter to B1, studies hard — but the app can't answer his only
question: **"will I be ready?"** Exam mode was cut (rightly). But even without
simulating the exam, Lexi knows his pace, his Known count per level, and FSRS
projections. Silence here wastes the strongest motivation in language learning:
a date with money on it.

- **F: A goal line.** Let him set a target (level + date). Today gets one
  sentence: "B1 vocabulary: 61% known · at your pace: ~87% by Oct 4." No new
  content needed — it's arithmetic on data the store already has. The pace
  sentence is the retention loop for every deadline-driven learner.

## S9 · Lena — wants to show someone

*24, three-week streak, proud. Phone.*

Hits a milestone ("A2 is 75% Known") — a line of text in the recap, gone in a
tap. She screenshots the treemap for her group chat; it's the best-looking
thing in the app but it's cropped chrome, not a designed artifact. **There is no
share moment.** Word-of-mouth is the only growth channel a free local-first app
has, and right now its best asset (the market) can't leave the app.

- **F: A share card.** One tap on a milestone or the market → a rendered image
  (canvas): the learner's treemap colored by Known, headline number, level,
  wordmark. The screenshot people already want to take, designed on purpose.

## S10 · Tomasz — Polish native, learning German *through* English

*41, works in Köln. English is his third language.*

Everything works — but every gloss forces a Polish→English→German triangle. He
manages (B2 English), yet each card costs him double translation. This is the
migrant learner the old Orbita docs cared about.

- **F: Not a build item — a strategic decision.** En-pivot is deep in the
  corpus (en glosses, en exercise prompts). Either commit to "English-base
  learners only" out loud (README + onboarding), or scope a gloss-language
  layer for later. Deciding *now* prevents accidental drift into a promise the
  corpus can't keep.

## S11 · Frau Dr. Weber — C1 teacher, marking with a red pen

*54, DaF instructor. Came because a student showed her.*

Reads the Kasus drill and approves of the grounded gates (fem-only genitive,
n-Deklination exclusion — "someone thought about this"). Then probes the top:
C2 has 6 exercise points, register/style content is deferred, and conjugation
MC is trivially easy at her level. She'd assign this app A1–B1 today, "with
supervision" B2, not above. She also finds two clunky cloze distractors in ten
minutes — and uses the flag button. It works. **She is not a user; she is your
proofreader and your distribution** (one teacher = thirty students).

- **F: The advanced ceiling is a known content debt** (BACKLOG: C1/C2
  register work, hand-authored). Confirmed as real by the most credible persona.
- **F: Flags need a review workflow on the maintainer side** — a
  `corpus:flags` script that ingests backup files and lists flagged cards
  against their data. The loop is only closed when flags change the corpus.

---

# The Next 10 — what makes it unforgettable

The pattern across all eleven sessions (these nine + Anna and Jonas): the app is
already *correct* and *kind*. What it isn't yet is **legible** (you can't see the
machine think), **fitted** (sessions don't match real minutes), and **narrative**
(progress has no arc you could tell someone about). The ten below, in order:

1. **Interval preview on grade buttons** (S — David). "Got it · 3d". The
   single cheapest trust feature in SRS; makes the scheduler visible.
2. **Quick 5 + same-day resume** (M — Priya). Sessions that fit the minutes
   people actually have. Includes UX-PATHS F5.
3. **Comeback mode** (S — Miriam). Longest-streak memory, comeback framing
   instead of a zero, backlog burn-down bar. The second unretired guilt
   mechanic dies here.
4. **The goal line** (M — Mehmet). Target level + date → one pace sentence on
   Today from data the store already has. Meaning for deadline learners.
5. **The share card** (M — Lena). Canvas-rendered treemap + Known headline.
   The only growth mechanism a local-first free app gets: pride.
6. **Stats surface** (M — David). Reviews/day, recall trend, 7-day due
   forecast, Known growth. The terminal finally gets its terminal screen.
7. **Type ramp on rem + text-size setting** (S/M — Karl). OS font scaling must
   work. Plus one-time coach marks for flip/grade/skip.
8. **The feel layer** (S — Sofia). Optional sound tick, card settle, count-up
   recap with a named best moment. Also the F3 miss-streak circuit breaker —
   feel includes how failure feels.
9. **`corpus:flags` maintainer loop** (S — Dr. Weber). Ingest backups, list
   flagged cards, close the loop that flag-a-card opened.
10. **Content depth arc** (L, human-gated — Anna's A1 + Dr. Weber's C1). The
    DaF-fed A1/A2 fill and the hand-authored C1/C2 register work. Every other
    item polishes the loop; this one is the promise the loop exists to keep:
    *the app grows with you, A1 to C2.*

**Explicit decision required (not a build item):** Tomasz — say "English-base"
out loud, or scope gloss layers. Silence is the only wrong answer.

*Sequencing note: 1, 3, and 9 are each roughly a session of work and compound
everything else. 2 and 4 are the retention core. 5 and 6 are the identity core.
7–8 are the humanity core. 10 runs underneath forever.*
