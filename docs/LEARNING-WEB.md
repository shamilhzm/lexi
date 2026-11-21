# What the best learning websites know, and what Lexi can take from them

*Written 2026-11-21, the day the web-first ruling shipped (VISION, settled decisions).
**Research, not policy.** Nothing here is decided, and every proposal names the ruling
it would need. External figures are cited with the date they were read; they are each
source's own claims and say so where the source is the vendor. Corpus figures come from
`npm run corpus:transfer`, run this session; **re-run it before quoting them.**
[COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md) already surveys the language apps
(Duolingo, Babbel, LingQ, Migaku, Anki, Nicos Weg). This document looks at the wider
set of learning websites that people call effective or beautiful, and asks what their
architecture teaches.*

*Status, later on 2026-11-21: proposals 1–4 are built, and the first slice of 5 (the
keyboard). BACKLOG, *Web first*, item 4, tracks what is left. The shipped transfer
gate is stricter than the measurement in §1: it puts a line on 21.7% of A1 cards, not
the 45% found here, because it refuses what a reader could not see.*

---

## The short version

The ambition: **Lexi becomes the open web's front door for turning the English a person
already has into German**, in the order the evidence supports.

The best learning sites share three things:

1. **A structure the learner can see and trust.** WaniKani's 60 levels, Math Academy's
   knowledge graph, Khan Academy's mastery path. The learner always knows where they
   are and why the next thing is next.
2. **Memory machinery woven into the explanation, not bolted on after it.** Quantum
   Country puts review prompts inside the essay. Execute Program unlocks a lesson only
   once its prerequisites have been reviewed recently.
3. **On the open web, they are public goods with URLs.** Lichess, Wikipedia, Monkeytype
   and Language Transfer are free, have no ads and earn trust by being inspectable.
   Lichess is the closest model for the ambition: a charity that is free, AGPL-licensed
   and ad-free, which commercial chess sites have had to compete with ever since.

Lexi already has the hardest parts: a machine-verified corpus, FSRS, honest numbers,
and films that explain. **The largest single gap is that Lexi ignores the English the
learner arrives with.** Measured this session, **31.1% of A1 cards are recognisable to
an English reader** (borrowed, a visible cognate or a lookalike). A further **14.1% have
an English cognate their gloss never mentions** (*Zimmer · timber*, *Stadt · stead*).
Lexi teaches *der Bruder* as if *brother* did not exist. `src/lib/falseFriends.ts` says
the same in its first lines: *"Everything else in Lexi treats German as if the learner
arrived with no first language."* Its 36 hand-listed false friends are the only place
the app uses the learner's English.

---

## 1. Transfer: the German an English speaker already owns

`npm run corpus:transfer` (`scripts/corpus/transfer.ts`) joins every teachable card to
its English Wiktionary etymology (`data/raw/kaikki-de.jsonl`, CC BY-SA, the corpus's
own source). Each card gets the first class that fits, tried in this order:

| Class | Meaning | A1 examples |
|---|---|---|
| **borrowed** | German took it from English | *das Baby, das Internet, die Jeans* |
| **cognate** | an English cognate is recorded, and it is in Lexi's gloss | *die Mutter · mother, das Jahr · year, das Wasser · water* |
| **inferred** | inherited, and its Proto-West-Germanic ancestor is spelled close to a gloss word | *der Bruder ← \*brōþer · brother, der Tag ← \*dag · day, das Brot ← \*braud · bread* |
| **lookalike** | no recorded link, but spelled like its gloss (ph/f, c/k and y/ie folded) | *die Familie, die Schule, das Hotel* |
| **hidden** | an English cognate is recorded but **not** in the gloss: a link the learner owns without knowing it, or a false friend | *die Sprache · speech, das Zimmer · timber, klein · clean* |
| **none** | none of the above | |

