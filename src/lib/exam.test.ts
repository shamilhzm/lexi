// The mark scheme is the one part of this feature a learner will trust
// completely and cannot check. It is worth pinning hard.
//
// Two classes of test here. The first pins telc's published arithmetic — the
// points table, the 60% floor on each half, the grade bands, and the two rules
// on the letter that are easy to implement as prose and forget to enforce. The
// second pins the *paper*: that its item numbering, counts and per-item points
// actually add up to the totals the mark scheme assumes, so an authoring slip
// (an eleventh item in a ten-item Teil, a key of 'd' in a three-option gap)
// fails CI instead of quietly changing what a learner's score means.
import { describe, expect, it } from 'vitest';
import {
  MAX, PAPERS, PASS, clozeSegments, noteFor, scoreExam, scorePart, scoreSpeaking, scoreWriting,
  type Part, type SpeakingMarks, type WritingMarks,
} from './exam.ts';
import { PAPER } from '../data/exams/telc-b1-01.ts';
import { PAPER as A1 } from '../data/exams/goethe-a1-01.ts';
import { PAPER as A2 } from '../data/exams/goethe-a2-01.ts';
import { PAPER as B2 } from '../data/exams/goethe-b2-01.ts';
import { PAPER as C1 } from '../data/exams/goethe-c1-01.ts';
import { PAPER as C2 } from '../data/exams/goethe-c2-01.ts';

const marks = (o: Partial<WritingMarks> = {}): WritingMarks => ({
  leitpunkte: 'A', gestaltung: 'A', richtigkeit: 'A', extraRange: false, extraLength: false, ...o,
});

const allA: SpeakingMarks = { expression: 'A', task: 'A', accuracy: 'A', pronunciation: 'A' };

describe('the letter', () => {
  it('is (I + II + III) × 3', () => {
    expect(scoreWriting(marks())).toBe(45);                          // 5+5+5
    expect(scoreWriting(marks({ gestaltung: 'B' }))).toBe(39);       // 5+3+5
    expect(scoreWriting(marks({ leitpunkte: 'B', gestaltung: 'B', richtigkeit: 'B' }))).toBe(27);
  });

  it('zeroes the whole letter on a D in criterion I or III', () => {
    expect(scoreWriting(marks({ leitpunkte: 'D' }))).toBe(0);
    expect(scoreWriting(marks({ richtigkeit: 'D' }))).toBe(0);
    // …but not on a D in II, which telc treats differently.
    expect(scoreWriting(marks({ gestaltung: 'D' }))).toBe(30);
  });

  it('refuses the discretionary points to a full-marks or a C-graded letter', () => {
    // Already 15/15 — the extras cannot push it past the maximum.
    expect(scoreWriting(marks({ extraRange: true, extraLength: true }))).toBe(45);
    // A C anywhere disqualifies them.
    expect(scoreWriting(marks({ gestaltung: 'C', extraRange: true }))).toBe(33);   // (5+1+5)×3
    // B across the board is where they can actually be earned: (3+3+3+2)×3.
    expect(scoreWriting(marks({
      leitpunkte: 'B', gestaltung: 'B', richtigkeit: 'B', extraRange: true, extraLength: true,
    }))).toBe(33);
  });

  it('never exceeds its 45-point ceiling', () => {
    expect(scoreWriting(marks({ extraRange: true, extraLength: true }))).toBeLessThanOrEqual(MAX.writing);
  });
});

describe('the oral', () => {
  const all = (b: 'A' | 'B' | 'C' | 'D') =>
    ({ expression: b, task: b, accuracy: b, pronunciation: b }) as const;

  it('weights Teil 1 at 15 and Teil 2/3 at 30 each', () => {
    expect(scoreSpeaking(1, all('A'))).toBe(15);
    expect(scoreSpeaking(2, all('A'))).toBe(30);
    expect(scoreSpeaking(3, all('A'))).toBe(30);
    expect(15 + 30 + 30).toBe(MAX.oral);
  });

  it('scores the four criteria independently', () => {
    expect(scoreSpeaking(2, { expression: 'B', task: 'A', accuracy: 'B', pronunciation: 'A' }))
      .toBe(6 + 8 + 6 + 6);
    expect(scoreSpeaking(1, all('D'))).toBe(0);
    // Pronunciation is worth less than the other three, in both scales.
    expect(scoreSpeaking(2, { ...all('A'), pronunciation: 'D' })).toBe(24);
  });
});

