# Orbita — Feature Backlog

*(formerly Lesefutter — renamed v5 for cross-language fit. File is now `app/orbita.html`; localStorage key remains `lesefutter_v2` to preserve user state.)*

A living roadmap for the content-driven language learning app. Items are tagged for audience fit (Adult professional, Teen/Kid, Migrant, All) and rated by effort (S/M/L/XL) and impact (★ to ★★★★).

**Currently shipped (v11):** all v5–v10 capabilities plus file upload —
- **Upload file** as a fourth source mode alongside Paste / Browse / URL. Accepts `.txt` · `.md` · `.html` · `.rtf` · `.pdf` · `.docx`. Click-to-pick or drag-and-drop onto the upload zone *or* anywhere on the source panel (which auto-switches to the Upload tab).
- **Text extraction** is inline for txt/md/html (browser FileReader) and rtf (regex strip handling `{\*...}`, `{\fonttbl...}`, `{\colortbl...}` and friends, hex escapes, par/line breaks). PDF uses pdf.js lazy-loaded from cdnjs (3.11.174). DOCX uses mammoth.browser lazy-loaded from cdnjs (1.6.0). Libs only load when their format is first needed, so initial page weight is unchanged.
- 8 MB upload cap with a clear error if exceeded. Binary-detection fallback rejects unknown files with a "try .txt/.md/.rtf/.pdf/.docx" hint instead of dumping garbage into the textarea.
- Auto-switches back to Paste tab after extraction so the user can review the text before generating.

**v10 (source picker):**
- **Browse sources** as a third source mode alongside Paste / URL. Three German sources curated in v1: DW Top-Thema (B1–B2 graded news with vocab), Nachrichtenleicht / DLF (A2–B1 weekly news in leichter Sprache), Tagesschau in einfacher Sprache (B1 daily). Click a source card → "Load today's articles" pulls a structured list of 3-6 current pieces. Click an article → cleaned text loads into the textarea and the tab auto-switches to Paste so you can review and Generate. ~$0.005 per browse on a bring-your-own key.
- **Universal fetch via r.jina.ai** (a free CORS-enabled reader proxy) so Browse works in iPhone Safari without the Cowork bridge. The `ask()` pipeline is used only for the structured index parsing, not for raw HTTP.
- **DE-only in v1**: targetLang must be German to see source cards. Other languages get a "DE-only for v1" note pointing back to URL paste. Source list is array-driven, easy to extend.

