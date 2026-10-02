# Trails — Trailhead's shape, for vocabulary

> **Proposal, not policy** *(2026-10-02)*. Nothing here is built. It is written to be
> argued with, like [BACKEND.md](BACKEND.md), and it would change two settled rulings in
> [VISION.md](VISION.md) — named at the end — so building any of it starts with deciding
> those.

## Why

The owner named [Trailhead](https://trailhead.salesforce.com/) as the benchmark for a
tangible outcome. They pointed to its copy, quizzes and hands-on checks, badges, ranks,
mascots, the way topics are organised, the sense of progression, and its optimism.
Measured against that, Lexi's engine is ahead of most consumer apps. The FSRS scheduler,
the 10,188 machine-verified cards and the feed that never grades are all strong. Its
*shape* is behind, in three ways.

1. **It is organised like a dictionary, not like a life.** Somebody who has moved to
   Germany needs "the words for the Bürgeramt on Thursday", not "more B1 words".
   - The words are already here. `npm run corpus:domains` (2026-10-02) finds **86 of 90**
     hand-picked survival words are verified cards.
   - They are scattered across 274 semantic sectors and a feed sorted by frequency.
2. **Progress is measured, not felt.** Lexi has a level path, a sky, a heatmap,
   durability and blind spots, all accurate. None is a milestone you could name to a
   friend.
3. **The voice is defensive.** Much of the copy explains what Lexi refuses. The honesty
   is right; it belongs in the mechanics, which frees the words to be warm.

## What Trailhead does that matters here

| Trailhead | What it does | Lexi's version |
|---|---|---|
| Trail → module → unit | Organised by what you will be able to do | Trails of **scenes** (below) |
| Objective + time at the top of a unit | You know the size of the commitment before you start | "~6 min · 8 words · read the Meldeformular" |
| Quiz at the end of a unit | A check stands behind the badge | A five-item check from the existing drills |
| Hands-on challenge, verified in your org | The outcome is real, not claimed | Machine-checkable in the app; real-world missions marked *self-confirmed* |
| Badges, points, ranks | Progress you can name | Stamps in a *Pass*; points only from verified recall; ranks with no leagues |
| Mascots, optimistic copy | Warmth | A Dackel, and copy that celebrates what a check proved |

## Trails are scenes, not sectors

Learning words in **semantic sets** (Gabel, Messer, Löffel) makes them interfere with
each other. Learners confuse the members more and learn the set more slowly (Tinkham
1993; Waring 1997). **Thematic sets** — the words of one situation, of mixed kinds —
help instead (Tinkham 1997). For example, Termin, Formular, unterschreiben and
Wartenummer.

Lexi's 274 sectors are semantic. Trails would be thematic, curated from cards that
already exist.

- **Ankommen**: Anmeldung, Bank, Handyvertrag, Krankenkasse.
- **Wohnen**: Wohnungssuche, Mietvertrag, Nebenkosten, Hausverwaltung.
- **Arbeit**: Bewerbung, Vorstellungsgespräch, Arbeitsvertrag, Kollegen, Krankmeldung.
- **Arzt & Apotheke**: no subtopics yet.
- **Behörden**: Ausländerbehörde, Aufenthaltstitel, Einbürgerung.
- **Einkaufen & Essen**: no subtopics yet.
- **Unterwegs**: DB, ÖPNV.
- **Geld & Steuern**: no subtopics yet.
- **Familie & Schule**: Kita, Elternabend, Elternbrief.
- **Feierabend**: no subtopics yet.
- **Your topics**: built from the stories the learner reads (narrow reading, BACKLOG).

`scripts/corpus/domain-coverage.ts` already lists seven of these domains. That makes it
the seed list, and it is how the gaps are found. Today they are *Meldebescheinigung* and
*Termin ausmachen* (absent), and *Anleiterin* and *Beschwerden* (lookup only).

## The unit loop

1. **Objective and time.** "Read the Meldeformular · ~6 min · 8 words."
2. **Meet the words.** Feed cards, with audio and the pictogram where there is one.
   They are heard in Hören too.
3. **Check.** Five items drawn from the drills that already exist: meaning, gender,
   plural and recall. Pass at four.
   - Only the **first attempt** is FSRS evidence.
   - Retries are allowed, as in Trailhead, and earn the stamp but write nothing.
4. **Try it (optional).** Hear the words in a Hören programme, or find them in today's
   story. Or take a real-world mission — "book the Termin by phone this week" — which
   is marked **selbst bestätigt** wherever it appears.
5. **Stamp.** A Behörden-style stamp on the pictogram grid, collected in a **Pass** on
   Fortschritt, with trails drawn as routes on the Atlas.

## Points and ranks — honest by construction

- **Points come only from verified recall**: a passed check item, or a Good/Easy review.
  Never from taps, scrolls, listens, saves or streaks.
- **Ranks use absolute thresholds**, with no leagues and no comparison to anyone. VISION
  refuses leagues, and this keeps that refusal.
- **Draft ladder** (names to be chosen with the owner): **Neu hier → Angemeldet →
  Stammgast → Nachbar → Kiezkenner → Zuhause.** The top rank is the feeling a mover is
  actually after.

## The mascot

**A Dackel, drawn on the pictogram grid** ([PICTOGRAMS.md](PICTOGRAMS.md)).

- **The precedent.** Waldi, the 1972 Munich Olympic dachshund, was the first official
  Olympic mascot. It came out of Otl Aicher's design office, which is the tradition the
  Atlas identity already draws on. An homage, not a copy.
- **What it does.** It carries the celebrations and the hints.
- **What it never does.** It never guilt-trips, never mourns a streak, and never says
  more than a check proved.

## Copy

Trailhead's structure, Lexi's honesty. A claim of competence is allowed **only right
after a check proved it**, and only about what was checked.

- **Before:** "No press, no grade — only an answer you vouch for counts."
- **After:** "Nine of ten on the Mietvertrag check. Those words are yours now — Lexi
  will bring them back before they fade."

## What it would change in VISION

1. **Track E #5, "nothing picks a card".** A trail is a curated set, so this would narrow
   to: *the opening session is not hand-composed; trails are opt-in and named as
   curation*.
2. **The refusal of "you can now …" from a word count.** This would narrow to: *never
   from a count; allowed right after a check, about what was checked*.

## A first slice, when it is decided

**Behörden**, one trail of three units, with its check, stamp and the first rank. It is
the smallest version that answers "does this feel like Trailhead?" on a phone.

**Open questions for the owner:**

- the rank names;
- whether *self-confirmed* missions belong at all;
- whether the Pass replaces the level path on Fortschritt or sits beside it.
