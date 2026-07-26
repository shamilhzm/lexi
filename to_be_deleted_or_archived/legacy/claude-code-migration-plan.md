# Orbita → Claude Code: an action plan

**Verdict:** Moving Orbita into Claude Code is the right call now. A 5,400-line single HTML file has outgrown manual editing — Claude Code gives you real version control, tests, modular code, and agentic iteration, which is exactly what you need to ship the C1 backlog fast. Do the migration this week, run Orbita as your intensiv companion through the course, and keep the **Language-as-a-Service idea as a gated Phase 3 behind your 10 Dec C1 pass** — your own `MISSION.md` warns that the tool can become the project; honour that guardrail.

Read this top to bottom once. Then do "This week" at the end.

---

## What Claude Code is (in one paragraph)

Claude Code is a terminal tool: you `cd` into a project folder, run `claude`, and talk to it like you've talked to me here — but it lives *in your repo*. It reads and edits your files directly, runs commands (git, tests, build), and asks permission before changes so you can review diffs. The one file that makes it powerful is **`CLAUDE.md`** — a markdown file in your project root that it reads at the start of *every* session. It's the same engine across terminal, IDE, and web, so your `CLAUDE.md`, settings, and MCP connectors carry over.

---

## Phase 0 — First-time setup (~30–45 min, one-time)

1. **Install.** You need Node 18+. Then either the npm path or a native installer:
   - npm (works everywhere): `npm install -g @anthropic-ai/claude-code`
   - macOS native alternative if you prefer: follow the installer on the official docs.
2. **Start it.** Open Terminal, `cd` into your project, run `claude`. It opens a browser to log in — use your Claude account (your existing plan covers Claude Code; it draws on the **same usage limits** you already manage, so the token discipline you practise here applies there too).
3. **Generate project memory.** Inside Claude Code, run `/init`. It scans the folder and writes a starter `CLAUDE.md`. This is the single most important setup step — do not skip it.
4. **Learn five things and you're productive:**
   - **Plan mode** (press `Shift+Tab` to cycle modes) — makes it propose a plan before editing. Use it for anything non-trivial.
   - **`@filename`** — pull a file into context (e.g. `@app/orbita.html`).
   - **`/clear`** — wipe context between unrelated tasks (saves your limit — same lesson as here).
   - **`/model`** — switch between Opus 4.6 (hard refactors), Sonnet 4.6 (daily driver), Haiku 4.5 (cheap/fast).
   - **Permissions** — it asks before edits/commands; read the diff, approve or redirect.

A good first prompt: *"Read STATE.md, docs/MISSION.md, and docs/orbita-backlog.md, then summarize the project and propose what to do first. Don't edit anything yet."*

---

## Phase 1 — Migrate Orbita cleanly (week 1, alongside drilling)

The goal here is **safety and structure, not a rewrite.** Get it into git, give it a brain (`CLAUDE.md`) and a safety net (tests), then stop.

1. **Put it under version control.** In the folder: `git init`, then commit everything (`app/orbita.html`, `docs/`, `decks/`, `reference-images/`). Ask Claude Code to add a sensible `.gitignore` (exclude `app/node_modules/`). Then create a **private GitHub repo** (Claude Code can walk you through `gh` or the web flow) — that's your history, backup, and the thing GitHub Pages deploys from.