**v9 (mobile):**
- viewport / theme-color / apple-mobile-web-app meta tags so Add-to-Home-Screen renders cleanly
- Responsive CSS at 760px and 420px breakpoints. Tab bar scrolls horizontally, settings grid collapses, tap targets bump to 40px+, rate buttons go 2×2, sel/vocab popovers and toasts respect 100vw.
- Pointer-event drag path for scramble on mobile (HTML5 drag events aren't reliable in mobile Safari). Desktop mouse keeps native drag.
- Three-tier `ask()` resolution: Cowork bridge → stored Anthropic API key with `anthropic-dangerous-direct-browser-access` flag → clean error pointing at Settings.
- New collapsible **Standalone mode** panel below the source panel: API key input, model selector (Haiku 4.5 / Sonnet 4.5 / Opus 4.5), Test key with latency, deck export/import JSON, live storage stats.
- Deck export downloads `verse-deck-YYYY-MM-DD.json`. Import is conservative: union by `(lang, lowercased text)` for vocab, union by id for SRS cards, history merge without timestamp duplication, take the row from whichever side reviewed more recently. Prefs intentionally never overwritten.

**v8 (deep retention):**
- **Today tab** is the first tab and the natural entry point when cards are due. Due-count badge updates live. The app auto-lands here on open if anything is scheduled. Stats row: due / deck size / mature (21d+) / streak / lifetime reviews.
- **SM-2 scheduler** with FSRS-ready event logging. Every rating event records prev/new interval and ease so we can switch to FSRS-5 later without rebuilding the deck. Cards interleave across types (round-robin vocab/cloze/transformation) so consecutive reps don't pattern-lock.
- **Card capture is automatic.** Every saved vocab word/phrase becomes a card immediately. Every cloze answer below exact-correct (warm/hot/cold/shown) becomes a card. Every transformation graded warm/cold by the LLM becomes a card. Removing a vocab word from the popover also removes its card.
- **Review surface** has type-specific prompts (vocab front-card, cloze sentence with blank, transformation source + instruction), Reveal-then-rate flow, four rate buttons (Again / Hard / Good / Easy) each previewing its scheduled interval, keyboard shortcuts (Space to reveal, 1/2/3/4 to rate). Speak buttons throughout so review is also a listening exercise.
- **Backfill migration** turns pre-existing vocab into new cards on first SRS-aware load, immediately due.
- **All v7 capabilities preserved:** phrase highlights, comprehension meter, audio on cards, dark-mode heat colors, cloze hints, drag-reorder scramble with heat dots, LLM-graded transformations with hint + skeleton, next-CTA at bottom of every tab, clickable vocab popovers.
- **v5/v6 base:** multi-language (DE/PT/ES/FR), A1–C2 levels with current/stretch/long-term-goal architecture, ten tabs, journal + journey, gamification, persistent vocab, dismissible per-tab tips, onboarding with methodology + ETA, print export, command palette ⌘K, dark mode as peer, Anki/Quizlet CSV export, URL fetch, live word counter, LLM Conversation Partner in Discuss.

---

**v7 UX pass (still present):**
- **Phrase highlights** in Read use a distinct purple underline so multi-word saves stand out from single words.
- **Comprehension meter** ("Known at a glance: 87%") above the article, encouraging-framed, updates live as you flag vocabulary.
- **Audio on flashcards** — Web Speech API plays the word, the definition, and the example sentence in the target-language voice; small speaker buttons on cloze, scramble, transformation, popovers.
- **Dark-mode heat colors** properly tokenized (`--heat-hot-bg`, `--heat-warm-bg`, `--heat-cold-bg` with light + dark twins meeting WCAG AA).
- **Cloze Hint** button reveals progressively (length → first letter → first half) — a graceful path between "blind guess" and "Show answer".
- **Scramble fixes**: tokens are now derived from the correct sentence itself (no more "needs two 'sind' but only one provided" bug). Chips are draggable inside the target for free reordering. On Check, each chip gets a hot / warm / cold heat dot showing how far it is from its correct slot.
- **Transformation scaffolds**: per-question Hint (grammatical nudge), Show Structure (skeleton with gaps), and a LLM-graded Check that returns a heat rating + targeted corrections + restates valid alternates.
- **Heat-pill consistency** across every Check — cloze, scramble, case-fill, comprehension, writing (level estimate), speaking (level estimate), transformation. Single visual language.
- **Next-up CTA** at the bottom of every tab pointing to the next stop with a one-line "what's next" hint — no more scrolling to the top to switch.
- **Clickable vocab tray** — every saved word/phrase opens a popover with translation, part of speech, definition, example, audio for word + example, and a one-click Remove.

---

## 1. Content sources — how material gets into the system

### 1.1 YouTube transcript ingestion *(user-requested)*
Paste a YouTube URL → the app fetches the transcript (via youtube-transcript API or `yt-dlp --write-auto-sub`) → feeds it through the same exercise pipeline. Adds the listening dimension (the biggest hole in the current build) by linking back to the original video for paired audio+text drill.
**Audience:** All · **Effort:** M · **Impact:** ★★★★

### 1.2 News provider subscriptions *(user-requested)*
OAuth-based connectors to NYT, The Economist, Bloomberg, FT, Wired, Stratechery. User signs in once, sees their actual saved articles or daily digest as a content picker. The pedagogical win is psychological: you're studying *your* paid subscriptions, not random text. Legal nuance: most TOS allow personal-use transformation but redistribution would be a problem, so this stays a single-user tool.
**Audience:** Adult · **Effort:** L (per provider) · **Impact:** ★★★★

### 1.3 RSS feed monitoring & daily auto-generation
Connect any RSS feed. Each morning the app pre-generates exercises from the latest item, ready when you open it. Pairs naturally with the scheduled-task system. Solves the "what do I study today?" friction.
**Audience:** All · **Effort:** M · **Impact:** ★★★

### 1.4 Podcast & audio file ingestion
Paste an Apple/Spotify/Overcast link or upload an MP3. Whisper transcribes, app generates exercises. Critical for migrants without strong reading habits — listening-first acquisition.
**Audience:** All (especially Migrant) · **Effort:** L · **Impact:** ★★★★

### 1.5 PDF & ebook excerpt upload — ✅ SHIPPED v11
Drop a PDF research paper, textbook chapter, or ebook page. Extract text, run pipeline. Lets serious learners use real domain literature. PDF via pdf.js, DOCX via mammoth.js, plus txt/md/html/rtf inline. Drag-and-drop or click-to-pick.
**Audience:** Adult · **Effort:** S · **Impact:** ★★

### 1.6 Browser highlight → exercises *(user-requested as Chrome extension)*
Chrome/Firefox extension: highlight any text on any webpage, click the Lesefutter icon, exercises pop up in a side panel. Eliminates the paste-and-go friction entirely. The single highest-leverage UX improvement.
**Audience:** All · **Effort:** L · **Impact:** ★★★★

### 1.7 Image / screenshot OCR
Photograph a magazine, menu, sign, or whiteboard. OCR extracts text, exercises generate. Especially valuable for migrants encountering official forms or signage in their daily environment.
**Audience:** Migrant, Teen · **Effort:** M · **Impact:** ★★★

### 1.7b Unified URL ingestion (auto-routing, no user-facing mode toggle) *(user-requested v5.2)*
The v5 implementation forces the user to choose between "paste" and "fetch from URL," then between "direct" and "ask in chat" when the bridge fails. This violates Brief §3.4 (opinions, not options) and §3.3 (speed is a feature). The intended design:

**Single input field.** No mode toggle. The field accepts either prose or a URL. The app sniffs the content: if it starts with `http(s)://` and contains a TLD, treat as URL; otherwise treat as prose. One button, one decision.

**Auto-routed fetch based on runtime.** Detect the available fetch mechanism at app load and use it silently:
- *Deployed web app:* server-side fetch endpoint handles arbitrary URLs (CORS, paywalls, robots respected).
- *Chrome/Firefox extension:* extension fetch permissions bypass CORS.
- *Sandboxed host with bridge (Cowork artifact, Claude desktop):* try the bridge; if it fails consistently in this runtime, hide the fetch UI entirely rather than offer broken alternatives.
- *Open-source LLM backend (future):* the URL is passed to the model as a tool input; the model fetches via its own browsing capability and returns exercises in one call.

**Never assume Claude Pro / Cowork.** The current v5.2 "Ask in chat" fallback works for the developer (Shamil) but assumes the user has a chat thread with a frontier model. For migrants, teens, classroom learners, anyone using Orbita standalone — that fallback is broken. URL ingestion should be a runtime capability, not a user-skill capability.

**Audience:** All · **Effort:** M (the routing logic) + L (the deployment infrastructure) · **Impact:** ★★★★

### 1.8 Free / open-access content network connectors *(user-requested)* — ✅ SHIPPED v10 (DE sources)
Direct integration with respectable, freely available, often open-licensed sources. Unlike 1.2 (paid subscriptions), these are TOS-friendly to ingest at scale, and several were *built* for language learners. Specifically:

- **Deutsche Welle (DW) Deutsch lernen** — already publishes graded news content at every CEFR level with audio + transcript + glossary. *Top-Thema mit Vokabeln* and *Langsam gesprochene Nachrichten* are essentially Lesefutter-ready inputs. For DE this is the single best free source on the internet.
- **BBC Learning English** — leveled news, "News Review", "6 Minute English". For EN learners (relevant when you share with multilingual friends learning English).
- **RFI Savoirs** — Radio France Internationale's *Journal en français facile*, transcripts included. For FR.
- **TV5Monde** — *Apprendre le français* hub with leveled video + exercises. For FR.
- **RTVE Aprende español / News in Slow Spanish (free tier)** — for ES learners.
- **Voz das Comunidades / Brasil de Fato simplified feeds** — for PT-BR. (PT-PT is harder; DW offers some Portuguese content.)
- **PBS NewsHour** — full transcripts published daily, Creative-Commons-leaning licensing for educational use, balanced editorial tone.
- **NPR All Things Considered / Morning Edition** — transcripts available.
- **Science / Nature open-access articles** — for serious adult learners in scientific fields. Nature publishes a meaningful share under CC-BY; PLOS One is fully open access.
- **arXiv abstracts** — STEM-domain reading practice for graduate-level learners. Abstracts are short enough to be ideal exercise inputs.
- **PubMed / Europe PMC** — medical literature for healthcare workers studying L2 medical vocabulary.
- **Wikipedia in target language** — every article exists in the user's target language; "Simple English" Wikipedia is a model for what a B1-leveled corpus looks like.
- **Project Gutenberg / Wikisource** — public-domain literature in dozens of languages for B2+ literary reading.
- **OER textbooks (OpenStax, OER Commons)** — for migrants studying for trades certification or community-college coursework.

**Implementation pattern:** rather than building 15 separate connectors, build one "content picker" that hits RSS feeds + a curated list of source homepages. User picks "today's DW Top-Thema" or "Nature article on quantum biology" from a categorized list, the app fetches, then runs the pipeline. Source list is community-extensible.

**Audience:** All — DW alone is transformative for DE learners · **Effort:** M (RSS-based) to L (custom scrapers) · **Impact:** ★★★★★

**v10 shipped:** three German sources (DW Top-Thema, Nachrichtenleicht / DLF, Tagesschau leicht) behind a Browse tab in the source panel. Universal fetch via r.jina.ai reader proxy so it works in iPhone Safari standalone, not just inside Cowork. `ask()` parses the index page into a `{title, url, snippet}` list; selecting an article fetches → cleans → drops in the textarea and switches back to Paste for review. **Still backlogged:** BBC Learning English / RFI / TV5Monde / RTVE for the other languages (the source array is one-line-per-source so adding them is mechanical, but each needs index-page testing). Wikipedia / Project Gutenberg / arXiv as separate "long-form" picker. Open question whether to add an RSS-based daily auto-generation layer (1.3) on top so the picker becomes "today's auto-generated set" instead of click-to-fetch.

### 1.9 Comic / manga panel mode
Upload a comic page. Extract speech bubbles via OCR, run vocabulary + slang-aware analysis. The bridge to keep teens engaged — anime and manga drive a massive share of self-directed Japanese/Korean learning; same pattern works for European languages with bandes dessinées (FR), fumetti (IT), or German graphic novels.
**Audience:** Teen · **Effort:** L · **Impact:** ★★★

---

## 2. Output channels — where the app lives

### 2.1 Chrome extension *(user-requested)*
See 1.6. Two modes: highlight-to-exercise, and a "stretch this page" mode that injects vocabulary hints into any webpage at your level.
**Audience:** All · **Effort:** L · **Impact:** ★★★★

### 2.2 Mobile app *(user-requested)*
PWA first (cheap, works on iOS/Android, can use installed-PWA shortcuts), native wrapper later if engagement justifies it. Mobile is essential for streak maintenance — the 10-minute commute slot is where most language learning actually happens. Push notifications for streak reminders. Speech recording is far more natural on phone.
**Audience:** All · **Effort:** XL · **Impact:** ★★★★

### 2.3 Print-to-paper worksheet export — ✅ SHIPPED v2.1
Clean printable HTML with both article versions, vocabulary table, all exercises with handwriting space, and an answer-key page. Opens in a new tab and auto-triggers the print dialog. Preserves the original handwriting method that motivated this whole project.
**Audience:** All (especially Teen, Kid) · **Effort:** S · **Impact:** ★★★

### 2.4 Email digest
Subscribe to a daily/weekly email with a fresh exercise set, completable inline. Lowers barrier for casual learners who won't open an app daily.
**Audience:** Adult · **Effort:** M · **Impact:** ★★

### 2.5 Voice-only mode (Alexa/Siri shortcut)
For commutes and dog walks. Hear a passage, answer prompts verbally, get scored feedback. Pure listening + speaking, no screen.
**Audience:** Adult · **Effort:** XL · **Impact:** ★★

---

## 3. Infrastructure & cost

### 3.1 Open-source LLM backend *(user-requested)*
Optional toggle to route generation/grading through a self-hosted Ollama running Llama 3.1, Mistral, or Qwen 2.5 (the latter two handle European languages especially well). Removes token cost for power users and enables true offline mode. Trade-off: smaller models produce less idiomatic output, especially for nuanced C1+ writing feedback — so this should be a per-task choice, not a global setting. Translation and exercise generation on local; writing/speaking grading on a frontier model.
**Audience:** All (cost-sensitive) · **Effort:** L · **Impact:** ★★★

### 3.2 Cross-article spaced repetition (SM-2 with FSRS-ready logging) — ✅ SHIPPED v8
The Today tab is now the entry point for the app whenever cards are due. Vocab saves, missed cloze items, and warm/cold transformations are captured as SRS cards with `srsCreateOrUpdate`. SM-2 schedules them (1d → 6d → ×ease, clamped at 1.3 ease floor, Hard ×1.2, Easy ×1.3 multiplier). Every rating event logs `{rating, q, prevInterval, newInterval, prevEase, newEase}` so we can drop FSRS-5 in later without losing history. Cards interleave across types (round-robin vocab/cloze/transformation) so consecutive reps don't pattern-lock. Keyboard: Space reveal, 1/2/3/4 rate. Streak + lifetime reviews shown in the stats row. Existing vocab is auto-backfilled on first load.
**Still backlogged:** Upgrade to FSRS-5 once we have ~500+ rating events to fit the w-parameters. Cross-device sync (3.4) so the deck travels.

### 3.3 Offline mode
Service worker caches generated exercises so they're usable on flights and subways. Pairs with FSRS for offline review sessions.
**Audience:** All · **Effort:** M · **Impact:** ★★

### 3.4 Multi-device sync
Cloud-backed account so progress on phone syncs with desktop. Currently localStorage only.
**Audience:** All · **Effort:** L · **Impact:** ★★★

### 3.5 Self-hostable Docker image
For organizations (schools, refugee resettlement orgs, corporate training) who need control over their learners' data.
**Audience:** Migrant orgs, schools · **Effort:** M · **Impact:** ★★

---

## 4. Pedagogy expansion

### 4.1 Real speech-to-text grading
Replace transcript-only speaking feedback with actual STT (Whisper or browser SpeechRecognition API). Grade pronunciation, fluency markers, hesitation. The current "type out what you said" approach is a stopgap.
**Audience:** All · **Effort:** L · **Impact:** ★★★★

### 4.2 LLM conversation partner — ✅ SHIPPED v6
New "Discuss" tab (9th tab, ⌘8). Multi-turn dialogue about the current article in the learner's target language. LLM auto-opens with a greeting and one open-ended question, stays in target language across all turns, matches the learner's stretch level for vocabulary and structure, and gently corrects grammar inline via brief parentheticals (`(Klein: 'ich bin gegangen' …)`) rather than separate feedback fields — keeps the conversation moving like a patient tutor would. Resets per article. Awards XP per exchange. Empty state, loading state, error state all designed. Speech bubbles set in serif on the assistant side, sans on the user side, for a small editorial distinction.
**Effort:** M · **Impact:** ★★★★

### 4.3 Pronunciation drills with TTS reference — ⚡ PARTIAL v7
Web Speech API playback shipped on flashcards, cloze sentences, scramble target sentences, transformation source + target, vocab popovers (word + example). Still backlogged: full pronunciation drill mode where the learner records and the app compares (needs real STT + phonetic distance).
**Remaining effort:** M · **Impact:** ★★★
For each vocabulary item, generate native-speaker audio via TTS, let the learner record themselves, compare. Visual waveform comparison or LLM-as-judge ("you stressed the wrong syllable in *Verantwortung*").
**Audience:** All · **Effort:** M · **Impact:** ★★★

### 4.4 Etymology & cognate mode
Show word origins and L1 cognates. For a Portuguese speaker learning Spanish, *embora* ↔ *aunque* (false friend warning). For a Korean speaker learning English, surface roots and morphology. Reduces vocab acquisition time dramatically when L1 is leveraged.
**Audience:** All (especially Migrant) · **Effort:** M · **Impact:** ★★★

### 4.5 "Common L2 mistakes at your level" highlighter
Domain knowledge: a B1 German learner predictably confuses *seit* vs *vor*, omits *zu* before infinitives, drops *der/die/das* in compound nouns. The LLM, primed with this error taxonomy, proactively highlights the patterns *you* would likely miss in the text.
**Audience:** All · **Effort:** M · **Impact:** ★★★

### 4.6 Goethe / DELE / DELF / CELPE mock-exam mode
Recombine accumulated vocabulary + recent exercise types into a timed, scored, full-format mock exam matching the target certification. Strict timing, no answer reveals until completion, performance report.
**Audience:** Adult, Teen (exam-bound) · **Effort:** L · **Impact:** ★★★★

### 4.7 Difficulty calibration over time
Track which exercise types correlate with the learner's reported "aha" moments in the journal vs. which are noisy. Auto-tune the next session's exercise mix.
**Audience:** All · **Effort:** L · **Impact:** ★★★

### 4.8 Listening at varying speeds
For audio sources, expose 0.75×, 1×, 1.25×, 1.5× playback with shadowing prompts ("Repeat what you just heard, in real time"). Standard but missing here.
**Audience:** All · **Effort:** S · **Impact:** ★★

---

## 5. Audience-specific

### 5.1 Teen / kid mode

- **Topic library by interest** — preset content packs around Minecraft, Pokémon, Naruto, FIFA, F1, K-pop, Roblox. Lowers the "what do I paste?" cognitive load for kids.
- **Avatar progression** — visible character that levels up cosmetically. The XP system is the engine; the avatar is the visible reward. Optional — should be off by default for adult mode.
- **Parent / teacher dashboard** — share-able link showing the child's journal entries, articles studied, areas of struggle.
- **Classroom / homework mode** — a teacher creates a "set" of articles, assigns to students, sees aggregated results.

**Audience:** Teen, Kid · **Effort:** M (each) · **Impact:** ★★★

### 5.2 Migrant / new-resident mode

- **Practical scenarios library** — pre-built content for navigating healthcare, opening a bank account, school enrollment, government forms, job applications, lease agreements. Substitutes "Finanzmärkte" with what their actual day requires.
- **L1 → target language pipeline** — most LLMs are competent in 50+ languages. A Tigrinya, Pashto, Tagalog, or Ukrainian speaker should be able to set their L1 and get exercises explained in L1 instead of routing through English.
- **Civics / naturalization test prep** — German Einbürgerungstest, French test d'intégration, Spanish CCSE. Pre-loaded official question banks transformed into Lesefutter exercises.
- **Document translation + simplification** — upload an official letter, get a simplified explanation in target language *and* L1, plus a vocab pack of bureaucratic terms.
- **Workplace vocabulary packs** by industry — construction, hospitality, hospitality, healthcare, retail, manufacturing, agriculture, ride-share. The actual jobs migrants disproportionately work, with the actual vocabulary those jobs require.

**Audience:** Migrant · **Effort:** L total · **Impact:** ★★★★ (life-impact)

### 5.3 Adult professional add-ons

- **CV / cover-letter writer** — drafts in target language, you provide bullet points in English, get a B2/C1-appropriate document with LLM feedback on naturalness.
- **Industry-specific topic packs** — beyond finance: medicine, law, software, academic publishing. Pre-curated source recommendations + vocabulary base.
- **Public-speaking prep** — rehearse a target-language presentation, get feedback on grammar, pace, vocabulary register.

**Audience:** Adult · **Effort:** M (each) · **Impact:** ★★★

---

## 6. Social & community

### 6.1 Collaborative annotation
Share an article with a study partner, both work through the same exercises, see each other's highlights and journal reactions afterward.
**Audience:** All · **Effort:** L · **Impact:** ★★

### 6.2 Public article library
Opt-in: when you generate exercises from a public source, the resulting exercise set is shareable. A community library forms around the topic packs people actually study.
**Audience:** All · **Effort:** M · **Impact:** ★★

### 6.3 Tutor / language exchange marketplace
Connect to a human tutor for a 30-minute conversation about the article you just studied. Strong topic priming → much higher signal density than generic conversation.
**Audience:** Adult, Teen · **Effort:** XL · **Impact:** ★★★

### 6.4 Study group / cohort mode
Five people studying the same target language at similar levels share a weekly article. Discussion threads, leaderboards, peer feedback.
**Audience:** All · **Effort:** L · **Impact:** ★★

---

## 7. Cross-cutting refinements

### 7.1 Better B1/C1 simplification quality control
Run a CEFR classifier (small fine-tuned model or LLM-as-judge) on each generated text and reject + regenerate when the simplified version drifts above target level or the original lands below. Right now we trust the LLM's self-leveling.
**Effort:** M · **Impact:** ★★★

### 7.2 Accessibility (WCAG AA)
Keyboard navigation through all tabs and exercises, screen-reader semantics, dyslexia-friendly font option, high-contrast theme. Important for the audience-expansion goal — migrants, kids, and learners with disabilities all benefit disproportionately.
**Effort:** M · **Impact:** ★★★

### 7.3 Anti-gamification toggle
Some adult learners find XP/streaks patronizing. A "scholar mode" hides all gamification, keeps journal + stats.
**Effort:** S · **Impact:** ★★

### 7.4 Export to Anki / Quizlet — ✅ SHIPPED v4
TSV export of vocabulary + saved phrases + cloze sentences (with Anki cloze syntax). Triggerable from command palette (⌘E) or by keyboard shortcut. Importable by Anki, Quizlet, Mochi, RemNote. Tagged with language, level, and source.
**Effort:** S · **Impact:** ★★★

### 7.5 Conversation export → journal
After a long LLM-conversation session, auto-generate a journal entry summarizing errors made, topics covered, vocabulary acquired.
**Effort:** S · **Impact:** ★★

---

## Sequencing — reshaped around the Goethe C1 mission (2026-05-29)

See [MISSION.md](./MISSION.md). The single goal is **Shamil passes the Goethe-Zertifikat C1 by 2026-12-31**. Everything below is ranked by impact on that outcome. Audience-expansion, social, and consumer-product items are deferred to a "Phase 2 (if the certificate is earned)" section at the bottom.

### Up next, in order

1. **Learner profile + memory injection into every prompt** *(inspired by Nihongo Dojo)*. Add `STATE.learner = { goal, examDeadline, weaknesses, strengths, interests, notes }`. Inject as a `learnerContext` block into every generation / grading / Discuss prompt. New "Profile" disclosure with goal + deadline + recurring-mistake tags + interest tags + free-form notes. Plus "Too Easy / Just Right / Too Hard" steering buttons after every exercise that auto-update profile tags. **Effort:** M · **Impact:** ★★★★★ · this single change makes every existing surface better. *(v13 — shipping now)*

2. **Blind Spots tab** *(inspired by Blindspot)*. Every wrong cloze, every transformation correction, every grammar miss gets a structural tag from a small taxonomy (e.g. `dat-pl-art`, `konj-ii`, `passiv-mit-modalv`, `funktionsverbgefuege`, `genus-fehler`). Dashboard shows top 10 patterns by frequency. Weekly drill targets the top three. **Effort:** L · **Impact:** ★★★★★ for C1.

3. **Goethe C1 exam-aligned exercises**. Today's tabs map to generic exercise types. Replace or supplement with the actual C1 task formats: Lesen Teil 1 (Verbindungsstücke), Teil 2 (Mehrfachauswahl), Teil 3 (Zuordnung), Teil 4 (Lückentext); Hören 1–4; Schreiben Aufgabe 1 + 2 with the official rubric (Inhalt / Kohärenz / Wortschatz / Korrektheit); Sprechen Vortrag + Diskussion with the same rubric. **Effort:** L · **Impact:** ★★★★★.

4. **Monthly mock-exam mode (already partially in 4.6)**. Full timed Goethe C1 Modellprüfung once per month. Score logged against the four falsifiable metrics from MISSION.md. The single best signal of whether Orbita is actually moving the needle. **Effort:** M (after #3 lands) · **Impact:** ★★★★★ for measurement.

5. **Listening dimension — YouTube + Podcast ingestion (1.1, 1.4)**. Hören is the module Shamil will be weakest at; current Orbita has zero listening-input surface. Whisper transcription for any URL or upload. **Effort:** L · **Impact:** ★★★★ for C1.

6. **Capture-with-context discipline** *(inspired by LangVia's "no auto-save")*. Right now click-to-save and the popover both add to vocab automatically. Sharpen to: select → "Explain" (structured plain meaning, why it works here, register, one example) → optional explicit "Save" button. The deck stays cleaner; only deliberate saves get scheduled into SRS. **Effort:** S · **Impact:** ★★★.

7. **Difficulty self-calibration over time (4.7)**. Once the steering buttons in #1 produce enough signal (~50 ratings), auto-tune next session's exercise mix toward the patterns the user is struggling with. **Effort:** M · **Impact:** ★★★.

8. **Real STT speaking grader (4.1)**. Web Speech API or Whisper-via-API for Sprechen practice. The productive skill hardest to self-train. **Effort:** L · **Impact:** ★★★★ for C1.

### Recently shipped (kept for memory)

- ~~**DW + free-source content picker**~~ ✅ v10 (DE-only)
- ~~**File upload (.txt/.md/.html/.rtf/.pdf/.docx + drag-and-drop)**~~ ✅ v11
- ~~**Cross-article SRS (SM-2 with FSRS-ready logging)**~~ ✅ v8

### Deferred to Phase 2 (only if the C1 certificate is earned)

These have been removed from the active priority list to keep the personal-Orbita phase focused. They go back on the table after 2026-12-31, *if* Shamil sits and passes the exam:

- Languages other than German (PT / ES / FR / EN) — plumbing stays but no roadmap work.
- Audience-specific modes: Teen / Kid (5.1), Migrant / new-resident (5.2), Adult professional add-ons (5.3).
- Social and community: collaborative annotation (6.1), public library (6.2), tutor marketplace (6.3), study groups (6.4).
- Output channels beyond what exists: native mobile app (2.2), email digest (2.4), voice-only mode (2.5), Chrome extension (1.6 / 2.1).
- Infrastructure expansion: open-source LLM backend toggle (3.1) — keep API path, defer local LLM; offline mode (3.3); multi-device cloud sync (3.4); self-hostable Docker (3.5).
- Anti-gamification toggle (7.3) — XP/streak are fine for the personal phase.

The deferral logic is explicit: anything whose primary value is "more users" or "more languages" or "more polished as a product" is not what moves Shamil toward C1 in 7 months. Resume after the goal is met or genuinely abandoned.
