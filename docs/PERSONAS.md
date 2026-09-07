# Lexi — personas & design review

The single persona file. Supersedes `SIMULATED-SESSION.md` (2 personas) and
`SIMULATED-SESSIONS-2.md` (9 personas), both folded in at the bottom with their
current status.

**Round 4 (2026-09-07) is the current round.** Fifty personas cut by *lens* rather
than by CEFR level, run on an iPhone 17 Pro simulator against the deployed build and
against scripts in `scripts/corpus/`. It supersedes Round 3 as the live critique.

**Round 3 was the first round that looked at the app** — but the app it looked at is
gone: five tabs, a grammar syllabus, an exam room and a reading room, all deleted in
the 2026-09-05 refocus. Its verdict on the terminal identity stands and is why the
Atlas exists; most of its *findings* are about surfaces that no longer ship. Read it
as history. Rounds 1–2 were traced against code and said so honestly.

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

## Round 4 — fifty-one, and the six lenses Round 3 did not have *(2026-09-07)*

**Round 3 judged an app that no longer exists.** It was run against the five-tab
instrument with the grammar syllabus, the exam room and the reading room in it; the
refocus deleted all three on 2026-09-05. Its verdict on the terminal identity stands
and is why the Atlas exists. Its *findings* are mostly about surfaces that are gone.
Read it as history.

### What is different about this round

Fifty-one is not five times more useful than ten unless the personas differ along an axis
that changes what they can see. Round 3 cut by **CEFR level**, which is one axis and
the one the product already thinks in — twelve people asking the same question at six
difficulties. This round cuts by **six lenses**, because the defects found on the
2026-09-06 pass clustered by lens and not by level: the learner who cannot read the
tab bar and the learner who cannot hear the word have nothing to do with each other's
CEFR band.

    the migrants     why somebody is learning at all           10
    the bodies       what the app assumes about yours           8
    the professions  people who judge this for a living         8
    the builders     people who would have to maintain it       8
    the contexts     where and on what it is actually opened    8
    the sceptics     including four whose job is to defend it   9

### The countermeasures, extended

Round 3's five are kept — priors declared before looking, an assigned defence,
findings separated from verdicts, every persona names what they would lose, and the
jury's question is *what should an app about acquiring German feel like*. Three more,
because fifty-one hats is fifty-one times the temptation:

6. **No criticism without an anchor.** Every one below cites a screen captured on the
   iPhone 17 Pro simulator against the deployed build, a script in `scripts/corpus/`
   run this session, or a named file and line. A persona is a *reason to look
   somewhere*, never evidence on its own.
7. **The checks that came back clean are written down too**, at the end, so the same
   ground is not re-audited by the next round. Three of this round's most promising
   suspicions died that way.
8. **Eight personas are given the defence**, not one — spread across cohorts, because
   a single defender is a token and gets outvoted by construction.

---

### Cohort 1 · The migrants — why somebody is learning at all

*The brief these ten were built for: people moving to Germany who need the language
for work, for the Behörde, and for the people they live with. They were driven on a
freshly erased device against the deployed build; the full walk is in BACKLOG under
the 2026-09-06 pass.*

**P13 · Amara, 24, Nigeria → Leipzig, care Ausbildung** · *prior: hopeful, English is
her second language too*
Tapped *Learn ten words now* — the only button on the welcome screen — and it deleted
the onboarding and left her in the feed. **Criticism: the first tap of the app did
nothing, and there was no way back to the screen that had explained it.** Fixed. She
would lose the welcome copy itself, which is the clearest writing in the product.

**P14 · Rafael, 31, Brazil → Munich, Elektroniker seeking Anerkennung** · *prior:
neutral, twenty minutes on the S-Bahn*
Searched `Sicherung` — the most common noun on a German building site. Five compounds
of it came back first (`Sicherungskopie`, `Absicherung`, `Versicherung`) and the word
itself was below a section break in a grey box. **Criticism: the exact match is
ranked below inexact ones whenever it lives in the lookup layer, because the sections
are ordered *taught first* rather than *best match first*.** Ranking *within* a layer
is excellent and he would lose that.

