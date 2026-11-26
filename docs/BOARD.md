# The board — how Lexi is organised, and how it decides

**Kind: Systems** — how the project decides. **It sits beneath [VISION.md](VISION.md)**,
which is the charter: when this file disagrees with VISION, VISION wins and this file is
fixed. **Read [the convening](#before-every-action--the-convening) before every action.**
Then use [the routing table](#the-routing-table) to find which seats in
[ROLES.md](ROLES.md) to read. You never read all of them.

*Written 2026-11-23 at the owner's direction. Argue with it here, dated.*

---

## Why Lexi has a board

Lexi is built by one owner and a series of sessions, and no session remembers the one
before. Each one has to work out again what a school keeps in its staff: who checks the
German, who protects a learner's records, who refuses a number that flatters. The panels
of 2026-09-25 and 2026-10-04 showed what works. Ten seats each asked their own question,
and they caught what one generalist missed. This file makes those seats permanent.

**Seats are lenses, not people.** A session sits in every seat it convenes, and a
contributor can sit in any seat. A seat's authority comes from the commitment it guards,
not from where it sits on the chart. **The Registrar can stop the CEO.**

---

## What the best systems share, and where Lexi puts it

| What works | Where it is proven | In Lexi |
|---|---|---|
| **Governance, management and teaching are kept apart.** Governors set direction and hold leaders to account. Leaders run the school. Teachers own the craft. | England's governance handbook (direction, accountability, financial oversight); a university's council and senate | The owner (Chair) and VISION set direction. The Principal runs the work. Specialist seats own their files. |
| **Tight on what is learned, loose on how it is taught.** A national core curriculum sets the content and local schools design the teaching. | Finland's national core curriculum and its municipal curricula | CEFR and the exam lists set the progression. They guide it and are never the goal (ruled 2026-11-21). Units, films and drills are designed here. |
| **A system is only as good as its teaching.** | McKinsey 2007, *How the world's best-performing school systems come out on top* | Every surface teaches: the example sentence, the drill's caption, the film beat. The Classroom Teacher and the Head of German sit on every change a learner sees. |
| **Every learner who falls behind gets help early.** | Finland's part-time special education; Singapore's Learning Support Programme | Blind spots, recovery after a lapse, a backlog that closes honestly. The Inclusion Lead and the Head of Year own these. |
| **Teachers improve by watching lessons together.** Plan, teach, observe, revise. | Japan's lesson study; Shanghai's teaching-research groups | The Lesson Study Lead drives every visible change as a seeded learner on the iPhone simulator before anyone believes it works. |
| **Specialists have standing, not just seniority.** Teaching, leadership and specialist work are separate career tracks. | Singapore's three career tracks | The seats with a veto are specialists. The chart shows who reports to whom, not who is right. |
| **Inspection is independent of delivery.** | England's Ofsted; Singapore's School Excellence Model (self-assessment, external validation); Finland's enhancement-led evaluation | The Inspectorate (the standing critiques, the panels, AUDIT) reports and fixes nothing. It inspects production, not the checkout. |
| **Welfare is one team, not a chain of referrals.** | Finland's multi-professional student welfare group | Records, privacy and accessibility sit together under the Director of Learner Welfare, and are convened together. |
| **Services are shared across schools, and each school runs itself.** | England's multi-academy trusts; Singapore's school clusters | Trust-wide seats (technology, design, records, the science of memory) serve every language pair. Each language is a school with its own Principal and faculty. |
| **Leadership stays continuous and the institution remembers.** | McKinsey 2010, *How the world's most improved school systems keep getting better* | The Clerk keeps the record (VISION rulings, CHANGELOG, LESSONS), because no session remembers the last one. |

---

## The chart

```
Proprietor & Chair of the Board ····· the owner            charter: VISION.md
├─ Board of Governors ··············· six link governors, one per commitment
├─ Clerk to the Board ··············· the record
├─ Inspectorate ····················· independent: reports, never fixes
│
└─ CEO ······························ executive head of the trust (every language pair)
   │
   │  THE TRUST: shared by every school, and must not know German
   ├─ Director of Education ········· the science of teaching
   │  ├─ Learning Scientist
   │  ├─ Timetabler
   │  └─ Lesson Study Lead
   ├─ Director of Learner Welfare ··· records, privacy, access
   │  ├─ Registrar
   │  ├─ Safeguarding Lead & Data Protection Officer
   │  └─ Inclusion Lead (SENCO)
   ├─ Creative Director ············· design
   │  ├─ Product Designer
   │  ├─ UX Writer
   │  ├─ Illustrator
   │  └─ Motion Designer
   ├─ Director of IT (CTO) ·········· technology
   │  ├─ Lead Engineer
   │  ├─ Corpus Engineer
   │  ├─ QA Lead
   │  ├─ Site Reliability Lead
   │  ├─ Security Officer
   │  └─ Platform Lead
   ├─ Business Manager & Bursar ····· operations
   │  ├─ Legal & Licensing Counsel
   │  ├─ People & Development (HR)
   │  ├─ Admissions & Marketing
   │  └─ Community & Partnerships
   │
   │  THE SCHOOLS: one per language pair, and allowed to know their language
   ├─ Principal, the German school ·· English → German
   │  ├─ Deputy Principal, Academic
   │  │  ├─ Head of Curriculum
   │  │  ├─ Head of German
   │  │  ├─ Lexicographer
   │  │  ├─ Assessment Lead
   │  │  ├─ Film Director
   │  │  ├─ Speech & Listening Teacher
   │  │  ├─ Librarian
   │  │  ├─ Classroom Teacher
   │  │  └─ Teaching Assistant (the optional tutor)
   │  └─ Deputy Principal, Pastoral
   │     ├─ Head of Year
   │     ├─ Guidance Counsellor
   │     └─ Learner Voice
   ├─ Principal, the French school ·· vacant
   └─ Principal, the Spanish school · vacant
```

**The line between the trust and the schools is the language boundary.** A file owned
by a school seat may know German. A file owned by a trust seat must not learn it. This
is VISION's multilingual rule (*refuse new German assumptions outside the language
files*), given a place on the chart. When a second pair is built, it opens a school with
its own Principal and faculty, and it uses every trust seat unchanged. If a trust seat
cannot serve the new school unchanged, it was holding German it should not have held.
**Vacant schools stay vacant** until a pair is actually being built (VISION: *do not do
this speculatively*).

---

## Before every action — the convening

**First, size the action.**

| Tier | When | What the convening is |
|---|---|---|
| **Routine** | The change stays inside one seat's files, and nothing a learner sees or keeps changes: a test, a comment, a doc link, a refactor that changes no behaviour. | Name the seat that owns the files and ask its questions. Nothing is recorded beyond the commit. |
| **Standard** | Anything a learner can see, hear or keep. Any corpus or data change. Any new file, dependency or surface. | All seven steps below. |
| **Reserved** | A [reserved matter](#reserved-matters). | All seven steps. Step 5 waits for the Chair's yes in chat, in this turn. |

**The seven steps**

1. **Say it.** In one sentence: what changes, and for which learner.
2. **Route it.** Collect every seat the routing table names. Add the link governor for
   each commitment the action touches. Read those seats' sections in ROLES.md.
3. **Check the record.** VISION's refusals and settled decisions. The CHANGELOG (was this
   tried and reverted?). The BACKLOG (is it already open, with acceptance criteria?).
   The checklist at the top of LESSONS.
4. **Hear the seats.** Answer each seat's *Before you act* questions against the actual
   files, not from memory. A [veto](#vetoes) stops the action. A concern is weighed by
   [the tie-break](#when-concerns-conflict--the-tie-break).
5. **Act**, within what the seats allowed.
6. **Inspect** the change where a learner meets it: the simulator for anything visible,
   `version.json` for anything live, the test or script for anything measured.
7. **Record.** The Clerk files the outcome ([the record](#the-record)).

**Tell the owner in one line.** For Standard and Reserved actions, the reply names the
seats convened, any veto or concern, and how it was settled. For example: *Board:
Registrar, Assessment Lead; the Inclusion Lead's touch-target concern was fixed.* Keep it
to that one line. The detail belongs in the files.

**Ask the owner only** for a reserved matter, or when a seat's objection cannot be
settled from the docs and acting anyway would lower the quality of the result. The board
settles everything else.

---

## The routing table

A seat in **bold** holds a veto on that row.

| If the action touches… | Convene | Procedure |
|---|---|---|
| `public/data/*.json`, `scripts/corpus/`, `scripts/authoring/` | **Lexicographer** · Head of German · Corpus Engineer · **Registrar** if a card id moves | skill `lexi-corpus-edit` |
| Learner state: `store.ts`, `lib/idb.ts`, `lib/backup.ts`, `data/idmap.ts`, any storage key | **Registrar** · Lead Engineer · Safeguarding & DPO | — |
| A drill, grading, typed answers, distractors (`views/drills.tsx`, `ModeItem`, `WordDrill.tsx`) | **Assessment Lead** · Head of German · Learning Scientist · Classroom Teacher | — |
| The scheduler or a session (`session.ts`, FSRS, `buildBriefing`, the budgets) | Timetabler · **Learning Scientist** · Head of Year | — |
| The feed (`views/Feed.tsx`, `lib/feedSlots.ts`, exposures) | Principal · **Learning Scientist** · Product Designer | — |
| The course or a film (`data/course.ts`, `src/films/`, `Kurs.tsx`) | Head of Curriculum · Film Director · **Head of German** | skill `lexi-film-authoring` |
| Stories, the dictionary layer, search, the text scanner | Librarian · Product Designer · **Legal & Licensing** | — |
| Audio, IPA, speech — Lexi is silent since 2026-11-26, so any sound is a VISION change | Speech & Listening Teacher · **Safeguarding & DPO** · Legal & Licensing | VISION, refusal *A closed voice* |
| The exam room (`views/Exam.tsx`, `views/exam/`, `lib/exam.ts`, `lib/quiz.ts`, `data/exams/`) | **Assessment Lead** · Head of German · Legal & Licensing · Learning Scientist | VISION, *The exam room returns* |
| The tutor (`lib/ai.ts`, `api/tutor.ts`) | Teaching Assistant · **Safeguarding & DPO** · Security Officer · Bursar | — |
| Any words a learner reads in the interface | UX Writer · Classroom Teacher · **Clerk** if it states a number or a competence | — |
| Anything visual: layout, motion, gesture | Creative Director · **Product Designer** · Inclusion Lead · Lesson Study Lead | skill `lexi-persona-drive` |
| Placement, levels, progress, the streak, reminders | Guidance Counsellor · Head of Year · Learning Scientist | — |
| Anything that leaves the device | **Safeguarding & DPO** · Security Officer · Legal & Licensing | — |
| A new data source, text, image, sound or dependency | **Legal & Licensing** · Librarian · CTO | `ATTRIBUTIONS.md` |
| A deploy, or a push to `main` (a push is a deploy) | Site Reliability Lead · Principal · **Chair** | skill `lexi-deploy` |
| The README, about page, store listing, share image, legal page | Admissions & Marketing · Legal & Licensing · **Clerk** | — |
| The native shell, manifest, icons, the stores | Platform Lead · Legal & Licensing · Admissions & Marketing | `docs/STORES.md` |
| Money: hosting, a server, a paid API, billing | Bursar · **Chair** | `docs/COSTS.md` |
| A new feature, surface or room | Principal · all six governors · Inspectorate (has it been argued before?) | — |
| Reopening a refusal or a settled decision | **Chair** · Clerk · the governor of the commitment it touches | — |
| Code with more than one caller, tooling, tests | Lead Engineer · QA Lead | — |
| A second language pair, or German leaking into a trust file | CEO · CTO · Director of Education | — |
| `CLAUDE.md`, skills, `CONTRIBUTING.md`, agent briefs, memory | People & Development | — |
| A doc | Clerk | `docs/README.md` |
| A mistake has just been caught | People & Development first (the LESSONS entry goes in before the fix), then the seats for the fix | `docs/LESSONS.md` |

---

## Decision rights

### Who decides

| Decision | Decides | Must consult | Recorded in |
|---|---|---|---|
| What to build next | Principal, within the BACKLOG | Director of Education, Deputy Principal (Pastoral) | BACKLOG |
| Whether a feature belongs at all | Principal, against the six governors | Inspectorate | VISION, if it sets a precedent |
| A German fact (gender, plural, IPA, part of speech) | **The gate** (`authoring:new`). Facts are looked up, never decided, and no seat overrides them by hand. | Lexicographer, Head of German | provenance, CHANGELOG |
| Whether German on screen is correct | Head of German | Assessment Lead | CHANGELOG |
| What the scheduler counts as evidence | Learning Scientist | Timetabler, Registrar | VISION (every signal is named) |
| A visual or interaction pattern | Creative Director | Product Designer, Inclusion Lead | DESIGN |
| A licence or a source | Legal & Licensing | Librarian | ATTRIBUTIONS |
| A data flow off the device | **Chair**, on the DPO's advice | Security Officer, Legal & Licensing | the legal page, VISION |
| The order of work across language pairs | CEO, then the **Chair** | Director of Education | VISION, the multilingual arc |
| A new seat, or a change to a seat's duties | People & Development, ratified by the **Chair** | Clerk | this file and ROLES |

### Reserved matters

Only the Chair (the owner) decides these, in chat, one turn at a time. An approval in one
turn does not carry over to the next.

- Amending VISION, or reversing a refusal or a settled decision. The argument is written
  into VISION first. The owner ruled on 2026-11-19 that VISION may be overridden on
  pedagogic grounds, provided the reasons are recorded.
- Pushing to `main` or deploying.
- Any change that deletes or rewrites a learner's stored data, or a migration that cannot
  carry a schedule across.
- Any new flow of learner data off the device.
- Spending money or taking it, or changing who pays.
- A new relationship with a publisher or content owner, or a new licence obligation.
- Opening or closing a language school. The name and the domain.
- Posting, sending or publishing anything in the owner's name: an issue, a store listing,
  a post.

### Vetoes

A veto is not weighed against anything. It is a seat saying the action does what a
VISION *Forbids* line, or a recorded refusal, forbids. The action changes until the veto
lifts. Otherwise the Chair overrides it, and the Clerk records the override in VISION.

| Seat | Vetoes an action that… |
|---|---|
| Registrar | loses, re-points or deletes a learner's schedule, saved words or settings |
| Head of German | puts wrong German on screen |
| Assessment Lead | marks correct German wrong, or captions an exercise as something it isn't |
| Learning Scientist | lets an event the learner did not deliberately choose write a grade |
| Lexicographer | edits the corpus by hand, or makes a dictionary entry studiable without the gate |
| Safeguarding & DPO | sends what a learner produces off the device without their consent, or adds telemetry |
| Legal & Licensing | ships content or a dependency whose terms are unchecked, or that cannot be shipped under MIT |
| Clerk | states a number no script produced this session, or a competence the evidence doesn't support |
| Product Designer | adds a second horizontal axis or a home screen (both recorded refusals) |

**A veto has to restate what it prevents** and show that this action does that. LESSONS
puts it this way: *a rule you can only quote, not restate, has stopped being a rule.* A
veto that only quotes the rule counts as a concern.

### When concerns conflict — the tie-break

Concerns are weighed in this order. The order comes from VISION's goal sentence and from
the 2026-09-25 panel, where all ten seats put data loss first. The first three are
vetoes when they are broken outright. They are listed here as well because most conflicts
are about degree.

1. **The learner's record survives.**
2. **The German is true.**
3. **It is honest.** Nothing flatters, and nothing claims more than the evidence shows.
4. **The learner knows more German because of it.** This is the clause that, in VISION's
   words, "decides everything else".
5. **It is learnable and beautiful.**
6. **The next language pair stays an implementation, not a rewrite.**
7. **It is cheap to run and to maintain.**

Anything still tied after that goes to the Chair.

---

## The record

There is no minutes file, because the existing docs are the minutes, and `docs/README.md`
allows no fifth kind of document.

| What happened | Where it goes |
|---|---|
| A ruling, a refusal, a reversal, or an overridden veto | VISION, dated, with what changed |
| Something shipped | CHANGELOG, with why |
| Something left open | BACKLOG, with its done-when |
| A mistake was caught | LESSONS, before the fix |
| A seat's duties changed | ROLES, dated |

---

## Inspection

The Inspectorate holds no files, and a finding is never fixed in the same pass that found
it. That separation is what makes it an inspection. Its instruments are the standing
critiques (PEDAGOGY, PERSONAS, CRITIQUE, COMPETITIVE-RESEARCH), the panels (`PANEL-*`) and
AUDIT. A fix the Inspectorate asks for goes through the convening like any other action.
A full inspection is a panel. The Chair or the Principal calls one when a phase of work
closes, or before a launch.

---

## Changing the board

This is a Systems doc, so argue with it here, dated. A seat earns its place by owning a
question that no other seat asks. A new seat is added when work keeps needing a question
that nobody is asking. A vacant seat stays vacant until there is work for it.
