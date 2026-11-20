---
name: lexi-deploy
description: Pre-flight checks and deploy for Lexi production (Vercel, https://lexi-eosin.vercel.app). Use it before any `vercel --prod`, `npm run deploy` or push to `main` (Vercel deploys `main` on its own, so a push is a deploy). Also use it when the user says ship it, release, deploy, push, "is production up to date", "what's live", or wants to review or test the live app, since that also starts by pinning the live build.
---

# Deploying Lexi

Production is Vercel. It builds `main` through the git integration, and
`npm run deploy` is the CLI path, which stamps the sha through `LEXI_BUILD_SHA`.
**Pushing `main` is a deploy.**

**Permission is per turn.** The owner approves each push and each deploy for that turn
only. An earlier "ship it" is not standing permission. Without this turn's approval, do
steps 1–4 and hand the owner the commands.

## 1. Read what is live

```bash
curl -s https://lexi-eosin.vercel.app/version.json
```

This returns `{ sha, builtAt }`. If `sha` is `dev` or missing, match `builtAt` against
`git log --format='%h %cI %s' --all`, or fingerprint the build: `vercel inspect <prod-url>
--logs` prints the module count and bundle sizes, and rebuilding a candidate commit
reproduces them.

## 2. Refuse a tree that doesn't contain it

```bash
git fetch origin && git merge-base --is-ancestor <prod-sha> HEAD && echo "contains production"
```

If this fails, stop and tell the owner. On 2026-09-24 a stale `main` was deployed over
two weeks of newer work. The tree looked fine from the inside: recent commits, clean
status, matching docs. Whether a tree is current can only be read from the deployment.

## 3. Run CI's checks, in CI's order

```bash
npm run typecheck && npm test && npm run build && node scripts/budget.ts && npm run corpus:validate -- --strict
```

`budget.ts` enforces the boot-set and entry-chunk ceilings and fails if `devseed`
reached the bundle. If a ceiling trips, don't raise it as a side effect. The one raise
so far (820 → 860 KB, 2026-11-19) was its own commit, with the reason written in
`scripts/budget.ts`.

## 4. Know what will ship

- `git status --short`. A **git-integration** deploy ships only committed, pushed work.
  A **CLI** deploy (`npm run deploy`) uploads the working directory, uncommitted edits
  included, while the stamp still names `HEAD`. Deploy from the CLI only with a clean
  tree.
- `git log origin/main..HEAD --oneline` is what the push adds.

## 5. Deploy (only with this turn's approval)

Choose one path, not both. Both would run two production builds.

- `git push origin main`, and Vercel builds it, **or**
- `npm run deploy`

## 6. Confirm

Run `curl -s https://lexi-eosin.vercel.app/version.json` until `sha` matches
`git rev-parse --short HEAD`. For anything visual, check it on the iPhone simulator
against production (see `lexi-persona-drive`). Record the production sha in the
CHANGELOG entry and in the project memory, so the next session's step 1 has something
to compare against.

## The tutor endpoint

`api/tutor.ts` needs `ANTHROPIC_API_KEY` and `TUTOR_ACCESS_CODE` set on the Vercel
project, and an env change needs a redeploy. Never put a key in the repo, in chat or in
the client. BACKLOG, *The tutor's owner setup*, has the steps.
