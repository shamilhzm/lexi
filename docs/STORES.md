# Lexi in the app stores — the plan, the listing, and what the owner has to do

*Written 2026-09-26 from the panel review (09 · app stores, rounds 1–3). A **plan**, not
a shipped state: nothing here has been submitted. Every number was measured in this
session. Where a number is an estimate, it says so.*

---

## The decision, and the order

**Web first. The stores come second, and Android comes before iOS.**

1. **Before any store:** settle the domain and the name. IndexedDB belongs to an
   origin, and so do a TWA's `assetlinks.json`, the privacy-policy URL and the
   support URL. Packaging `lexi-eosin.vercel.app` and moving later would strand every
   learner's progress. The data-loss fixes and the legal page are already merged.
2. **Google Play, as a Trusted Web Activity** (Bubblewrap). A TWA *is* the website:
   same deploy, same origin, same Chrome storage. A learner who used Lexi in Chrome
   keeps their words, and every Vercel deploy updates the app. Estimate: about a
   day of work, plus Play's 14-day closed test (below).
3. **iOS, as a Capacitor app with the bundle inside it.** Do this only when the
   conditions under *iOS* are met. A shell that loads the website instead of
   bundling it is the classic Guideline 4.2 rejection ("a repackaged website"). The
   bundled data is the strongest answer to 4.2: every word and every dictionary
   entry works in airplane mode.

**Why bother at all.** Reach is not the reason; the reasons are the two things the
web cannot do for a local-first app. Storage in an app container is not subject to
Safari's eviction of script-writable storage. And a native local notification fires
with the app closed and needs no server, which dissolves the collision BACKLOG
describes between reminders and "no backend".

---

## What is in the repo now

| Piece | Where | Checked by |
|---|---|---|
| One mark. Every PNG is rendered from `public/icon.svg` by `npm run icons`: full-bleed opaque apple-touch-icon (180), `any` 192/512, maskable 192/512, and an opaque 1024 App Store icon | `scripts/icons/`, `public/icon-*.png`, `public/icons/` | `scripts/icons/raster.test.ts`: pixels match a fresh render; maskable mark inside the 80% safe zone; 1024 has no alpha |
| A complete manifest: `id` pinned to the identity existing installs already have, `purpose` on every icon, three labelled narrow screenshots (720×1298), and a **Start a walk** shortcut to `/?walk` | `public/manifest.webmanifest`, `public/screenshots/` | `scripts/icons/manifest.test.ts` |
| A store-build switch: `VITE_STORE_BUILD=1 npm run build` uses relative asset URLs for a native shell and turns off what store copies may not carry yet. A Play TWA is recognised at runtime by its `android-app://` referrer | `vite.config.ts`, `src/lib/platform.ts` | `src/lib/platform.test.ts` |
| Listing text for both stores | `store/listing.json` | `store/listing.test.ts`: limits, keywords, banned names, no stories/tutor, no "offline" on Play, every number ≤ the corpus |

**Measured today.** The corpus in this tree teaches **10,078** words (`cards.json`
without the `kind: 'grammar'` rows) and answers **93,046** dictionary entries (232
shards). A store build is **40.4 MB** on disk (`du`, vocab.json excluded as the
normal build excludes it), of which the dictionary shards are 29 MB. Its
`index.html` references `./assets/…`, as a native shell needs.

**Screenshots in the manifest are for Chrome's install sheet, not for the stores.**
They were cropped from the panel's iPhone 17 Pro simulator shots (dev build, seeded
learners, 2026-09-25), with Safari's chrome removed. Recapture them when the surfaces
change.

---

## What a store copy leaves out, and when it comes back

`lib/platform.ts` decides this, at three entry points: the feed's story loader and
topic question, the topics and tutor sections of Settings, and Profile's support link.
The web app loses nothing, and nothing touches a learner's stored choices.

| Off in store copies | Why | Comes back when |
|---|---|---|
| **Stories** (feed slots, topic picker, reader) | App Store 5.2.2 requires permission to display third-party content, with proof on request. Today Lexi has only the learner's private fetch (VISION, *Stories join the feed*) | A publisher grants it in writing. The legal panelist rates DW, a learning broadcaster, the likeliest yes. Record the grant in `ATTRIBUTIONS.md` and re-enable per source |
| **The tutor** | Its only job is explaining what the learner reads, so it has no surface without stories. If it ever returns, 5.1.2(i) requires naming the provider and asking consent before the first send (the consent step exists) | Stories return |
| **"Support Lexi's development"** | A heart asking for support reads as a donation ask outside in-app purchase (3.1.1) | A non-store copy only, or a US-storefront-only build if external links are wanted |

In a bundled build, `VITE_STORE_BUILD` is a literal, so no launch-time signal can turn
stories back on. The story *code* still ships in that bundle, unreachable, because the
checks are function calls the minifier does not inline (LESSONS, 2026-09-26).

---

## The listing

The text lives in `store/listing.json`; the test there holds it to the limits.

- **Name** (26/30): `Lexi Deutsch: German Words`. The bare name "Lexi" is taken in
  this category: a search of apps.apple.com on 2026-09-25 found two vocabulary apps
  already called Lexi. *Lexi Deutsch* is the marketing panelist's naming system, with
  *Lexi Español* later. **Owner decision**: if the name changes, change it here.
- **Subtitle** (30/30): `Learn German vocabulary, A1–C2`.
- **Keywords.** en-US and en-GB each get their own 100-character field. Neither
  repeats a word from the name or subtitle, since Apple already indexes those.
  - *der, die, das* are what learners type.
  - *wortschatz, vokabeln, artikel, wörterbuch* catch the German-language searches.
  - *srs, spaced, repetition, flashcards* catch the method.
  - **Never** a competitor or an exam brand. *Goethe* and *telc* would breach 2.3.7
    and promise what VISION §10 refuses to answer.
