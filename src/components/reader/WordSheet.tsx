// The word you tapped, in the sentence you met it in.
//
// Two kinds of word reach here and they get different answers:
//
//   a **card Lexi has** — its gloss, its status, and two honest actions: put it in
//   today's study, or say you already know it (a real first review, graded Easy);
//
//   a **word Lexi does not have** — looked up in Wiktionary, never written, and
//   saved (if the learner wants it) as a card whose example is *this sentence*.
//   That is the best example a card can have: the learner chose it, and it is
//   about something they care about.
//
// The sentence itself can be heard, and — with a key set — explained.
import { useEffect, useState } from 'react';
import { X, Volume2, Plus, Check, BookmarkPlus, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import Chip from '../ui/Chip.tsx';
import IconButton from '../ui/IconButton.tsx';
import { lookupWord, wiktionaryUrl, type Lookup } from '../../lib/wiktionary.ts';
import { mineLookup, markKnown, minedId } from '../../lib/news/library.ts';
import { explainSentence, aiReady, AiError, type Explanation } from '../../lib/ai.ts';
import { statusOf, studyLevel } from '../../store.ts';
import { BY_ID } from '../../data/index.ts';
import { speak } from '../../lib/tts.ts';
import { genderColor } from '../../lib/ui.ts';
import type { Word } from '../../types.ts';

export interface Picked {
  surface: string;
  word: Word | null;
  sentence: string;
  paragraph: string;
}

const STATUS_COPY = { new: 'New to you', learning: 'Learning', known: 'Known' } as const;

export default function WordSheet({ picked, article, queued, onQueue, onMined, onClose }: {
  picked: Picked;
  article: { title: string; url: string };
  /** Ids already queued for study from this article. */
  queued: Set<string>;
  onQueue: (id: string) => void;
  onMined: (w: Word) => void;
  onClose: () => void;
}) {
  const { surface, word, sentence, paragraph } = picked;
  const [look, setLook] = useState<Lookup | null | 'loading' | 'error'>(word ? null : 'loading');
  const [explain, setExplain] = useState<Explanation | 'loading' | string | null>(null);
  const [, bump] = useState(0);

  // Look the word up only when Lexi does not carry it. The sheet is keyed by the
  // tapped token, so a new word is a new mount and the state starts clean.
  useEffect(() => {
    if (word) return;
    let live = true;
    lookupWord(surface).then((l) => { if (live) setLook(l); }).catch(() => { if (live) setLook('error'); });
    return () => { live = false; };
  }, [surface, word]);

  // A looked-up word may already be one the learner saved from another article.
  const mined = look && typeof look === 'object' ? BY_ID.get(minedId(look.lemma)) ?? null : null;
  const card = word ?? mined;
  const status = card ? statusOf(card.id) : null;

  const runExplain = async () => {
    setExplain('loading');
    try {
      setExplain(await explainSentence({ sentence, paragraph, title: article.title, level: studyLevel() }));
    } catch (e) {
      setExplain(e instanceof AiError ? e.message : 'Could not explain this one.');
    }
  };

  const save = (known: boolean) => {
    if (!look || typeof look !== 'object') return;
    const w = mineLookup(look, sentence, article);
    if (known) markKnown(w.id);
    onMined(w);
    bump((n) => n + 1);
  };

  // Highlight the tapped word inside its sentence.
  const at = sentence.indexOf(surface);

  return (
    <Card tone="card" pad="none" className="px-4 py-4 sm:px-5" role="dialog" aria-label={`About ${surface}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {card ? (
            <>
              <p lang="de" className="headword text-2xl font-semibold leading-tight">
                {card.gender && <span style={{ color: genderColor(card.gender) }}>{card.gender} </span>}
                {card.term.replace(/^(der|die|das)\s+/, '')}
              </p>
              <p className="text-sm mt-0.5">{card.en}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {status && <Chip tone={status === 'known' ? 'good' : 'accent'}>{STATUS_COPY[status]}</Chip>}
                {card.plural && <span className="text-2xs text-dim">plural <span lang="de">{card.plural.replace(/^die\s+/, '')}</span></span>}
                {card.id.startsWith('usr:read:') && <span className="text-2xs text-dim">saved from your reading</span>}
              </p>
            </>
          ) : look === 'loading' ? (
            <p className="flex items-center gap-2 text-sm text-dim"><Loader2 size={14} className="animate-spin" /> Looking up <span lang="de" className="font-semibold text-txt">{surface}</span>…</p>
          ) : look === 'error' ? (
            <p className="text-sm text-dim">Couldn’t reach Wiktionary. Check your connection and tap the word again.</p>
          ) : look === null ? (
            <>
              <p lang="de" className="headword text-2xl font-semibold">{surface}</p>
              <p className="text-sm text-dim mt-0.5">No dictionary entry — most likely a name.</p>
            </>
          ) : (
            <>
              <p lang="de" className="headword text-2xl font-semibold leading-tight">
                {look.gender && <span style={{ color: genderColor(look.gender) }}>{look.gender} </span>}
                {look.lemma}
              </p>
              {look.isName
                ? <p className="text-sm text-dim mt-0.5">A name — not counted as vocabulary.</p>
                : look.glosses.length
                  ? <p className="text-sm mt-0.5">{look.glosses.slice(0, 3).join('; ')}</p>
                  : <p className="text-sm text-dim mt-0.5">No English gloss in Wiktionary yet.</p>}
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-dim">
                {look.pos && <span>{look.pos}</span>}
                {look.plural && <span>plural <span lang="de">{look.plural}</span></span>}
                {look.lemma !== surface && <span>from <span lang="de">{surface}</span></span>}
                <a href={wiktionaryUrl(look.lemma)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 underline decoration-dotted hover:text-accent">
                  Wiktionary <ExternalLink size={10} />
                </a>
              </p>
            </>
          )}
        </div>
        <IconButton label="Close" pull onClick={onClose}><X size={18} /></IconButton>
      </div>

      {/* The actions. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {word && status !== 'known' && (
          <>
            <Button size="sm" variant={queued.has(word.id) ? 'secondary' : 'primary'} disabled={queued.has(word.id)}
              onClick={() => onQueue(word.id)}>
              {queued.has(word.id) ? <><Check size={13} /> In your study list</> : <><Plus size={13} /> Study this</>}
            </Button>
            <Button size="sm" variant="quiet" onClick={() => { markKnown(word.id); bump((n) => n + 1); }}>
              <Check size={13} /> I know it
            </Button>
          </>
        )}
        {!word && look && typeof look === 'object' && !look.isName && (
          mined
            ? <Chip tone="good"><Check size={11} /> Saved</Chip>
            : (
              <>
                <Button size="sm" onClick={() => save(false)}><BookmarkPlus size={13} /> Save as a card</Button>
                <Button size="sm" variant="quiet" onClick={() => save(true)}><Check size={13} /> I know it</Button>
              </>
            )
        )}
      </div>

      {/* The sentence it came from. */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-start gap-2">
          <p lang="de" className="flex-1 text-sm leading-relaxed">
            {at >= 0
              ? <>{sentence.slice(0, at)}<mark className="bg-transparent text-accent font-semibold">{surface}</mark>{sentence.slice(at + surface.length)}</>
              : sentence}
          </p>
          <IconButton label="Listen to the sentence" pull onClick={() => speak(sentence)}><Volume2 size={16} /></IconButton>
        </div>
        <div className="mt-2">
          {aiReady() ? (
            explain === null ? (
              <Button size="sm" variant="quiet" onClick={runExplain}><Sparkles size={13} /> Explain this sentence</Button>
            ) : explain === 'loading' ? (
              <p className="flex items-center gap-2 text-xs text-dim"><Loader2 size={12} className="animate-spin" /> Reading the sentence…</p>
            ) : typeof explain === 'string' ? (
              <p className="text-xs text-red-txt">{explain}</p>
            ) : (
              <div className="rounded-md bg-panel2 border border-line px-3 py-2.5">
                <p className="text-sm">{explain.translation}</p>
                {explain.points.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {explain.points.map((p, i) => (
                      <li key={i} className="text-xs leading-relaxed">
                        <span lang="de" className="font-semibold">{p.de}</span> — <span className="text-dim">{p.note}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-2xs text-dim">AI explanation — usually right, not always. Nothing here changes your cards.</p>
              </div>
            )
          ) : (
            <a href={`https://www.deepl.com/translator#de/en/${encodeURIComponent(sentence)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-dim underline decoration-dotted hover:text-accent">
              Translate this sentence on DeepL <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
