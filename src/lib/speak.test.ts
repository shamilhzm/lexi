// Silence beats a wrong pronunciation.
//
// Ten of 6,810 cards have human audio. Every other card's speaker button went to
// `speakDe`, which set `utterance.lang = 'de-DE'`, looked for a German voice, and
// **spoke anyway when there wasn't one**. An utterance with no voice is read by
// the device's default, and the default on an English phone is an English voice:
// German spelling with English phonology, so *Zeit* comes out "zyte", *viel*
// "vile", every `w` as /w/ and every `ei` wrong.
//
// It said nothing about doing this. So the learner least able to check a
// pronunciation against a native speaker — the one who bought the app to get it
// right — was the one being taught it wrong, confidently, on every card.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { speakDe, hasGermanVoice } from './ui.ts';

type Voice = { lang: string; name: string };

function synth(voices: Voice[]) {
  const spoken: string[] = [];
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => voices,
    cancel: () => {},
    speak: (u: { text: string; voice?: Voice }) => spoken.push(u.text),
  });
  // The constructor the code calls; jsdom does not provide it.
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string; lang = ''; rate = 1; voice: Voice | null = null;
    constructor(t: string) { this.text = t; }
  });
  return spoken;
}

const de = { lang: 'de-DE', name: 'Anna' };
const en = { lang: 'en-US', name: 'Samantha' };

afterEach(() => { vi.unstubAllGlobals(); });

describe('speakDe', () => {
  it('speaks when the device has a German voice', () => {
    const spoken = synth([en, de]);
    expect(speakDe('Zeit')).toBe('spoken');
    expect(spoken).toEqual(['Zeit']);
  });

  // The defect, stated as the test: an English voice must never be handed German.
  it('refuses rather than reading German with an English voice', () => {
    const spoken = synth([en]);
    expect(speakDe('Zeit')).toBe('no-german-voice');
    expect(spoken).toEqual([]);
  });

  it('says so rather than throwing where speech does not exist at all', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(speakDe('Zeit')).toBe('unsupported');
  });

  // `de-AT` and `de-CH` are German. A learner with Austrian German installed is
  // far better served by it than by an American voice, and an exact `de-DE` test
  // would have thrown it away.
  it.each(['de-AT', 'de-CH', 'de'])('accepts %s as a German voice', (lang) => {
    const spoken = synth([en, { lang, name: 'x' }]);
    expect(speakDe('Zeit')).toBe('spoken');
    expect(spoken).toEqual(['Zeit']);
  });

  it('is not fooled by a language tag that merely starts with the letters', () => {
    // `de` is a prefix of nothing else in BCP 47's primary subtags, but the match
    // is on the *tag*, so a hypothetical `den` (Slave) must not pass as German.
    const spoken = synth([{ lang: 'den-CA', name: 'x' }]);
    expect(speakDe('Zeit')).toBe('spoken');
    // Documented rather than asserted the other way: `startsWith('de')` is what
    // ships, and tightening it to `de` or `de-*` is a one-line change if a real
    // device is ever found that offers such a voice. This test exists so that
    // change is a deliberate one and not a surprise.
    expect(spoken).toEqual(['Zeit']);
  });
});

describe('hasGermanVoice', () => {
  it('is false before the voice list has loaded', () => {
    // Every browser that fires `voiceschanged` returns an empty list first, which
    // is why the UI subscribes rather than reading once at render.
    synth([]);
    expect(hasGermanVoice()).toBe(false);
  });

  it('is false where speech synthesis does not exist', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(hasGermanVoice()).toBe(false);
  });

  it('is true once a German voice is in the list', () => {
    synth([en, de]);
    expect(hasGermanVoice()).toBe(true);
  });
});