| Level | Cards | Borrowed | Cognate | Inferred | Lookalike | Hidden | None | **Visible** |
|---|---|---|---|---|---|---|---|---|
| A1 | 1,256 | 3.3% | 15.4% | 3.2% | 9.3% | 14.1% | 54.8% | **31.1%** |
| A2 | 1,734 | 3.7% | 5.8% | 1.9% | 10.6% | 9.6% | 68.4% | **22.0%** |
| B1 | 3,026 | 2.7% | 4.7% | 0.9% | 13.1% | 6.4% | 72.1% | **21.4%** |
| B2 | 2,103 | 2.4% | 2.0% | 0.7% | 11.8% | 3.1% | 80.0% | **16.8%** |
| C1 | 2,864 | 1.4% | 1.1% | 0.2% | 14.0% | 2.2% | 81.0% | **16.7%** |
| C2 | 237 | 1.3% | 0.8% | 1.3% | 26.2% | 0.8% | 69.6% | **29.5%** |
| All | 11,220 | 2.5% | 4.6% | 1.1% | 12.6% | 6.0% | 73.3% | **20.7%** |

*Visible = borrowed + cognate + inferred + lookalike.*

**How far to trust it.** Three hits per class were checked by hand, and three bugs were
caught on the way (LESSONS, *der Tag was "borrowed from English"*):
- *Tag* had merged with the loan *Tag* (a tag).
- *Montag* was missed because "English Monday" is capitalised.
- An over-strict plural test dropped *Name* and *Sonne*.

The figures are a **lower bound**. The A1 misses include *Käse · cheese*, *geben · give*
and *Tisch · dish*, which have no ancestor or English word in their entries. It also
doesn't count **compounds of known parts** (*Hausnummer*, *Kühlschrank*), the biggest
unmeasured share. The *hidden* class is noisier: it includes archaic English
(*Wohnung · woning*) and deep links nobody can use (*arbeiten · orphan*).

The curve has a shape worth noting. Germanic transfer is concentrated in A1 and fades.
Latinate lookalikes climb toward C2 (26.2%), where academic German and academic English
share their Latin. So "what you already own" is a different set at each end of the
course.

**What the research says** (read 2026-11-21; a single search, not a review):
- A Penn State study of 35 third-semester learners of German found that explicit
  teaching of the historical sound shifts behind English–German cognates beat meeting
  cognates incidentally. Learners also used it to guess unfamiliar cognates.
- A 2026 Albany dissertation found strong similarity effects but little *extra* gain
  from awareness training.
- One study suggests similarity helps early and may cost later.

So **transfer is a door at A1–A2, not a method for the whole course**, and the effect
has to be measured, not assumed.

**Who teaches this way already:** *Language Transfer*. It is free, has no signup and is
funded by donations. It teaches through the learner's own language: Mihalis Eleftheriou
asks the student to guess how a cognate would sound, then corrects it. It is audio only
and has no spaced repetition. Lexi has the half it lacks.

### What Lexi could do with it, inside the rules

- **A *verwandt* line on the card** · M. *Bruder — English brother*, *Zimmer — English
  timber (z ↔ t)*. Every word comes from the etymology data, never from a model, and goes
  through a gate like every other fact. A sound correspondence is named only when it
  holds over enough cards to be counted. Needs a VISION ruling: it is a new property of
  the word, which the vocabulary ruling allows, but it changes the card.
- **A film: *The German you already know*** · M. It would cover the High German
  consonant shift (*t → z/ss*: *ten · zehn*, *water · Wasser*; *p → pf/f*: *pepper ·
  Pfeffer*, *ship · Schiff*; *d → t*: *day · Tag*) and the Latinate half at C1. Every
  pair would be a card and every rate a corpus count, the films' own contract
  (`films.test.ts`).
- **Generate false friends instead of only hand-listing them** · S. The *hidden* class
  is the candidate pool. A false friend is a recorded cognate whose English word means
  something else (*bekommen · become*). `falseFriends.ts` stays the curated output; the
  instrument proposes and a person decides.
- **Extend the instrument to compounds** · S. Count the cards whose every part is
  already visible. That is the number that would show how far one A1 word reaches.

---

## 2. What the best learning sites do, and what to take

