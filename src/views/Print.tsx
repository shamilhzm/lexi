// Drucken — the worksheet surface.
//
// The screen half of `lib/worksheet.ts`. It picks a source, renders A4, and gets
// out of the way: the actual output is paper, so everything here that is not on
// the sheet is chrome that must not print. See the `@media print` block in
// index.css — this view is the only one in the app whose real target is not a
// screen.
//
// Deliberately not a "share" surface. There is no send, no upload, no link. The
// learner prints it, or saves it as a PDF through the browser's own dialog, and
// what happens next is theirs.
import { useMemo, useState } from 'react';
import { Printer, FileText, ArrowLeft } from 'lucide-react';
import { WORDS, SECTORS } from '../data/index.ts';
import { missStats, levels } from '../store.ts';
import { useStore } from '../useStore.ts';
import { loadGrammar, type GrammarByLevel } from '../lib/grammar.ts';
import {
  buildVocabSheet, buildClozeSheet, buildGrammarSheet, buildMissSheet,
  type Sheet, type VocabDirection,
} from '../lib/worksheet.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { ALL_LEVELS, type CEFR } from '../types.ts';
import { useEffect } from 'react';

type Source = 'vocab-en-de' | 'vocab-de-en' | 'cloze' | 'grammar' | 'misses';

const SOURCES: { id: Source; label: string; desc: string }[] = [
  { id: 'vocab-en-de', label: 'Vocabulary · EN → DE', desc: 'Write the German, with the article. The harder direction, and the one worth setting.' },
  { id: 'vocab-de-en', label: 'Vocabulary · DE → EN', desc: 'Write the English. Gentler — good for a first week.' },
  { id: 'cloze', label: 'Gap-fill', desc: 'The word missing from a real sentence from its own card.' },
  { id: 'grammar', label: 'Grammar point', desc: 'Authored exercises from one concept, with the rule at the top.' },
  { id: 'misses', label: 'What I keep getting wrong', desc: 'Your own error log, for a lesson. Generated here; never sent.' },
];