**P15 · Dr. Anjali Rao, 38, India → Essen, sitting the Fachsprachprüfung** · *prior:
sceptical of consumer apps; twenty minutes at 23:00*
Finished a twenty-card session and was told **RECALL 100%** for twenty cards she had
been shown answer-side-up and never asked to recall. **Criticism: the one number the
recap leads with is the one number the session did not measure.** She reads it as the
app grading itself.

**P16 · Yusuf Demir, 52, Turkey → Duisburg, grandchildren answer in German** ·
*prior: wary, low confidence, presbyopic*
Runs his phone at an accessibility text size. **Criticism: at `accessibility-extra-large`
the headword scrolls off its own screen, the top bar loses search, streak and avatar,
and the tab labels collide into `Wörter Themen ÜbenFortschri`.** The app honours
Dynamic Type, which is more than most web apps do, and then has clearly never been
opened at one. Bounded: everything holds to the largest *standard* size.

**P17 · Marta Nowak, 29, Poland → Berlin, engineer who works in English** · *prior:
**defends** the restraint; design-literate*
Wants Feierabend German — the small talk she is locked out of. **Criticism: Themen
offers *Building Blocks*, *Society & Politics*, *Work & Economy* — the corpus's own
taxonomy, not a life.** Nothing in the app is called *my job*, *the Ausländerbehörde*
or *my kid's school*. She would lose the Band treatment, which she rates as the
cleanest thing in the product.

**P18 · Elena Ivanova, 45, Ukraine → Dresden, two kids in Grundschule** · *prior:
motivated, time-poor*
Pasted a real Elternbrief into the text scanner. It returned 0%, *11 words Lexi
doesn't teach yet*, and a sentence explaining the ceiling that she **could not
read** — the result renders below the fold and the page will not scroll, because
focusing the textarea scrolled the window and the `100dvh` shell never recovered.
**Criticism: the app's best feature is unreachable the moment you use the keyboard
that feature requires.**

**P19 · Kenji Tanaka, 27, Japan → Stuttgart, Blue Card engineer** · *prior: **defends**
drilling; wants volume*
Ran the word drill on `anbieten`. The four options were *to offer* against *to shine*,
*to work*, *to get to know*. **Criticism: distractors are not chosen to be confusable,
so a four-option question about a separable verb is free.** The confusable set is
`annehmen`, `anrufen`, `anfangen` — same prefix, different stem — and that is where
the actual error lives.

**P20 · Sofía Herrera, 34, Colombia → Hamburg, kitchen** · *prior: neutral; audio-first,
hands wet*
Tapped the speaker on twelve words. **Criticism: 10 cards of 6,810 have human audio —
0.15% — and `speakDe` sets `lang = 'de-DE'` then falls back to whatever voice exists.
On a device with no German voice installed it reads German with English phonology and
says nothing about it.** For a pronunciation tool that is worse than silence.

**P21 · Grace Mensah, 19, Ghana → Freiburg, undergraduate** · *prior: hostile; will
try to break it*
Tapped *Themen* while the saved-words sheet was open. The tab highlighted, the sheet
stayed, and the back button now said *the feed* while pointing at Themen.
**Criticism: `go()` clears `drill` but not `showSaved` or `searching`, so navigation
can leave a layer stranded over the wrong tab.**

**P22 · Ahmed Al-Sayed, 41, Syria → Hannover, needs C2 for a public-sector post** ·
*prior: **defends** the corpus; former civil engineer*
Probed the seven domains a migrant survives. **Criticism: `corpus:domains` measures
52 of 90 taught, 32 lookup-only, and 6 absent from both layers — `Elterngeld`,
`Steuernummer`, `Meldebescheinigung`, `Einschulung` among them.** The dictionary layer
closed the *lookup* gap and none of it can be *studied*. He would lose the
`noteWanted` flow, which promises nothing and is right not to.

---

### Cohort 2 · The bodies — what the app assumes about yours

**P23 · Nadia, blind, VoiceOver, learning German for work** · *prior: neutral*
Opened the app and tried to navigate by heading, which is how she navigates
everything. **Criticism: the feed — the front door — has zero headings and 106
focusable controls.** Every other route has a proper `h1`/`h2` structure; the one
screen the app opens on has none, so the German word, the single most important
element, is marked up as nothing.