describe('passing', () => {
  it('needs 60% of each half independently', () => {
    expect(PASS.written).toBe(Math.round(0.6 * MAX.written));
    expect(PASS.oral).toBe(Math.round(0.6 * MAX.oral));
  });

  it('fails a strong written half with a weak oral one', () => {
    expect(noteFor(225 + 30, true, false)).toBe('nicht bestanden');
    expect(noteFor(130 + 75, false, true)).toBe('nicht bestanden');
  });

  it('puts the bands where telc puts them', () => {
    expect(noteFor(180, true, true)).toBe('ausreichend');
    expect(noteFor(209.5, true, true)).toBe('ausreichend');
    expect(noteFor(210, true, true)).toBe('befriedigend');
    expect(noteFor(240, true, true)).toBe('gut');
    expect(noteFor(270, true, true)).toBe('sehr gut');
    expect(noteFor(300, true, true)).toBe('sehr gut');
  });

  it('makes the minimum pass exactly the bottom of "ausreichend"', () => {
    // 135 + 45 = 180, which is why the grade table starts there and not at 0.
    expect(PASS.written + PASS.oral).toBe(180);
    expect(noteFor(PASS.written + PASS.oral, true, true)).toBe('ausreichend');
  });
});

describe('scoring a part', () => {
  const part = PAPER.parts.find((p) => p.id === 'lv3')!;

  it('counts only exact key matches, and counts blanks as unanswered', () => {
    const s = scorePart(part, { 11: 'a', 12: 'c', 13: '' });
    expect(s.correct).toBe(1);      // 11 right, 12 wrong, 13 blank
    expect(s.answered).toBe(2);
    expect(s.total).toBe(10);
    expect(s.points).toBe(2.5);
  });

  it('gives a perfect part its full weight', () => {
    const all = Object.fromEntries(part.items.map((i) => [i.n, i.answer]));
    expect(scorePart(part, all).points).toBe(25);
  });
});

describe('scoring a sitting', () => {
  const perfect = Object.fromEntries(
    PAPER.parts.flatMap((p) => p.items.map((i) => [i.n, i.answer])),
  );

  it('reaches exactly 300 on a perfect paper with full marks either side', () => {
    const r = scoreExam(PAPER, {
      responses: perfect,
      writing: marks(),
      speaking: {
        1: { expression: 'A', task: 'A', accuracy: 'A', pronunciation: 'A' },
        2: { expression: 'A', task: 'A', accuracy: 'A', pronunciation: 'A' },
        3: { expression: 'A', task: 'A', accuracy: 'A', pronunciation: 'A' },
      },
    });
    expect(r.bySubtest.reading.points).toBe(75);
    expect(r.bySubtest.language.points).toBe(30);
    expect(r.bySubtest.listening.points).toBe(75);
    expect(r.written).toBe(225);
    expect(r.oral).toBe(75);
    expect(r.total).toBe(300);
    expect(r.note).toBe('sehr gut');
    expect(r.provisional).toBe(false);
  });

  it('marks a sitting provisional until both productive parts are assessed', () => {
    expect(scoreExam(PAPER, { responses: perfect }).provisional).toBe(true);
    expect(scoreExam(PAPER, { responses: perfect, writing: marks() }).provisional).toBe(true);
  });

  it('scores an empty sheet at zero rather than throwing', () => {
    const r = scoreExam(PAPER, { responses: {} });
    expect(r.total).toBe(0);
    expect(r.passed).toBe(false);
    expect(r.note).toBe('nicht bestanden');
  });
});

