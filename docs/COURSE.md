# The course — A1 → C2 *(2026-11-19)*

Lexi's course is a path of **units** through each level: eight a level, twelve at C1. A
unit is a **situation** and **its words** — *Beim Arzt* and the 24 cards a doctor's
waiting room needs — and most units have a **film**: a two-minute, learner-paced,
animated explanation of one idea about German that the situation needs. You watch the
film, then *Learn the words*, which opens an ordinary Üben session over the unit's
cards.

It lives under Themen (`#/words/kurs/<level>`), because a unit *is* a theme with a
direction. Themen opens with a band pointing at your next unit; Fortschritt's level card
links to your level's course. The why — and what it reversed — is in
[VISION.md](VISION.md), Settled decisions, *The course returns, as films*.

## The principles it is built on

1. **Thematic, not semantic.** A unit groups the words of one situation, not a set of
   near-synonyms: words that share a scene help each other, words that share a meaning
   interfere (Tinkham 1997; [TRAILS.md](TRAILS.md)).
2. **One idea per unit, chosen because the situation needs it.** You report symptoms with
   *müssen* and *dürfen*; you fill in forms full of compounds; you describe a chart with
   *steigen*, *sinken*, *stagnieren*. The idea earns its place by being *used* in the
   unit's German.
3. **Explain, then space.** A film makes a pattern noticeable (Schmidt's noticing
   hypothesis); the scheduler then does what it always did with the items. Neither
   alone is as good.