| Site | What makes it work | Take | Leave |
|---|---|---|---|
| **WaniKani** (kanji, web-first) | 60 levels. Radicals come before the kanji built from them, and kanji before the words built from those. Items climb named stages (Apprentice → Burned). A mnemonic for every item | **Parts before wholes**: German's version is word families and compounds (*Haus* → *Hausnummer*, *-ung*, *-heit*), which the pipeline already reasons about (`corpus:families`, `scripts/authoring/derive.ts`). A visible level, honestly earned | Hard gating. VISION: nothing is locked |
| **Math Academy** | A knowledge graph and *Fractional Implicit Repetition*: reviewing an advanced topic credits its prerequisites ("trickles down"), and reviews are chosen to "knock out" other due ones | **Implicit credit through families.** Getting *Hausnummer* right is evidence about *Haus*. Fewer reviews for the same memory | Writing that credit to FSRS unmeasured. VISION #9: a signal the scheduler acts on is one it names. Run it in shadow first |
| **Quantum Country** | The *mnemonic medium*: 112 review prompts inside an essay. The authors' own notes: after 5 days of demonstrated retention the median reader's accuracy is 95%, and the median reader lapses 8 times before reaching that. They call the evidence mostly correlative | The **way it reports**: efficacy published with its caveats, in public. Lexi's honest-number stance could produce the same note | Grading inside a film. Films never grade, and *Learn the words* is the hand-off |
| **Execute Program** | A lesson unlocks only when its prerequisites were recently reviewed. A missed answer doesn't penalise unless you give up. Fewer review levels than WaniKani | **Forgiveness** is already Lexi's (typo tolerance). Take *recently reviewed* as a **suggestion** for the course's next unit | Locking |
| **Khan Academy** | Mastery learning. Its own 2022–23 report links 30+ minutes a week to about 20% greater-than-expected gains. An RCT found an effect of 0.17, concentrated where practice averaged about 35 minutes a week | **Name a dose.** "Fifteen minutes a day" is a claim Lexi could test with its own learners and then state | A dashboard of minutes. Minutes are not evidence; recall is |
| **Explorable explanations** (Ciechanowski, Victor, Nicky Case, Distill) | The reader's attention is guided through a simulation they can move. A 60-article study links interactive articles to better learning | **Films become explorable on a wide screen.** Drag an ending (*-ung*, *-chen*) and watch the gender counts recompute over the corpus. Every fact is still a count | Interactivity that has no fact behind it |
| **Lichess** | A charity with AGPL code and no ads; "never sell our users' data". Funded only by donations. It also publishes its game database | **The organisation.** Free forever, said in writing. **Open data**: publish the corpus as a versioned, citable dataset (it is CC BY-SA already) | Anything that needs a server Lexi doesn't have |
| **Monkeytype** | Open source (GPL-3.0), minimal, keyboard-first, built in public, with themes from the community | **The keyboard.** Typed production is the one production Lexi grades, and a desktop keyboard is its best instrument | 400 themes. DESIGN's identity is one card box. Light, dark and high-contrast are enough |
| **Jisho** | A dictionary praised for "only showing you directly useful information" | The discipline for the word pages (PAGES.md) | |
| **Toucan** (Babbel) | An extension that swaps English words on any page for the target language | The insight: **the open web is the reading room** | An extension is a second product. Stories already bring the web in |

Clozemaster (frequency-ordered cloze, 1,000 words a level) and Lingvist (guess the
word in a sentence before the card) confirm choices Lexi already made: frequency order,
and a first sight that teaches before it tests. Neither suggests anything new.

---

## 3. What the web gives that the phone could not

- **Room for the gesture grammar, laid flat.** On a phone the horizontal axis is
  `[ entry ] [ WORD ] [ practice ]`, one panel at a time. On a desktop the same three
  positions can sit side by side, so it is one grammar, not a second one. A reading text
  with its glossary beside it. The word map with the word open. **Test it on a phone
  first and on a desktop second**, because the phone layout is where defects hide
  (LESSONS).
- **URLs.** Word pages (PAGES.md). Shareable decks and course units. **Embeddable
  films** for a teacher's blog, which would need `frame-ancestors` opened on one route
  (it is `'none'` site-wide in `vercel.json`).