export default function Print({ onExit }: { onExit: () => void }) {
  useStore();
  const [source, setSource] = useState<Source>('vocab-en-de');
  const [sector, setSector] = useState<string>('');
  const [level, setLevel] = useState<CEFR>('A1');
  const [pointIdx, setPointIdx] = useState(0);
  const [count, setCount] = useState(20);
  const [withKey, setWithKey] = useState(true);
  const [grammar, setGrammar] = useState<GrammarByLevel | null>(null);

  useEffect(() => { loadGrammar().then(setGrammar).catch(() => setGrammar(null)); }, []);

  const inScope = useMemo(() => {
    const lv = levels();
    return SECTORS.filter((s) => s.levels.some((l) => lv.has(l))).map((s) => s.name).sort();
  }, [source]);

  const words = useMemo(() => {
    const lv = levels();
    const pool = WORDS.filter((w) => w.kind === 'word' && lv.has(w.level) && (!sector || w.field === sector));
    // Shuffled so two sheets from the same deck are not the same sheet — a
    // teacher printing for two groups needs two papers, not one twice.
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }, [sector, source, count]);

  const points = grammar?.[level] ?? [];

  const sheet: Sheet | null = useMemo(() => {
    if (source === 'vocab-en-de' || source === 'vocab-de-en') {
      const dir: VocabDirection = source === 'vocab-en-de' ? 'en-de' : 'de-en';
      return buildVocabSheet(words, dir, count);
    }
    if (source === 'cloze') return buildClozeSheet(words, count);
    if (source === 'grammar') {
      const p = points[pointIdx];
      return p ? buildGrammarSheet(p, level, count) : null;
    }
    return buildMissSheet(missStats(30), count);
  }, [source, words, count, points, pointIdx, level]);

  const scopeLabel = sector || 'all sectors in your level filter';

  return (
    <div className="w-full">
      {/* ---- controls: screen only ---- */}
      <div className="no-print">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onExit} className="tap-44 flex items-center gap-1.5 text-xs text-dim hover:text-amber">
            <ArrowLeft size={15} /> Back
          </button>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Drucken</h1>
        <p className="text-dim text-xs mb-5 leading-relaxed max-w-[46rem]">
          A worksheet and an answer key, on paper. Nothing is uploaded and nothing is
          collected — this is generated on your device and printed by you.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 mb-4">
          {SOURCES.map((s) => (
            <Card as="button" key={s.id} nested pad="none" onClick={() => setSource(s.id)}
              aria-pressed={source === s.id}
              className={`text-left px-3 py-2.5 transition-colors ${source === s.id ? 'border-amber' : 'hover:border-amber'}`}>
              <span className="block text-xs font-semibold mb-0.5">{s.label}</span>
              <span className="block text-2xs text-dim leading-snug">{s.desc}</span>
            </Card>
          ))}
        </div>

        <Card pad="sm" className="mb-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {(source === 'vocab-en-de' || source === 'vocab-de-en' || source === 'cloze') && (
              <label className="flex items-center gap-2 text-xs">
                <span className="text-dim">Deck</span>
                <select value={sector} onChange={(e) => setSector(e.target.value)}
                  className="bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs max-w-[16rem]">
                  <option value="">All sectors in your level filter</option>
                  {inScope.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
            {source === 'grammar' && (
              <>
                <label className="flex items-center gap-2 text-xs">
                  <span className="text-dim">Level</span>
                  <select value={level} onChange={(e) => { setLevel(e.target.value as CEFR); setPointIdx(0); }}
                    className="bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs">
                    {ALL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <span className="text-dim">Point</span>
                  <select value={pointIdx} onChange={(e) => setPointIdx(Number(e.target.value))}
                    className="bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs max-w-[18rem]">
                    {points.map((p, i) => <option key={p.title} value={i}>{p.title}</option>)}
                  </select>
                </label>
              </>
            )}
            <label className="flex items-center gap-2 text-xs">
              <span className="text-dim">Items</span>
              <input type="number" min={5} max={40} value={count}
                onChange={(e) => setCount(Math.max(5, Math.min(40, Number(e.target.value) || 20)))}
                className="bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs w-16 tabular-nums" />
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} />
              <span>Answer key</span>
            </label>
            <Button size="sm" className="ml-auto" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </Button>
          </div>
        </Card>

        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} className="text-amber" />
          <Kicker tone="accent">Preview</Kicker>
        </div>
      </div>

      {/* ---- the sheet: the only thing that prints ---- */}
      {!sheet || sheet.items.length === 0 ? (
        <Card pad="none" className="px-6 py-10 text-center no-print">
          <p className="text-sm font-semibold mb-1">Nothing to put on a page yet</p>
          <p className="text-dim text-xs">
            {source === 'misses'
              ? 'No misses logged in the last 30 days — do some drills and this fills itself.'
              : 'This deck has no cards that can carry this exercise. Try another deck or a different sheet.'}
          </p>
        </Card>
      ) : (
        <div className="sheet bg-white text-black rounded-lg p-8 sm:p-10 mx-auto max-w-[820px]">
          <header className="border-b border-black/25 pb-3 mb-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-bold">{sheet.title}</h2>
              <span className="text-xs opacity-70 whitespace-nowrap">Lexi · {sheet.subtitle}</span>
            </div>
            {sheet.note && <p className="text-xs opacity-80 mt-1.5 leading-snug">{sheet.note}</p>}
            <div className="flex gap-8 mt-4 text-xs opacity-70">
              <span>Name: ______________________</span>
              <span>Datum: ______________</span>
              {source !== 'misses' && <span>Deck: {scopeLabel}</span>}
            </div>
          </header>

          <ol className="space-y-3.5">
            {sheet.items.map((it, i) => (
              <li key={i} className="flex gap-3 break-inside-avoid">
                <span className="font-mono text-xs opacity-60 w-6 flex-shrink-0 pt-0.5 text-right">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p lang={source === 'vocab-en-de' || source === 'misses' ? 'en' : 'de'} className="text-sm leading-snug">
                    {it.prompt}
                  </p>
                  {it.hint && <p className="text-xs opacity-60 mt-0.5">{it.hint}</p>}
                  {/* The misses sheet is a report, not an exercise: its "answer"
                      is the diagnosis, so it belongs under the item rather than
                      in a key at the back, and there is nothing to write on. */}
                  {source === 'misses'
                    ? <p className="text-xs mt-0.5">{it.answer}</p>
                    : <div className="border-b border-black/25 mt-2 h-4" />}
                </div>
              </li>
            ))}
          </ol>

          {withKey && source !== 'misses' && (
            <section className="key-page mt-10 pt-5 border-t border-black/25">
              <h3 className="text-sm font-bold mb-2">Answer key — {sheet.title}</h3>
              <ol className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                {sheet.items.map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono opacity-60 w-6 text-right flex-shrink-0">{i + 1}.</span>
                    <span lang="de">{it.answer}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

        </div>
      )}
    </div>
  );
}
