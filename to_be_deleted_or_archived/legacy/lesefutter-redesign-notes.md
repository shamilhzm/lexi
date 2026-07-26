# Lesefutter artifact — redesign + bugfix (session 2026-05-30)

Artifact: `Documents/Claude/Artifacts/lesefutter/index.html` (~5,400 lines, brand shows "Orbita"). Edited in place, then pushed via cowork update_artifact (id `lesefutter`).

## The JSON bug — root cause
`Error: Could not parse JSON from LLM response`. The generate prompt asks for the FULL article translated twice (target_original at stretch level + target_simplified at current level) plus all exercises. With input capped at 6000 words and API `max_tokens: 4096`, the response truncates mid-JSON → `JSON.parse` throws.

## Fixes applied
1. `extractJson` (was ~line 1710): rewritten to multi-strategy + repair — strips fences, narrows to outer `{`, then tries: raw → slice-to-last-`}` → `sanitizeLlmJson` (escape raw control chars inside strings, drop trailing commas) → `closeTruncatedJson` (close open string + brackets to salvage truncation). Two new helper fns added right after it.
2. `askViaAnthropicApi` `max_tokens` 4096 → 8192 (safe ceiling incl. Haiku 4.5).
3. `SRC_LIMITS.truncateTo` 6000 → 3000 (keeps double-translation output within budget; default Cowork bridge = Haiku, low output cap).

## UI declutter
- Composer (`#setup-panel`): heading → "New article" + subtitle; 6-field grid → compact `.composer-bar` (I'm learning / My level / Stretch + "More options" toggle + "Learner profile" jump). src-lang/view-mode/topic-hint moved into `#adv-options` (hidden by default, inline onclick toggle).
- Learner profile + Standalone panels: relocated to a bottom "Settings & learner profile" region via CSS flex `order` (body→flex column; label order 19, standalone 20, learner 21). Learner `open` attr removed (collapsed by default). NO DOM moves — every id/handler stays put.
- Tabs: underline → contained pill bar with two `.tab-sep` dividers (Today | Read…Speaking | Discuss Journal).
- New CSS appended before first `</style>` (anchor: the `touch-action: manipulation` line).

## Invariants honored
All element ids preserved (src-lang, target-lang, current-level, stretch-level, view-mode, topic-hint, src, generate-btn, etc.). `switchTab` uses `[data-tab]` selector; popover guard uses `#setup-panel`; learner wiring uses delegated click on `#learner-panel` — all still valid.

## If resuming
If edits landed but artifact not updated: call cowork update_artifact id=lesefutter html_path=<the index.html>. Verify by grepping `closeTruncatedJson`, `composer-bar`, `tab-sep`, `max_tokens: 8192`, `truncateTo: 3000`.