**P24 · Tomás, screen-reader user, second pass** · *prior: **defends** the labels*
**Criticism: 24 empty `aria-live="polite"` regions on the feed**, one per slot. Empty
they are harmless; the day one populates, a scroll announces two dozen of them. He
would lose the labels themselves — *"Learn lassen — put it in my next session"*,
*"Profile — Yusuf, B1, 41-day streak"* — which are better than most sighted apps'.

**P25 · Priya, low vision, 200% zoom, not a screen-reader user** · *prior: wary*
**Criticism: see P16 — but her failure comes earlier**, because browser zoom and
Dynamic Type compound, and nothing in the layout is expressed in a way that survives
either past the standard range.

**P26 · Jan, motor impairment, switch control, one target at a time** · *prior: neutral*
**Criticism: 106 focusables on the feed with no landmark to skip a word by.** Reaching
the fourth word costs sixteen switch actions. The *Skip to content* link exists and
lands him at the top of the same 106.

**P27 · Dolores, deaf, lipreads German, no use for audio** · *prior: **defends** the
text-first design*
**Criticism: strip the audio out and IPA is the whole of what is left, and IPA is a
notation almost no learner reads.** `/ˈɡʁɪlən/` is precise and, to her, inert — there
is no respelling, no rhyme, no stress mark she can use. She would lose the fact that
nothing in the app *requires* sound: she can complete every drill.

**P28 · Ravi, dyslexic, English is his second language** · *prior: wary*
**Criticism: the chrome is German metalanguage — Wörter, Themen, Üben, Fortschritt —
and the app's stated audience is English speakers at A1.** The argument for German
surface names is real (the tab matches the page it opens). The cost lands hardest on
the person least able to absorb it.

**P29 · Bea, deuteranopia** · *prior: neutral*
**Criticism: gender is carried by `--color-der` / `--color-die` / `--color-das`, and
the der/a1 hue collision is a known open item.** Mitigated honestly — the article is
always spelled out beside the colour, so colour is never the only signal. Filed as
*checked, adequate* rather than as a defect.

**P30 · Karl, 71, vestibular disorder, motion makes him ill** · *prior: hostile to
animation*
**Criticism: none found.** `prefers-reduced-motion` is honoured in three places in
`index.css` and through `useReducedMotion` in thirteen components, including the tab
bar's shared-layout slide and the new glass transition. Recorded so nobody re-audits.

---

### Cohort 3 · The professions — people who judge this for a living

**P31 · Frau Dr. Weber, DaF instructor** · ***assigned the defence***
"The refocus was right and the reviewers who want the grammar syllabus back are
wrong." **Her criticism is narrower and worse: the first session a learner ever sees
is twenty verbs, every one tagged CORE VERBS.** No noun, so no gender ink and neither
the gender nor the plural drill — the two the VISION ruling kept — can fire on day
one. She would lose the ruling itself, which she thinks is the best decision in the
project.

**P32 · Herr Lange, lexicographer** · *prior: sceptical*
**Criticism: `wiederholen` is glossed "to bring back, take back" while its own
definition reads *to repeat* and both its examples read «Wiederholt es!» — *Repeat
it.*** Two fields against one, and the outvoted field is the only one on screen. It is
card 2 of the first session. `npm run corpus:gloss-vote` finds 105 of these; about one
in five is real.

**P33 · Dr. Okonkwo, SLA researcher** · *prior: neutral*
**Criticism: the feed records an *exposure* after 1200 ms of dwell and uses it to rank
what is introduced next — and dwell is not attention.** The separation from grading is
principled and tested; the inference from dwell to interest is not evidenced and is
not labelled as a guess anywhere the learner can see.

**P34 · Signe, speech and language therapist** · *prior: neutral*
**Criticism: nothing in the app asks the learner to produce sound**, and `recall` —
the one production drill — is typed. For a migrant whose blocker is speaking, the app
measures the half that is easy to measure. (This is PEDAGOGY's own standing headline,
restated by a new lens.)

**P35 · Herr Vogt, school IT and data protection officer** · *prior: hostile by role*
**Criticism: none on privacy — and he looked hard.** No account, no backend, no
telemetry, everything in IndexedDB, and the copy says so on the welcome screen.
**His actual criticism is the dictionary: `mein Kondom ist gerissen` is a headword**,
along with 710 other Wiktionary phrasebook entries, and there is no content filter for
a device in a classroom.

