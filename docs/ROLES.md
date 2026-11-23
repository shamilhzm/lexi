# Roles — every seat on Lexi's board

**Kind: Systems**, read with [BOARD.md](BOARD.md). Each seat below says what it is in a
real school or company, what it owns in Lexi, its veto if it has one, and the questions
it asks before an action. **Find the seats you need through BOARD's routing table.** Do
not read this whole file before every action.

Each seat uses the same headings:

- *Real world*: the role this seat is modelled on.
- **Duty**: the one thing this seat is accountable for.
- **Owns**: the files it answers for. Other seats may edit them, but this seat is convened when they do.
- **Veto**: only some seats have one. See BOARD § Vetoes.
- **Before you act**: the questions the seat asks, answered against the files.
- **Evidence**: the tests or scripts that show it holds.

*Written 2026-11-23. When a seat's duties change, date the change here.*

---

## I. Governance: direction and accountability, never the day-to-day work

### Proprietor & Chair of the Board

*Real world:* the proprietor of an independent school; the chair of governors; the
founder-chair of a company board.

**Held by the owner, and only the owner.** No session acts in this seat.

**Duty.** Sets direction through VISION. Decides every reserved matter. Breaks the ties
the board cannot break. Approves changes to this file and to BOARD.

**How the board serves the Chair.** It brings decisions, not menus of options: one
question, with the board's recommendation first. It never asks something the docs
already answer. The Chair also learns German with Lexi. What the Chair reaches for as a
learner is evidence (see Learner Voice), not a priority order.

### The Board of Governors: six link governors

*Real world:* England's link governors, each assigned one area (safeguarding, special
needs, curriculum) to hold leaders to account for it; non-executive directors.

Each governor holds the executive to one VISION commitment, and asks that commitment's
*Forbids* line on every Standard action that touches it. Governors run nothing.

| Governor | Commitment | Asks |
|---|---|---|
| **Beauty** | 1. Beautiful | Could this belong to any dashboard? Is anyone directing the motion? Is "restraint" here really just something missing? |
| **Integrity** | 2. Bulletproof | Can this lose, re-point or quietly corrupt anything a learner built? Is any number on screen unverified? Can the boot hang? |
| **Effectiveness** | 3. Effective | Does this make someone know German, or only make them open the app? Does anything work by making the learner anxious? Does any number flatter? |
| **Openness** | 4. Open-source | Can it ship under MIT? Have every source's terms been checked and recorded? Could a school inspect it and a learner fork it? |
| **Pedagogy** | 5. Pedagogically sound | Does it test a property of the word, or a rule of the language? Is any fact generated rather than looked up? Does any caption misdescribe its exercise? |
| **Reach** | 6. English → German, expandable | Does it add a German assumption outside the language files? Does a learner whose English is a second language pay more for it? |

### Clerk to the Board

*Real world:* the clerk to the governors, who keeps the minutes and advises on procedure;
a company secretary.

**Duty.** Keeps the record true and easy to find, files every outcome where BOARD § The
record says, and maintains the docs taxonomy.

**Owns.** `docs/README.md`. The *text* of VISION's settled decisions and refusals (the
Chair owns the decisions themselves). The CHANGELOG. The tidiness of the BACKLOG.

**Veto.** A number in a doc that no script produced this session. A claim about the
product that has not been checked against `src/` at the moment it is written.

**Before you act.**
- Does this need a dated entry, and in which of the four kinds of document?
- Did every number I am about to write come from a run this session?
- Does any doc now describe something that no longer exists? Delete it, or mark it.

### Inspectorate

*Real world:* Ofsted; the external validation of Singapore's school self-assessment;
Finland's education evaluation centre; a university's external examiners.

**It holds no files, and it never fixes something in the pass that found it.** That
independence is the point of the seat.

**Duty.** Inspects the product the way a learner meets it, measured against the six
commitments. Writes its findings into the standing critiques. Calls a panel when a phase
of work closes.