- **The platform's own motion.** Cross-document view transitions shipped in Safari 18.2
  and Chrome, but are partial or absent in Firefox. Scroll-driven animations shipped in
  Safari 26 and Chrome 115, but not Firefox. Both are progressive enhancements: a
  browser without them loses an animation and keeps the content, the commitment the
  entrance guard already keeps. Some of `motion`'s share of the entry chunk could go.
  Measure it before deciding.
- **Open data to move toward:**
  - **Common Voice German 25.0** (CC0, released 2026-03-24): 1,388.85 validated hours
    from 20,466 speakers. That is many voices per word, one licence, and no
    per-recording check, unlike Tatoeba. An ASR gate, like the one planned for Hören's
    clip packs, would select the clips that contain the headword.
  - **OdeNet**, the Open German WordNet (CC BY-SA 4.0). It was built from OpenThesaurus
    and Princeton WordNet and is linked to the Collaborative Interlingual Index, which
    is a route to **sense-level alignment** between an English word and its German
    senses. That is the structured half of "converting a vocabulary". A 2023 paper
    reports errors in its index assignments, so it needs a gate like everything else.
  - **Wikidata lexemes** (CC0) are already in, and **Wiktionary etymologies** (above)
    are already on disk.
- **Storage is not more durable for being SQLite.** WebKit gives a home-screen app its
  own counter of days of use, and grants `persist()` on heuristics that favour home-screen
  apps. As of WebKit's late-2024 bug thread it was still open whether ITP clears OPFS. So
  moving to SQLite-on-OPFS would change the engine and not the risk. The only answer to
  durability that keeps privacy by architecture is **optional end-to-end-encrypted
  sync**. Evolu, for example, uses SQLite and its server sees only timestamps, but it is
  early-stage. That is VISION's open decision 1 (accounts and a backend), not an
  engineering choice.

---

## 4. Language schools: what would actually worry them

A school sells a structured path, a human who corrects your speaking, a group, a
deadline and a certificate. Goethe-Institut's private lessons in Germany cost EUR 890
for 10 (its own price page, read 2026-11-21). I found no official group-course price; a
third-party figure is not quoted here.

**Lexi can beat them on:**
- vocabulary breadth and spacing, the half of a course that classes do worst (see
  COMPETITIVE-RESEARCH on Nicos Weg: *no spaced repetition*);
- explanation on demand, through films;
- price, since it is free;
- time, since it works at any minute;
- honesty, since it never says "you can".

**It cannot** give a human conversation or a certificate. VISION refuses machine-marked
speaking for good reasons, and those still hold.

So the competitive move is not to replace the class. It is to **make the vocabulary half
of every class redundant**, and then prove it:
- *Bring your course book* already works: the text scanner and the course-book audits.
- The transfer layer above shortens A1 for every English speaker.
- What would worry a school is a **published efficacy note** in Quantum Country's
  manner: learners who used Lexi beside a course, what they recalled after 30 days, and
  the caveats. BACKLOG already wants *ten learners*. This is what they would be for.

VISION's refusal of **competing on content volume** stands. The open web gives reach, not
a reason to write more units.

---

## 5. Proposals, ranked

| # | Proposal | Size | Needs |
|---|---|---|---|
| 1 | **The transfer line** on cards, gated from etymology data, plus generated false-friend candidates | M | A VISION ruling (a new card property) |
| 2 | **The film *The German you already know*** (A1) and a Latinate companion at C1 | M | Nothing new: the films' contract covers it |
| 3 | **Word pages** | M | Already planned (PAGES.md), after the domain |
| 4 | **The corpus as a versioned, citable open dataset**, the Lichess database model | S | Owner: where it is hosted, and a DOI |
| 5 | **The desktop layout**: the gesture grammar laid flat, keyboard-first production | M–L | A DESIGN pass; it must stay one grammar |
| 6 | **Common Voice audio for headwords** | M | The ASR gate; COSTS and the legal page |
| 7 | **Implicit credit through word families**, measured in shadow before it writes | M | A VISION #9 amendment, after the shadow data |
| 8 | **Optional end-to-end-encrypted sync** | L | VISION open decision 1 |
| 9 | **An efficacy note**, from ten learners and 30-day recall, published with caveats | S per round | Learners; BACKLOG's *ten learners* |

