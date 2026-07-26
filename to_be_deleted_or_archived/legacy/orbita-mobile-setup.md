# Orbita — standalone setup (Mac + iPhone)

This is the path that gets you **every feature**: Browse, file upload (all formats including PDF/DOCX), generation, grading, Discuss. The Cowork artifact sidebar can also run Orbita but trades off Browse and PDF/DOCX upload because the sandbox blocks network access except to one CDN allowlist.

## Important first: your Claude subscription does not include API access

Claude Pro / Max / Team / Enterprise are consumer subscriptions for the claude.ai app. They give you the chat interface, Projects, MCP connectors, Cowork — but they do **not** include credits for the Anthropic API. The API is a separate product, billed separately, with its own account and credit balance.

If you've never used the API before, you'll need to set up billing once at <https://console.anthropic.com/settings/billing>. Pricing as of v12 is roughly:
- Claude Haiku 4.5 — $1 per million input tokens, $5 per million output tokens
- Claude Sonnet 4.5 — $3 / $15
- Claude Opus 4.5 — $15 / $75

A heavy day in Orbita (one full article generation + 30 cloze grades + 10 Discuss replies) costs around **$0.20 on Sonnet, $0.04 on Haiku**. Set a usage cap at <https://console.anthropic.com/settings/limits> and you can never accidentally spend more.

If you'd rather not set up API billing at all, use the Cowork artifact path instead (`Open Orbita from Cowork's artifacts sidebar`) — generation works via Cowork's bridge with no separate billing, but Browse and PDF/DOCX upload don't work in that sandbox.

---

## Mac — 5 minutes

1. **Get an API key.** Go to <https://console.anthropic.com/settings/keys> → Create Key → name it "Orbita" → copy the `sk-ant-…` string. You'll only see it once.

2. **Open Orbita.** In Finder, navigate to `~/Documents/Claude/Projects/A Personalized Language Learning App/app/orbita.html`. Right-click → Open With → Safari (or Chrome — both work). You'll see a banner saying "LLM features need a runtime" — expected.

3. **Paste the key.** Click the **Standalone mode · API key & deck sync** disclosure near the top. Paste your key into the field. Pick a model (Sonnet 4.5 is the default and what I'd suggest). Click **Test key** — should report ~700ms latency and "OK".

4. **Done.** Generate, Browse, Upload, Discuss all work now. Your key is stored in Safari/Chrome's localStorage for this folder only.

If you want a less-buried entry point, drag `orbita.html` into your Dock or make a Safari bookmark.

---

## iPhone — 5 minutes (after Mac is set up)

iPhone Safari needs the file in a location it can open. The cleanest path is iCloud Drive.

1. **Copy to iCloud.** In Finder on Mac, drag `~/Documents/Claude/Projects/A Personalized Language Learning App/app/orbita.html` into `iCloud Drive → Documents → Orbita → orbita.html`. Create the folder if it's not there. Wait ~30 seconds for sync.

2. **Open on iPhone.** Files app → iCloud Drive → Documents → Orbita → tap `orbita.html` → Safari preview opens. Tap the share icon (square with arrow up) → **Open in Safari**.

3. **Paste the same key.** Same Standalone mode disclosure, same field. The key lives in iPhone Safari's localStorage for this origin — separate from your Mac, so paste it once on each device.

4. **Add to Home Screen.** Safari share icon → **Add to Home Screen**. Orbita now opens like a native app from your home screen.

5. **Sync your deck.** On Mac: Standalone mode → **Export deck (JSON)** → save to `iCloud Drive → Documents → Orbita`. On iPhone: same disclosure → **Import deck (JSON)** → pick the file. Repeat any time. Merges are conservative: by vocab `(lang, lowercased text)`, by card id, newer history wins. Your prefs (theme, view mode) are intentionally **not** synced so you can keep different settings per device.

---

## When I ship a new version

The file in the project folder is the master copy. Drag it into iCloud, replacing the old `orbita.html`. Safari picks up the new version next time you open it. Your deck, journal, vocab, API key all persist across updates — they're keyed by the browser's origin, not the file contents.

---

## Troubleshooting

**Test key fails with "Invalid API key"** — the key must start with `sk-ant-` and the account must have billing set up. Visit <https://console.anthropic.com/settings/billing>, add a card, deposit $5 minimum.

**Test key fails with "CORS error"** — your key might be an older format. Generate a fresh one at <https://console.anthropic.com/settings/keys>. The app sets the `anthropic-dangerous-direct-browser-access` header automatically.

**Browse "No curated sources" message** — confirms targetLang is something other than German. Switch the target language in the language selector at top. Browse v1 ships German-only; other languages get added one at a time.

**Browse fails on iPhone** — Browse uses `r.jina.ai` as a CORS-safe reader proxy. Very rarely it's slow or down. Try again, or use URL fetch / Paste instead.

**PDF upload spinner forever** — pdf.js is loading from cdnjs the first time. Should resolve in 2-3s. If your network blocks cdnjs, only txt/md/html/rtf upload will work.

**Streak resets after syncing decks** — the streak counts consecutive days you reviewed at least one card. If your two devices had different lastReviewDay values, the merge picks the later one, which can preserve or rebuild the streak depending on order. Review on one device per day to avoid this entirely.

**My desktop deck doesn't show on iPhone** — localStorage is per-origin. Mac Safari and iPhone Safari are different origins even reading the same iCloud file. Use export/import to sync. If you settle on a single origin (e.g. hosting on GitHub Pages), the deck stays in sync automatically.

---

## TL;DR

Mac: Open `app/orbita.html` in Safari → paste API key in Standalone mode → done.
iPhone: Drag the file to iCloud → open in Safari → paste the same key → Add to Home Screen → import the deck export.
Cost: ~$0.20/day for heavy use on Sonnet, ~$0.04 on Haiku. Set a spending cap at console.anthropic.com.
