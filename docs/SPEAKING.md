# Sag es — the pronunciation game

**Status: MVP, 2026-09-09.** Scope, plan, the critical pass that changed the plan,
and what is built. The empirical gates are named and **three of the four are not yet
measured** — they need a human and a microphone, and are marked ⬜ throughout.

---

## What the game is

From the meme (*"This is impossible for a Scottish person"*): a word arrives, you say
it out loud, and the recogniser's live transcript is **printed over the top of the
word**. The joke is the overlay — `JUNE` sitting across `JANUARY` — not a score.

Three mechanics, all load-bearing:

1. **A word stays until it is caught.** *(Changed from the first cut, and it is the
   rule the game turns on.)* The first version gave each word a deadline and let it go
   past — the meme's shape, and the wrong shape here: a word that expires is the
   recogniser's failure charged to the learner. So the pressure moved up a level. **The
   run has a clock; a word does not.** One minute, and the score is how many words you
   clear. A word that will not be caught costs you *time* rather than a mark against
   it. You are racing a clock, never failing a word.
2. **Two signals, and they answer different questions.** *(Rebuilt after a recording
   from a real phone.)* The first version printed the transcript across the word,
   offset slightly, in the accent colour — on a phone that was `rudern` under
   `Rudern Juden Juden Juden Juden wurden`, one unreadable smear, and it still could
   not say whether the microphone was working at all.

   - **The bars are speech arriving.** They kick whenever the recogniser reports
     hearing anything and decay between events — so they move on sound the machine
     is receiving, whether or not it makes a word of it.
     
     They were **raw amplitude** for one build, off a second `getUserMedia` stream,
     which is a better signal and is now **off by default**: it was reported crashing
     a real iPhone *immediately after granting microphone access*, which is exactly
     when it started, and it was the only new native-API surface in that build. Two
     consumers of one microphone is ordinary on desktop and evidently not on iOS,
     where the audio session is shared. `?meter=1` turns it back on; the diagnosis is
     circumstantial and the code is kept for whoever can confirm it.
   - **The word is what was understood.** Each letter lights as the transcript comes
     to contain it, by longest-common-subsequence alignment. Not *how close* but
     **where it diverged**.

   Bars moving and letters dark is a real state and used to be indistinguishable from
   a dead microphone: the machine heard a sound and made nothing of it.
3. **The next words are visible ahead.** The queue is what lets the game feel fast on a
   recogniser that is not.

**The article is part of the word.** `der Tisch`, not `Tisch` — reversing the first
cut, which dropped it to spare the recogniser a syllable. Knowing a German noun means
knowing its gender and this app is emphatic about that everywhere else; dropping it
was optimising for the wrong party. It also gives the matcher *more* to work with:
`die Katze` is a longer and more distinctive target than `Katze`, and one mangled
syllable of two still lands above the fuzzy floor. The reflexive and the government
still go — `sich` is not said aloud and `an + A` is notation.

It forced a real fix in the matcher. With a two-word target, `verdict` has to compare
**contiguous windows** of the transcript, not just whole tokens and the whole string:
`die Sprache ist schön` contains `die Sprache` and matched nothing at all before.

**Skip is free and clears nothing.** Charging time for a skip would charge the learner
for the recogniser refusing a word, which is the same error wearing a different coat.

## How you get to it

Three ways, and the first two are new because the original was unreachable in practice:

- **Themen**, under the text scanner — the surface that lists things you can *do*.
- **The session recap**, the one moment the app knows you owe nothing.
- ~~Üben's empty state~~ — where it started, and where nobody would ever have found it:
  that branch needs no fresh cards either, which this app's own comment says never
  happens inside a 6,700-word corpus.

## Why it belongs in Lexi, and the ruling it has to survive

VISION open decision 8, ruled 2026-09-09: **speech is not scored**, because a
pronunciation score a machine cannot stand behind is exactly the pretence commitment 3
forbids. That ruling stands and this game does not contradict it, on one condition
that is written into the design rather than the copy:

> **A miss says the word was not caught. It never says the learner mispronounced it.**

The distinction is the same one the app already makes twice: the feed records an
*exposure* and refuses to infer knowledge from it, and the scheduler reports *"you kept
stopping on this"* and refuses to infer interest. Here the app reports *"the recogniser
heard X"* and refuses to infer that X is what you said. The overlay makes that literal:
the evidence is on screen, and the learner can judge it.

**So the game never writes an FSRS card.** Same rule as the feed, same reason.

---

## The four gates

Named before anything was built, because three of them can invalidate the design and
only one of them is answerable without a microphone.

| | Gate | Status |
|---|---|---|
| 0 | **Does the API exist on Lexi's actual platform?** | ✅ **yes** — iOS Safari 26.5 on iPhone 17 Pro reports `webkitSpeechRecognition` and `isSecureContext: true`. Measured 2026-09-09 in the Simulator against `http://localhost:4320` |
| 1 | **Latency** — median mic warm-up and time to first interim guess | ⬜ needs `npm run probe:asr` |
| 2 | **Substitution vs. acoustics** — do rare C2 words fail *worse* than long compounds? Rare-word failure is lexical (the language model swaps in something common) and is partly fixable; long-compound failure is acoustic and is not | ⬜ |
| 3 | **Alternatives** — does iOS return more than one? If `maxAlternatives` yields 1, the "target appeared in the top 5" strategy does not exist on this device and the matcher must be more generous on its own | ⬜ |

`scripts/probe/asr.html` measures all four. It is served on **localhost only**
(`npm run probe:asr`), because the speech API needs a secure origin: a Mac's LAN
address is not one, and the API is *absent* there rather than blocked, so the page
looks broken instead of refused. The iOS Simulator shares the host's network stack,
which is what makes a real iOS Safari able to reach it.

---

## The critical pass — four things the plan was missing

The build order handed over was: matcher → recognition wrapper → headless engine → UI
→ word sets. That order is right and is what got built. Four corrections:

### 1. The privacy gate was missing, and it outranks latency

**Web Speech API is not local.** Safari streams audio to Apple's servers for
recognition; Chrome streams to Google's. Lexi is a local-first app with no backend —
that is a commitment in VISION, not an implementation detail — and this is the first
feature that would send anything a learner produces off the device.

That does not kill it. It makes it a **deliberately entered, disclosed, opt-in
surface**: the game is a place you go, it says what it does with your voice before the
microphone opens, and it is not woven into a session where a learner could meet it
without choosing it. Recorded in VISION as a settled decision rather than left to the
permission prompt to imply.

### 2. "Filter the word sets to what the recogniser can catch" is backwards

The handover's step 5 was *word sets from Lexi's vocabulary, filtered by whatever the
probe says is winnable*. That would let a third party's language model choose Lexi's
curriculum — the game would quietly teach the words Google and Apple happen to know.

Inverted: **the corpus is not filtered by ASR performance.** A word that cannot be
caught is a fact about the recogniser, and the game says so. What *is* filtered is by a
property of the word itself, measured below.

### 3. The difficulty curve is inverted at three ends, not two

The handover had it at two: A1 words are trivial, C2 words are rare enough that the
recogniser substitutes. Measured against the corpus, there is a third and it is the
worst one — **313 of 1,170 A1 cards are monosyllabic and 129 are function words**
(`so`, `nur`, `ab`, `auch`). A single-syllable function word said in isolation is a
coin flip for any recogniser, and it is unplayable for reasons that have nothing to do
with the learner.

So the playable set is not a CEFR band. It is **content words of two or more
syllables**, which cuts across every level:

| level | cards | 1-syllable | function words | playable | median chars |
|---|---|---|---|---|---|
| A1 | 1,170 | 313 | 129 | **797** | 7 |
| A2 | 1,414 | 188 | 106 | **1,147** | 8 |
| B1 | 2,340 | 195 | 154 | **2,014** | 9 |
| B2 | 1,038 | 39 | 76 | **927** | 9 |
| C1 | 696 | 26 | 34 | **637** | 10 |
| C2 | 186 | 10 | 9 | **169** | 9 |