- **Categories.** App Store: Education, with Reference secondary (the dictionary is
  real, and that shelf is less crowded). Play: Education.
- **Locales first:** en-US and en-GB, then en-AU and en-CA as further keyword fields.
  No de-DE listing: German-locale users are not the audience.
- **Age rating** (estimate): 4+ / IARC Everyone, because store copies carry no news
  and no AI-written text. **Answer the questionnaires; don't copy this.**

### Screenshot storyboard — six frames

Shoot on the **iPhone 17 Pro Max simulator** (Apple requires 6.9": 1320×2868 or
1290×2796), in standalone mode, never in Safari. Use seeded learners on the dev server
(`?seed=b1`). Play takes the same frames at 9:16, plus a 1024×500 feature graphic
built from the Fortschritt sky.

1. **Feed word**, a B1 noun in its gender colour: *"One German word at a time."*
2. **Üben, answer side**, with the FSRS intervals on the grade buttons: *"Save it.
   Lexi brings it back before you forget."* Shoot this after the round-3 card
   rebuild.
3. **A gender or plural drill**: *"der, die, das — drilled, not guessed."*
4. **Search, two layers** ("Lexi teaches" above "From the dictionary"):
   *"10,000 words to learn. 90,000 to look up."*
5. **Fortschritt sky**: *"See every word you know."*
6. **The welcome slot**: *"No account. No ads. Your progress stays on your phone."*

No story frames, because store copies carry none. No publisher mastheads anywhere.

---

## Privacy labels (store copies)

- **Expected: "Data Not Collected"** on the App Store, and "no data collected or
  shared" on Play. With stories and the tutor off, a store copy sends nothing a
  learner writes anywhere. Two things to confirm at submission:
  - *Sag es* speech recognition: in a browser it runs on Apple's or Google's
    servers, and it is disclosed in the app before the mic opens.
  - Tatoeba recordings, fetched on first play: these expose an IP address to
    Tatoeba, not to the developer.
- **Privacy-policy URL:** `<origin>/legal.html`, the static page that loads without
  JavaScript (from the legal panelist). It goes in `store/listing.json` once the
  origin is final.
- If the tutor ever ships in a store copy: *User Content → Other User Content, App
  Functionality, not linked to you*.

---

## Android — the TWA, step by step (owner)

1. Play Console **personal account**: US$25 once, plus identity verification.
2. `npx @bubblewrap/cli init --manifest https://<final-origin>/manifest.webmanifest`,
   run on the owner's machine; nothing is added to this repo's dependencies. Choose
   the package id once; it can never change.
3. Let **Play App Signing** hold the key. Put its SHA-256 fingerprint in
   `public/.well-known/assetlinks.json` and deploy. Without it, the TWA shows a
   browser bar and fails review.
4. **Closed test: at least 12 testers, opted in for 14 continuous days.** Personal
   accounts created after 13 Nov 2023 need this before production access, so start
   the clock the day the first build exists.
5. **Forms:**
   - Data safety (above).
   - Content rating.
   - Target audience 13+, not Families.
   - News declaration: **no**, because the TWA shows no stories.
6. Afterwards, optionally add `related_applications` to the manifest, keeping
   `prefer_related_applications: false` so the web install prompt still shows.

---

## iOS — conditions before starting (owner + engineering)

1. **The origin is final.** A Capacitor app runs on its own origin
   (`capacitor://localhost`), so existing learners need an **export → import**
   handoff. Backup already exists; the first-launch screen needs to offer it.
2. **Vendor the HD voice.** `lib/tts.ts` imports a module from jsDelivr at runtime.
   Interpreted code consistent with the app's purpose is allowed, but a downloaded
   module is exactly what review questions, and it breaks "works offline". Bundle
   it, or hide HD voice in store builds.
3. **Speech in WKWebView is unverified.** *Sag es* already detects capability; confirm
   it degrades cleanly, or move to on-device `SFSpeechRecognizer` through a plugin.
4. **Service workers do not run under `capacitor://`.** This is harmless: the bundle
   is the cache.
5. **iPhone only at launch.** Reviewers still open iPhone apps on iPads, so drive the
   layout there first.
6. **Legal:**
   - A custom EULA that carves out the MIT code and the CC BY-SA data, from the
     legal panelist.
   - Declare **non-trader** under the EU DSA while Lexi is free, so no address is
     published.
   - An individual account lists the owner's legal name as the seller.
7. **Background audio:** declare `UIBackgroundModes: audio` **only** in the build
   that ships walk mode's locked-screen playback. Declaring it unused is a 2.5.4
   rejection.

Build: `VITE_STORE_BUILD=1 npm run build`, then `npx cap sync ios`. The Capacitor
packages are not dependencies of this repo yet; adding them is the first commit of
the iOS project.

---

## Costs and time

| | Cost | Time |
|---|---|---|
| Apple Developer Program | US$99 a year, individual; fee waivers are for organisations | Review usually takes a day or two. Expect one rejection round on a first web-technology app (estimate) |
| Google Play | US$25 once | 14-day closed test, then review. New accounts wait longer (days) |
| Upkeep | — | About 2–4 hours a month (estimate): Play's target-API bump each August, Apple's minimum SDK each spring. Corpus updates reach the TWA on deploy but need a new iOS binary |

## Refused, from this seat

- A remote-URL wrapper for iOS.
- Review gating, or any "rate us" prompt other than `SKStoreReviewController`. Call
  it after a completed session, never after a miss.
- An analytics SDK "for ASO". The store consoles already report impressions and
  conversion.
- Streak-threat notifications.
- Competitor names in keywords.
- Screenshots of features a store copy does not carry.
