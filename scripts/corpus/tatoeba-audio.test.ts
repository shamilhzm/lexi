import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isReusableLicense, parseRow, buildAudioManifest, sentenceToCard,
} from './sources/tatoeba-audio.ts';

// Tatoeba's audio licence is per *recording*, and its download page states that
// an empty licence field means the audio may not be reused outside Tatoeba.
// These are not style tests — a regression here would mean redistributing a
// contributor's voice against their terms.

describe('isReusableLicense — the allow-list', () => {
  it('accepts the licences that permit reuse', () => {
    for (const ok of ['CC0', 'CC0 1.0', 'CC BY 2.0 FR', 'CC BY 4.0', 'cc-by-sa 3.0', 'Public Domain']) {
      expect(isReusableLicense(ok), ok).toBe(true);
    }
  });

  it('rejects an empty or missing licence — the documented do-not-reuse case', () => {
    for (const bad of ['', '   ', undefined, null]) {
      expect(isReusableLicense(bad as string), JSON.stringify(bad)).toBe(false);
    }
  });

  it('rejects non-commercial and no-derivatives despite the "cc by" prefix', () => {
    // These start with an accepted prefix and must still be dropped.
    for (const bad of ['CC BY-NC 4.0', 'CC BY-NC-SA 4.0', 'CC BY-ND 4.0', 'cc by nc']) {
      expect(isReusableLicense(bad), bad).toBe(false);
    }
  });

  it("rejects Tatoeba's \\N null marker, which appears in ~1,400 real rows", () => {
    expect(isReusableLicense('\\N')).toBe(false);
  });

  it('rejects anything it does not recognise, rather than guessing', () => {
    for (const bad of ['All rights reserved', 'ask me first', 'GPL-3.0', 'unknown']) {
      expect(isReusableLicense(bad), bad).toBe(false);
    }
  });
});

describe('parseRow', () => {
  it('reads audioId, sentenceId, contributor and attribution', () => {
    const r = parseRow('991\t12382447\tsomeone\tCC BY 4.0\thttps://example.org/me');
    expect(r).toEqual({
      sentenceId: '12382447',
      entry: { audioId: '991', license: 'CC BY 4.0', attribution: 'https://example.org/me', by: 'someone' },
    });
  });

  it('drops a row whose licence field is empty', () => {
    expect(parseRow('991\t12382447\tsomeone\t\thttps://example.org/me')).toBeNull();
  });

  it('survives short rows without throwing', () => {
    expect(parseRow('991\t12382447')).toBeNull();          // no licence column at all
    expect(parseRow('')).toBeNull();
    expect(parseRow('\t\t\t\t')).toBeNull();
  });
});

describe('buildAudioManifest', () => {
  const fixture = (rows: string[]) => {
    const p = join(mkdtempSync(join(tmpdir(), 'lexi-audio-')), 'sentences_with_audio.csv');
    writeFileSync(p, rows.join('\n'), 'utf8');
    return p;
  };

  it('keeps only licensed rows that match a card we ship', async () => {
    const path = fixture([
      '1\t100\talice\tCC0\thttps://a',          // licensed + wanted   → kept
      '2\t200\tbob\t\thttps://b',               // UNLICENSED          → dropped
      '3\t300\tcarol\tCC BY 4.0\thttps://c',    // licensed, not wanted → dropped
      '4\t400\tdan\tCC BY-NC 4.0\thttps://d',   // non-commercial      → dropped
    ]);
    const cards = new Map([['100', 'voc:A1:eins'], ['200', 'voc:A1:zwei'], ['400', 'voc:A1:vier']]);
    const { manifest, stats } = await buildAudioManifest(path, cards);

    expect(Object.keys(manifest)).toEqual(['voc:A1:eins']);
    expect(manifest['voc:A1:eins'].by).toBe('alice');
    expect(stats).toMatchObject({ rows: 4, kept: 1 });
    // Those two were wanted but unusable; the manifest must not contain them.
    expect(manifest['voc:A1:zwei']).toBeUndefined();
    expect(manifest['voc:A1:vier']).toBeUndefined();
  });

  it('takes the first usable recording when a sentence has several', async () => {
    const path = fixture([
      '10\t100\tfirst\tCC BY 4.0\thttps://1',
      '11\t100\tsecond\tCC0\thttps://2',
    ]);
    const { manifest } = await buildAudioManifest(path, new Map([['100', 'voc:A1:eins']]));
    expect(manifest['voc:A1:eins'].audioId).toBe('10');
    expect(manifest['voc:A1:eins'].by).toBe('first');
  });

  it('an unlicensed row never wins over a licensed one for the same sentence', async () => {
    const path = fixture([
      '10\t100\tanon\t\thttps://1',             // unlicensed, listed first
      '11\t100\tnamed\tCC0\thttps://2',
    ]);
    const { manifest } = await buildAudioManifest(path, new Map([['100', 'voc:A1:eins']]));
    expect(manifest['voc:A1:eins'].audioId).toBe('11');
  });

  it('returns an empty manifest rather than failing when nothing qualifies', async () => {
    const path = fixture(['1\t100\ta\t\tx', '2\t101\tb\tAll rights reserved\ty']);
    const { manifest, stats } = await buildAudioManifest(path, new Map([['100', 'a'], ['101', 'b']]));
    expect(manifest).toEqual({});
    expect(stats.kept).toBe(0);
  });
});

describe('sentenceToCard', () => {
  it('maps Tatoeba sentence ids to the card that cites them', () => {
    const m = sentenceToCard([
      { id: 'voc:A1:der Name', exampleSource: 'tatoeba:12382447' },
      { id: 'voc:A1:alle', exampleSource: 'tatoeba:1014050' },
      { id: 'voc:A1:ab', exampleSource: 'wiktextract:kaikki-de.jsonl' },  // other source
      { id: 'voc:A1:x', exampleSource: null },
      { exampleSource: 'tatoeba:999' },                                   // no card id
    ]);
    expect([...m.entries()].sort()).toEqual([
      ['1014050', 'voc:A1:alle'],
      ['12382447', 'voc:A1:der Name'],
    ]);
  });

  it('keeps the first card when two cite the same sentence', () => {
    const m = sentenceToCard([
      { id: 'first', exampleSource: 'tatoeba:5' },
      { id: 'second', exampleSource: 'tatoeba:5' },
    ]);
    expect(m.get('5')).toBe('first');
  });
});