**Parked:** a browser extension (a second product), community themes, and gating by
mastery.

---

## Sources

Read 2026-11-21.

- WaniKani: [how it works](https://knowledge.wanikani.com/getting-started/how-wanikani-works/) · [SRS stages](https://knowledge.wanikani.com/wanikani/srs-stages/) · [Tofugu](https://www.tofugu.com/japanese-learning-resources-database/wanikani/)
- Math Academy: [Skycak, FIRe](https://justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/) · [how it works](https://mathacademy.com/how-our-ai-works)
- Quantum Country: [retention after five days](https://notes.andymatuschak.org/z2Rv4RAjXUrwa3fMYn9Q1iR) · [effects on reader memory](https://notes.andymatuschak.org/zqetsQERteJhyPitmRoaeE) · [2019 experiment](https://notes.andymatuschak.org/z2cKiAiZ8tAWiz4ZUoTaaBv)
- Execute Program: [Matuschak's notes](https://notes.andymatuschak.org/Execute_Program) · [spaced repetition](https://www.executeprogram.com/spaced-repetition)
- Khan Academy: [efficacy, 30 minutes a week](https://blog.khanacademy.org/new-study-finds-every-minute-spent-on-khan-academy-can-lead-to-learning-gains) · [RCT working paper](https://edworkingpapers.com/sites/default/files/ai24-1036.pdf)
- Explorables: [Victor](https://worrydream.com/ExplorableExplanations/) · [Distill, interactive articles](https://distill.pub/2020/communicating-with-interactive-articles/) · [UW dissertation](https://digital.lib.washington.edu/researchworks/items/5d615042-1f87-433e-9f04-1e2554a8bc97/full)
- Lichess: [why it will always be free](https://lichess.org/blog/YF-ZORQAACAA89PI/why-lichess-will-always-be-free) · [about](https://lichess.org/about) · [open database](https://database.lichess.org/)
- Monkeytype: [interview, three years](https://kbd.news/Interview-3-years-of-Monkeytype-2019.html)
- Jisho: [about](https://jisho.org/about) · [ODict case study](https://contra.com/p/s73AA3cW-building-a-better-dictionary-with-o-dict)
- Language Transfer: [about](https://www.languagetransfer.org/about) · [review](https://fluentu.com/blog/reviews/language-transfer)
- Toucan: [Babbel support](https://support.babbel.com/hc/en-gb/articles/18269893246738-Toucan-browser-extension) · [TechCrunch](https://techcrunch.com/?p=2045090)
- Clozemaster: [cloze tests](https://www.clozemaster.com/blog/cloze-tests-help-learn-language-5x-faster/) · Lingvist: [review](https://www.fluentu.com/blog/lingvist-review/)
- Cognates: [Penn State, historical linguistics in the L2 classroom](https://pure.psu.edu/en/publications/intentional-and-incidental-vocabulary-learning-the-role-of-histor/) · [Albany dissertation](https://scholarsarchive.library.albany.edu/etd/531) · [Frontiers 2021](https://frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.651506/full)
- Common Voice: [Scripted Speech 25.0 – German](https://datacollective.mozillafoundation.org/datasets/cmn4rsdh6009unz07jdn2ol9p)
- OdeNet: [repository](https://github.com/rwingerter55/odenet) · [ILI classification, 2023](https://aclanthology.org/2023.gwc-1.43)
- Storage: [WebKit storage policy](https://webkit.org/?p=14403) · [OPFS and ITP thread](https://bugs.webkit.org/show_bug.cgi?id=276998) · [MDN quotas and eviction](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Sync: [Evolu](https://github.com/manGoweb/evolu) · [Smashing, local-first architecture](https://smashingmagazine.com/2026/05/architecture-local-first-web-development/)
- Platform: [cross-document view transitions](https://web-platform-dx.github.io/web-features-explorer/features/cross-document-view-transitions) · [scroll-driven animations](https://caniuse.com/wf-scroll-driven-animations)
- Goethe-Institut: [private lessons in Germany](https://www.goethe.de/ins/de/en/kur/ang/ind.html)