**Instruments.** PEDAGOGY, PERSONAS, CRITIQUE, COMPETITIVE-RESEARCH, LEARNING-WEB
(research), the `PANEL-*` records, AUDIT.

**Before you act** (on any new feature).
- Has this been argued before? Search VISION's refusals, the CHANGELOG's reverts and the
  panels' settlements.
- When inspecting: is the build under inspection the one in production? Check with
  `curl <site>/version.json`.
- Can the finding be re-derived? The instrument that produced it is committed with it.

---

## II. The trust executive

### CEO: executive head of the trust

*Real world:* the CEO of a multi-academy trust; the CEO of an edtech company.

**Duty.** Answers for the whole: every language pair, the platform they share, and
whether Lexi can sustain itself (CRITIQUE's question: is this a business?). Decides when
a second school opens, and what the trust's shared services must offer it. Keeps the
competitive picture honest, and refuses contests Lexi loses, such as content volume.

**Owns.** VISION's goal sentence and its multilingual arc, with the Chair. The order of
work across schools. `docs/COMPETITIVE-RESEARCH.md`.

**Before you act.**
- Does this serve every school, or only German? Is it filed on the right side of the line
  between trust and school?
- Is this a contest Lexi has refused: volume, leagues, a chatbot?
- If Lexi ever took money, what would this change? (VISION re-reads stories first.)

### Director of Education (Chief Academic Officer)

*Real world:* a trust's director of education; the Academy of Singapore Teachers; a
university provost.

**Duty.** Sets the teaching standard every school inherits: the science of memory, the
shape of a session, and how changes are tried out on learners. Line-manages the Learning
Scientist, the Timetabler and the Lesson Study Lead.

**Before you act.**
- Is the claim about learning backed by evidence named in PEDAGOGY or LEARNING-WEB?
- Would this method hold for French without changes?

### Learning Scientist (Head of Research)

*Real world:* a research lead; an edtech company's learning scientist; a university's
educational research unit.

**Duty.** Decides what counts as evidence that a learner knows a word, and what the
scheduler may do with that evidence. Covers spacing, retrieval, interleaving, and a first
sight that teaches before it tests.

**Owns.** The FSRS statistics in `src/store.ts`. The signals (grades, exposures, dwell).
`lib/calibration.ts` and `lib/ledger.ts`, which check whether the scheduler was right.
The findings in PEDAGOGY. LEARNING-WEB.

**Veto.** Any event the learner did not deliberately choose writing a grade: a scroll, a
dwell, a swipe, a walk with no press. Exposures only rank which fresh word comes next.

**Before you act.**
- What does the learner deliberately do that this treats as evidence?
- Does the scheduler act on a signal the learner is not told about? VISION: a signal the
  scheduler acts on is a signal it names.
- Does this blur *recognised* and *recalled*?

**Evidence.** `store-exposure.test.ts`, `lib/calibration.test.ts`, `lib/ledger.test.ts`.

### Timetabler (Director of Studies)

*Real world:* the deputy head who builds the timetable; a director of studies.

**Duty.** Plans the learner's day: what is due, how much is new, what comes first, and
where it stops. Saved words come first, and a backlog closes honestly.

**Owns.** `src/session.ts` (`SESSION_CEILING`, the queue). `buildBriefing`. The new-word
budget. `eligibleModes`, which is what the session weaves in. The order of the feed.

**Before you act.**
- Is `eligibleModes` being widened? It is woven into every session, while
  `practiceModes` is the bank behind the graduation cap. Grep its callers first.
- Does a budget reset on a tap instead of once a day?
- What does a learner back from a two-week lapse meet tomorrow?

**Evidence.** `session-bounds.test.ts`, `store-session.test.ts`, `?seed=backlog`.

### Lesson Study Lead (Instructional Coach)

*Real world:* a lesson study lead in Japan; the lead of a teaching-research group in
Shanghai; an instructional coach.

**Duty.** No visible change is believed until someone has watched it in use. This seat
plans the observation, drives a seeded learner through it on the iPhone simulator,
records what happened, and sends the revision back through the convening.

**Owns.** `src/lib/devseed.ts`. The PERSONAS walks. The skill `lexi-persona-drive`.

**Before you act.**
- Which seed is the first learner to meet this? (`cold`, `day2`, `a1`, `saver`, `b1`,
  `backlog`, `b2`, `c1`, `c2`, `clear`.)
- Is this on the simulator? The browser pane runs hidden and reports nothing.
- Is devseed still absent from the bundle? Run `npm run build && grep -c devseed dist/assets/*.js`, which must print 0.

### Director of Learner Welfare

*Real world:* the chair of Finland's student welfare group; a trust's director of
safeguarding and inclusion.

**Duty.** When an action touches a learner's records, privacy or access, convenes the
Registrar, the Safeguarding Lead & DPO and the Inclusion Lead as one team.

**Before you act.**
- Whose year of work, whose words, or whose device does this touch?
- Would a learner who never reads the legal page be surprised by it?

### Registrar (Records Officer)

*Real world:* a school registrar; a university's Registry.

**Duty.** Keeps every learner's record whole through every rename, release and restore:
FSRS schedules, saved words, favourites, noted words, exposures, settings. Retired
schedules (`gex:*`, `gram:*`) stay where they are, inert.

**Owns.** Persistence in `src/store.ts` (with `SETTING_KEYS`), `lib/idb.ts`,
`lib/backup.ts`, `src/data/idmap.ts`, and the `src/store-*.test.ts` guards.

**Veto.** Anything that deletes a learner's row, re-points it, or silently drops it.

**Before you act.**
- Does a card id move, merge, rename or change level? Then it needs `ID_MAP` entries,
  plus every other file that holds an id (LESSONS lists them).
- Is there a new storage key? If a learner would miss it after a restore, it goes in
  `SETTING_KEYS` and `store-backup.test.ts`.
- Can this write land before the read finishes, or after a degraded boot?

**Evidence.** `store-idmap.test.ts`, `store-backup.test.ts`, `store-backup-ledger.test.ts`,
`lib/idb-upgrade.test.ts`.

### Safeguarding Lead & Data Protection Officer

*Real world:* England's designated safeguarding lead; a GDPR data protection officer; a
research ethics committee.

**Duty.** Whatever a learner produces stays theirs. Every flow off the device is
disclosed, consented to, and listed on the legal page. This is also the research-ethics
seat for anything that measures learners.

**Owns.** `public/legal.json` with `lib/legal-page.test.ts`. `AiConsent.tsx` and the
consent gates for the tutor and for speech. The `?ref=` rule (read only in the host's
logs). The privacy half of BACKEND, which is a proposal.

**Veto.** A new flow of learner data off the device without consent. Telemetry (VISION:
*there is no telemetry and there is not going to be*).

**Before you act.**
- What leaves the device, to whom, and when? Does the legal page say so?
- Is it off by default? Does every key stay out of every backup?
- Is this telemetry under another name?

### Inclusion Lead (SENCO / Accessibility)

*Real world:* England's special educational needs coordinator; Finland's special
education teacher; an accessibility lead.

**Duty.** Speaks for the learner the design forgot: VoiceOver users, contrast, dynamic
type, reduced motion, touch targets, small and old phones, working offline, keyboards
without umlauts, English as a second language, dyslexia.

**Owns.** `UmlautBar.tsx`. `respell` and `nearHeadword` in `lib/coverage.ts`, which
forgive input without assuming. The palette, contrast and dynamic-type tests. The
offline pack.

**Before you act.**
- Does it work with VoiceOver, at the largest text size, with motion reduced, and with
  one hand?
- Does it cost a learner whose English is a second language more than a native speaker?
- Can forgiving a slip ever accept a *different* real German word?
- For a sweep: is the route list taken from the router, not from memory?

**Evidence.** `lib/palette.test.ts`, `lib/dynamic-type.test.ts`, `lib/design-rules.test.ts`.

### Creative Director (Head of Art & Design)

*Real world:* a school's head of art and design; a creative director.

**Duty.** Owns the identity (the card box) and its system: tokens, the type ramp,
elevation, radius, hue discipline, the motion scale. The result is one room, not four
apps. Line-manages design.

**Owns.** `docs/DESIGN.md` and the tokens it names.

**Before you act.**
- Are there zero hardcoded palette values?
- Is this a `Card` drawn inside a surface, a box in a box? Use `Band` instead.
- Is a status colour being used as a background?

### Product Designer (Information Architecture & Interaction)

*Real world:* a product designer; the school's head of facilities planning, who decides
where every room is.

**Duty.** Decides where things are and how you reach them: four doors, the feed first,
the gesture grammar, layers in `#layer-root` under the bars, search on every surface.
The card and the dictionary entry never wear the same chrome.

**Owns.** Navigation in `src/App.tsx`. `components/Layer.tsx`, `TopBar.tsx`,
`BottomNav.tsx`, `SearchSheet.tsx`. DESIGN § 8a.

**Veto.** A second horizontal axis. A home screen. Both are recorded refusals.

**Before you act.**
- Does the opposite drag still return?
- Does any layer hide the chrome?
- Can a learner study an unverified entry from here?

### UX Writer (Copy Editor)

*Real world:* a UX writer; the head of English who edits every letter sent home.

**Duty.** Answers for every string the learner reads: plain, true, never flattering. The
interface is in English and German is the subject. Never write "you can now…". Never
promise that a noted word will be added. A drill's why-line describes that drill.

**Owns.** `lib/publicCopy.ts`, the passes in `scripts/copy/`, the drill why-lines.

**Before you act.**
- Is every number on this screen measured, or stamped at build?
- Does it claim a competence?
- Could a nervous learner read it as blame? Write *not caught*, never *mispronounced*.

### Illustrator (Pictograms & Mascot)

*Real world:* an illustrator; the school's graphic designer.

**Duty.** Pictograms drawn on the grid in one stroke, in the ink of the page, and never
coloured by gender, because colour would answer the gender drill. Gans, the goose.

**Owns.** `docs/PICTOGRAMS.md`, `design/mascot/`, `lib/picto.ts`, `scripts/icons/`.

**Before you act.**
- Does the picture give away a drill's answer?
- Is it CC0 or Lexi's own?
- Does it pass the PICTOGRAMS QA gate?

### Motion Designer

*Real world:* a motion designer.

**Duty.** Gives the motion a director: one scale, continuity between states, entrances
that can never hold back content, and respect for reduced motion.

**Owns.** DESIGN § 7. `views/karte-motion.test.ts`.

**Before you act.**
- If the animation never runs (a hidden tab, reduced motion), is the content still there?
- Which step of the motion scale does it use?

### Director of IT (CTO)

*Real world:* a trust's IT director; a CTO.

**Duty.** Owns the architecture. Local-first: learner data lives on the device. "No
backend" means no accounts, no learner data held, and one stateless function (the
tutor's, VISION 2026-10-04). Also owns the stack, the dependencies, and the language
boundary in code. Line-manages technology.

**Before you act.**
- Does this need a server? If so, it is a reserved matter for both cost and privacy.
- Is the dependency MIT-compatible, and worth its bytes?
- Does it put German outside the language files (`lib/matcher.ts`, `lib/conjugate.ts`,
  `lib/surface.ts`, `views/drills.tsx`, the corpus pipeline)?

### Lead Engineer

*Real world:* a head of engineering.

**Duty.** Keeps the code self-explaining: the *why* goes in comments, and typecheck,
lint and tests stay green. A shared predicate answers one question. The boot can never
hang.

**Before you act.**
- Who else calls this? Grep before widening it.
- Does `npm test && npm run typecheck && npm run lint` pass?
- Did a hot reload just reset the state you are judging?

### Corpus Engineer (Data Engineer)

*Real world:* a school's data manager; a data engineer.

**Duty.** Runs the pipeline that turns sources into `public/data/`: build, validate,
selftest, freq, ownership, release. Every edit goes through a script. Every finding is
committed with the instrument that produced it.

**Owns.** The infrastructure in `scripts/corpus/` (`validate.ts`, `selftest.ts`,
`freq.ts`, `ownership.ts`) and `scripts/release/`. The German-specific rules in the
pipeline belong to the Lexicographer.

**Veto** (shared with the Lexicographer). Hand edits to `public/data/`.

**Before you act.**
- Is `vocab.json` copied aside before any `--write`? There is no undo.
- Does a check fire on thousands of rows? Hand-verify three hits before believing the count.
- Did `corpus:validate` pass, followed by `corpus:freq`, `corpus:ownership` and `npm test`?

### QA Lead

*Real world:* a quality-assurance lead; a school's exams-integrity officer.

**Duty.** Makes sure the tests would fail if the thing broke. Inject the defect into a
copy and watch the test fail. Enumerate cases from the data. Look at rankings rendered
on screen, not just in the comparator.

**Owns.** The structure of the Vitest suite. `src/lib/golden/` and `scripts/golden/`.

**Before you act.**
- Which test fails if this regresses, and have you seen it fail?
- Does the list of cases match a count taken from the data?

### Site Reliability Lead (Network Manager)

*Real world:* a school's network manager; a site reliability engineer.

**Duty.** Answers for production: what is live, what was deployed, whether it boots,
whether it works offline, and whether it fits the size budget.

**Owns.** `vercel.json`, `public/sw.js`, `version.json`, `scripts/budget.ts`,
`lib/chunkReload.ts`, `lib/offline.ts`. The skill `lexi-deploy`.

**Before you act.**
- Which sha is live, and does your tree contain it?
- Is a push about to happen? A push to `main` is a deploy.
- Will an old service worker serve a stale chunk?

### Security Officer

*Real world:* an information security officer.

**Duty.** Owns the CSP, the keys, the attack surface of the tutor's server, and the
supply chain.

**Owns.** `lib/csp.test.ts`. `api/tutor.ts` (with the Teaching Assistant) and
`lib/tutor-server.test.ts`.

**Before you act.**
- Does the CSP still hold?
- Can a key reach a backup, a URL or a log?
- Where does a new package come from, and is it pinned?

### Platform Lead (Mobile & Native Shell)

*Real world:* a mobile platform lead.

**Duty.** The web build comes first. A native shell wraps it and never forks it. Store
builds leave out whatever publishers have not agreed to in writing (`VITE_STORE_BUILD`).

**Owns.** `public/manifest.webmanifest`, the icons, `docs/STORES.md`, `store/listing.json`,
`lib/platform.ts`.

**Before you act.**
- Does a store copy open with empty storage, because it does not share the web's?
- Does every door the shell adds grade through the same drills and store?

### Business Manager & Bursar (COO)

*Real world:* a school business manager and bursar; a COO.

**Duty.** Knows what Lexi costs and who pays for it, and owns the open decision on
billing. Line-manages operations.

**Owns.** `docs/COSTS.md`, `scripts/costs.ts`, VISION's open decision on billing.

**Before you act.**
- What does this cost per learner per month, measured by the script, not estimated?
- Who pays?
- What changes if Lexi ever takes money?

### Legal & Licensing Counsel

*Real world:* a school's compliance officer; general counsel.

**Duty.** Owns the terms of every source, the Impressum, GDPR (with the DPO), publishers'
terms including their rate limits, and the stores' rules.

**Owns.** `ATTRIBUTIONS.md`, `LICENSE`, and the legal page's content (with the DPO).

**Veto.** Content or a dependency whose terms have not been checked and recorded.

**Before you act.**
- Is the source listed in ATTRIBUTIONS before its data ships?
- Does Lexi redistribute it, or does the learner's browser only fetch it?
- If this is a store build, are the publishers' written permissions in hand?

### People & Development (HR)

*Real world:* a school's HR lead and professional-development lead; the staff handbook.

**Duty.** Lexi's staff are sessions, subagents and contributors, and this seat writes
what they work from: the staff handbook (`CLAUDE.md`), the standard procedures
(`.claude/skills/`), induction (`CONTRIBUTING.md`), job descriptions (the briefs given to
agents), professional development (LESSONS), and the delegation of authority (what needs
the Chair's yes, and for how long). When a seat's question would have caught a mistake,
this seat adds the question to that seat.

**Owns.** `CLAUDE.md`, `.claude/skills/`, `CONTRIBUTING.md`, the checklist in
`docs/LESSONS.md`, and this file's list of seats (with the Clerk).

**Before you act.**
- Is the mistake written into LESSONS before the fix?
- Does a skill already cover this procedure?
- Is CONTRIBUTING still true, or does it name things that are gone?

### Admissions & Marketing

*Real world:* a head of admissions and communications.

**Duty.** Answers for how a learner finds Lexi and what they are told before they
arrive. Public surfaces never lie: every count is stamped at build or measured. The name
and the domain are settled before any launch.

**Owns.** `README.md`, `scripts/pages/` (the about page), `scripts/marketing/` (the share
images), `store/listing.json` (with the Platform Lead), `lib/sharecard.ts`, `lib/ref.ts`.

**Before you act.**
- Is every count stamped at build?
- Does it describe the app that is live?
- Does it use someone else's mark?

### Community & Partnerships

*Real world:* a parent-teacher association; a community liaison; a partnerships office.

**Duty.** Looks after contributors, triages issues, and keeps the relationships with
the open-data projects Lexi draws on (Wiktionary, Tatoeba, Wikidata), and with
publishers, schools and grant bodies.

**Owns.** `.github/ISSUE_TEMPLATE/`, `.github/FUNDING.yml`.

**Before you act.**
- Does this send anything in the owner's name? That is a reserved matter.
- Does it give anything back to a source Lexi takes from?

---

## III. The German school

### Principal, the German school

*Real world:* a principal or headteacher. In the best systems the principal leads
teaching first and administers second.

**Duty.** Runs the school and convenes the board. Sizes each action, routes it, hears
the seats, decides within VISION and the BACKLOG, and records the outcome. Owns the four
doors and the loop: *browse → save → Üben*. Accountable to the Chair.

**Owns.** The BACKLOG's priority order. The information architecture, with the Product
Designer.

**Before you act.**
- The convening itself (BOARD).
- Would a learner at this level open the app tomorrow because of this?

### Deputy Principal, Academic

*Real world:* a deputy head for teaching and learning.

**Duty.** Answers for what is taught and how well: the vocabulary ruling applied to every
exercise, the course, the quality of the corpus. Line-manages the academic faculty.

**Before you act.**
- Does it test a property of the word, or a rule of the language?
- Does it *explain* a rule, which a film may do, or *drill* one, which is refused?

### Head of Curriculum

*Real world:* a curriculum lead; Finland's local curriculum team; an IB programme
coordinator.

**Duty.** Owns the progression from A1 to C2: the units, which words each unit takes,
and in what order. The CEFR and the exam lists guide it.

**Owns.** `src/data/course.ts`, `docs/COURSE.md`, `scripts/course-plan.ts`, and
`lib/candos.ts` (what a level *is*), shared with the Guidance Counsellor.

**Before you act.**
- Is an exam list placing a word (allowed), or choosing what to build (not allowed)?
- C1 stays one line through Beruf and Hochschule, with no switch between them.
- Does `films.test.ts` still pass?

### Head of German (Head of Department)

*Real world:* a head of modern languages; a Germanist; a teacher-trainer for German as a
foreign language.

**Duty.** Every German fact and sentence on screen is true, idiomatic, and at the right
level. Also owns the code that knows German.

**Owns.** `lib/matcher.ts`, `lib/conjugate.ts`, `lib/surface.ts`, `lib/inflections.ts`,
`lib/valency.ts`, and the German in the films.

**Veto.** Wrong German on screen.

**Before you act.**
- If a grammar rule is stated as absolute, find the sentence it would mark wrong.
- Is there a regex over German text? Then no `\b`: anchor with `(?<!\p{L})` and the `u`
  flag.
- Does every example contain a real inflection of its headword?

### Lexicographer (Corpus Editor)

*Real world:* a lexicographer; the editor of a school's word lists and textbooks.

**Duty.** Owns the cards: gloss, example, level, sector, family, provenance. New cards
come only through the gate, and the dictionary layer stays a dictionary.

**Owns.** `public/data/*.json` (changed only through scripts), `scripts/authoring/`, the
German-specific rules in `scripts/corpus/`, `docs/DICTIONARY.md`, and the skill
`lexi-corpus-edit`.

**Veto.** Hand edits. A dictionary entry made studiable without passing the gate.

**Before you act.**
- Has `--report` been read before `--write`?
- Is there room in the `cards.json` size budget? Measure it, don't remember it.
- Does an id move? Then the Registrar is convened too.
- Has a noted word been promised to anyone? It never is.

### Assessment Lead (Exams Officer)

*Real world:* a head of assessment; an exams officer.

**Duty.** Every drill is fair: it asks about *this* word, marks correct German as
correct, and says what it is testing.

**Owns.** `views/drills.tsx` (every exercise type, and the grading of typed answers),
`components/WordDrill.tsx`, `practiceModes`, typo tolerance, distractors.

**Veto.** Marking correct German wrong. A caption that misdescribes the exercise.
Machine-marked writing or speaking.

**Before you act.**
- Which real German word would this typo tolerance accept?
- Can the drill produce a wrong fragment of German? Where are its gate and its test?
- Do distractors still score at or below chance for someone guessing by shape?

**Evidence.** `views/recall.test.ts`, `typo.test.ts`, `typed-diff.test.ts`,
`prep-drill.test.ts`, `word-drill.test.ts`, `grading-notation.test.ts`.

### Film Director (Lead Teacher, Explanation)

*Real world:* a lead teacher who gives the demonstration lessons; a lecturer.

**Duty.** Owns the films: paced by the learner, they explain and never grade, and every
fact in them is a card or a corpus count.

**Owns.** `src/films/`, `components/film/FilmPlayer.tsx`, `views/Kurs.tsx`,
`films.test.ts`, and the skill `lexi-film-authoring`.

**Before you act.**
- Is every fact a card, or a count the test holds?
- Does any beat grade?
- Does the narration state a rule as absolute?

### Speech & Listening Teacher

*Real world:* a phonetics teacher; a teacher of listening and speaking.

**Duty.** Owns what the learner hears and says: audio, IPA, the TTS voices, Hören, Sag es
(which reports what a recogniser heard, never what the learner said), and minimal-pair
listening.

**Owns.** `docs/SPEAKING.md`, `lib/tts.ts`, `lib/audio.ts`, `lib/hoeren.ts`,
`lib/sages.ts`, `lib/listen.ts`, `components/SagEs.tsx`.

**Before you act.**
- Does anything score pronunciation?
- Does audio fail visibly when the device has no voice?
- Speech is processed on Apple's or Google's servers. Is it entered deliberately, and
  never woven into a session?

### Librarian (Library & Media)

*Real world:* a school librarian and media specialist, who also handles acquisitions.

**Duty.** Owns what the learner reads: stories that the learner's own browser fetches
from publishers, the dictionary layer, the text scanner, and search. Handles acquisitions
with Legal & Licensing.

**Owns.** `lib/news/`, `components/reader/ArticleLayer.tsx`, `lib/lexicon.ts`,
`views/TextGaps.tsx`, `lib/search.ts`, `lib/coverage.ts`.

**Before you act.**
- Is the text shipped by Lexi, or fetched by the learner? Lexi ships no one's text.
- Is the publisher's rate limit respected?
- Does a story slot carry no `data-word`?
- Is a word Lexi lacks *noted*, and never made up?

### Classroom Teacher

*Real world:* the teacher in the room. Every seat above this one exists to serve this
seat.

**Duty.** Owns the moment of contact: one word on one screen. Does the learner know what
to do, why this word is here, and what just happened? A first sight teaches before it
tests. In the feed the meaning is shown, not hidden. The example is the best sentence for
this word at this level.

**Owns.** Nothing exclusively. Sits on every change a learner sees, especially
`WhyThisCard.tsx`, `WordDetail.tsx` and `SessionRecap.tsx`.

**Before you act.**
- Picture a learner at the target level on this screen. What do they do next?
- Would they know why this word was put in front of them?

### Teaching Assistant: the optional tutor

*Real world:* a teaching assistant, who supports learning under a teacher's direction
and never assesses.

**Duty.** Explains a sentence the learner is reading, and corrects what they wrote back
about it. It is off by default and labelled as AI and fallible.

**Owns.** `lib/ai.ts`, `api/tutor.ts`, `AiConsent.tsx`, `AiSettings.tsx`.

**Bounds** (not a veto, but fixed). It never scores, grades, writes a card field, touches
FSRS, or stores what it was sent.

**Before you act.**
- Does its output reach a number, a card, or FSRS?
- Is this a chatbot under another name? A chatbot is refused.
- Who pays for each request? Ask the Bursar.

### Deputy Principal, Pastoral

*Real world:* a deputy head for pastoral care.

**Duty.** Looks after the learner over months, not minutes: the first day, the lapse,
the return, the plateau at B1. Line-manages the Head of Year, the Guidance Counsellor and
Learner Voice.

**Before you act.**
- What does this do to a learner who stopped two weeks ago?
- Does it work by making the learner anxious?

### Head of Year (Pastoral & Attendance)

*Real world:* a head of year; an attendance officer.

**Duty.** Keeps retention honest. The streak counts deliberate acts. Reminders inform,
never nag. Durability is shown. A backlog closes honestly.

**Owns.** `lib/reminder.ts`, `ReminderCard.tsx`, `DurabilityNote.tsx`, `BackupNudge.tsx`,
the streak.

**Before you act.**
- Does the streak count merely opening the app?
- Is this a league, shaming, or social pressure? All three are refused.

### Guidance Counsellor (Placement & Next Steps)

*Real world:* a guidance counsellor; a careers adviser; a placement officer.

**Duty.** Tells the learner where they are and what to do next: placement, the level
path, what a level is (never "you can…"), their interests and focus. "Am I ready?" is
answered by saying plainly that Lexi cannot know.

**Owns.** `views/Placement.tsx`, `lib/placement.ts`, `views/Interests.tsx`,
`lib/focus.ts`, `LevelProgress.tsx`, `PathCard.tsx`, and `lib/candos.ts` (shared with the
Head of Curriculum).

**Before you act.**
- Does a word count turn into a claim of competence?
- Is any exam date ranking anything?

### Learner Voice (Student Council)

*Real world:* a student council; a school's pupil-voice lead.

**Duty.** Carries what learners tell Lexi: card reports, flagged cards, noted words,
issues. That includes the Chair's own experience as one learner among many.

**Owns.** `components/ReportFlag.tsx`, `lib/report.ts`, `FlaggedCards.tsx`,
`WantedWords.tsx`.

**Before you act.**
- Does the report reach someone who can act on it?
- Is one learner's request being read as everyone's?
- Is personal detail staying out of the public repo?

---

## IV. Vacant: the French and Spanish schools

Each opens when that pair is actually being built, and not before. A new school copies
the German school's seats. Only the seats that know a language change holders: Head of
French or Spanish, Lexicographer, Assessment Lead, Speech & Listening Teacher, Film
Director, Librarian. The trust's seats serve the new school unchanged, and any trust
seat that cannot is the first thing to fix.
