// The report links are the corpus's only inbound channel, so what they carry —
// and what they must never carry — is pinned here.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  cardIssueUrl, flagsIssueUrl, wantedIssueUrl, REPORT_FIELDS, MAX_URL, REPO_URL,
  CARD_TEMPLATE, WORD_TEMPLATE,
} from './report.ts';

const params = (url: string) => new URL(url).searchParams;
/** Field ids an issue form declares — the query keys GitHub will fill. */
function formIds(template: string): Set<string> {
  const yml = readFileSync(join(process.cwd(), '.github/ISSUE_TEMPLATE', template), 'utf8');
  return new Set([...yml.matchAll(/^\s+id:\s*(\S+)/gm)].map((m) => m[1]));
}

describe('cardIssueUrl', () => {
  const card = { id: 'voc:A1:die Sprache', term: 'die Sprache' };

  it('opens a new issue on the one repository, from the card template', () => {
    const url = cardIssueUrl(card, 'gender');
    expect(url.startsWith(`${REPO_URL}/issues/new?`)).toBe(true);
    expect(params(url).get('template')).toBe(CARD_TEMPLATE);
  });

  it('carries the card id, the headword and what looks wrong — spaces and umlauts survive', () => {
    const p = params(cardIssueUrl({ id: 'voc:B1:die Übung', term: 'die Übung' }, 'plural'));
    expect(p.get('card')).toBe('voc:B1:die Übung');
    expect(p.get('term')).toBe('die Übung');
    expect(p.get('problem')).toBe('Plural');
    expect(p.get('title')).toBe('[card] die Übung — plural');
  });

  it('carries corpus data and nothing about the learner', () => {
    const keys = [...params(cardIssueUrl(card, 'meaning')).keys()].sort();
    expect(keys).toEqual(['build', 'card', 'problem', 'template', 'term', 'title']);
  });

  it('every query key is a field the issue form declares, so GitHub fills it', () => {
    const ids = formIds(CARD_TEMPLATE);
    for (const f of REPORT_FIELDS) {
      for (const k of params(cardIssueUrl(card, f.key)).keys()) {
        if (k === 'template' || k === 'title') continue;
        expect(ids, `card.yml has no field "${k}"`).toContain(k);
      }
    }
  });
});

describe('flagsIssueUrl', () => {
  it('one flag is one card report', () => {
    const p = params(flagsIssueUrl([{ id: 'voc:A1:der Tisch', term: 'der Tisch' }]));
    expect(p.get('card')).toBe('voc:A1:der Tisch');
  });

  it('lists every id when they fit, and stays under the URL budget when they do not', () => {
    const few = Array.from({ length: 3 }, (_, i) => ({ id: `voc:A1:w${i}`, term: `w${i}` }));
    expect(params(flagsIssueUrl(few)).get('details')).toContain('`voc:A1:w2`');

    const many = Array.from({ length: 200 }, (_, i) => ({ id: `voc:B2:das Wort${i}`, term: `das Wort${i}` }));
    const url = flagsIssueUrl(many);
    expect(url.length).toBeLessThanOrEqual(MAX_URL);
    expect(params(url).get('details')).toMatch(/…and \d+ more \(attach the saved file\)/);
  });

  it('only declared form fields', () => {
    const ids = formIds(CARD_TEMPLATE);
    const url = flagsIssueUrl([{ id: 'a', term: 'a' }, { id: 'b', term: 'b' }]);
    for (const k of params(url).keys()) if (k !== 'template' && k !== 'title') expect(ids).toContain(k);
  });
});

describe('wantedIssueUrl', () => {
  it('ranks as given, counts repeats, and keeps the sentence it was met in', () => {
    const p = params(wantedIssueUrl([
      { term: 'Gepflogenheit', n: 3, ex: 'Das ist hier Gepflogenheit.', src: 'Ein Artikel' },
      { term: 'Wurstbrot', n: 1 },
    ]));
    expect(p.get('template')).toBe(WORD_TEMPLATE);
    expect(p.get('words')).toBe('- Gepflogenheit (3×) — „Das ist hier Gepflogenheit.“ (Ein Artikel)\n- Wurstbrot');
  });

  it('never promises anything in the URL — the template says what happens', () => {
    const url = decodeURIComponent(wantedIssueUrl([{ term: 'x', n: 1 }]));
    expect(url).not.toMatch(/will be added/i);
  });

  it('a long list is cut from the rarely-asked end, under the budget', () => {
    const words = Array.from({ length: 300 }, (_, i) => ({ term: `Wort${i}`, n: 300 - i, ex: 'Ein ziemlich langer Beispielsatz, der hier steht.'.repeat(3) }));
    const url = wantedIssueUrl(words);
    expect(url.length).toBeLessThanOrEqual(MAX_URL);
    const listed = params(url).get('words')!;
    expect(listed.startsWith('- Wort0 (300×)')).toBe(true);
    expect(listed).toMatch(/…and \d+ more/);
  });

  it('only declared form fields', () => {
    const ids = formIds(WORD_TEMPLATE);
    for (const k of params(wantedIssueUrl([{ term: 'x', n: 1 }])).keys()) {
      if (k !== 'template' && k !== 'title') expect(ids).toContain(k);
    }
  });
});
