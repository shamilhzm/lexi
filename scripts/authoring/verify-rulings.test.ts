// The rulings file is a gate on a gate, so it is strict about its own shape.
//
// A malformed row here does not fail loudly at the point of use — it fails as a
// card rejected for the hundredth time with no explanation, which is exactly the
// invisibility `verify-rulings.tsv` exists to end. So every parse failure is an
// exception, never a skipped line, and these are the cases that produce one.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRulings, rulingsFor, loadRulings } from './verify.ts';

const row = (...cols: string[]) => cols.join('\t');
const ok = row('das Handy', 'gender', 'das', 'de.wikipedia "Mobiltelefon"', '2026-09-09');

describe('parseRulings', () => {
  it('reads a well-formed row', () => {
    expect(parseRulings(ok)).toEqual([{
      term: 'das Handy', field: 'gender', value: 'das',
      evidence: 'de.wikipedia "Mobiltelefon"', date: '2026-09-09',
    }]);
  });

  it('ignores comments, blanks and the header', () => {
    expect(parseRulings(['# a comment', '', 'term\tfield\tvalue\tevidence\tdate', ok].join('\n'))).toHaveLength(1);
  });

  it('rejects a row missing columns rather than guessing at it', () => {
    expect(() => parseRulings(row('das Handy', 'gender', 'das'))).toThrow(/5 tab-separated columns/);
  });

  it('rejects a field it does not know', () => {
    expect(() => parseRulings(row('das Handy', 'level', 'A1', 'somewhere', '2026-09-09')))
      .toThrow(/unknown field "level"/);
  });

  it('rejects a ruling with no citation — the column that makes it a ruling', () => {
    expect(() => parseRulings(row('das Handy', 'gender', 'das', '', '2026-09-09')))
      .toThrow(/needs a citation/);
  });

  it('rejects a gender that is not an article', () => {
    expect(() => parseRulings(row('das Handy', 'gender', 'neuter', 'somewhere', '2026-09-09')))
      .toThrow(/must be der\/die\/das/);
  });

  it('rejects a plural without its article, the way the corpus writes them', () => {
    expect(() => parseRulings(row('das Handy', 'plural', 'Handys', 'somewhere', '2026-09-09')))
      .toThrow(/must carry its article/);
    expect(parseRulings(row('das Handy', 'plural', 'die Handys', 'somewhere', '2026-09-09'))).toHaveLength(1);
  });

  it('rejects a date that is not a date, so "when was this decided" always answers', () => {
    expect(() => parseRulings(row('das Handy', 'gender', 'das', 'somewhere', 'last tuesday')))
      .toThrow(/YYYY-MM-DD/);
  });
});

describe('rulingsFor', () => {
  it('matches the term case-insensitively and keys by field', () => {
    const all = parseRulings([
      ok,
      row('das Handy', 'plural', 'die Handys', 'same page', '2026-09-09'),
      row('der Tisch', 'gender', 'der', 'elsewhere', '2026-09-09'),
    ].join('\n'));
    const m = rulingsFor(all, 'DAS HANDY');
    expect([...m.keys()].sort()).toEqual(['gender', 'plural']);
    expect(m.get('gender')!.value).toBe('das');
  });

  it('returns nothing for a term with no ruling — the normal case', () => {
    expect(rulingsFor(parseRulings(ok), 'der Tisch').size).toBe(0);
  });
});

describe('the shipped file', () => {
  it('parses, so a malformed commit fails here and not mid-batch', () => {
    expect(() => loadRulings()).not.toThrow();
  });

  it('documents its own boundary, because the boundary is the safeguard', () => {
    // The one thing a reader must not have to infer: a ruling fills a silence and
    // can never overturn what the dictionary says. If that sentence ever leaves
    // the header, this fails and someone has to decide deliberately.
    const header = readFileSync(join('scripts', 'authoring', 'verify-rulings.tsv'), 'utf8');
    expect(header).toMatch(/where the dictionary is silent/i);
    expect(header).toMatch(/Override a contradiction/i);
  });
});