**P36 · Claudia, freelance translator** · *prior: **defends** the lookup layer*
**Criticism: the "93,046 headwords" is inflated. 10.0% — 9,301 entries — are proper
nouns**: `Lyon`, `Langkampfen`, `Knecht Ruprecht`. Add 594 prefixes, suffixes,
characters and symbols and the count of German *words* a learner could look up is
nearer 83,000. She would lose the layer's disclosure line, which she calls the most
honest sentence in any dictionary UI she has used.

**P37 · Herr Brandt, Goethe examiner** · *prior: neutral*
**Criticism: the exam room was deleted and nothing replaced the question it
answered** — *am I ready?* Fortschritt reports what you have met, which is not the
same claim. Defensible under the refocus; he notes that the app now says nothing at
all to the person with a date booked.

**P38 · Malika, curriculum designer** · *prior: sceptical*
**Criticism: 5 of 24 determiners, quantifiers and negators in the Kernwortschatz top
5000 are taught.** `kein` is rank 170 and is the only way to negate a noun in German,
and there is no card for it. `beide`, `jeder`, `nichts`, `etwas`, `einige`, `welcher`
are absent; `alle` is glossed *finished* and `mal` is glossed *times*.

---

### Cohort 4 · The builders — people who would have to maintain it

**P39 · Sam, iOS engineer** · *prior: neutral*
**Criticism: there is no `visualViewport` handling anywhere in `src/`.** The shell is
`h-[100dvh] overflow-hidden` over an inner scroller; iOS scrolls the *window* to
reveal a caret and nothing puts it back, so after any keyboard use the top bar rides
under the status bar and the scroller cannot reach its own bottom.

**P40 · Aoife, accessibility auditor** · *prior: hostile by role*
**Criticism: `#/settings` goes `h1` → `h3`, skipping a level**, and two focusables —
one on `#/profile`, one on `#/text` — have no accessible name. Small, and the kind of
thing that is only small until somebody is using it.

**P41 · Dmitri, performance engineer** · *prior: neutral*
**Criticism: `sw.js` re-caches the lexicon on every load.** The `/data/` branch is
network-first with an unconditional `cache.put`, so ~6.4 MB is cloned and rewritten
per navigation, and navigations are network-first too — which means the installed PWA
waits for a network timeout before it will show the cached shell. On a U-Bahn that is
the whole experience.

**P42 · Ines, design systems lead** · *prior: **defends** the token architecture*
**Criticism: the contrast guard for the glass was empty.** `palette.test.ts`
composited the alpha over `--color-bg` and `--color-card` and asserted AA — and could
not fail, because those grounds are 1.14 and 1.05 luminance apart, so sweeping the
fill from 100% to *zero* moves `dim` from 6.67 to 5.85. It had been green since it was
written. She would lose the token architecture, which she rates as genuinely rare.

**P43 · Ola, QA** · *prior: neutral*
**Criticism: every custom session was destroyed by its own URL** — the app wrote
`#/session`, its own `hashchange` handler read it back, found no encodable target and
replaced the id list with the day's queue. Three features, one root cause, and it
survived because scoped sessions *are* encodable and hid it. Fixed.

**P44 · Bruno, technical writer** · *prior: **defends** the doc culture*
**Criticism: the docs describe surfaces that were deleted.** `ReminderCard.tsx:38`
tells the learner Lexi will flag a slipping day *"on Home"*, and Home was removed on
2026-09-05; `Review.tsx:441` carries the same reference in a comment. He would lose
the CHANGELOG, which he says is the best-argued engineering history he has read.

**P45 · Priyanka, open-source maintainer** · *prior: neutral*
**Criticism: the corpus is effectively CC BY-SA and the code is MIT, and a
contributor cannot tell which they are touching from inside the repo.**
ATTRIBUTIONS.md says it clearly; nothing in `public/data/` or the authoring scripts
repeats it at the point of use.