4. **Segmented and learner-paced.** A film is a run of *beats*; each animates in, and the
   learner moves on when they have it (Mayer's segmenting principle). No clock, no
   autoplay.
5. **Guess before the answer.** Gender and choice beats hold the film until the learner
   commits — the generation effect, and the owner's "open the gap before the answer".
6. **A film never grades.** A guess is a prediction. Nothing in a film writes FSRS; only
   the unit's Üben session does, on words the learner chose to learn.
7. **Every fact comes from the corpus.** A film names cards; their article, plural,
   gloss and examples are looked up. An ending's gender is *counted* over the corpus
   while the beat plays, exceptions listed. Only the explanation and a few short grammar
   sentences are written by hand.
8. **Nothing is locked.** Every unit at every level is open. The marked unit is a
   suggestion: the first whose words are not yet 80% known.

## C1 — one line through Beruf and Hochschule

Language schools split C1 into *Beruf* (telc C1, the workplace) and *Hochschule* (telc
C1 Hochschule, DSH, TestDaF — the university) courses. They share most of what they
teach: nominal style, *Funktionsverbgefüge*, argument, hedging, describing data. Lexi
does not make the learner choose. The C1 line is one path:

- **Kern** units first and throughout: what both settings need.
- **Beruf** and **Hochschule** units **in turn** — never two of one setting in a row.
- **Brücke** (bridge) units teach one skill in both settings side by side: arguing
  (*zwar … aber* in a meeting and in a seminar) and describing a chart (a quarter's
  turnover and a study's sample).

Four units each, Kern · Beruf · Hochschule; `films.test.ts` holds the balance and the
alternation. A switch (Beides / Beruf / Hochschule) was built and removed the same day,
before it shipped, at the owner's direction: a C1 exam and a C1 life both mix the
registers, and the switch invited a learner to skip half of the German they will meet.

## How a unit gets its words

Not hand-listed, so the plan cannot drift from the corpus (`unitCards` in
`data/course.ts`):

1. The cards the unit **names** — its own `terms` (the particles unit names *doch, ja,
   mal* …, which are A1 words mastered at C2) and its film's cards — lead the session.
   A film card more than one level below the unit's lowest level is **scaffolding**
   (*Haus* and *Tür* in the compound film): shown in the film, not taught in the unit.
2. Then the unit's **sectors** at its levels, commonest first, up to 24 cards.
3. **No card is taught by two units** unless one of them names it. Units fill in course
   order, each taking the commonest cards no earlier unit has. (Drawn independently,
   *Argumentieren* and *Karriere* opened on the same three words.)

A unit session passes `course: <unit id>` on its target, which marks the list as
chosen: it bypasses the level filter the way a scanned text's words do.

## Writing a film

A film is data (`src/films/films.ts`) rendered by `components/film/FilmPlayer.tsx`. Beat
kinds (`src/films/types.ts`):

| Beat | Shows | Where its facts come from |
|---|---|---|
| `title` | The idea, in one sentence | Written |
| `words` | Cards dealt one by one | The cards |
| `gender` | Guess a card's article, then the reveal | The card |
| `choice` | Guess between written options | Written — grammar has no card |
| `plural` | Singular → plural, ending and umlaut lit | The cards' `plural` |
| `trap` | A false friend: looks like, means, say instead | `lib/falseFriends.ts` |
| `pattern` | How the corpus genders an ending, counted live | `films/measure.ts` over the corpus |
| `compound` | Parts slide together; the article comes from the last | The cards |
| `order` | Sentences stacked so one position lines up | Written |
| `bracket` | An arc between two words: a separable verb, a clause frame | Written |
| `move` | One sentence becomes another; shared words glide | Written |
| `pair` | Two columns — a row reads left → right, or `split` lists | Cards where items are cards |
| `scale` | One meaning at several registers | Written, cards where named |
| `example` | A card's own sentence, the point marked | The card's examples |
| `say` | One written German line and its English | Written |
| `chart` | A small bar chart and the sentence for it | Written |
| `outro` | The hand-off to the unit's words | — |

**The contract** (`src/films/films.test.ts`, which fails the suite if any breaks): every
named card exists; gender beats ask only nouns; plurals exist and begin with *die*;
traps are in the false-friends list; every pattern's claimed article is the corpus's
majority at ≥ 85% over ≥ 15 nouns; compounds are what they say they are and take the
last part's article; every example quotes a sentence the card really has, marks
included; choices are answerable; a film opens with a title, closes with an outro and
has 5–10 beats; the player imports nothing from the store but `markFilmSeen`.

**Before adding one:** link it from its unit (`film:` in `data/course.ts`), run
`npm test`, then **play it on the iPhone simulator** — three layout defects in the first
films (wrapped pairs overlapping, *Weiter* under the tab bar, a tap freezing the
slide-in) were found that way.

## The plan

Generated from `data/course.ts` on 2026-11-19. Units without a film are listed in
[BACKLOG.md](BACKLOG.md).

### A1

| # | Unit | The situation | The idea | Film |
|---|---|---|---|---|
| 1 | **Hallo!** | Greetings and first words | der, die, das | *Der, die, das* |
| 2 | **Familie** | Family and friends | One noun, two forms: the plural | *Einer, viele* |
| 3 | **Essen und Trinken** | Food and drink | Compound nouns | — |
| 4 | **Meine Wohnung** | Home and furniture | ein, eine: the article family | — |
| 5 | **Mein Tag** | Daily routine and time | The verb in position 2 | *Das Verb an Position 2* |
| 6 | **Einkaufen** | Shopping and prices | einen: the accusative | *einen, eine, ein* |
| 7 | **Freizeit** | Free time | gern and können | — |
| 8 | **In der Stadt** | Around town | Questions: W-word, then verb | *Fragen stellen* |

### A2

| # | Unit | The situation | The idea | Film |
|---|---|---|---|---|
| 1 | **Beim Arzt** | At the doctor’s | müssen, sollen, dürfen | *müssen, sollen, dürfen* |
| 2 | **Arbeit und Beruf** | Jobs and workplaces | -in: der Lehrer, die Lehrerin | *Der Lehrer, die Lehrerin* |
| 3 | **Wohnungssuche** | Finding a flat | Compounds that name things | — |
| 4 | **Was hast du gemacht?** | Talking about the past | Perfekt: haben or sein | *Das Perfekt* |
| 5 | **Feste und Feiern** | Celebrations | Verbs with their preposition | — |
| 6 | **Handy und Internet** | Phones and the internet | Loanwords and false friends | *Falsche Freunde* |
| 7 | **Reisen** | Travel | weil, dass: the verb goes last | *weil und dass* |
| 8 | **Bank und Post** | Banks, post and offices | be-, ver-, er-: prefixes that stay | — |

### B1

| # | Unit | The situation | The idea | Film |
|---|---|---|---|---|
| 1 | **Bewerbung** | Applying for work | Nouns and their verbs | — |
| 2 | **Umwelt** | The environment | -ung, -heit, -keit: always die | *-ung, -heit, -keit* |
| 3 | **Bildung** | School, training, university | Word families | — |
| 4 | **Gesund leben** | Healthy living | sich: reflexive verbs | *sich* |
| 5 | **Konsum** | Shopping and advertising | One verb, many prefixes | — |
| 6 | **Nachrichten** | Following the news | deshalb, trotzdem: connectors | *deshalb, trotzdem* |
| 7 | **Zusammenleben** | Neighbours and society | Relative clauses: der, die, das again | *Relativsätze* |
| 8 | **Ämter und Formulare** | Offices and forms | Long words, short parts | *Lange Wörter* |

### B2

| # | Unit | The situation | The idea | Film |
|---|---|---|---|---|
| 1 | **Arbeitswelt** | The changing workplace | From verb to noun | *Vom Verb zum Nomen* |
| 2 | **Wissenschaft und Technik** | Science and technology | International endings | *Internationale Endungen* |
| 3 | **Wirtschaft** | Economy and finance | Describing change | — |
| 4 | **Politik** | Politics and elections | The passive: what happens | *Das Passiv* |
| 5 | **Meinung** | Opinions and debate | Phrases for an opinion | — |
| 6 | **Energie und Klima** | Energy and climate | Compounds for ideas | — |
| 7 | **Gesundheitssystem** | The health system | Prepositions that belong to verbs | — |
| 8 | **Kunst und Kultur** | Art and culture | Konjunktiv II: würde, hätte, könnte | *Konjunktiv II* |

### C1

| # | Unit | The situation | The idea | Film |
|---|---|---|---|---|
| 1 | **Nominalstil** · *Kern* | How reports and papers sound | weil … → wegen … | *Nominalstil* |
| 2 | **Besprechung und Protokoll** · *Beruf* | Meetings and minutes | The words that run a meeting | *In der Besprechung* |
| 3 | **Studium** · *Hochschule* | Lectures, seminars, office hours | The words of a university | — |
| 4 | **Funktionsverbgefüge** · *Kern* | Noun-verb expressions | eine Entscheidung treffen | *Funktionsverbgefüge* |
| 5 | **Geschäftskorrespondenz** · *Beruf* | Business letters and complaints | The formal register | — |
| 6 | **Wissenschaftlich schreiben** · *Hochschule* | Writing a paper | Konjunktiv I for other people’s claims | *Wissenschaftlich schreiben* |
| 7 | **Argumentieren** · *Brücke* | Arguing in a meeting and in a seminar | zwar … aber: conceding and countering | *Zwar … aber* |
| 8 | **Karriere und Verhandlung** · *Beruf* | Career and negotiation | Negotiating politely | — |
| 9 | **Referat und Diskussion** · *Hochschule* | Presenting and discussing | Phrases that structure a talk | — |
| 10 | **Grafiken beschreiben** · *Brücke* | A chart at work and at university | steigen, sinken, stagnieren | *Eine Grafik, zwei Welten* |
| 11 | **Wirtschaft und Verantwortung** · *Beruf* | Business, ethics and digital work | Abstract nouns of responsibility | — |
| 12 | **Forschung und Ethik** · *Hochschule* | Research and its ethics | Hedging a claim | — |

### C2

| # | Unit | The situation | The idea | Film |
|---|---|---|---|---|
| 1 | **Redewendungen** | Idioms | Pictures that mean something else | *Redewendungen* |
| 2 | **Register** | Casual, neutral, formal | kriegen, bekommen, erhalten | *kriegen, bekommen, erhalten* |
| 3 | **Wortbildung** | Prefixes and suffixes that carry meaning | -bar and -los | *-bar und -los* |
| 4 | **Recht** | The language of law | Legal compounds | — |
| 5 | **Finanzwelt** | Markets and the global economy | The register of finance | — |
| 6 | **Wissenschaftssprache** | Scientific German | Precision words | — |
| 7 | **Modalpartikeln** | Small words that set the tone | doch, ja, mal, halt | *Modalpartikeln* |
| 8 | **Stil und Ausdruck** | Style and expression | Words for nuance | — |

*52 units, 29 films, as of this page.*
