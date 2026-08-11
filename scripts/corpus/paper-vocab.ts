// Every word a learner meets in a Lexi paper should be a word Lexi teaches.
//
// "Make sure every word across the practice exams is in the corpus" is only
// enforceable if the set of exams is bounded, and it is: the papers **we author**
// are the ones a learner actually sits here. So this walks every German string in
// every paper — passages, adverts, cloze bodies, listening scripts, statements,
// speaking models, the letter — resolves each token with the app's own matcher,
// and reports what the corpus cannot teach.
//
// The published exams themselves are a different question and a bounded one too:
// Goethe publishes a Wortliste for A1, A2 and B1 and those are ingested through
// `relevel-a1.ts` and its siblings. Above B1 no board publishes a word list,
// because vocabulary at B2+ is by design open — which is why "every word in every
// public practice exam" cannot be a closed set, and why this file measures the
// thing that can actually be guaranteed.
//
// Excluded from the denominator, for the same reasons the comprehension meter
// excludes them: function words, ordinals, spelled-out cardinals, and proper
// nouns. Names are listed explicitly rather than guessed at — a heuristic that
// silently drops capitalised unknowns would hide exactly the gaps this exists to
// find.
//
//   npm run corpus:papervocab            report
//   npm run corpus:papervocab -- --batch  emit an authoring skeleton for the gaps
import { writeFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus } from './lib.ts';
import { buildMatcher, isLikelyEntity, isNeutralWord } from '../../src/lib/matcher.ts';
import type { ExamPaper } from '../../src/lib/exam.ts';
import { PAPER as TELC_B1 } from '../../src/data/exams/telc-b1-01.ts';
import { PAPER as GOETHE_A1 } from '../../src/data/exams/goethe-a1-01.ts';
import { PAPER as GOETHE_A2 } from '../../src/data/exams/goethe-a2-01.ts';

const PAPERS: ExamPaper[] = [TELC_B1, GOETHE_A1, GOETHE_A2];

/** Names invented for the papers. Held here rather than sniffed for, so adding a
 *  character to a listening script is a deliberate two-line act. */
export const PAPER_NAMES = new Set([
  'amir', 'karimi', 'nadia', 'lena', 'ali', 'sabine', 'bauer', 'meier', 'klein',
  'julia', 'mehmet', 'anna', 'schulz', 'weber', 'jana', 'reuter', 'tobias',
  'ahrens', 'katrin', 'katja', 'marianne', 'milan', 'nina', 'rui', 'berger',
  'adriana', 'popescu', 'ostheim', 'bernd', 'kern', 'baumann', 'sonnenhof',
  'leipzig', 'plagwitz', 'freiburg', 'aveiro', 'hamburg', 'kassel', 'bonn',
  'münchen', 'berlin', 'köln', 'wien', 'dresden', 'isfahan', 'iran', 'europa',
  'straßburg', 'frankfurt', 'stuttgart', 'ostsee', 'deutschland', 'österreich',
  'persisch', 'spanisch', 'englisch', 'deutsch', 'nordwind', 'schillerstraße',
  'lindenstraße', 'hofstraße', 'bahnhofstraße', 'beethovenstraße', 'aktiv',
  'stadtgespräch', 'vhs', 'ice', 'wlan', 'facebook', 'apotheke',
]);