**P46 · Wei, release engineer** · *prior: hostile to hand-rolled deploys*
**Criticism: every production build stamped `version.json` with `"dev"`.** A CLI
`vercel --prod` is not a git-linked deploy so `VERCEL_GIT_COMMIT_SHA` is unset, and
`.vercelignore` excludes `.git` so the `git rev-parse` fallback had nothing to ask.
Both rungs of a ladder built to answer *is my fix live?* were missing. Fixed.

---

### Cohort 5 · The contexts — where and on what it is actually opened

**P47 · Piotr, night shift, phone at 40% brightness in a dark room** · *prior: neutral*
**Criticism: none — dark is where the material works.** The glass reads better on dark
than light because the fill differs enough from the ground to be seen. Recorded because
it is the inverse of the finding that drove the scroll-reactive change.

**P48 · Fatima, one-handed, holding a child** · *prior: neutral*
**Criticism: the three word actions — ⓘ, bookmark, cap — sit centred at the vertical
middle of the screen**, which is the hardest place on a 6.3" phone for a thumb. The
gestures reach them, and the gestures are undiscoverable without the coach that
disappears permanently after one dismissal.

**P49 · The Özdemir family, one shared iPad** · *prior: neutral*
**Criticism: local-first means one profile per device and the app never says so.**
Two learners on one iPad share a streak, a queue and an FSRS schedule, and the
recovery is a backup file each. Honest architecture, unstated consequence.

**P50 · Emeka, four-year-old Android, 2 GB RAM** · *prior: hostile*
**Criticism: cold boot is 1.42 MB gzipped and `detail.json` is 810 kB of it**, fetched
on every cold start after first paint. The feed then holds a snap container over
thousands of slots.

**P51 · Léa, school Chromebook, managed profile, storage cleared nightly** · *prior:
neutral*
**Criticism: `navigator.storage.persist()` is requested and a refusal is handled
silently.** On a managed profile the refusal is the normal case, so a term's work can
vanish between Friday and Monday with nothing having warned her.

**P52 · Herr Kaufmann, 68, learning for his daughter-in-law** · *prior: wary*
**Criticism: Fortschritt opens on seven zeroes and Themen on nine 0% bars.** The empty
states *below* the fold are excellent — *"The curve needs a second study day to have a
shape"* is the best line in the app — and the tops of both pages have none.

**P53 · Nour, offline most evenings, prepaid data** · *prior: neutral*
**Criticism: see P41.** The app is architecturally offline-capable and its start path
is network-first, which is the one combination that feels broken to exactly the person
it was built for.

**P54 · Stefan, installs everything to the Home Screen** · *prior: **defends** the PWA*
**Criticism: the reminder card says *"Notifications unavailable — this browser has no
notification support."*** iOS Safari supports Web Push for Home-Screen-installed web
apps; the copy tells every iPhone user their browser cannot do a thing it can do, and
the correct message is an install prompt. He would lose *Add to calendar*, which is a
genuinely smart answer to the same problem.

---

### Cohort 6 · The sceptics — including four whose job is to defend it

**P55 · A rival PM, consumer language app** · *prior: hostile*
"The feed is a good idea executed with more integrity than we would manage."
**Criticism: the feed opens on a lottery.** A cold learner's first word was `grillen`
— Kernwortschatz rank **8,451**, filed under *Core verbs* — and `sein`, rank **4**,
arrived seventeenth.

**P56 · Ben, 40k Anki reviews** · ***assigned the defence***
"Everything I want is here and none of it is hidden behind a subscription."
**Criticism: the recap says *Nothing is due tomorrow* about twenty cards it has just
given a ten-minute interval.** `dueForecast` buckets a due-today card into `out[0]`
and the recap reads `[1]`. He would lose the scheduler's honesty, which is why he is
here.

**P57 · A designer who thinks Liquid Glass is a fad** · *prior: hostile*
"In eighteen months this will date like skeuomorphism did."
**Criticism, and it is a fair one: the material has to be earned per surface.** It is
— glass is chrome-only and content stays paper, which is the rule Apple actually
follows and most imitators do not. Recorded as a challenge answered, not a defect.

