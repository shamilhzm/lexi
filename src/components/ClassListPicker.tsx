// "This is my chapter this week."
//
// Lexi organises 7,389 cards into 284 semantic sectors and a CEFR filter. That is
// the *corpus's* organisation, and no amount of filtering turns it into a
// learner's course — someone at a language school has a list their teacher handed
// out, and until now there was nowhere to put it.
//
// So: paste the list. Matching reuses the reader's surface index, which knows
// inflected and plural forms, so "Häuser" or "ging" find their card rather than
// bouncing. What doesn't match is reported rather than silently dropped: a list
// that quietly loses a third of its words is worse than one that says so.
import { useMemo, useState } from 'react';
import { ClipboardList, Play, X, Check } from 'lucide-react';
import { classList, setClassList } from '../store.ts';
import { useStore } from '../useStore.ts';
import { lookupSurface } from '../lib/reader.ts';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Target, Word } from '../types.ts';

/** Split pasted text into candidate entries.
 *
 *  Tolerant on purpose — a list copied out of a worksheet arrives as lines, or
 *  commas, or "der Hund – dog" with a gloss attached. Anything after a dash, an
 *  equals or a tab is the learner's own translation, not part of the word. */
export function parseList(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((raw) => raw
      .replace(/^\s*[-*•\d.)\]]+\s*/, '')        // bullets and numbering
      .split(/\s+[–—=]\s+|\t|\s+[-]\s+/)[0]      // strip an attached translation
      .replace(/\s+/g, ' ')
      .trim())
    .filter((s) => s.length > 1 && /\p{L}/u.test(s));
}

/** Match entries against the lexicon, keeping the learner's order and reporting
 *  what could not be found. */
export function matchList(entries: string[]): { words: Word[]; missed: string[] } {
  const words: Word[] = [];
  const missed: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    // A pasted noun usually carries its article; the index is keyed on the bare
    // form, so try the whole entry and then its last word.
    const parts = e.split(' ');
    const hit = lookupSurface(e) ?? (parts.length > 1 ? lookupSurface(parts[parts.length - 1]) : null);
    if (!hit) { missed.push(e); continue; }
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    words.push(hit);
  }
  return { words, missed };
}

export default function ClassListPicker({ onStudy }: { onStudy?: (t: Target) => void }) {
  useStore();
  const saved = classList();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const result = useMemo(() => (text.trim() ? matchList(parseList(text)) : null), [text]);

  const save = () => {
    if (!result?.words.length) return;
    setClassList({ name: name.trim() || 'My list', ids: result.words.map((w) => w.id), at: Date.now() });
    setOpen(false); setText(''); setName('');
  };

  if (!open) {
    return (
      <Card pad="none" className="p-4">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
          <ClipboardList size={16} className="text-amber" /> My class list
        </h3>
        <p className="text-dim text-xs mb-3 max-w-[60ch]">
          Paste the words from this week’s lesson and Lexi will match them to its cards, so you can
          study your course rather than its own topic map.
        </p>
        {saved ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Kicker tone="accent">{saved.name}</Kicker>
            <span className="text-dim text-xs">{saved.ids.length} words</span>
            {onStudy && (
              <Button size="sm" onClick={() => onStudy({ kind: 'custom', name: saved.name, ids: saved.ids })}>
                <Play size={13} /> Study
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Replace</Button>
            <button onClick={() => setClassList(null)}
              className="text-2xs text-dim hover:text-red-txt inline-flex items-center gap-1">
              <X size={12} /> Remove
            </button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Paste a list</Button>
        )}
      </Card>
    );
  }

  return (
    <Card pad="none" className="p-4">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
        <ClipboardList size={16} className="text-amber" /> My class list
      </h3>
      <label className="block text-xs text-dim mb-1" htmlFor="cl-name">What is this list?</label>
      <input id="cl-name" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Lektion 5"
        className="w-full bg-panel2 border border-line rounded-md px-3 py-2 text-sm mb-3 outline-none focus:border-amber" />

      <label className="block text-xs text-dim mb-1" htmlFor="cl-words">
        The words — one per line, or separated by commas
      </label>
      <textarea id="cl-words" value={text} onChange={(e) => setText(e.target.value)} rows={7}
        lang="de" placeholder={'der Hund\ndie Katze – cat\naufstehen'}
        className="w-full bg-panel2 border border-line rounded-md px-3 py-2 text-sm outline-none focus:border-amber resize-y" />

      {result && (
        <div className="mt-3 text-xs">
          <p className="text-green flex items-center gap-1.5">
            <Check size={14} /> {result.words.length} matched
          </p>
          {result.missed.length > 0 && (
            // Named, not hidden. A word Lexi doesn't have is a fact about Lexi,
            // and the learner should be able to see which ones to look up elsewhere.
            <p className="text-dim mt-1">
              {result.missed.length} not in the lexicon:{' '}
              <span lang="de" className="text-txt">{result.missed.slice(0, 8).join(', ')}</span>
              {result.missed.length > 8 && ` and ${result.missed.length - 8} more`}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button size="sm" onClick={save} disabled={!result?.words.length}>Save list</Button>
        <Button variant="secondary" size="sm" onClick={() => { setOpen(false); setText(''); }}>Cancel</Button>
      </div>
    </Card>
  );
}