describe('the B1 paper itself', () => {
  it('numbers its items 1–60 with no gaps and no repeats', () => {
    const ns = PAPER.parts.flatMap((p) => p.items.map((i) => i.n)).sort((a, b) => a - b);
    expect(ns).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
  });

  it('adds up to telc’s subtest maxima', () => {
    const sum = (sub: string) => PAPER.parts
      .filter((p) => p.subtest === sub)
      .reduce((n, p) => n + p.items.length * p.pointsPerItem, 0);
    expect(sum('reading')).toBe(MAX.reading);
    expect(sum('language')).toBe(MAX.language);
    expect(sum('listening')).toBe(MAX.listening);
    expect(sum('reading') + sum('language') + sum('listening') + MAX.writing).toBe(MAX.written);
  });

  it('keys every item to an option that actually exists', () => {
    for (const p of PAPER.parts) {
      for (const it of p.items) {
        const keys = optionKeys(p, it.n);
        expect(keys, `${p.id} item ${it.n} (key "${it.answer}")`).toContain(it.answer);
      }
    }
  });

  it('never reuses an advert in Teil 3, where each may be used once', () => {
    const p = PAPER.parts.find((x) => x.id === 'lv3')!;
    const used = p.items.map((i) => i.answer).filter((k) => k !== 'x');
    expect(new Set(used).size).toBe(used.length);
  });

  it('never reuses a word from the Sprachbausteine box', () => {
    const p = PAPER.parts.find((x) => x.id === 'sb2')!;
    const used = p.items.map((i) => i.answer);
    expect(new Set(used).size).toBe(used.length);
  });

  it('gives every cloze gap a marker in the body, and every marker an item', () => {
    for (const p of PAPER.parts) {
      if (p.kind !== 'cloze') continue;
      const gaps = clozeSegments(p.body).filter((s): s is number => typeof s === 'number');
      expect(gaps, p.id).toEqual(p.items.map((i) => i.n));
    }
  });

  it('gives every listening item a statement and every track a script', () => {
    for (const p of PAPER.parts) {
      if (p.kind !== 'tf') continue;
      expect(p.statements.map((s) => s.n), p.id).toEqual(p.items.map((i) => i.n));
      expect(p.items.every((i) => i.answer === 'r' || i.answer === 'f'), p.id).toBe(true);
      expect(p.audio?.tracks.every((t) => t.lines.length > 0), p.id).toBe(true);
    }
  });

  it('explains every item — the part a photocopied Modellsatz cannot do', () => {
    for (const p of PAPER.parts) {
      for (const it of p.items) expect(it.why, `${p.id} item ${it.n}`).toBeTruthy();
    }
  });

  it('offers three graded models for every speaking prompt and for the letter', () => {
    for (const t of PAPER.speaking) {
      expect(t.prompts.length, t.id).toBeGreaterThan(0);
      for (const pr of t.prompts) {
        expect(pr.models.map((m) => m.band), pr.id).toEqual(['A2', 'B1', 'B2']);
        expect(pr.models.every((m) => m.lines.length > 0), pr.id).toBe(true);
      }
    }
    expect(PAPER.writing.models.map((m) => m.band)).toEqual(['A2', 'B1', 'B2']);
  });

  it('gives the letter exactly the four Leitpunkte criterion I is scored on', () => {
    expect(PAPER.writing.leitpunkte).toHaveLength(4);
  });

  it('covers all three parts of the oral', () => {
    expect(new Set(PAPER.speaking.map((t) => t.teil))).toEqual(new Set([1, 2, 3]));
  });

  it('lists every part exactly once across its timed blocks', () => {
    const listed = PAPER.blocks.flatMap((b) => b.partIds).sort();
    expect(listed).toEqual(PAPER.parts.map((p) => p.id).sort());
  });
});

/** Which keys are legal for this item — the paper's own answer alphabet. */
function optionKeys(p: Part, n: number): string[] {
  switch (p.kind) {
    case 'match': return p.options.map((o) => o.k);
    case 'mc': return p.questions.find((q) => q.n === n)?.options.map((o) => o.k) ?? [];
    case 'ads': return [...p.ads.map((a) => a.k), 'x'];
    case 'cloze': return p.mode === 'bank'
      ? (p.bank ?? []).map((o) => o.k)
      : (p.options?.[n] ?? []).map((o) => o.k);
    case 'tf': return ['r', 'f'];
  }
}

