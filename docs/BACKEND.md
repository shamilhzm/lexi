# Accounts and sync — the design

**Status: design only. No code written.** This exists because the decisions below
are not cheap to reverse, and two of them are promises to users rather than
technical choices.

> ## ⚠️ Proposal, not policy — flagged 2026-08-13
>
> **This document and [`CLAUDE.md`](../CLAUDE.md) disagree, and neither has yielded.**
> §"Why this is happening" below says *"the call was made: build toward accounts and a
> backend."* The project's own instructions say *"Local-first, no backend."* Since this
> was written, [PEDAGOGY.md](PEDAGOGY.md) found that **every teacher persona and several
> learners named the absence of accounts as the single thing they would lose** — and
> that the teacher-visibility problem this design exists to solve has a local-first
> answer nobody had costed: print, plus learner-initiated export.
>
> **Ruling ([VISION.md](VISION.md) § open decisions): local-first is the shipping
> behaviour, and no doc, screen or pitch may promise otherwise until this is settled
> deliberately.** Nothing here is cancelled — the design work is good and §1 (the
> promise that has to change first) and §4 (why per-card last-write-wins is wrong) are
> both correct and would be expensive to re-derive. But it is a proposal awaiting a
> decision, not a direction being executed.
>
> The one item worth building regardless is **§5 step 1, the append-only review
> ledger** — it improves Stats on its own, involves no server, and is the prerequisite
> for any future merge.

## Why this is happening

[CRITIQUE.md](CRITIQUE.md) named two contradictions the product could not hold at
once. The B2B pitch in [SCHOOL-PITCH.md](SCHOOL-PITCH.md) needs accounts the
architecture refuses, and the retention story has no mechanism — the reminder is a
page-context timer that only fires while Lexi is open, so nothing brings a learner
back. Both resolve the same way, and the call was made: **build toward accounts and
a backend.**

**Decisions taken:**

| | |
|---|---|
| First job | **Consumer: progress sync + push.** Teacher dashboards later, on the same foundation. |
| Offline | **Local-first with sync on top.** IndexedDB stays the source of truth; the server is a replica. |
| Account | **Optional.** Signed-out behaviour is exactly what ships today. |

That last one is mine rather than a stated requirement, and it is the load-bearing
choice in this document — see §2.

---

## 1. The promise that has to change first

The first-run screen tells every new learner, verbatim (`src/views/Today.tsx:126`):

> No account, no sign-in. Your progress is stored on this device only and never
> leaves it.

The same claim is in [`README.md`](../README.md) twice (lines 15 and 43) and is the
whole of the DSGVO argument in SCHOOL-PITCH.

**This copy must change in the same release that ships the first byte of sync, or
before it — never after.** Not because a regulator would notice, but because it is
a specific factual promise made to a person who then acted on it. Shipping sync
while that sentence is on screen would make the app lie to the people who trusted
the claim most.

Concretely, before any sync code merges:
- Today's first-run blurb becomes true for both modes.
- README's two claims become mode-qualified.
- A privacy note exists that says what leaves the device, when, and to where.
- SCHOOL-PITCH's DSGVO section is rewritten or marked stale.

This is the one item in this document I would block a release on.

---

## 2. Account-optional is what keeps the current product

The cheapest version of this pivot is a required account. It is also the one that
throws away the asset the critique identified: **zero data liability, zero infra
cost, and an offline story that genuinely works.** A learner on a plane, a learner
in a Sprachschule with bad wifi, and a learner who simply does not want an account
are all served today and would stop being.

So: **signed-out is not a degraded mode, it is the current app.** Everything works,
nothing syncs, and the export/import backup in Settings remains the recovery path.
Signing in adds a replica and push. Signing out leaves the local data alone.

The cost is real and worth stating: two code paths, two sets of edge cases, and a
sync layer that cannot assume it has ever seen this device before. The alternative
costs the product's only genuine moat outside the scheduler.

---

## 3. What syncs, and what deliberately does not

The store already separates these, which makes the boundary easy to draw honestly.

**Syncs — the learner's actual progress:**

| Key | What | Why |
|---|---|---|
| `lexi.cards.v1` | FSRS state per card (IndexedDB) | the thing that is irreplaceable |
| `lexi.miss.v1` | blind-spot miss log | drives which drills ride along |
| `lexi.visits.v1` | days studied | streak, and the comeback greeting |
| `lexi.reviewlog.v1` | daily review *counts* — not a ledger, see §4 | Stats and the recall curve; merges by taking the higher count per day |
| `lexi.completions.v1` | finished sectors | ratcheted; losing it un-earns something |

