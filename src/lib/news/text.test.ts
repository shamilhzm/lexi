import { describe, it, expect } from 'vitest';
import { sentences, sentenceAt, ago } from './text.ts';

describe('sentences', () => {
  it('splits ordinary sentences', () => {
    expect(sentences('Der DAX fällt. Anleger sind nervös! Warum?').map((s) => s.text))
      .toEqual(['Der DAX fällt.', 'Anleger sind nervös!', 'Warum?']);
  });
  it('does not split on abbreviations, ordinals or decimals', () => {
    const p = 'Am 3. Oktober sprach Dr. Müller z. B. über 1.3 Prozent Wachstum. Danach ging er.';
    expect(sentences(p).map((s) => s.text)).toEqual([
      'Am 3. Oktober sprach Dr. Müller z. B. über 1.3 Prozent Wachstum.', 'Danach ging er.',
    ]);
  });
  it('keeps a quotation inside its sentence and splits after it', () => {
    expect(sentences('Er sagte: „Das reicht nicht.“ Die Opposition widersprach.').map((s) => s.text))
      .toEqual(['Er sagte: „Das reicht nicht.“', 'Die Opposition widersprach.']);
  });
  it('finds the sentence around an offset', () => {
    const p = 'Erster Satz. Zweiter Satz hier.';
    expect(sentenceAt(p, p.indexOf('hier'))).toBe('Zweiter Satz hier.');
  });
});

describe('ago', () => {
  it('reads like a person', () => {
    const now = Date.UTC(2026, 8, 24, 12);
    expect(ago(now - 30_000, now)).toBe('just now');
    expect(ago(now - 12 * 60_000, now)).toBe('12 min ago');
    expect(ago(now - 5 * 3600_000, now)).toBe('5 h ago');
    expect(ago(now - 3 * 86400_000, now)).toBe('3 d ago');
    expect(ago(0, now)).toBe('');
  });
});