describe('cloze markers', () => {
  it('splits a body into alternating text and gap numbers', () => {
    expect(clozeSegments('a [[7]] b')).toEqual(['a ', 7, ' b']);
    expect(clozeSegments('no gaps')).toEqual(['no gaps']);
  });
});


// ---- every paper, not just the first one -----------------------------------
// The B1 suite above pins telc's arithmetic. These are the guarantees that must
// hold for *any* paper the app can load, and they exist because the second paper
// is what proved the engine was not as general as it claimed: Goethe A1 is
// multiple-choice-over-audio and true/false-over-a-sign, neither of which the
// telc-shaped model could express.

describe.each([['telc B1', PAPER], ['Goethe A1', A1], ['Goethe A2', A2], ['Goethe B2', B2], ['Goethe C1', C1], ['Goethe C2', C2]])('%s — structural integrity', (_name, paper) => {
  it('numbers its items consecutively with no gaps or repeats', () => {
    const ns = paper.parts.flatMap((p) => p.items.map((i) => i.n)).sort((a, b) => a - b);
    expect(ns).toEqual(Array.from({ length: ns.length }, (_, i) => i + ns[0]));
  });

  it('keys every item to an option that actually exists', () => {
    for (const p of paper.parts) {
      for (const it of p.items) {
        expect(optionKeys(p, it.n), `${p.id} item ${it.n} (key "${it.answer}")`).toContain(it.answer);
      }
    }
  });

  it('explains every item', () => {
    for (const p of paper.parts) {
      for (const it of p.items) expect(it.why, `${p.id} item ${it.n}`).toBeTruthy();
    }
  });

  it('gives every question and statement exactly one item, and vice versa', () => {
    for (const p of paper.parts) {
      const itemNs = p.items.map((i) => i.n);
      if (p.kind === 'mc') expect(p.questions.map((q) => q.n), p.id).toEqual(itemNs);
      if (p.kind === 'tf') expect(p.statements.map((q) => q.n), p.id).toEqual(itemNs);
      if (p.kind === 'match') expect(p.texts.map((t) => t.n), p.id).toEqual(itemNs);
      if (p.kind === 'ads') expect(p.situations.map((t) => t.n), p.id).toEqual(itemNs);
    }
  });

  it('never reuses an option where the paper says each may be used once', () => {
    for (const p of paper.parts) {
      if (p.kind === 'match' && p.once) {
        const used = p.items.map((i) => i.answer);
        expect(new Set(used).size, p.id).toBe(used.length);
      }
      if (p.kind === 'ads') {
        const used = p.items.map((i) => i.answer).filter((k) => k !== 'x');
        expect(new Set(used).size, p.id).toBe(used.length);
      }
    }
  });

  it('carries a stimulus for every part — heard, read, or per-question', () => {
    for (const p of paper.parts) {
      if (p.kind === 'mc') {
        const has = !!p.passage || !!p.audio || p.questions.every((q) => q.stimulus?.length);
        expect(has, `${p.id} has nothing to read or hear`).toBe(true);
      }
      if (p.kind === 'tf') {
        expect(!!p.audio || !!p.texts?.length, `${p.id} has nothing to read or hear`).toBe(true);
      }
      if (p.kind === 'tf' && p.audio) {
        expect(p.audio.tracks.every((t) => t.lines.length > 0), p.id).toBe(true);
      }
    }
  });

  it('scores a perfect sheet at exactly the objective maximum', () => {
    const scheme = paper.scheme ?? MAX;
    const all = Object.fromEntries(paper.parts.flatMap((p) => p.items.map((i) => [i.n, i.answer])));
    const r = scoreExam(paper, { responses: all });
    for (const sub of ['reading', 'language', 'listening'] as const) {
      const authored = paper.parts.some((p) => p.subtest === sub);
      if (authored) expect(Math.round(r.bySubtest[sub].points), `${sub}`).toBe(scheme[sub]);
    }
  });

  it('offers three graded models for every speaking prompt and for the letter', () => {
    for (const t of paper.speaking) {
      for (const pr of t.prompts) {
        expect(pr.models, pr.id).toHaveLength(3);
        expect(pr.models.every((m) => m.lines.length > 0), pr.id).toBe(true);
      }
    }
    expect(paper.writing.models).toHaveLength(3);
  });

  it('lists every part exactly once across its timed blocks', () => {
    const listed = paper.blocks.flatMap((b) => b.partIds).sort();
    expect(listed).toEqual(paper.parts.map((p) => p.id).sort());
  });
});

