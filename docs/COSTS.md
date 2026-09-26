# What Lexi costs — and how to help

*Measured 2026-09-26 with `node scripts/costs.ts` (after `npm run build`, on `panel`
at `814cd4a` plus the finance branch), and with `--live https://lexi-eosin.vercel.app`
against production, which was serving `b186ab4`. **Re-run the script before quoting any
number on this page.** The host's limits are its terms, not facts about this repo: they
were read on 2026-09-25 at the links given, and can change.*

**The short version.** Lexi costs close to nothing to run, and that is the architecture
working as intended. Local-first means no server, no database and no accounts, so the
only thing that grows with learners is bytes served from a static host, and those fit
Vercel's free tier with a wide margin. The costs that do exist fall on three parties —
the owner, the learner, and a few free public services — and this page names each one.

---

## Who pays for what

| What | Who pays | What it costs | Where it is decided |
|---|---|---|---|
| Hosting the app and its data | the owner | **$0.** Vercel Hobby, a static deploy with no functions | `vercel.json` |
| A domain | nobody yet | **$0.** `lexi-eosin.vercel.app` is a free subdomain. Decide before any public launch: IndexedDB is scoped to the origin, so in a local-first app **the address is the account**, and moving later strands everyone's progress behind an export and import | owner |
| Writing and checking cards | the owner | the owner's Claude plan and time — the generator is a Claude session and the repo commits only the prompt, the batch and the gate (VISION, *AI conversation tutor*). Not itemised here | `scripts/authoring/` |
| The tutor | **the learner** | the learner's own key, billed per request by Anthropic or OpenRouter. Lexi has no server, never sees the bill and takes no margin | `lib/ai.ts` |
| The HD voice (opt-in) | **the learner's data plan**; served by jsDelivr, cdnjs and Hugging Face | **74.6 MB once**: the Thorsten model is 63.2 MB, and the runtime — phonemizer, ONNX and their scripts — 11.4 MB | `lib/tts.ts` |
| Walk mode's audio | **the learner's phone**, and its data plan once | rendered on the device (`lib/walkAudio.ts`): Lexi hosts no audio. The first walk also fetches the English voice, **63.5 MB** — **138.1 MB** for a learner who has neither voice yet | `lib/walkAudio.ts` |
| Stories | the learner's browser, from each publisher | Lexi ships and hosts no text. tagesschau's API terms allow private, non-commercial use | `lib/news/sources.ts` |
| Name lookups in stories · the human recordings | Wikimedia (the de.wiktionary API) · Tatoeba | free public services, both run by non-profits | `lib/wiktionary.ts` · `lib/audio.ts` |

## What a learner downloads

**First visit** — the page, its fonts, and the three data files `data/index.ts` fetches
before the first word can be drawn:

| File | Built (gzip -9) | Built (brotli, best) | Live, on the wire |
|---|---|---|---|
| `cards.json` — every card's front | 430 KB | 312 KB | **452 KB** |
| main script | 254 KB | 212 KB | 256 KB |
| three fonts (woff2, already compressed) | 97 KB | 97 KB | 97 KB |
| `freq.json` | 61 KB | 50 KB | 61 KB |
| stylesheet | 13 KB | 11 KB | 13 KB |
| `sectors.json` | 4 KB | 3 KB | 4 KB |
| **Before the first word** | **859 KB** | **685 KB** | **884 KB** |

Straight after the first paint, `inflections.json` adds 152 KB (gzip). The live column is
what production (`b186ab4`) serves, which predates this tree's latest corpus and code
changes, so compare down a column rather than across a row.

**Only when used.** Each level's detail file (the back of the card) loads the first time
a word at that level is opened: A1 178 KB · A2 198 KB · B1 309 KB · B2 183 KB · C1 203 KB ·
C2 30 KB (gzip). The dictionary is 232 shards and an index, **4.4 MB** gzipped if every one were
opened; searches fetch only the shards they need.

## How often it is downloaded again

A changed file is fetched again at most **once a day** — whatever the number of commits
behind it. So the unit that costs bandwidth is *days on which something changed*. Over
the last 30 days (from `git log`, an upper bound on days that were actually deployed):

- `cards.json` changed on **4 days** (430 KB gzip each time);
- the code changed on **9 days** (266 KB of script and stylesheet each time; fonts are
  content-hashed and only move when a font does).

**Modelled** — a learner who opens Lexi every single day of such a month, and gets every
change: **5.1 MB a month** (a first visit plus every change-day; no level files,
dictionary shards or voices). Vercel Hobby includes **100 GB** of transfer a month, which
covers **~19,500** such learners. The free tier is not the constraint; its terms are (see
*What would change the bill*).

## Why walk mode renders on the phone

**Modelled** — every word and every example pre-rendered as audio, at an assumed 14
characters a second plus 0.3 s of padding per clip: **34,237 clips, 24.2 hours**.

| Codec | The whole set |
|---|---|
| Opus 16 kbit/s | 194.7 MB |
| Opus 24 kbit/s | 281.7 MB |
| MP3 48 kbit/s | 536.1 MB |
| MP3 64 kbit/s | 710.2 MB |