A fourth exclusion arrived from the persona pass rather than from the corpus, and it
is in the table's numbers below: **one word**. Pattern cards carry a whole clause as
their term — the run's lookahead was showing *Ich kann lange schlafen.* — and a
sentence fails both the overlay, which prints one transcript across one word, and the
deadline, which is sized for one utterance.

**5,576 of 6,844 cards (81.5%)** are playable on the final rule — A1 783, A2 1,117,
B1 1,981, B2 920, C1 617, **C2 158** — so both requested ends are stocked. A1 gives
`Sprache`, `Mutter`, `Schwester`, `Woche`; C2 gives `Argumentation`, `Prämisse`,
`erörtern`, `Quellenkritik`, `Metapher`.

### 4. Personas cannot test the microphone, and that is fine

This repo's persona practice is seeded states driven on the Simulator. None of them can
speak. What they *can* test is everything the recogniser is not: the permission
refusal, the unsupported browser, the run where nothing is heard at all, the copy after
a miss, the layout at accessibility text sizes, and whether the track is legible while
moving. That is most of the risk, because the recogniser's accuracy is a *measurement*
and the rest is *design*.

---

## The persona pass, and what it found

Seven personas, defined by what they can break rather than by who they are — none of
them can speak, and the point of the exercise is that the recogniser's accuracy is a
*measurement* while everything around it is *design*.

| | Persona | Found |
|---|---|---|
| A | **Ana** refuses the microphone | ✅ the run stops and says what to do, rather than filling twelve words with silence |
| B | **Bruno** on a browser with no speech API | ✅ told which browsers can, and the *origin* is checked first — outside a secure context the constructor is absent, so checking the API first tells somebody whose browser is fine that it is not |
| C | **Céline** says nothing for a whole run | ✅ the track keeps moving, the recap lists what it heard instead of nothing, and no copy suggests she failed |
| D | **Dmitri** at an accessibility text size | ⬜ **not verified.** The browser pane reports `clientWidth: 0` because it runs hidden, so its "no overflow" is the false negative `docs/LESSONS.md` warns about, and changing iOS Dynamic Type needs a pass through Settings. Touch targets are px and the word is `clamp()` on `vw`, so neither scales with the root — but that is an argument, not a measurement |
| E | **Eva**, three days in, A1 only | ✅ 783 playable A1 cards; the run drew `stehen`, `Freitag`, `essen`, `Mieter` |
| F | **Farid** at C2 | ✅ 158 playable cards — thin, and enough for a 12-word run |
| G | reduced motion / screen reader | ✅ the overlay is `aria-hidden` (two overlapping words read as gibberish) with a `sr-only` live region carrying *heard: …*; the bar has no transition when motion is reduced |

### The two defects it found, both on the phone and neither visible anywhere else

**1. The clock ran through the permission dialogs.** iOS shows *two* system prompts
between pressing Start and audio arriving — Speech Recognition, then Microphone — and
the first version started its track at `listen()`. Driven on the Simulator, a
twelve-word run was **on word 8 by the time the second dialog was answered**: seven
words missed, none of them by the learner, from the app's own clock rather than from
any recogniser. That is precisely the failure this game exists never to produce.

Fixed: the listener reports `onOpen` from `onaudiostart`, the track holds at word 1
until then, and the status line says *Waiting for the microphone…*. Armed once per
*run* rather than per session — the recogniser stops after every pause and is
restarted, so per-session arming would hand out a fresh deadline each time the learner
stopped talking. A `onHeard` fallback and an 8-second timer cover engines that never
fire the event.

**2. Pattern cards were in the pool** — see the one-word rule above.

### And one found before it could be tested

