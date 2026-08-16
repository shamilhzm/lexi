// Reading back what the learner typed — see `typedDiff` in GrammarDrill.tsx.
//
// The bug, reported from a real dictation card: the answer field is a single-line
// `<input>` at `text-xl`, so „Ich besuche meine Eltern jeden Sonntag.“ overflowed
// and rendered as „Ich besuche meine Eltern jet“. The field is `disabled` after
// grading — still clipped — at exactly the moment the learner is comparing their
// attempt with the answer. *"I can't even see what I wrote to know which part I
// wrote incorrectly."*
import { describe, it, expect } from 'vitest';
import { typedDiff } from './GrammarDrill.tsx';

const wrong = (typed: string, answer: string) =>
  typedDiff(typed, answer).filter((s) => !s.ok).map((s) => s.text);

describe('typedDiff', () => {
  it('marks nothing when the sentence matches', () => {
    const d = typedDiff('Ich besuche meine Eltern jeden Sonntag.', 'Ich besuche meine Eltern jeden Sonntag.');
    expect(d.every((s) => s.ok)).toBe(true);
    expect(d).toHaveLength(6);
  });

  it('marks only the word that is actually wrong', () => {
    expect(wrong('Ich besuche meine Eltern jeder Sonntag.', 'Ich besuche meine Eltern jeden Sonntag.'))
      .toEqual(['jeder']);
  });

  it('keeps every word the learner typed, so the readback is complete', () => {
    // The whole point: the input clipped this, so nothing may be dropped here.
    const typed = 'Ich besuche meine Eltern jet';
    expect(typedDiff(typed, 'Ich besuche meine Eltern jeden Sonntag.').map((s) => s.text))
      .toEqual(['Ich', 'besuche', 'meine', 'Eltern', 'jet']);
  });

  it('does not scold an umlaut typed as a digraph — spellingDiff owns that lesson', () => {
    expect(wrong('Ich moechte schoen essen', 'Ich möchte schön essen')).toEqual([]);
  });

  it('marks trailing words the answer does not have', () => {
    expect(wrong('Ich besuche meine Eltern jeden Sonntag bitte', 'Ich besuche meine Eltern jeden Sonntag'))
      .toEqual(['bitte']);
  });

  it('marks from the divergence on when a word is missing', () => {
    // Positional alignment gives up gracefully rather than pretending to realign.
    const w = wrong('Ich meine Eltern besuche', 'Ich besuche meine Eltern');
    expect(w.length).toBeGreaterThan(0);
    expect(w).not.toContain('Ich');
  });

  it('handles an empty attempt without throwing', () => {
    expect(typedDiff('', 'Ich besuche meine Eltern')).toEqual([]);
  });

  it('ignores case and punctuation the way the grader does', () => {
    expect(wrong('ich besuche meine eltern', 'Ich besuche meine Eltern')).toEqual([]);
  });
});