2. **Write a strong `CLAUDE.md`.** Fold in the hard-won constraints that already live in `STATE.md` so Claude Code never relearns them the hard way:
   - Do **not** rename `STORAGE_KEY = 'lesefutter_v2'` (it's the localStorage namespace — renaming wipes every deck).
   - The app must stay a **single self-contained file** that works offline and via iCloud / GitHub Pages on iPhone.
   - **Always `node --check`** the extracted script before declaring done.
   - The mission: **Goethe C1 by 10 Dec 2026** — features are judged against that.
   - Mobile + iCloud + JSON deck export are load-bearing; don't break them.

3. **Add a safety net so Claude Code can refactor fearlessly.** Right now nothing stops a bad edit from silently breaking the deck. Ask Claude Code to add:
   - a tiny test runner (`node --test`) with unit tests for the riskiest pure logic — **SM-2 scheduling**, `cefrIndexOf`, `seedDecks` (no double-seed), JSON import/export round-trip;
   - a one-command check: `node --check` + tests, run before every commit.

4. **Decide the structure (do this *after* steps 1–3, not day one).** Two viable paths:
   - **(a) Stay single-file, add a build step.** Keep authoring in `orbita.html` but add a script that validates + minifies. Lowest effort; the file stays the monolith.
   - **(b) Modular source → single-file output (recommended once stable).** Split the 5,400 lines into `src/` modules (srs, galaxy, decks, ui, llm) and use **Vite + `vite-plugin-singlefile`** to bundle back into one self-contained `orbita.html`. You keep the "one file works offline" property *and* get editable, testable modules. This is the upgrade that makes everything after it faster — but it's a real change, so do it as its own branch with tests green before and after.

5. **Deploy for the phone.** You already have `docs/orbita-mobile-setup.md` (iCloud + GitHub Pages). With the repo live, GitHub Pages gives Orbita a real URL → Add-to-Home-Screen on iPhone. Ask Claude Code to set up the Pages workflow.

**Migration done when:** repo on GitHub, `CLAUDE.md` written, tests + `node --check` pass, Pages URL works on your phone. Resist productizing until this is true.

---

## Phase 2 — Intensiv course companion (from 22 June)

Now Claude Code earns its keep by shipping the backlog fast while you're in class:

- **Daily loop:** after class, paste the day's *Schritte B1* unit or your notes → have Orbita generate exercises from it; log misses. Ask Claude Code to add a lightweight **"today's class" ingestion** path so this is one tap.
- **Ship the ranked backlog** (`orbita-backlog.md`), in order, one feature per branch:
  1. **Blind Spots tab** — the four weakness tags are already seeded (`konj-ii`, `passiv`, `kasus-dekl`, `konnektoren`); this slots straight in.
  2. **Goethe C1 exam-aligned exercises** (Lesen 1–4, Hören 1–4, Schreiben 1+2 on the official rubric, Sprechen).
  3. **Monthly mock-exam mode** scored against your four mission metrics.
  4. **Listening ingestion** (YouTube/podcast → transcript → exercises) — your weakest module.
- **Workflow habits:** use plan mode for each feature; let it run the tests; commit per feature; keep `STATE.md` as your resume file (you already do this well — it's exactly the right Claude Code habit).

---

## Phase 3 — Language-as-a-Service (design now, build *after* the exam)

The ambition is credible — but sequence it honestly.

**The guardrail (from your own `MISSION.md`):** *"anything whose primary value is 'more users' is not what moves Shamil toward C1."* So: **gate the build behind your 10 Dec C1 pass.** You may make architecture choices now that keep the door open; you may not let SaaS work eat study hours before December.

What actually changes going multi-user:
- **Backend.** Single-file + localStorage doesn't serve many users. You'd add accounts/auth, per-user decks, and sync — a thin stack like **Supabase (Postgres + auth)** is the low-overhead choice. Keep the single-file app as the free/personal tier; the SaaS tier talks to the backend.
- **Generation server-side.** Move the `ask()` pipeline to the **Claude Agent SDK** on the server so students don't bring their own API key and you control cost and quality.
- **The school wedge (your real opportunity).** Sell B2B to language schools like **activ lernen** — teacher dashboards, class sets, CEFR-aligned drills, progress analytics. Your own intensiv is the design partner and first case study, and you already hold **Markus Leal's card** — that's your first validation call.
- **Content rights — important.** *Schritte PLUS NEU* and *DaF Kompakt* are copyrighted; you can't redistribute their content. The defensible model is exactly Orbita's: **students bring their own licensed material and the app generates personalized exercises from it.** Don't ship textbook text.
- **Compliance.** German students = real **GDPR** obligations (data minimization, consent, hosting in the EU). Treat this seriously before taking real user data. *(Not legal advice — get a professional review before you sell.)*
- **Validate before you build.** Two or three schools saying "yes, we'd pay for this and here's what teachers need" is the signal that turns this from a dream into a roadmap. Do that *after* December.

---

## First-timer guardrails

- **Commit often; branch for experiments.** Cheap undo is the whole point.
- **`/clear` between unrelated tasks** and let it read `STATE.md`/`MISSION.md` at session start — same context discipline that keeps your sessions long.
- **Migrate first, refactor second, productize last.** Don't rewrite + go multi-user in one heroic session; that's how projects break.
- **The mission trap is real.** Every week ask: did this move me toward the C1, or did I just enjoy building? If scores aren't trending by September, the answer is fewer features and more official Goethe practice — not more Orbita.

---

## This week (concrete first steps)

1. Install Claude Code and authenticate (`npm install -g @anthropic-ai/claude-code`, then `claude`).
2. `git init` in the project folder + create a private GitHub repo.
3. Run `/init`, then have it write the real `CLAUDE.md` from the constraints above.
4. Add `node --check` + 2–3 unit tests (SM-2, `cefrIndexOf`, deck import/export).
5. Ship **one small feature** end-to-end (the Blind Spots tab) to learn the full loop: plan → edit → test → commit → deploy.

Once those five are done, you're a Claude Code user — and Orbita is ready to grow into your course companion.

---

### Sources
- [Claude Code — Overview (official docs)](https://code.claude.com/docs/en/overview)
- [Claude Code — getting started / install](https://code.claude.com/docs/en/overview)