The game was first offered from Üben's empty state. That branch needs *no fresh cards
either*, and this file's own comment says a learner inside a 6,700-word corpus never
reaches it — so the entry point was effectively unreachable. It is on the session
recap instead, which is reached every day and is the one moment the app knows the
learner owes nothing. Not on a first run: that session ends in the placement test, and
a microphone prompt on top of that is a second ask during a first impression.

---

## When it does not hear you

Reported from a real phone: *"it opens but it doesn't react to my voice"*. Driving it
on the Simulator with the diagnostics turned on showed what that looks like from
inside:

```
starts 25 · ends 24 · results 0 · live true · audio-capture
```

**Twenty-five sessions in twenty seconds, not one transcript, an `audio-capture` error
every time — and the screen said *Listening…* throughout.** Three defects, and the
third is the one that matters:

1. **The restart ran inside the `end` event.** Safari throws `InvalidStateError` when
   `start()` lands too close to the `end` before it. Now it restarts on a 300 ms timer.
2. **`continuous` is not safe to assume.** It is honoured by Chrome, ignored by some
   builds and harmful on others — a session that ends instantly, every time. There is
   no capability flag to ask, so `asr.ts` asks by *trying*: two consecutive sessions
   that end inside a second having heard nothing, and the next one drops the flag.
   Self-correcting beats a user-agent test that is wrong next release.
3. **The failure counter was cleared by the microphone opening.** Which is exactly
   what a broken capture does *before* it fails — so the guard reset itself 24 times
   and never fired. **Only a transcript proves audio is reaching the recogniser**, so
   only a transcript clears the count now.

And the app admits it. After six seconds of an armed run with nothing heard, the status
line says **"Not hearing anything — is the mic blocked?"**, and a one-line readout of
what the recogniser actually did appears — *shipped, not dev-only*, because it only
shows in a failure state and it is the difference between "it doesn't work" and a bug
report:

```
started 2 · ended 2 · heard 0 · aborted
```

**What is still unverified: live recognition, anywhere.** The iOS Simulator cannot
capture audio (`audio-capture` on every session) and the browser pane blocks the
microphone outright. Both refusals are now handled correctly and both were *observed* —
but nobody has yet watched this game catch a single spoken word, and this file will not
pretend otherwise until `npm run probe:asr` has been run by a person with a mouth.

---

## What is built

| | Module | What it is | Tested without a microphone |
|---|---|---|---|
| 1 | `src/lib/asr-match.ts` | Pure. Normalisation, Kölner Phonetik, Levenshtein, and one `verdict()` | ✅ |
| 2 | `src/lib/asr.ts` | The recogniser wrapper — capability detection, one event shape, swappable | ✅ (capability paths) |
| 3 | `src/lib/sages.ts` | The round, as a pure reducer over transcript events | ✅ |
| 4 | `src/components/SagEs.tsx` | The track, the overlay, the disclosure | persona pass, on the phone |
| 5 | word selection | `playableWords()` — the rule in §3, over the live corpus | ✅ |

## Open, and deliberately not decided yet

- **Thresholds.** The fuzzy cutoff is 0.80 and the phonetic match is all-or-nothing,
  both inherited from the probe and neither tuned, because tuning them against anything
  other than real transcripts would be fitting to a guess. Gate 1–3 first.
- **Scoring at all.** The MVP has a streak and no score. Whether a run produces a number
  is a question for after the personas.
- **A per-word substitution allowlist** — the recogniser reliably hears one thing for
  another, and that is a fact worth recording per card. It needs the probe's JSON.
- **Whether the noun's article should be said.** Currently not: gender has its own
  drill and asking for *der Tisch* doubles the surface the recogniser can fail on for
  a fact this game is not testing. Revisit once the substitution rate is known.
- **Dynamic Type**, above.

## How to run the probe

```
npm run probe:asr
```

Then open `http://localhost:4320/` in the iOS Simulator's Safari — **not** the Mac's
LAN address, which is not a secure origin and where the API is silently absent. Run
all four sets, press *Copy results*, and paste the JSON back. It carries the user
agent and the origin with it, so a result can be attributed to a device.
