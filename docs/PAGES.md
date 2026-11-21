# Lexi on the open web: a page per headword

*Written 2026-11-21 from the web-first ruling (VISION, settled decisions). **Status,
later the same day:** steps 2 and 3 below are built. `npm run build` writes 11,153
pages to `dist/wort/` with `noindex`, and `#/w/<id>` opens a word in the app. Step 4
waits for the domain. The rest of this document is the plan as written. Every number below comes from `npm run
pages:measure`, run this session on `482f2d5` plus this change. **Re-run it before
quoting any of them.** Host limits are the host's terms, read on 2026-11-21 at the
links given, and they can change.*

---

## Why

Someone types *Band plural* or *der die das Band* into a search box. Lexi has the
answer, machine-verified: both genders, both plurals, the IPA and three graded examples.
But every route in the app is a `#/…` fragment, a crawler ignores the fragment, and so
the answer cannot be found. A static page per headword puts a verified card in front of
that person, and one press opens it in Lexi.

This is also the open corpus made readable. Commitment 4 says anyone can inspect Lexi.
Today that means cloning a repo and opening an 8 MB JSON file. With these pages it means
following a link.

---

## What a page is, and what it is not

- **One page per spelling, with case folded.** `/wort/band` holds *die Band* and *der
  Band*. `/wort/essen` holds *essen* and *das Essen*. Every card with that spelling
  appears on its page.
- **Cards only.** The 93,046 dictionary entries get no page. They are unverified
  Wiktionary glosses, and a page would dress an entry in the card's chrome on a
  stranger's first visit (VISION, *Two layers*). Most of them would also only
  duplicate Wiktionary. A spelling with no card still has the app's search.
- **Static HTML with no script.** A page cannot read or write a learner's store, so it
  cannot grade, and it cannot count an exposure. It honours the feed's rule because it
  has no way to break it.
- **It shows:** the article and headword, plural, IPA, part of speech, level, gloss,
  definition where there is one, every example with its translation, and synonyms and
  antonyms. It **leaves out** audio: Tatoeba recordings carry a licence per contributor
  and the app checks it when it fetches, and a page with no script plays nothing.
  Pictograms (`public/data/picto/`) can come later.
- **One action: *Learn this word in Lexi*** opens `/#/w/<card id>`, the word's sheet
  over the feed. Arriving there saves nothing; only pressing *save* does (the
  bookmark rule).
- **It says what it is.** The footer carries CC BY-SA 4.0, the sources, a Tatoeba
  credit on each example `provenance.json` attributes to Tatoeba, and the line from
  `public/data/NOTICE.txt` that many glosses and examples were written with an AI model
  and machine-checked.

---

## The URL, decided by measurement

| Measured | |
|---|---|
| Teachable cards (`kind: 'word'`) | **11,220** |
| Pages (distinct slugs) | **11,153** |
| Pages holding more than one card | **67.** 65 differ only by case (*essen / das Essen*, *morgen / der Morgen*, *lesen / das Lesen*). Two are true homographs: *die Band / der Band* and *die Entschuldigung / Entschuldigung!* No page holds more than two cards |
| Slugs that keep ä, ö, ü or ß | **1,796** |
| Extra merges an ASCII transliteration would cause | **0.** The check was proven to fire: `maße` → `masse` |
| What a page can show | IPA on 99.8% of cards; a definition on 58.0%; at least one example on 100%; a plural on 6,159 of 6,209 nouns |
| A throwaway prototype page per slug | 11,153 files · 11.3 MB raw · 6.6 MB gzip · 0.60 KB gzip on average · 1.2 s to render |

The prototype's markup is not the design; only its size was read.

- **Case-folded, because a Mac cannot hold both.** `/wort/Essen` beside `/wort/essen`
  would be the more German URL. But `Essen.html` and `essen.html` are one file on the
  case-insensitive APFS a maintainer builds on, so one would silently overwrite the
  other, 65 times. Folding also makes the better page: someone who searched *essen*
  sees the verb and the noun together.
- **The real spelling, not ASCII.** Transliteration would merge nothing today, but it
  would make `/wort/maedchen` the canonical address of a word whose spelling is part of
  the lesson. Browsers show the decoded path.
- **The spelling, not the card id.** An id carries its level (`voc:A1:der Name`) and
  changes on a relevel. A spelling changes only when its card goes.
- **Nothing 404s once published.** Commit the list of published slugs. A test fails
  when a slug disappears without a redirect, either to its nearest page or to search
  with the spelling typed.