describe('the pass rule is the paper’s own, and a blank sheet never passes', () => {
  // This is here because it did. A1 and A2 have no telc-style floor on the
  // written half, `pass.written` was 0, and `passed` was `written >= 0 && oral >=
  // 0` — so an untouched Goethe sheet came back **bestanden** with a grade of
  // *nicht bestanden* printed beside it. The total is now part of the rule.
  it('fails an empty sheet on every paper', () => {
    for (const paper of [PAPER, A1, A2, B2, C1, C2]) {
      const r = scoreExam(paper, { responses: {} });
      expect(r.passed, paper.id).toBe(false);
      expect(r.note, paper.id).toBe('nicht bestanden');
    }
  });

  it('agrees with itself: passing is exactly the bottom band', () => {
    for (const paper of [PAPER, A1, A2, B2, C1, C2]) {
      const s = paper.scheme ?? MAX;
      expect(s.pass.total, paper.id).toBe(s.bands[s.bands.length - 1][0]);
      expect(s.pass.written + s.pass.oral, paper.id).toBeLessThanOrEqual(s.pass.total);
    }
  });
});

describe('modular papers are passed module by module', () => {
  const modular = PAPERS.filter((p) => p.level === 'B2' || p.level === 'C2');

  it('is what B2 and C2 use, and nothing else does', async () => {
    for (const meta of modular) {
      const paper = await meta.load();
      expect(paper.scheme?.modular, meta.id).toBe(true);
    }
    expect(A1.scheme!.modular).toBeUndefined();
    expect(A2.scheme!.modular).toBeUndefined();
  });

  it('fails the whole sitting for one weak module, however strong the rest', async () => {
    for (const meta of modular) {
      const paper = await meta.load();
      const all = Object.fromEntries(paper.parts.flatMap((p) => p.items.map((i) => [i.n, i.answer])));
      // Everything right, everything self-assessed at A — except a listening
      // sheet left blank. Three modules at 100%, one at 0%.
      const listening = new Set(paper.parts.filter((p) => p.subtest === 'listening')
        .flatMap((p) => p.items.map((i) => i.n)));
      const responses = Object.fromEntries(
        Object.entries(all).filter(([n]) => !listening.has(Number(n))));
      const r = scoreExam(paper, {
        responses,
        writing: marks(),
        speaking: { 1: allA, 2: allA, 3: allA },
      });
      expect(r.modules.find((m) => m.subtest === 'listening')!.passed, meta.id).toBe(false);
      expect(r.modules.find((m) => m.subtest === 'reading')!.passed, meta.id).toBe(true);
      expect(r.passed, meta.id).toBe(false);
    }
  });
});

describe('Goethe A1 scoring differs from telc B1, and the scheme travels with the paper', () => {
  it('scales four skills of 25 to 100', () => {
    const s = A1.scheme!;
    expect(s.total).toBe(100);
    expect(s.reading + s.listening + s.writing + s.speaking).toBe(100);
  });

  it('has no separate floor on the oral — unlike telc B1', () => {
    expect(A1.scheme!.pass.oral).toBe(0);
    expect(PASS.oral).toBe(45);
  });

  it('grades on its own bands', () => {
    expect(noteFor(95, true, true, A1.scheme!)).toBe('sehr gut');
    expect(noteFor(60, true, true, A1.scheme!)).toBe('ausreichend');
    expect(noteFor(59, true, true, A1.scheme!)).toBe('nicht bestanden');
  });
});
