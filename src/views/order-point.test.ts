// Which rule the sentence builder opens — see `orderPoint` in Fundamentals.tsx.
//
// The bug it fixes, reported from a real session: the rule card explained
// W-questions ("W-word first, verb second", worked through with *Wo wohnst du?*)
// directly above a tile exercise whose answer was **„Können Sie mir bitte Ihren
// Namen buchstabieren?“** — a yes/no modal question whose difficulty is entirely
// the bracket. Every word-order item opened the same static point regardless of
// the sentence, which is the third instance of a bug `TENSE_POINT` and
// `CASE_POINT` were each written to fix.
import { describe, it, expect } from 'vitest';
import { orderPoint } from './Fundamentals.tsx';

describe('orderPoint', () => {
  it('opens the modal rule for the sentence that was reported', () => {
    expect(orderPoint('Können Sie mir bitte Ihren Namen buchstabieren?')).toBe('gram:A1:Modalverben');
  });

  it('still opens the question rule for a real W-question', () => {
    // The one case the old static point got right, and it must not regress.
    for (const s of ['Wo wohnst du?', 'Was lernst du?', 'Wann kommt der Zug?', 'Wie heißt du?']) {
      expect(orderPoint(s), s).toBe('gram:A1:Wortstellung & Fragen');
    }
  });

  it('treats a W-question containing a modal as a question', () => {
    // Specificity order matters: the W-word is the thing in position 1.
    expect(orderPoint('Wo kann ich hier parken?')).toBe('gram:A1:Wortstellung & Fragen');
  });

  it('opens the subordinate-clause rule when the verb goes to the end', () => {
    expect(orderPoint('Ich bleibe zu Hause, weil ich krank bin.')).toBe('gram:B1:Nebensätze (weil/dass)');
    // …even with a modal in it: the clause is the rule being tested.
    expect(orderPoint('Er sagt, dass er nicht kommen kann.')).toBe('gram:B1:Nebensätze (weil/dass)');
  });

  it('opens the Perfekt rule for a two-part past', () => {
    expect(orderPoint('Ich habe gestern einen Brief geschrieben.')).toBe('gram:A1:Perfekt');
    expect(orderPoint('Wir sind nach Berlin gefahren.')).toBe('gram:A1:Perfekt');
  });

  it('falls back to word order for a plain statement or a yes/no question', () => {
    expect(orderPoint('Ich lerne Deutsch.')).toBe('gram:A1:Wortstellung & Fragen');
    expect(orderPoint('Lernst du Deutsch?')).toBe('gram:A1:Wortstellung & Fragen');
  });

  it('falls back rather than throwing on a missing sentence', () => {
    expect(orderPoint(undefined)).toBe('gram:A1:Wortstellung & Fragen');
    expect(orderPoint('')).toBe('gram:A1:Wortstellung & Fragen');
  });
});