- **`/wort/`, and a second language gets its own word.** A French pair would publish
  under `/mot/`, so neither pair collides with the other or needs a rewrite
  (commitment 6). *Owner's call; see below.*

`slug()` and `bare()` live in `scripts/pages/measure.ts` for now. The build and the app
should import one copy from `src/lib/slug.ts`, so a "share this word" link and the page
it points to can never disagree.

---

## Where it touches the app: three things that would break

1. **The service worker would answer a page with the app.** `isShellPath`
   (`public/sw.js:272`) treats every path that does not end in `.html` as the shell. With
   clean URLs, an installed learner who taps a search result for `/wort/band` would be
   shown the feed instead. `/wort/` must count as a document path, cached under its own
   URL the way `legal.html` is. That is the same shape as the 2026-09-25 bug the
   worker's comment records. Extend `src/lib/sw.test.ts` to cover it.
2. **Clean URLs need one rewrite, scoped.** Emit `dist/wort/<slug>.html` and add one
   `rewrites` entry in `vercel.json`, `/wort/:slug` → `/wort/:slug.html`. Do not use
   `cleanUrls: true`, which would also redirect `/legal.html` and change what the worker
   caches. Hobby allows 2,048 routes per deployment and this adds one
   ([Vercel limits](https://vercel.com/docs/limits/overview)).
3. **The app has no word route.** `src/route.ts` names views, decks, sessions and the
   course, but not a word. Add `#/w/<id>`, which opens the feed with that word's sheet
   open. A retired id goes through `src/data/idmap.ts`. An unknown id opens the search
   sheet with the spelling typed.

GitHub Pages builds use the `/lexi/` base (`vite.config.ts:92`). The generator takes the
same base, or those builds skip the pages.

The existing CSP holds unchanged: the pages carry no script, and one static
`pages.css` uses the DESIGN tokens and the self-hosted fonts.

---

## The build

- **`scripts/pages/build.ts`, run after `vite build`, writing only into `dist/`.** The
  pages are generated, never committed and never hand-edited. The corpus rule covers
  their content because the build only renders fields from `cards.json` and
  `detail/`; it writes none.
- It also writes `sitemap.xml` (11,153 URLs, under the 50,000 a single sitemap file may
  hold) and `robots.txt`.
- **Canonical URLs need the final origin, so the pages go live only after the name and
  domain.** Getting `lexi-eosin.vercel.app` indexed and then moving would throw away
  the search ranking, just as moving strands progress. Until then the build ships
  `noindex` so the pages can be reviewed on preview deploys.
- **Host limits.** Vercel sets no cap on output files and warns only that builds slow
  past about 100,000 ([Vercel limits](https://vercel.com/docs/limits/overview)); 11,153
  is far under that. The 15,000-file cap applies to source files a CLI deploy uploads,
  and these pages are generated at build time, not uploaded.
- **Budgets.** The app's entry chunk is untouched, because the pages share no script
  with it. Add a per-page budget to `scripts/budget.ts`: 2 KB gzip, more than three
  times the prototype's average.

---

## What holds it (tests)

- Each page has one `h1` per card, `lang="de"` on every German string, a canonical
  link, and the licence footer.
- Each fact on a page comes from the corpus files. The test reads a sample of pages back
  against `cards.json` and `detail/`, which is the films' rule (`films.test.ts`) applied
  to pages.
- The published-slug list never loses an entry without a redirect.
- The worker answers a navigation to `/wort/x` with that page, never with the shell.
- The build and the app import the same `slug()`.

---

## Order and size

1. **Owner: the name and domain.** This blocks step 4, not steps 2 and 3.
2. **The `#/w/<id>` route and the worker's document path** · S. Useful on its own: the
   app can share a link to a word today.
3. **`build.ts`, `pages.css`, the tests, shipped with `noindex`** · M.
4. **On the settled domain:** canonical URLs, the sitemap, and the site added to Google
   Search Console under the owner's account · S.
5. **Measure after eight weeks** in Search Console: impressions, clicks, and the queries
   that land. The pages add no analytics and Lexi keeps its "no tracking" line;
   Search Console reports from Google's side.

---

## For the owner

1. **The path word.** The plan uses `/wort/`; `/word/` and `/de/` are the alternatives.
   Choose before step 4, because changing a published path later means a redirect for
   every page.
2. **Dictionary entries stay unpublished.** Say so if you want them argued.
