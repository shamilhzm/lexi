# Lexi — personas & design review

The single persona file. Supersedes `SIMULATED-SESSION.md` (2 personas) and
`SIMULATED-SESSIONS-2.md` (9 personas), both folded in at the bottom with their
current status.

**Round 3 (this file's main body) is the first round that looked at the app.**
Rounds 1–2 were traced against code and said so honestly. This one was run against
a seeded mid-B1 learner in a real browser at 1280×800 and 375×812, in both themes.
Every finding tagged `[identity]`, `[motion]`, `[hierarchy]` or `[density]` cites a
screen that was captured.

---

## Method

### The honesty clause, inherited

> A simulation can only find what the simulator can imagine — it validates flows,
> not feelings.

Round 3 narrows that gap (it validates *pixels* too) but does not close it. A
simulated persona cannot tell you whether they would come back on day 2.

### The anti-confirmation problem

Twelve personas is a rhetorical device. Run carelessly, it is one opinion wearing
twelve hats — especially when the brief is "I'm not sure this is award-worthy,"
which is a thesis looking for a jury. Five countermeasures, applied:

1. **Priors declared before the app was seen.** Five of twelve are predisposed to
   *like* a dense instrument.
2. **One persona is assigned the defence** (P11, the DaF teacher). Their job is the
   strongest possible case for the terminal.
3. **Every persona names one thing they would lose** if the identity changed.
4. **Findings are separated from the verdict.** A finding is anchored to a screen.
   The verdict is labelled as judgment.
5. **The jury's question is not "is the terminal pretty?"** It is *what should an
   app about acquiring German feel like* — then, does this feel like that.

### The external rubric

So "award-worthy" isn't taste. **Awwwards** scores Design · Usability · Creativity ·
Content; its 2026 Site of the Year won because *"it didn't just represent a racing
driver — it felt like racing"* — form matching **subject**. It also rewards motion
that *"has a director, not just a library."* **Apple Design Awards** run six
categories: Delight and Fun · Inclusivity · Innovation · Interaction · Social
Impact · Visuals and Graphics.

Scored honestly, before the personas: Lexi is **strong on Inclusivity** (enforced
a11y, DSGVO by architecture, offline, free, no account) and **strong on
Interaction** (the drag physics in `Review.tsx` are genuinely good). It is **weak
on Delight** and **weak on Visuals and Graphics**. That matches the brief.

### Capture conditions

Seeded learner: 3,506 cards touched · 2,326 known · 41-day streak · 247 due ·
41 misses weighted to Kasus · goal B2 by 15 Nov · filter A1–B2. Screens captured:
Today (first-run and seeded), Progress/heatmap, session flip card, all at desktop
and mobile, dark and light.

---

## Round 3 — twelve personas, two per level

Tags: `[identity] [motion] [hierarchy] [density] [copy] [a11y] [pedagogy] [i18n] [perf]`
Severity: **P0** breaks a core promise · **P1** costs a real user something ·
**P2** friction · **P3** polish.

---

### P1 · Aylin — A1, mobile, 11pm on the sofa · *prior: wary of anything that looks technical*

Moved to Wien three weeks ago. Opens the app in bed. The first screen is a
near-black room with one card floating in it.

1. `[identity]` **P1** — The first impression at A1 is *sparseness, not seriousness*. The desktop hero occupies the top 38% of the viewport and the remaining ~500px is empty. The aesthetic promises a dense instrument and delivers an empty room; on the one screen where density would reassure ("this thing knows a lot"), there is none.
2. `[hierarchy]` **P1** — Two "Start" affordances compete: the sidebar's **bright cyan** *Start session* and the hero's **dim teal** *Start*. The one that matters on first run is the quieter of the two, and the loud one leads to an empty queue.
3. `[copy]` **P2** — *"Find your level, then learn your first words"* is good. *"2 minutes"* is better. Both are undersold by being the least contrasty text in the card.
4. `[motion]` **P2** — Nothing on the first screen moves, ever. There is no evidence the app is alive until she taps.
5. `[identity]` **P2** — Cool cyan on near-black is the default "serious software" palette of the last decade. It reads as competent and borrowed. Nothing about it says *German*, or *language*, or *learning*.
6. `[copy]` **P3** — The new *"German from English — every gloss, rule and example is in English"* line is correct and welcome, and set at `text-2xs` in `--color-dim`, which is the least legible text on the screen.
7. `[pedagogy]` **P0-adjacent** — Correctly, the first session strips drills (`teachOnly`). This is the single best decision in the onboarding and she never knows it happened.
8. `[motion]` **P2** — Tapping into the session cross-fades through blank. It doesn't feel like entering a room; it feels like a slide changing.
9. `[a11y]` **P2** — At 11pm the near-black ground with dim-grey secondary text is the hardest possible combination for tired eyes. Light theme is better and she'll never find it.
10. `[identity]` **P1** — *What she'd lose if it changed:* nothing yet. At A1 the identity is doing no work for her — it is a cost she pays before receiving any benefit.

---

### P2 · Jonas — A1, desktop, learning German for a move · *prior: **hostile**; designer, judges in five seconds*

The closest thing this review has to an award juror.

1. `[identity]` **P0** — *"It represents a Bloomberg terminal. It doesn't feel like learning a language."* The winning pattern in the reference set is form matching **subject**. This is form borrowing **authority** from a domain the product is not in.
2. `[density]` **P1** — The terminal claim is not even cashed. A real terminal is dense; this is a **single column of six stacked rounded rectangles**, all the same width, all the same corner radius, all the same treatment, on a 1280px screen. No grid, no asymmetry, no compositional tension.
3. `[motion]` **P1** — Route changes are a 0.18s opacity cross-fade. Every navigation goes **visible → invisible → visible**. There is no continuity between screens, so the app reads as a slideshow of unrelated states rather than one place you move around in.
4. `[motion]` **P0** — `layoutId` appears **exactly once** in the codebase (the bottom-nav pill, `BottomNav.tsx:55`). Tapping a heatmap tile to open its sector — the one navigation in the app where the same object exists on both sides — is a hard swap.
5. `[hierarchy]` **P1** — Dark theme: the session card's **"60"** is the largest element on Today and is rendered in a dim grey that reads as *disabled*. In light theme the same number is black and dominant. The two themes disagree about what the most important thing on the screen is.
6. `[density]` **P2** — Every row is left-aligned text with 40–60% empty space to its right. The layout doesn't use the width it takes.
7. `[motion]` **P2** — `.tile-in` animates `scale(.985)` — a **1.5%** change, below the perceptual threshold. It costs a frame budget and buys nothing.
8. `[identity]` **P2** — Mono is well-applied ("mono means data" is a good rule, enforced). But the net surface is IBM Plex Mono + system sans, with Fraunces confined to one word on one surface. **The German — the actual subject — is the least present typeface in the product.**
9. `[perf]` **P2** — `vocab.json` is 5.2 MB and the build warns on >500 kB chunks. Jurors test on real devices.
10. `[identity]` **P1** — *What he'd lose:* "The heatmap. It's the only thing here I haven't seen before, and it's genuinely good. I'd keep that and throw away the frame around it."

---

### P3 · Marek — A2, mobile, four minutes on the tram · *prior: neutral*

1. `[density]` **P1** — Mobile Progress spends **~200px of an 812px screen** on three stacked rows of chrome (Markt/Liste toggle, six CEFR chips, Study all) before one pixel of map. The control surface outweighs the content.
2. `[hierarchy]` **P1** — The floating Study FAB **overlaps the treemap**, sitting semi-transparently on top of the "Work & Economy" tile. Two interactive things occupy the same pixels.
3. `[density]` **P2** — The ticker on a 375px viewport shows 3.5 items and cuts mid-word. At this width the marquee is decoration that costs 60px.
4. `[motion]` **P2** — The ticker is the app's only continuous motion, and it's a 42s linear marquee — the visual language of a news crawl, not an instrument.
5. `[copy]` **P1** — Quick 5 exists and is exactly right for him. It is the quieter of two buttons and named in a way that doesn't say "this fits your four minutes."
6. `[motion]` **P3** — The bottom-nav pill is the single best motion moment in the instrument room, and it's 8 pixels tall.
7. `[pedagogy]` — The honest due framing (*"247 reviews waiting in total — today serves the oldest 60. The rest keep."*) is the best sentence in the product. It removes the exact anxiety that ends SRS habits.
8. `[i18n]` **P1** — See P5.1. "3.496 seen" reads as three-point-four-nine-six.
9. `[motion]` **P2** — Finishing a session and returning to Progress, the tile that changed does not move. The reward for studying is a re-render.
10. `[identity]` — *What he'd lose:* "The map. On a phone it's the only screen that feels like it's showing me something real."

---

### P4 · Frau Bauer — A2, desktop, Sprachschule student with a textbook open · *prior: **defends** density*

1. `[density]` — She *wants* the instrument, and says the app under-delivers it rather than over-delivers: "there is room for three times this much information."
2. `[pedagogy]` **P1** — "Next up" (Dativ / Body & Illness / Kasus) is the single most useful widget in the app and is buried mid-page below a level strip she reads once a week.
3. `[hierarchy]` **P2** — "Your Path" (six CEFR tiles) occupies prime real estate above the fold and changes about once a fortnight. The session card, which changes daily, is below it.
4. `[i18n]` **P1** — "663/1.705 · 22 sectors" — she reads German, so the separators look right to her and wrong the moment she switches to the English glosses. The app is inconsistent with itself, not with a locale.
5. `[copy]` **P2** — "Core Vocabulary · **1 sectors**". Unpluralized.
6. `[pedagogy]` **P2** — Nothing maps to her textbook's chapter. This is the B2B gap SCHOOL-PITCH already names; from the learner's chair it shows up as "the app and my course are two separate lives."
7. `[density]` **P2** — Treemap tile text truncates at mid sizes: "19 secto…", "2… ▲219". The instrument's own data doesn't fit its own tiles.
8. `[motion]` **P3** — Hovering a tile produces no response. On desktop, an interactive region that doesn't acknowledge the pointer reads as an image.
9. `[hierarchy]` **P2** — The `▲974` weekly deltas — genuinely interesting, genuinely motivating — are the smallest text in the corner of each tile.
10. `[identity]` — *What she'd lose:* "The seriousness. My daughter's app has a cartoon owl. This one looks like it respects me. Don't trade that away for animation."

---

### P5 · Deniz — B1, mobile, Goethe B1 booked in five weeks · *prior: neutral, high stress*

1. `[i18n]` **P0** — **"2.320 known"** in an otherwise-English UI. German thousands separators with English labels: an English reader parses 2.320 as *two point three two*. This is the app's headline number, on every surface, formatted ambiguously. Cheapest P0 in the list.
2. `[pedagogy]` — The goal line (*"B2 by 15. Nov. · 35% known · at your pace: ~78% by then"*) is exactly what a deadline learner needs, and it is honest about falling short. Best feature for this persona.
3. `[hierarchy]` **P1** — That sentence is one line of 14px text between two large cards. The most motivating information in the app is styled as a footnote.
4. `[copy]` **P2** — "B2 by 15. Nov." mixes a German date format into an English sentence — same inconsistency as the separators, different mechanism.
5. `[motion]` **P1** — The pace figure (~78%) is the number he'll watch daily. It never animates, so he can't tell whether today moved it.
6. `[pedagogy]` **P1** — Exam mode is cut (correctly). But the app knows his level, pace and weak modes and never says *"your weakest area for B1 is Kasus"* in the one place he'd act on it.
7. `[hierarchy]` **P2** — "+ 4 drills targeting your blind spots" is rendered in red. It reads as an error, not as the app doing him a favour.
8. `[a11y]` **P2** — That red is the only signal for that line; on the light theme it's the sole non-grey element and still reads as a warning.
9. `[density]` **P2** — On mobile the session card's supporting text runs to three lines of dim grey before the button.
10. `[identity]` — *What he'd lose:* "Nothing I'd notice. I'd trade the whole look for one screen that tells me if I'll pass."

---

### P6 · Ben — B1, desktop, self-directed, 40k Anki reviews · *prior: **defends**; wants the machine visible*

1. `[pedagogy]` — Interval previews on the grade buttons ("10 min" / "2 mo") and the `WhyThisCard` reason line are, to him, the best things in the product and better than Anki's equivalent. **This is the app's genuine competitive moat and it is invisible until you're three cards deep.**
2. `[hierarchy]` **P1** — The scheduler's reasoning — the single most differentiating thing Lexi does — has no presence anywhere in the instrument room. It lives entirely inside the session.
3. `[motion]` **P1** — The desk on **desktop is not full-bleed**. `DESIGN.md` §8 promises "full-bleed, no chrome at all"; what renders is an ~800px column letterboxed in black on a 1280px viewport. The two-rooms principle is only realised on mobile.
4. `[density]` **P2** — Inside that column, the flip card is ~520px tall with content in the top 45% and **~250px of empty card below it**. A card whose job is to hold one word is mostly margin.
5. `[identity]` **P2** — The brand accent is **absent from the study surface**. On the card, the only cyan is the speaker button. The product's colour appears everywhere except the thing you look at most.
6. `[motion]` **P2** — The 3D flip with overshoot (`cubic-bezier(.3,1.15,.4,1)`) is excellent and is the app's best single moment. Nothing else in the product is built to that standard.
7. `[hierarchy]` **P2** — "Didn't know" and "Knew it" are equal weight, equal size, low contrast — on a screen with nothing else to look at.
8. `[perf]` **P3** — Stats panels are good but static; a workload forecast that never moves invites less trust than one that redraws.
9. `[pedagogy]` **P2** — Blind spots rank by raw miss count, so a mode he drills more looks worse than one he avoids. Rate, not count.
10. `[identity]` — *What he'd lose:* "Mono numerals and the interval previews. Everything else could be pink for all I care, as long as the numbers stay honest."

---

### P7 · Sabine — B2, desktop, works in German, uses it between meetings · *prior: **defends** speed over delight*

1. `[motion]` **P0** — **Observed and reproduced: an entire view rendered at `opacity: 0`.** Navigating to Progress while the tab was backgrounded left 1,769px of fully laid-out content invisible, with the enter transform frozen mid-flight (`matrix(1,0,0,1,0,6.53)`). The route enter at `App.tsx:179` uses `initial={{ opacity: 0, y: 8 }}`; if the animation never runs, the destination is blank. **This is the exact hazard `DESIGN.md` §7 documents and defends against in CSS — and the rule was never applied to the Framer route transition every navigation goes through.**
2. `[motion]` **P1** — Even when it works, the enter animation means every destination is invisible for ~180ms. Twice during a six-navigation capture run, a screenshot caught a blank or ghosted screen. Perceived latency is worse than actual latency.
3. `[density]` **P1** — For a between-meetings user the information-per-scroll ratio is low: four scroll-lengths on desktop to see what could fit in one.
4. `[hierarchy]` **P2** — The ticker is clipped at the left edge on desktop, showing a partial "7%" against the sidebar boundary. It reads as a rendering fault.
5. `[identity]` **P2** — She likes the restraint and finds it under-used: "It's calm, but calm and empty aren't the same thing."
6. `[motion]` **P2** — No skeleton or progressive reveal while the 5.2 MB lexicon loads; the app shell paints, then content appears.
7. `[pedagogy]` **P2** — B2 is where the corpus thins and she can feel it — more repeats of words she knows.
8. `[copy]` **P3** — "Guten Tag" is warm; "Dienstag, 28. Juli" is a nice touch. Both are set in the dimmest ink on the screen.
9. `[hierarchy]` **P2** — Level filter chips (A1…C2) rescope the entire app and look like decorative badges.
10. `[identity]` — *What she'd lose:* "The quiet. No streaks screaming at me, no confetti. That's why I opened it a second time."

---

### P8 · Tom — B2, mobile, hit the wall, hasn't opened it in nine days · *prior: wary; motivation-fragile*

The persona the motion critique is really about.

1. `[motion]` **P0** — Answering correctly produces a colour change and a haptic tick. **Nothing on the screen celebrates, moves, or acknowledges.** Round 2's Sofia called this "like a spreadsheet"; at B2 with fading motivation it's the difference between continuing and closing.
2. `[motion]` **P0** — Finishing a session, the heatmap tile that just moved from 41% to 47% **does not animate**. The single most emotionally loaded event in the product — visible, earned progress — is delivered as a silent re-render on a screen he has to navigate to himself.
3. `[motion]` **P1** — `CountUp` exists and is used only in the session recap. The Known headline — the number the whole product is organised around — does not count up, ever.
4. `[hierarchy]` **P1** — Coach marks consume ~200px of an 812px screen on a device where the card already competes for height.
5. `[copy]` **P0** — The session footer reads **"Space to flip and check the translation"** on a touch device with no Space key. Wrong affordance, wrong platform, on the primary surface.
6. `[density]` **P2** — Mobile session chrome (flag / speaker / undo / skip) wraps to a second row, making a 140px header before the card starts.
7. `[motion]` **P2** — Comeback mode exists and is well-judged, but arrives as static text. The one moment engineered to feel like relief is styled like everything else.
8. `[identity]` **P1** — At low motivation the near-black ground reads as heavy. The palette has one emotional register, and it is *sober*.
9. `[pedagogy]` — The circuit breaker after four misses is genuinely kind and he'd never know it was designed.
10. `[identity]` — *What he'd lose:* "Honestly? The feeling that it isn't trying to manipulate me. Every other app I've quit was manipulating me."

---

### P9 · Dr. Reisinger — C1, desktop, translator · *prior: neutral*

1. `[pedagogy]` **P1** — C1/C2 content thinness is real and known (BACKLOG). At C1 the app starts repeating and the promise "grows with you A1–C2" gets thin exactly where it's hardest to fulfil.
2. `[density]` **P1** — With the level filter at C1 the heatmap is mostly dark tiles; the instrument's most impressive screen is least impressive for its most advanced user.
3. `[identity]` **P2** — "The terminal implies breadth and precision. At C1 it delivers precision and not breadth, and the frame makes the gap more obvious, not less."
4. `[hierarchy]` **P2** — Heatmap colour maps linearly over 0–100%, but real data occupies **26–45%**, so every tile renders nearly the same green. **The heat map is not a heat map** — the range compression defeats the metaphor's entire purpose, which is seeing where you're thin at a glance.
5. `[motion]` **P2** — With no transition between tile and sector, drilling in loses all sense of *where* she came from; the back-stack is real routing but doesn't feel spatial.
6. `[pedagogy]` **P2** — Synonyms/antonyms exist but aren't differentiated by register — a C1 concern the corpus doesn't yet model.
7. `[copy]` **P3** — "Wortkarte", "Markt", "Üben" — German nouns for surfaces is a good rule, well applied.
8. `[a11y]` — `lang="de"` on German strings is correctly enforced and she notices, because her screen reader doesn't mangle the vocabulary.
9. `[hierarchy]` **P3** — "Study all" is a primary-styled button next to six filter chips it doesn't relate to.
10. `[identity]` — *What she'd lose:* "The typographic discipline. Mono for data is right and almost nobody does it."

---

### P10 · Yusuf — C1, mobile, heritage speaker closing literacy gaps · *prior: neutral*

Speaks fluently, reads and writes unevenly. Nobody has modelled him before.

1. `[pedagogy]` **P1** — Placement assumes ignorance is uniform. He'll test at C1 on vocabulary and B1 on orthography, and the app has one number for him.
2. `[pedagogy]` **P1** — He needs *written form* practice — der/die/das, ß/ss, capitalisation — and the drills that would serve him (gender, plural, case) are gated behind CEFR level rather than skill.
3. `[i18n]` **P2** — His English is his third language. The English-base commitment is now stated honestly, which he appreciates and which still costs him a translation hop per card.
4. `[hierarchy]` **P2** — The Known headline counts vocabulary he already speaks, so his number is inflated relative to his actual need.
5. `[motion]` **P2** — Same as P8: correct answers are silent.
6. `[density]` **P2** — On mobile the heatmap shows ~2.5 rows before the bottom nav clips it.
7. `[copy]` **P3** — "Tap a group to drill in · long-press to study it directly" sits **below the fold** on both viewports; the primary interaction is documented where it can't be seen.
8. `[a11y]` **P2** — Long-press as the *only* route to "study this group" has no keyboard or screen-reader equivalent surfaced.
9. `[pedagogy]` **P3** — IPA on every card is a real asset for him and is never explained.
10. `[identity]` — *What he'd lose:* "The map is the only place I can see that my German has a shape. That's worth more to me than the colour scheme."

---

### P11 · Frau Dr. Weber — C2, desktop, DaF instructor · ***assigned the defence***

Her job is the strongest case for the terminal. She makes it, and then qualifies it.

1. `[identity]` — **The defence:** "Every competitor infantilises. Streaks, mascots, confetti, a green owl guilt-tripping my students. This is the only vocabulary tool I've seen that treats an adult as an adult, and that is not a small thing — it is the reason I would put it in front of a class."
2. `[identity]` — "The restraint is also *pedagogically* right. A learning tool that competes with its own content for attention is a worse learning tool. The calm is a feature."
3. `[identity]` **P1** — **The qualification:** "But restraint and absence are not the same thing, and this app confuses them. Nothing here is *wrong*. A great deal of it is simply *not there*."
4. `[identity]` **P1** — "The terminal is a claim about the product's seriousness. The seriousness is real — the grounded drill gates, the honest counters, the scheduler that explains itself. **The aesthetic is the least convincing evidence of the very thing it's asserting.** The drills prove it; the dark blue does not."
5. `[pedagogy]` — The grounded gates (`caseSafe` excluding n-Deklination, feminine-only genitive) remain the thing that convinces her a person thought about this.
6. `[pedagogy]` **P1** — C2 is 6 exercise points. She would assign A1–B1 today, B2 with supervision, not above. Unchanged from round 2.
7. `[hierarchy]` **P2** — The scheduler's reasoning (P6.2) is her strongest selling point to a colleague and is invisible from outside a session.
8. `[a11y]` — Enforced a11y and DSGVO-by-architecture are, for a German institution, worth more than any visual treatment. No competitor with a teacher dashboard can match it.
9. `[pedagogy]` **P2** — No class report, no textbook alignment. Known gap; from her chair it's the reason she can't actually adopt it.
10. `[identity]` — *What she'd lose:* "The adulthood. Change anything you like, but the day this app congratulates me with a cartoon is the day I stop recommending it."

---

### P12 · Ana — C2, mobile, maintenance only · *prior: wary*

1. `[pedagogy]` **P1** — At C2 the value proposition inverts: she doesn't need coverage, she needs *rare* words. The app has no concept of "words worth keeping" versus "words worth acquiring."
2. `[hierarchy]` **P1** — Her heatmap is uniformly dark (C2 is 0%), which reads as failure rather than as "you're past this."
3. `[identity]` **P2** — "The instrument is measuring a journey I've finished. It has no screen for someone who arrived."
4. `[motion]` **P2** — Same silence on success as P8/P10. At C2, where correct answers are the norm, the silence is total.
5. `[pedagogy]` **P2** — No maintenance mode: low-volume, high-interval, rare-vocabulary review is exactly what FSRS is best at and the app never offers it as a shape.
6. `[density]` **P3** — Six CEFR chips when she only uses one.
7. `[copy]` **P3** — "0%" on C2 is technically true and reads as a judgment.
8. `[perf]` **P2** — Downloading a 5.2 MB corpus to use ~200 cards.
9. `[motion]` **P3** — The live-dot pulse is the only "alive" signal in the instrument and it's 7px.
10. `[identity]` — *What she'd lose:* "Nothing. I'm not the user this was built for, and that's a fair answer."

---

## Consolidated findings — 120 raw, 25 distinct

Ranked by `personas hitting it × severity`. This is the part that becomes work.

**✅ = fixed in the Atlas pass, 2026-07-28.** Six of the twenty-five, including three
of the five P0s. #1 turned out to be worse than reported — the *rule* DESIGN.md
used to prevent it was itself wrong (see BACKLOG 0b). #8 is fixed by making light
the primary theme rather than by retuning the dark one.

| # | Finding | Sev | Personas | Tag |
|---|---|---|---|---|
| 1 | ✅ **Route enter can leave a whole view at `opacity: 0`** — observed, 1,769px of content invisible. `App.tsx:179` violates DESIGN.md §7's own rule. | **P0** | P7 | motion |
| 2 | **Success is silent.** No motion, no acknowledgment on a correct answer, anywhere. | **P0** | P8, P10, P12, P3 | motion |
| 3 | **The heatmap never animates on data change.** 41%→47% is a re-render. | **P0** | P8, P3 | motion |
| 4 | ✅ **`de-DE` number separators in an English UI** — "2.320 known", "6.618", "1.705". Headline number, every surface. | **P0** | P5, P4, P3 | i18n |
| 5 | ✅ **"Space to flip" shown on touch devices.** | **P0** | P8 | copy |
| 6 | **No shared-element continuity.** `layoutId` used once; every navigation cross-fades through blank. | **P1** | P2, P9, P7 | motion |
| 7 | ✅ **Heatmap colour range compressed** — data spans 26–45%, ramp spans 0–100%, so every tile is the same green. The heat map isn't a heat map. | **P1** | P9 | hierarchy |
| 8 | ✅ **Dark theme "60" reads as disabled**; light theme renders it black and dominant. Themes disagree on hierarchy. | **P1** | P2 | hierarchy |
| 9 | **Two competing "Start session" CTAs**, the contextual one quieter than the persistent one. | **P1** | P1 | hierarchy |
| 10 | **Desk is not full-bleed on desktop** — an ~800px letterbox, contradicting DESIGN.md §8. | **P1** | P6 | density |
| 11 | **The scheduler's reasoning is invisible outside a session** — the app's genuine moat, unadvertised. | **P1** | P6, P11 | hierarchy |
| 12 | **Mobile Progress spends ~200px on chrome** before any map. | **P1** | P3 | density |
| 13 | **Mobile FAB overlaps the treemap.** | **P1** | P3 | hierarchy |
| 14 | **The goal line is styled as a footnote** — most motivating sentence, smallest treatment. | **P1** | P5 | hierarchy |
| 15 | **C1/C2 content thinness** (known debt) — the "A1–C2" promise thins where it's hardest. | **P1** | P9, P11 | pedagogy |
| 16 | **Blind spots rank by raw count, not rate** — drilling a mode makes it look worse. | **P1** | P6 | pedagogy |
| 17 | **Single-column stack of identical rounded rectangles** on desktop; no grid, no compositional variety. | **P1** | P2, P7 | density |
| 18 | **Coach marks eat 200px of 812px on mobile.** | **P1** | P8 | hierarchy |
| 19 | ✅ **`.tile-in` animates 1.5%** — below perceptual threshold. | **P2** | P2 | motion |
| 20 | **Ticker clipped at the left edge on desktop**; cuts mid-word on mobile. | **P2** | P7, P3 | hierarchy |
| 21 | **Treemap tile text truncates** ("19 secto…", "2…"). | **P2** | P4 | density |
| 22 | **No hover/press affordance on treemap tiles**; primary interaction hint is below the fold. | **P2** | P4, P10 | motion |
| 23 | **Brand accent absent from the study card** — cyan appears everywhere except the thing you look at. | **P2** | P6 | identity |
| 24 | **"+ 4 drills targeting your blind spots" is red** — reads as an error, not a favour. | **P2** | P5 | hierarchy |
| 25 | **5.2 MB corpus, >500 kB chunk warning**, no progressive reveal. | **P2** | P7, P12 | perf |

Plus one-off copy defects: **"1 sectors"** unpluralized; German date format inside English sentences; the English-base line set at the lowest legibility on the screen.

---

## The verdict on the terminal identity

**Labelled as judgment, not finding.**

**Vote: 7 for redirection · 3 for keeping it · 2 abstain** (P10 and P12 said the
identity is not what's failing them).

**But the vote is the least interesting part, and taken alone it would be
misleading.** The two most credible witnesses — the hostile designer (P2) and the
assigned defence (P11) — independently reached the *same* diagnosis from opposite
directions, and it is not "the terminal is wrong."

> P2: *"It represents a Bloomberg terminal. It doesn't feel like learning a
> language."*
>
> P11: *"Restraint and absence are not the same thing, and this app confuses them.
> Nothing here is wrong. A great deal of it is simply not there."*

**The finding: the terminal identity is not failing because it is the wrong
metaphor. It is failing because it is only half-built.**

The evidence is that the aesthetic makes a promise of **density, precision and
liveness** and the implementation delivers **sparseness, compression and
stillness**:

- It claims density → ships a single column of six identical cards with 40–60% empty space per row (#17).
- It claims precision → ships an ambiguous headline number (#4) and a heat map whose colour range is so compressed that every tile is the same green (#7).
- It claims a live instrument → ships one 7px pulsing dot, a marquee, and total silence on the only event the user causes (#2, #3).

A market terminal is legitimate *specifically because* it is dense, exact and
alive. Lexi has adopted its **palette and its typography** and almost none of its
**behaviour**. What the personas rejected 7–3 was not the metaphor; it was a
metaphor asserted and unfulfilled.

### Recorded dissent, verbatim

P4: *"There is room for three times this much information."* — the pro-density
witness says the problem is too little terminal, not too much.

P11: *"The seriousness is real — the grounded drill gates, the honest counters, the
scheduler that explains itself. The aesthetic is the least convincing evidence of
the very thing it's asserting."*

P7: *"It's calm, but calm and empty aren't the same thing."*

### The unanimity check

The verdict is **not** unanimous, which is the outcome the method was built to
allow. Three personas defended the identity outright and two declined to blame it.
Every persona named something they would lose; the losses clustered hard on three
things — **the adulthood** (P11, P8, P7), **the heatmap** (P2, P3, P10), and **the
typographic/numeric discipline** (P6, P9). Any redirection that keeps those three
keeps what the personas actually valued.

### What this means for DESIGN.md

The recommendation is therefore **neither "keep it" nor "replace it"** but
**"finish it"** — and the specific unfinished half is behaviour, which is why the
motion brief and the identity trial converge on the same work:

1. **Earn the density claim** — composition, grid, information-per-screen (#17, #12, #3).
2. **Earn the precision claim** — fix the number formatting and the colour-range compression that make an instrument look imprecise (#4, #7, #21).
3. **Earn the liveness claim** — a real motion system: continuity between screens, animation on data change, and acknowledgment of success (#1, #2, #3, #6, #19).

Sofia's paradox from round 2 — *"like a city"* and *"like a spreadsheet"* about the
same aesthetic — resolves under this reading. **They are separable.** The city is
the composition; the spreadsheet is the stillness. Fixing the second does not cost
the first, which was the open question the plan flagged and is now answered.

---

## Rounds 1–2 — prior findings, folded in

Method: traced against code, not screens. Retained for provenance and for the open
items.

### Round 1 (2 personas — Anna A1 mobile, Jonas B1 desktop)

Shipped from it: zero-seed placement copy; "Still learning / Got it" on first-sight
cards; ✓/✗ icons on all MC states; bare-noun dative restricted to *mit*; *während*
dropped from genitive frames; `navigator.storage.persist()` + install nudge;
flag-a-card.
**Still open:** edit-distance-1 typo tolerance (measure over-forgiveness first);
surface the flagged list in Profile.
**Never answered** (needs a real human): does anyone return on day 2 unprompted; is
20 cards the right session length; does "Still learning" read as kind or
patronising.

### Round 2 (9 personas — S3–S11, cut by axis)

Shipped: interval previews · Quick 5 · comeback mode + backlog burn-down · the goal
line · the share card · the Stats surface · rem type ramp + text-size setting +
coach marks · the feel layer + circuit breaker · `corpus:flags`.
**Closed since:** S10's gloss-language question — English-base, now stated in the
README and the first-run hero.
**Still open:** the content depth arc (C1/C2 register), re-confirmed here by P9 and
P11.

**What round 3 changes about round 2:** S7 (Sofia) reported the spreadsheet feeling
and it was actioned as *"the feel layer"* — sound, count-up, a named best moment,
all inside the **recap**. Round 3 finds the feeling was never addressed where she
had it: at the moment of answering, and in the instrument room. Findings #2 and #3
are the unclosed half of that report.

---

*Maintenance: when a finding ships, mark it here and move the detail to
BACKLOG.md's shipped log. This file is the only persona doc — don't start a fourth.*