Today's deploy uploads **38.8 MB in 458 files**; Vercel Hobby's CLI deploys stop at
**100 MB and 15,000 files**. Even the smallest codec does not fit the 61 MB of headroom,
and 34,237 clips break the file limit on their own — before a single learner has
downloaded any of it. Rendering on the phone moves the cost to where it is paid once:
a one-time voice download (above) and a minute of "preparing" before a walk.

## What would change the bill

- **Charging money, in any form** — a supporter unlock, a paid tier, a subscription.
  Vercel's fair-use guidelines restrict Hobby to "non-commercial personal use only", and
  "any method of requesting or processing payment from visitors of the site" is
  commercial; that needs Pro, **$20 a month per seat** when checked. The same page says
  "Asking for Donations **does not** fall under commercial usage". Charging also means
  re-reading tagesschau's terms first (VISION, *Stories join the feed*).
- **Accounts and sync** (`BACKEND.md`, a proposal). A database, sign-in email, an EU
  region, and the duties of a data controller. The storage is cheap; the responsibility
  is not, and the no-account promise is printed in the app.
- **A relay for publishers without open CORS** (VISION, open decision 3b). A server
  function — Hobby includes 1,000,000 invocations a month — but the question that decides
  it is the publishers' terms, not the bill.
- **Hosting audio or images.** Not in the deploy (above). If it ever happens: a separate
  store that does not charge for downloads, content-hashed names, fetched when needed and
  never precached.
- **Store builds.** Developer fees, review and a separate build — see `docs/STORES.md`.

Sources: [vercel.com/docs/limits/fair-use-guidelines](https://vercel.com/docs/limits/fair-use-guidelines),
[vercel.com/docs/limits](https://vercel.com/docs/limits),
[vercel.com/pricing](https://vercel.com/pricing), all read 2026-09-25.

## Grants

*Read 2026-09-25; confirm on each funder's own site before applying.*

- **Prototype Fund** (Germany). The next window is **1 October – 30 November 2026**:
  up to **€47,500 for six months** for an individual. Applicants live in Germany and are
  self-employed or freelance, and the fund's focus since 2025 is data security and
  software infrastructure. Lexi as a consumer app is a weak fit; a reusable part of it is
  a real one — account-optional sync of a local-first review ledger (`BACKEND.md` §4–5
  designs the merge), or the open, Wiktionary-verified German lexicon pipeline. Summary
  read at [starthub-hessen.de](https://www.starthub-hessen.de/de/services/navigator/prototype-fund-bewerbung-ab-01-oktober-2026-moglich/);
  [prototypefund.de](https://prototypefund.de) refused an automated read, so check the
  terms there.
- **NLnet NGI Zero Commons Fund** — closed after its final call on 1 June 2026
  ([nlnet.nl/commonsfund](https://nlnet.nl/commonsfund/)). NLnet runs other programmes.
- **Sovereign Tech Agency** — funds critical open-source infrastructure; an end-user app
  is not that.

## How to help

- **Report a wrong card** — a gender, a plural, a gloss, an example. Open an issue on
  [GitHub](https://github.com/shamilhzm/lexi/issues); a vocabulary app's card reports
  *are* its quality system, and this is the most useful help there is.
- **Contribute** — [CONTRIBUTING.md](../CONTRIBUTING.md).
- **Money — not yet.** There is no sponsorship account, so `.github/FUNDING.yml` is a
  commented placeholder and GitHub shows no Sponsor button. When one exists, it will be
  listed here.

## Before taking any money — the owner's checklist

*Not legal or tax advice; a lawyer and a Steuerberater decide.*

1. **The host.** Donations are allowed on Hobby; anything a visitor pays for is not.
2. **The news.** tagesschau permits private, non-commercial use. A paid build, or any
   store build, leaves stories out until each publisher has said yes.
3. **The legal page.** Per the panel's legal review, the Impressum and privacy notice are
   owed already, while Lexi is free (`public/legal.html`); taking money adds the business
   items.
4. **Tax.** Register with the Finanzamt (*Fragebogen zur steuerlichen Erfassung*) and ask
   about the small-business VAT scheme (§ 19 UStG) and its turnover limits.
5. **Keep sponsorship reward-free.** No perks, no unlocks: a gift, not a sale.
6. **Side activity.** If the owner is employed, or holds a residence permit tied to a job,
   check that a side income is permitted before it starts.
7. **App stores.** An EU *trader* — anyone who monetises — has an address, phone and email
   shown on the listing. A free, unmonetised app can declare itself a non-trader.

## Known gaps

- **The tutor shows no cost.** `ai.ts` drops the provider's `usage` field. Showing tokens
  per request would make the cost visible without Lexi guessing a price; until then the
  settings line points at the provider's own usage page, and it no longer promises
  "cents".
- **The HD voice's five-minute download timeout** (`useHdVoice.ts`) needs about 2 Mbit/s
  at the measured 74.6 MB. A stall timer that resets on progress would not fail a slow,
  working download.
- **Walk mode's copy** says it downloads two voices once, but not how much: 138.1 MB for
  a learner with neither.
- **`cards.json` is one file**, so any corpus change re-sends all of it, and the host
  compresses it on the fly: 452 KB on the wire against 312 KB at brotli's best setting.
  Pre-compressed copies would cut the largest file in the boot by about 30%.
