# Orbita — the consolidated product

*2026-06-09. Supersedes nothing; ties everything together. One sentence: **Orbita is the personalized language-learning app Shamil wishes existed — and the tool that gets him through Goethe C1 by 2026-12-31.***

## What Orbita is, structurally

Two layers, one name:

**Orbita (the app)** — `app/orbita.html`. The single-file daily driver, formerly Verse/Lesefutter, v17. Sixteen versions of shipped functionality: learner profile injected into every prompt, SM-2 SRS with FSRS-ready history, Blind Spots error dashboard, vocab decks, source picker + file upload, the C1 Lesen exam module, mobile-responsive, offline-capable. This is what gets used every day and what every mission metric is measured in.

**Orbita Lab** — `orbita-lab/`. The Vite+TS prototype plus the distilled vision from all the design chats: the product brief (Concept model, 15 exercise widgets, FSRS via ts-fsrs, star systems → ship parts → galaxy warp), the style brief, and the Home-Galaxy PRD (zoomable CEFR star map). The Lab is where ideas are proven; proven ideas get ported into the app. The full Lab vision (RN mobile app, content packs, monetization) is **Phase 3 — after the C1 pass**, exactly as docs/MISSION.md demands.

## The mission, unchanged

Everything is still judged against one outcome: **Goethe-Zertifikat C1 by 2026-12-31** (docs/MISSION.md). The four falsifiable metrics: Lesen >60% in <70 min (module shipped v16) · Hören pass <40 min · Schreiben C1+ on the official rubric · Sprechen C1+ Vortrag + Diskussion. The rebrand changes the name on the door, not the door.

## Hard constraints carried forward

- `STORAGE_KEY = 'lesefutter_v2'` and the `verse_anthropic_*` localStorage keys are frozen forever — renaming wipes decks/keys.
- One self-contained file, works from `file://`, Edit-not-Write, `npm run check` + `npm test` before every commit.
- No copyrighted textbook content.

## This week (decided 2026-06-09)

| Day | Goal |
|---|---|
| Tue (done) | v17 rebrand: Verse → Orbita everywhere, checks green, this doc |
| Wed | **iPhone deploy**: private GitHub repo → GitHub Pages → Add-to-Home-Screen (docs/orbita-mobile-setup.md). Export deck JSON from desktop, import on phone. Daily use starts. |
| Thu–Fri | **Galaxy + flip cards port**: Map tab → zoomable/pannable CEFR star map per the Home-Galaxy PRD (canvas renderer, stable hash angles — `hashStr`/`cefrIndexOf` already exist — LOD labels, search-fly-to); Today tab → Karteto-style flip-card review polish from the Lab. |
| Weekend | Use it. Log friction in STATE.md. |
| Next | **C1 Schreiben module** (Aufgabe 1+2, official rubric, feeds Blind Spots) — the weakest mission metric. |

## Definition of "actually using it"

A review session on the iPhone home-screen app every day this weekend, with the steering bar and swipe-to-rate doing the work — not opening a file on the laptop out of duty.
