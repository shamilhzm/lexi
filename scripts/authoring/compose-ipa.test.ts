// A compound has one primary stress.
//
// The naive concatenation keeps every constituent's own mark and produces
// ˈaɪ̯nˌbaʊ̯ˈʃʁaŋk — two primaries and a stray secondary, which is not a German
// word's shape. These cases are read off Lexi's own shipped transcriptions
// (ˈkʁaŋkn̩ˌhaʊ̯s, ˈfluːkˌhaːfn̩, ˈʁaʊ̯sˌkɔmən, ˈʊnˌklaːɐ̯), so the rule is checked
// against the corpus it has to live beside rather than against a textbook.
import { describe, it, expect } from 'vitest';
import { compose } from './compose-ipa.ts';

describe('compose', () => {
  it('demotes a constituent-internal secondary stress', () => {
    // `Einbau` is ˈaɪ̯nˌbaʊ̯ standing alone; inside a larger compound it keeps only
    // its primary, and the second constituent takes the secondary.
    expect(compose(['ˈaɪ̯nˌbaʊ̯', 'ʃʁaŋk'])).toBe('ˈaɪ̯nbaʊ̯ˌʃʁaŋk');
    expect(compose(['ˈsnoːˌboːɐ̯t', 'ˈfaːʁən'])).toBe('ˈsnoːboːɐ̯tˌfaːʁən');
  });

  it('adds a primary to an unmarked first constituent', () => {
    // Monosyllables are listed without a stress mark; first position needs one.
    expect(compose(['ʃiː', 'ˈjakə'])).toBe('ˈʃiːˌjakə');
    expect(compose(['ʁaɪ̯n', 'ˈkɔmən'])).toBe('ˈʁaɪ̯nˌkɔmən');
  });

  it('demotes a later constituent’s primary to secondary', () => {
    expect(compose(['ˈʊn', 'ˈpʁaktɪʃ'])).toBe('ˈʊnˌpʁaktɪʃ');
  });

  it('never emits two primary stresses', () => {
    for (const parts of [['ˈaɪ̯nˌbaʊ̯', 'ʃʁaŋk'], ['ʃiː', 'ˈjakə'], ['ˈʊn', 'ˈpʁaktɪʃ'], ['ʁaɪ̯n', 'ˈɡeːən']]) {
      expect([...compose(parts)].filter((c) => c === 'ˈ')).toHaveLength(1);
    }
  });

  it('matches the pattern the corpus already ships for separable verbs', () => {
    // `rauskommen` is ˈʁaʊ̯sˌkɔmən in vocab.json; `reinkommen` must come out the
    // same shape or the six new cards will read as foreign next to the other 1,100.
    expect(compose(['ʁaʊ̯s', 'ˈkɔmən'])).toBe('ˈʁaʊ̯sˌkɔmən');
  });
});