**P58 · A linguist who thinks CEFR levels are pseudoscience** · *prior: hostile*
**Criticism: 21% of A1 cards are outside the Kernwortschatz top 10,000** — and the
check that produced that number is *wrong for this question*, because a corpus ranking
punishes concrete local nouns by design and the outliers are `eins`, `zwölf`,
`tschüss`, `die Haltestelle`, which are exactly right for A1. Included deliberately:
this is the shape of a plausible criticism that dies on contact with its own data.

**P59 · A learner who quit at day nine** · *prior: hostile, motivation-fragile*
**Criticism: a wrong answer in the word drill is marked and never explained.** The
correct option goes green, the chosen one red, and nothing says why. `anbieten` is
transparently `an-` + `bieten`, and the moment the learner is most able to hear that
is the moment they got it wrong.

**P60 · A teacher who does not believe apps work** · *prior: hostile*
"Vocabulary apps teach recognition and call it knowing."
**Criticism: partly answered and partly true.** `recall` exists and is production, and
`Known` is ratcheted; the app still cannot hear you say a word. Overlaps P34 and is
kept separate because they would fix it differently.

**P61 · The owner's own advocate** · ***assigned the defence***
"Most of this list is polish on something whose foundations are unusually good."
**Criticism: the highest-value work in the backlog is not on the list at all** — it is
Phase 1 of DICTIONARY.md, ~2,800 more taught cards, because *lookup-only* is where
every migrant persona in Cohort 1 ended up.

**P62 · A11y consultant hired to fail it** · *prior: hostile, paid to find things*
**Criticism: the app's own claim.** VISION lists Inclusivity as a *strength*. The feed
has no headings, the accessibility text sizes break the layout, and the bar labels
fall under AA over their own backdrop. The claim is ahead of the evidence, and that is
the one thing VISION forbids anywhere else.

**P63 · A returning Round-3 persona: Frau Bauer, A2, textbook open** · ***assigned the
defence***
"The density I defended in Round 3 is gone and I miss less of it than I expected."
**Criticism: the app forgot it used to be able to print.** Her class works on paper and
the worksheet printer went with the refocus. Recorded as a consequence of a ruling, not
a defect.

---

### The checks that came back clean

*Written down so the next round does not spend itself here.*

- **Search ranking inside a layer.** `haus` → `das Haus`, `tag` → `der Tag`, `arbeit`
  → `die Arbeit`, `see` → `der See`, all first. The LESSONS-recorded bug that put
  `das Haus` fourth is fixed and stayed fixed. English-side search works too — `kind`
  returns `gütig`, `nett`, `freundlich`.
- **Short examples at A1 are correct, not lazy.** 22.8% of A1 examples are four words
  or fewer and they are *"Guten Tag!"*, *"Ich heiße Anna."*, *"Ich bin müde."* The
  share falls to 1.4% at C2, which is the right shape.
- **Corpus completeness.** 98.4% have IPA, 97.6% of nouns have a plural, 97.1% have a
  definition, and every card with examples has at least two. The 110 with none are
  exactly the 110 `kind: 'grammar'` cards, which are filtered at load.
- **Reduced motion** is honoured in `index.css` and in thirteen components.
- **Privacy.** No account, no backend, no telemetry; the welcome screen says so.
- **Boot has a deadline.** `main.tsx` races three times; an unsettling promise cannot
  strand the splash.

### The verdict, separated from the findings

Fifty-one personas produced **41 distinct criticisms**, of which four were fixed during
the pass, six are already open items restated by a new lens, and three died on their
own evidence. The shape of what is left is not what Round 3 found. Round 3 said the
app looked like the wrong thing. Round 4 says **the app is good and its claims are
slightly ahead of it** — the corpus is strong and biased toward print, the a11y story
is better than most and worse than VISION says, and the two best features in the
product (the text scanner and the two-layer search) are the two most likely to strand
the person using them.

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

> **One deliberate exception, 2026-08-13.** [PEDAGOGY.md](PEDAGOGY.md) runs twelve more
> personas — six learners, six teachers — on the **pedagogy** lens rather than the
> design one, alongside [CRITIQUE.md](CRITIQUE.md)'s investor lens. It is not a fourth
> *round*, which is what the rule above forbids; the rounds in this file are the design
> review and it stays the only one. Where the two overlap, PEDAGOGY marks the finding
> and does not re-count it.