/** Every German string a paper puts in front of a learner. */
export function germanOf(p: ExamPaper): string[] {
  const out: string[] = [];
  const push = (s?: string) => { if (s?.trim()) out.push(s); };

  for (const part of p.parts) {
    push(part.rubric);
    if (part.kind === 'match') {
      part.options.forEach((o) => push(o.text));
      part.texts.forEach((t) => push(t.body));
    }
    if (part.kind === 'mc') {
      push(part.passage?.title); push(part.passage?.standfirst);
      part.passage?.paras.forEach(push);
      part.audio?.tracks.forEach((t) => t.lines.forEach((l) => push(l.text)));
      push(part.audio?.intro);
      part.questions.forEach((q) => {
        push(q.stem);
        q.options.forEach((o) => push(o.text));
        q.stimulus?.forEach((s) => push(s.body));
      });
    }
    if (part.kind === 'ads') {
      part.situations.forEach((s) => push(s.text));
      part.ads.forEach((a) => { push(a.head); push(a.body); });
    }
    if (part.kind === 'cloze') {
      push(part.body.replace(/\[\[\d+\]\]/g, ' '));
      part.bank?.forEach((b) => push(b.text.toLowerCase()));
      Object.values(part.options ?? {}).forEach((os) => os.forEach((o) => push(o.text)));
    }
    if (part.kind === 'tf') {
      push(part.intro);
      push(part.audio?.intro);
      part.audio?.tracks.forEach((t) => t.lines.forEach((l) => push(l.text)));
      part.texts?.forEach((t) => push(t.body));
      part.statements.forEach((s) => push(s.text));
    }
  }

  push(p.writing.situation);
  p.writing.letter.body.forEach(push);
  p.writing.leitpunkte.forEach((l) => push(l.de));
  p.writing.models.forEach((m) => m.lines.forEach((l) => push(l.de)));

  for (const t of p.speaking) {
    push(t.task);
    t.notes?.forEach(push);
    t.sheets?.forEach((s) => { push(s.text); s.facts.forEach(push); });
    for (const pr of t.prompts) {
      push(pr.de);
      pr.models.forEach((m) => m.lines.forEach((l) => push(l.de)));
    }
  }
  for (const g of p.redemittel) g.phrases.forEach((ph) => push(ph.de));
  return out;
}

export interface Gap { token: string; count: number; papers: Set<string> }

/** Tokens the corpus cannot resolve, worst first. */
export function gapsIn(papers: ExamPaper[], corpus: Parameters<typeof buildMatcher>[0]): Gap[] {
  const m = buildMatcher(corpus);
  const gaps = new Map<string, Gap>();
  for (const p of papers) {
    for (const text of germanOf(p)) {
      for (const seg of m.annotate(text)) {
        if (!seg.isWord || seg.word) continue;
        const tok = seg.text;
        const lc = tok.toLowerCase();
        if (isNeutralWord(tok) || isLikelyEntity(tok) || PAPER_NAMES.has(lc)) continue;
        if (/^\d/.test(tok) || tok.length < 3) continue;
        const g = gaps.get(lc) ?? { token: lc, count: 0, papers: new Set<string>() };
        g.count++; g.papers.add(p.id);
        gaps.set(lc, g);
      }
    }
  }
  return [...gaps.values()].sort((a, b) => b.count - a.count || a.token.localeCompare(b.token));
}

// ---- CLI -------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const corpus = loadCorpus(PATHS.vocab);
  const gaps = gapsIn(PAPERS, corpus);
  let tokens = 0;
  const m = buildMatcher(corpus);
  for (const p of PAPERS) {
    for (const text of germanOf(p)) {
      for (const seg of m.annotate(text)) {
        if (!seg.isWord) continue;
        if (isNeutralWord(seg.text) || isLikelyEntity(seg.text) || PAPER_NAMES.has(seg.text.toLowerCase())) continue;
        if (/^\d/.test(seg.text) || seg.text.length < 3) continue;
        tokens++;
      }
    }
  }
  const missing = gaps.reduce((n, g) => n + g.count, 0);
  console.log(`papers ${PAPERS.length} · content tokens ${tokens} · unresolved ${missing} `
    + `(${(100 * (tokens - missing) / tokens).toFixed(1)}% covered) · distinct gaps ${gaps.length}`);
  for (const g of gaps) console.log(`  ${g.token}${g.count > 1 ? ` ×${g.count}` : ''}  [${[...g.papers].join(', ')}]`);

  if (process.argv.includes('--batch')) {
    const out = gaps.map((g) => ({
      term: g.token, en: '', pos: '', level: 'A1', field: '',
      ex: [{ de: '', en: '' }, { de: '', en: '' }],
    }));
    writeFileSync('scripts/authoring/batches/paper-gaps.json', JSON.stringify(out, null, 1));
    console.log(`\nskeleton → scripts/authoring/batches/paper-gaps.json (${out.length} rows to fill)`);
  }
}
