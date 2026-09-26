// Reports that reach somebody — a card that looks wrong, a word Lexi lacks.
//
// ## Why this exists *(2026-09-25, panel review)*
//
// A solo-maintained corpus lives or dies by error reports, and until now every
// report ended in a drawer. The flag wrote `{id, term, at}` to this device, the
// Profile list said "save them as a small file and send it on", and nothing
// anywhere said *where*. The repository had never received an issue. A learner
// who knew the maintainer personally could close the loop; nobody else could.
//
// So a report is now a **link the learner follows**: a GitHub issue, opened in a
// new tab, with the card id, the headword and what looks wrong already filled
// in. Nothing is sent by Lexi — the learner sees the whole issue before it
// exists, and can edit or abandon it. That keeps the local-first promise
// literal: this module builds a URL and does nothing else.
//
// **No email fallback, deliberately.** The repo publishes no contact address, and
// inventing one is the owner's decision, not the code's. When one exists, a
// `mailto:` builder belongs beside `cardIssueUrl` with the same body.
//
// **What goes in the URL is corpus data, never learner data.** A card id and its
// headword are public; a flag's timestamp, the learner's schedule, their name and
// their level are not, and none of them are read here. The wanted-words issue
// carries what the learner typed and the sentence it was met in — shown to them in
// full on GitHub before submitting, because an issue is public.
import { BUILD } from './build.ts';

/** The one repository reports go to. Also the "Support" link's target. */
export const REPO_URL = 'https://github.com/shamilhzm/lexi';

/** The issue forms in `.github/ISSUE_TEMPLATE/`. Named here so a renamed template
 *  fails a test rather than silently opening a blank issue. */
export const CARD_TEMPLATE = 'card.yml';
export const WORD_TEMPLATE = 'word.yml';

/** What can be wrong with a card, in the order a learner is likely to notice it.
 *  One chip each. `other` is honest about the list not being exhaustive. */
export const REPORT_FIELDS = [
  { key: 'meaning', label: 'Meaning' },
  { key: 'gender', label: 'Gender' },
  { key: 'plural', label: 'Plural' },
  { key: 'example', label: 'Example' },
  { key: 'pronunciation', label: 'Pronunciation' },
  { key: 'level', label: 'Level' },
  { key: 'other', label: 'Something else' },
] as const;
export type ReportField = (typeof REPORT_FIELDS)[number]['key'];

/** GitHub serves `issues/new` URLs to about 8 KB and truncates silently past it.
 *  Kept well inside, because a report that arrives cut off mid-word is worse
 *  than one that says "and 12 more — see the attached file". */
export const MAX_URL = 6000;

function issueUrl(params: Record<string, string>): string {
  const q = new URLSearchParams(params);
  return `${REPO_URL}/issues/new?${q.toString()}`;
}

/** A prefilled issue for one card.
 *
 *  The query keys after `template` are the issue form's field ids — GitHub fills
 *  an input whose `id` matches a parameter. `card.yml` declares `card`, `term`,
 *  `problem` and `build`; keep the two in step (`report.test.ts` reads the
 *  template and checks). */
export function cardIssueUrl(card: { id: string; term: string }, field: ReportField): string {
  const label = REPORT_FIELDS.find((f) => f.key === field)?.label ?? 'Something else';
  return issueUrl({
    template: CARD_TEMPLATE,
    title: `[card] ${card.term} — ${label.toLowerCase()}`,
    card: card.id,
    term: card.term,
    problem: label,
    build: BUILD.sha,
  });
}

/** Several flagged cards in one issue — the Profile list's "report all".
 *  Ids only, one per line: the maintainer's `corpus:flags` already takes ids. */
export function flagsIssueUrl(flags: { id: string; term: string }[]): string {
  if (flags.length === 1) return cardIssueUrl(flags[0], 'other');
  const rows = flags.map((f) => `- ${f.term} · \`${f.id}\``);
  return fitted(rows, (listed) => issueUrl({
    template: CARD_TEMPLATE,
    title: `[card] ${flags.length} cards flagged in Lexi`,
    card: '(several — see details)',
    problem: 'Something else',
    details: listed,
    build: BUILD.sha,
  }));
}

/** A word Lexi does not have, as one issue — "Words Lexi didn't have".
 *
 *  Ranked by how often it was looked up, which is the order `authoring:new` wants
 *  them in. The sentence it was met in rides along when there is one (it is the
 *  attested example a card needs), trimmed, because the page it came from is on
 *  the learner's device and the issue is public. Never promises the word will be
 *  added: the gate decides, and the template says so. */
export function wantedIssueUrl(words: { term: string; n: number; ex?: string; src?: string }[]): string {
  const rows = words.map((w) => {
    const count = w.n > 1 ? ` (${w.n}×)` : '';
    const met = w.ex ? ` — „${trim(w.ex, 140)}“${w.src ? ` (${trim(w.src, 60)})` : ''}` : '';
    return `- ${w.term}${count}${met}`;
  });
  return fitted(rows, (listed) => issueUrl({
    template: WORD_TEMPLATE,
    title: words.length === 1 ? `[word] ${words[0].term}` : `[word] ${words.length} words Lexi didn't have`,
    words: listed,
    build: BUILD.sha,
  }));
}

/** As many rows as fit under `MAX_URL`, and a line saying how many did not.
 *  Drops from the end, which is the least-asked-for end for both callers. */
function fitted(rows: string[], make: (listed: string) => string): string {
  for (let k = rows.length; k > 0; k--) {
    const more = rows.length - k;
    const url = make([...rows.slice(0, k), ...(more ? [`- …and ${more} more (attach the saved file)`] : [])].join('\n'));
    if (url.length <= MAX_URL) return url;
  }
  return make(`- ${rows.length} items (attach the saved file)`);
}

function trim(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}