**Syncs — settings worth carrying to a second device:**
`placement`, `levels`, `retention`, `pace`, `goal`, `interests`, `focus`,
`profile.name`, `flags`. These are already enumerated as
`SETTING_KEYS` in `store.ts:1232` for the backup export, which is the same
boundary — the export has been answering "what is worth keeping" correctly for
months and should be reused rather than re-derived.

**Does not sync, on purpose:**
- `lexi.theme.v1`, `lexi.textscale.v1`, `lexi.sound.v1`, `lexi.sidebar.collapsed.v1`
  — per-device preferences. A phone and a laptop want different answers.
- `lexi.mapseen.v1` — ephemeral view state. `store.ts:418` already says why: a
  months-old "last seen" restored from elsewhere animates a meaningless jump.
- `lexi.reminder.v1` — a study time is a per-device notification setting.
- `lexi.backup.v1`, `lexi.installnudge.v1` — local nags.
- **Nothing derived.** Stats, coverage and the heatmap are computed from cards; a
  server that stored them would be storing a second truth that could disagree.

---

## 4. Conflict resolution

Two devices, both offline, both studying the same card. This is the part that
usually gets hand-waved and then bites.

**Per-card last-write-wins is wrong here**, and it is worth saying why rather than
just asserting it: FSRS state is not a value, it is the result of a history.
Overwriting a card reviewed twice on the phone with one reviewed once on the laptop
silently discards a real review, and the learner sees a card come back sooner than
it should with no way to know why.

The correct merge is to treat reviews as append-only events and re-fold them:
`ts-fsrs` is deterministic, so the same events in the same order produce the same
card on both devices.

### There is no such event log today, and I nearly designed around one

`lexi.reviewlog.v1` sounds like the ledger this needs and is not. It is
`Record<date, { n, again }>` (`store.ts:483`) — **daily counts**, capped at 60 days,
with no card ids, no grades and no timestamps. It exists to draw the Stats chart.
Nothing in the app currently records *which* card was reviewed *when* and *how*.

So event-replay merge has a genuine prerequisite: **an append-only review ledger
that does not exist yet.** That is a schema addition to IndexedDB, a write on every
grade, and a size question (a mature learner reviews tens of thousands of times).
It is the first engineering task of this phase and it has nothing to do with
servers — it can ship, and be useful for Stats, before any account exists.

### Until that ledger exists

Merge on **higher `reps` wins**, per card. It is the least-destructive tie-break
available, it is already what `migrateIds` does for id collisions (`store.ts:141`),
and it degrades in the right direction: the device that studied more keeps its
state. It will occasionally lose a review. It will never invent one.

Ship sync on this only if the ledger turns out to be expensive; prefer the ledger.

## 5. Sequencing

Each step is independently shippable and independently reversible.

1. **Build the review ledger** (§4). Append-only, card id + grade + timestamp.
   Audited already: the existing `reviewlog` cannot do this. No server involved,
   and it improves Stats on its own, so it is worth doing whatever happens next.
2. **Change the copy** (§1). Ships before anything transmits.
3. **Anonymous device id + opt-in error reporting.** Not tracking — the critique's
   separate point that nothing tells you when the app breaks for someone. Smallest
   possible server surface, and it proves the deployment path.
4. **Auth.** Email link or OAuth; no passwords stored either way.
5. **Sync.** Push local → server, pull server → local, replay-merge per §4.
   Signed-out remains untouched throughout.
6. **Push notifications.** The retention mechanism this whole phase exists for.
   Needs VAPID keys and a `push` + `notificationclick` handler in `public/sw.js`,
   which today has neither.
7. **Teacher dashboards.** Only after 1–6, and only with a design partner.

## 6. Open questions — decisions, not tasks

- **Hosting region and provider.** EU is effectively required by the DSGVO story;
  Vercel already hosts the frontend but its Postgres/KV region must be pinned.
- **Auth method.** Email magic-link is the lowest-friction and stores no password.
- **Data retention and deletion.** An account implies a delete path. Under
  local-first-plus-replica, "delete my account" means dropping the replica and
  leaving the device untouched — which is a nice story, and needs to be the
  documented one.
- **Under-18 learners.** Schools mean minors. If B2B is ever pursued this becomes a
  consent question with a different legal shape.
- **Cost ceiling.** Zero today. What is the monthly number above which this stops
  making sense?

---

*Written 2026-08-06. Nothing in this document has been built. Argue with it here
rather than in a commit message.*
