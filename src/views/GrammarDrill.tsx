// Grammatik-Übungen — the authored exercise bank on FSRS tracks. Renders the
// five widget kinds (choose, mc, type, order, error); wrong answers log a
// blind-spot tag (the grammar point’s title). Reached from Grammar Fundamentals.
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { cardOf, review, levels, logMiss, logAttempt } from '../store.ts';
import { useStore } from '../useStore.ts';
import { isDue, Rating } from '../srs.ts';
import { haptic, tick } from '../lib/ui.ts';
import { lookupSurface } from '../lib/reader.ts';
import { loadGrammar, flatten, type GItem, type RevealData } from '../lib/grammar.ts';
import { citationTiles, sentenceCase, sameOrder } from '../lib/wordorder.ts';
import UmlautBar from '../components/UmlautBar.tsx';
import { RevealBlock, Derivation, Paradigm, useChoiceKeys } from '../components/Reveal.tsx';
import WhyLink, { RuleToggle, DrillHeader, NoHelpCtx } from '../components/RulePanel.tsx';
import Surface from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import type { CEFR } from '../types.ts';

// canon: case/whitespace-insensitive. norm: additionally folds umlauts/ß, so
// "schoen" matches "schön" — a norm-only match is a *near-miss* (right word,
// spelling drifted), surfaced supportively instead of graded wrong.
const canon = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const norm = (s: string) => canon(s)
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

/** One insertion, deletion or substitution apart? */
function editDistance1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return false;
  if (a.length === b.length) {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false;
    return d === 1;
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  let i = 0, j = 0, d = 0;
  while (i < s.length && j < l.length) {
    if (s[i] === l[j]) { i++; j++; } else if (++d > 1) return false; else j++;
  }
  return true;
}

/** Was this a slipped finger rather than a wrong answer?
 *
 *  Blanket edit-distance-1 tolerance is unusable here, and not marginally: 25% of
 *  the corpus's typed targets have *another real German word* one edit away, and
 *  they are concentrated in exactly the vocabulary a beginner is drilling —
 *  Mutter/Butter, Haus/Hals, Brot/Boot, Uhr/Ohr, Zeit/weit, Kind/Kino. Accepting
 *  "Butter" for "Mutter" would not be kindness; it would be teaching the wrong
 *  word and calling it right.
 *
 *  So the tolerance is guarded: one edit *and* what they typed is not itself a
 *  German word the app knows. A real word is treated as a real answer — and a
 *  wrong one — while "muter" or "Hausu" is read as the typo it plainly is. The
 *  learner is still told, because an error forgiven silently is how it sets.
 */
export function isTypoFor(typed: string, accept: string[]): boolean {
  const t = norm(typed);
  if (t.length < 4) return false;         // too short for one edit to be evidence
  if (lookupSurface(typed.trim())) return false;  // a real word is a real answer
  return accept.some((a) => editDistance1(t, norm(a)));
}

/** Name the spelling that drifted on a near-miss.
 *
 *  Grading folds ä/ö/ü/ß to their ASCII digraphs so "schoen" is accepted for
 *  "schön" — which is right, because the learner knew the word. But the message
 *  was "Right — just the spelling: schön", and a learner who types "schoen" every
 *  time is never told *which* part was the spelling. Forgiving an error silently
 *  is how it becomes permanent.
 *
 *  Returns the substitutions actually needed, e.g. "oe → ö". Null when the two
 *  differ some other way (case, spacing), where there is no lesson to name. */
export function spellingDiff(typed: string, canonical: string): string | null {
  const PAIRS: [string, string][] = [['ae', 'ä'], ['oe', 'ö'], ['ue', 'ü'], ['ss', 'ß']];
  const t = canon(typed), c = canon(canonical);
  const found = PAIRS.filter(([ascii, real]) => c.includes(real) && t.includes(ascii));
  if (!found.length) return null;
  return found.map(([ascii, real]) => `${ascii} → ${real}`).join(', ');
}

/** What the learner typed, word by word, marked where it diverges from the answer.
 *
 *  Reported from a real session on a dictation card: the answer field is a
 *  single-line `<input>` at `text-xl`, so „Ich besuche meine Eltern jeden Sonntag.“
 *  overflowed it and rendered as „Ich besuche meine Eltern jet“. The field is then
 *  `disabled` — still clipped — at the exact moment the learner is comparing their
 *  attempt against the correct sentence. *"I can't even see what I wrote to know
 *  which part I wrote incorrectly."*
 *
 *  Word-level rather than character-level, deliberately: in a dictation the unit of
 *  error is a word or an ending, and a character diff of a whole sentence is a
 *  mess of fragments.
 *
 *  Compared through `norm`, not `canon` — the same fold the *grader* uses. `canon`
 *  only lowercases and collapses whitespace; `norm` also folds ä/ö/ü/ß, which is
 *  what makes „moechte“ an accepted spelling of „möchte“. Marking it red here would
 *  contradict the grade the learner was just given, and `spellingDiff` already
 *  teaches that difference in words.
 *
 *  Alignment is positional, which is right for the common cases (a wrong ending, a
 *  missed word at the end) and gives up gracefully on a shifted sentence: extra or
 *  missing words simply mark from the divergence on. Exported for tests. */
export function typedDiff(typed: string, answer: string): { text: string; ok: boolean }[] {
  const t = typed.trim().split(/\s+/).filter(Boolean);
  const a = answer.trim().split(/\s+/).filter(Boolean);
  return t.map((w, i) => ({ text: w, ok: i < a.length && norm(w) === norm(a[i]) }));
}

/** Progressive hint ladder for typed answers: shape → first letter → first
 *  half. A graceful path between blind guess and giving up; taking a hint
 *  never changes the grade. Exported for tests. */
export function hintText(answer: string, level: number): string {
  const words = answer.split(/\s+/).filter(Boolean);
  if (level <= 1) return words.length > 1
    ? `${words.length} words · ${answer.replace(/\s+/g, '').length} letters`
    : `${answer.length} letters`;
  if (level === 2) return `starts with “${answer[0]}”`;
  return `“${answer.slice(0, Math.ceil(answer.length / 2))}…”`;
}
function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

/** One grammar point, addressed the way flatten() ids it. */
export interface PointScope { level: CEFR; pi: number; title: string }

export default function GrammarDrill({ onExit, scope }: { onExit: () => void; scope?: PointScope }) {
  useStore();
  const lvKey = [...levels()].sort().join('');
  const [all, setAll] = useState<GItem[] | null>(null);
  // A scoped drill answers "practise *this* concept", so it deliberately ignores
  // the CEFR filter — tapping Practice on a point is itself the license for it,
  // the same reasoning session.ts uses for its WORD_POINT links.
  const scopeKey = scope ? `${scope.level}:${scope.pi}` : '';
  useEffect(() => {
    loadGrammar().then((g) => setAll(
      scope ? flatten(g, new Set([scope.level])).filter((it) => it.pi === scope.pi)
            : flatten(g, levels())
    ));
  }, [lvKey, scopeKey]);

  const queue = useMemo(() => {
    if (!all) return [];
    const now = Date.now();
    const due: GItem[] = [], fresh: GItem[] = [];
    for (const it of all) { const c = cardOf(it.id); if (!c) fresh.push(it); else if (isDue(c, now)) due.push(it); }
    // Scoped: play this point rather than a slice of the day's mixed queue, and
    // replay it even when nothing is due — the learner asked for this concept.
    //
    // **Authored exercises first.** Points used to hold about six exercises each
    // and a scoped session was all of them. `corpus:genex` then added up to 150
    // derived ones per point, which would have made a session asking to *learn* a
    // concept about 96% machine drill — and a generated item can only state that
    // an answer is right, where an authored one was written to explain why. So
    // the authored ones are spent first and the generated ones fill the rest.
    if (scope) {
      const authored = all.filter((x) => !x.ex.gen);
      const derived = all.filter((x) => x.ex.gen);
      return [...shuffle(authored), ...shuffle(derived)].slice(0, 25);
    }
    return [...shuffle(due), ...shuffle(fresh)].slice(0, 25);
  }, [all, scopeKey]);

  const [i, setI] = useState(0);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const item = queue[i];

  const grade = useCallback((ok: boolean) => {
    if (!item) return;
    review(item.id, ok ? Rating.Good : Rating.Again);
    haptic(ok ? 'grade' : 'wrong');
    tick(ok ? 'good' : 'wrong');
    // Every graded item, not only the failures — the denominator BACKLOG #10
    // needs so a blind spot can be ranked by rate instead of by exposure.
    logAttempt(item.point.title);
    if (!ok) logMiss(item.point.title);
    setDone((d) => d + 1); setCorrect((c) => c + (ok ? 1 : 0)); setI((n) => n + 1);
  }, [item]);

  if (!all) return <Shell onExit={onExit}><div className="grid place-items-center min-h-[300px] text-dim"><Loader2 className="animate-spin" /></div></Shell>;
  if (queue.length === 0) return <Shell onExit={onExit}><Empty scope={scope} /></Shell>;
  if (!item) return <Shell onExit={onExit}><Summary done={done} correct={correct} /></Shell>;

  return (
    <Shell onExit={onExit} progress={`${done}/${queue.length}`} score={done ? Math.round((correct / done) * 100) : null}>
      <div className="text-center mb-3">
        <RuleToggle pointRef={{ level: item.level, title: item.point.title }} />
      </div>
      <Item key={item.id} item={item} onGrade={grade} />
    </Shell>
  );
}

function Item({ item, onGrade }: { item: GItem; onGrade: (ok: boolean) => void }) {
  return <GrammarExercise ex={item.ex} onGrade={onGrade} point={{ level: item.level, title: item.point.title }} />;
}

/** Which concept the exercise on screen belongs to. Ambient rather than threaded
 *  through every widget: all five kinds render the shared <Explain>, and only
 *  Explain needs it (to offer the rule after a wrong answer). */
const PointCtx = createContext<{ level: CEFR; title: string } | null>(null);

/** Render one grammar exercise (any of the five widget kinds). Reused by the
 *  unified session, where `point` is what makes the rule reachable from a drill
 *  the learner met mid-session rather than by choosing it. */
export function GrammarExercise({ ex, onGrade, point }: {
  ex: GItem['ex']; onGrade: (ok: boolean) => void; point?: { level: CEFR; title: string };
}) {
  const body = ex.kind === 'choose' || ex.kind === 'mc' ? <ChooseItem ex={ex} onGrade={onGrade} />
    : ex.kind === 'type' ? <TypeItem ex={ex} onGrade={onGrade} />
    : ex.kind === 'order' ? <OrderItem ex={ex} onGrade={onGrade} />
    : <ErrorItem ex={ex} onGrade={onGrade} />;
  return <PointCtx.Provider value={point ?? null}>{body}</PointCtx.Provider>;
}

/** The exercise surface — the same card material as the flip it interleaves with. */
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-line rounded-lg p-6 sm:p-8">{children}</div>;
}
function Explain({ text, ok, answer, note, rulePoint, reveal }: {
  text?: string; ok: boolean; answer?: string; note?: string;
  rulePoint?: string | null; reveal?: RevealData;
}) {
  const ctx = useContext(PointCtx);
  // A *generated* word-drill isn't an authored point, so it has no PointCtx —
  // which meant a wrong transformation answer had no route to any rule at all.
  // An explicit `rulePoint` (the tense this card actually asked for) wins.
  const point = rulePoint !== undefined ? rulePoint : ctx;
  // Show the derivation and the paradigm on a miss, and on a near-miss (right
  // form, spelling drifted) — but not on a clean correct answer, where a run of
  // extra teaching becomes wallpaper. Same rule as WhyThisCard: silence is valid.
  const teach = reveal && (!ok || note);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center" role="status" aria-live="polite">
      {ok ? <p className="text-green font-semibold flex items-center justify-center gap-1.5"><Check size={16} /> Correct</p>
          : <p className="text-base"><X size={15} className="inline text-red -mt-0.5 mr-1" /> {answer && <>Answer: <span className="text-green font-bold">{answer}</span></>}</p>}
      {note && <p className="text-amber text-xs mt-1">{note}</p>}
      {text && <p className="text-dim text-xs mt-1.5">{text}</p>}
      {teach && (
        // Left-aligned inside a centred block on purpose: a formula and a
        // paradigm are things you read down a column, not banner copy.
        <div className="mt-3.5 text-left mx-auto max-w-[19rem]">
          {reveal.derivation && (
            <RevealBlock label="How it’s built">
              <Derivation parts={reveal.derivation} note={reveal.note} />
            </RevealBlock>
          )}
          {reveal.paradigm && (
            <RevealBlock label={reveal.paradigm.label}>
              <Paradigm rows={reveal.paradigm.rows} />
            </RevealBlock>
          )}
        </div>
      )}
      {/* The per-exercise `explain` justifies this answer; the rule explains the
          system. Offer it only on a miss, so a run of correct answers stays clean. */}
      {!ok && point && <div className="flex justify-center"><WhyLink pointRef={point} /></div>}
    </motion.div>
  );
}
function NextBtn({ onClick }: { onClick: () => void }) {
  return <div className="mt-5 flex justify-center"><Button variant="secondary" onClick={onClick}>Next →</Button></div>;
}

function ChooseItem({ ex, onGrade }: { ex: GItem['ex']; onGrade: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = ex.answer ?? 0;
  const choose = (idx: number) => { if (picked !== null) return; setPicked(idx); };
  useChoiceKeys({
    count: (ex.options ?? []).length,
    answered: picked !== null,
    onPick: choose,
    onNext: () => picked !== null && onGrade(picked === correct),
  });
  return (
    <Card>
      <p lang="de" className="headword text-xl sm:text-2xl font-bold text-center mb-5 leading-snug">{ex.prompt}</p>
      <div className="grid gap-2.5">
        {(ex.options ?? []).map((o, idx) => {
          const state = picked === null ? 'idle' : idx === correct ? 'right' : idx === picked ? 'wrong' : 'idle';
          return (
            <button key={idx} onClick={() => choose(idx)} disabled={picked !== null}
              className={`rounded-md py-3.5 px-4 border text-base text-left transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red-txt'
                : 'bg-panel2 border-line hover:border-amber'}`}>
              <kbd aria-hidden className="hidden sm:inline-block font-mono text-2xs text-dim mr-2 tabular-nums">{idx + 1}</kbd>
              {state === 'right' && <Check size={14} className="inline -mt-0.5 mr-1.5" />}
              {state === 'wrong' && <X size={14} className="inline -mt-0.5 mr-1.5" />}
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && <Explain text={ex.explain} ok={picked === correct} answer={ex.options?.[correct]} />}
      {picked !== null && <NextBtn onClick={() => onGrade(picked === correct)} />}
    </Card>
  );
}

/** Typed-answer widget. Exported so word-level drills (tense transformation)
 *  can reuse it with a fabricated exercise object. */
export function TypeItem({ ex, onGrade, rulePoint, ruleLabel, promptLang = 'de', noteFor }: {
  ex: GItem['ex']; onGrade: (ok: boolean) => void; rulePoint?: string | null; ruleLabel?: string;
  /** Language of the *prompt*. Every drill but one asks a question in German, so
   *  `de` is the default — but the recall drill's prompt is the English gloss, and
   *  a screen reader handed English inside `lang="de"` reads it in a German voice.
   *  That is the exact defect `lang="de"` exists to prevent, pointed the other way. */
  promptLang?: 'de' | 'en';
  /** Say something more specific than right/wrong about *this* attempt.
   *
   *  `spellingDiff` already does this for the umlaut fold — "Right — just the
   *  spelling: schön (oe → ö)" — on the principle that an error forgiven silently
   *  is how it becomes permanent. The same principle has a second case the widget
   *  cannot know about on its own: in the recall drill, typing "Fakultät" for
   *  "die Fakultät" is a **gender** miss wearing a vocabulary miss's clothes, and
   *  the learner should be told which one they made. Returning a note never
   *  changes the grade. */
  noteFor?: (typed: string, ok: boolean) => string | undefined;
}) {
  const [val, setVal] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [near, setNear] = useState(false); // right word, spelling drifted (umlauts/ß)
  const [hint, setHint] = useState(0);     // 0 = none, 1..3 = ladder
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const accepts = useMemo(() => new Set((ex.accept ?? []).map(norm)), [ex]);
  const canonical = ex.accept?.[0] ?? '';
  // An authored ladder wins over the generic one. `hintText` counts letters and
  // leaks the first character, which is useless when the prompt already prints
  // the pronoun — see `transformHints`.
  const rung = (n: number) => ex.hints?.[n - 1] ?? hintText(canonical, n);
  const rungs = ex.hints?.length ?? 3;
  // Exam conditions: the hint ladder is exactly the scaffolding an exam removes.
  const noHelp = useContext(NoHelpCtx);
  const submit = () => {
    if (result !== null) return;
    const exact = accepts.has(norm(val));
    const typo = !exact && isTypoFor(val, ex.accept ?? []);
    const ok = exact || typo;
    // Near-miss: matched only through the umlaut/ß fold, or a single slip of the
    // finger — correct, supportively shown with the proper spelling rather than
    // punished as wrong.
    setNear(ok && !(ex.accept ?? []).some((a) => canon(a) === canon(val)));
    setResult(ok);
  };
  return (
    <>
      {ruleLabel && <DrillHeader pointRef={rulePoint ?? null} label={ruleLabel} />}
    <Card>
      <p lang={promptLang} className="headword text-xl sm:text-2xl font-bold text-center mb-4 leading-snug">{ex.prompt}</p>
      <label className="sr-only" htmlFor="drill-answer">Your answer</label>
      <input id="drill-answer" lang="de" ref={ref} value={val} disabled={result !== null} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { if (result === null) submit(); else onGrade(result); } }}
        placeholder="Type your answer…"
        className={`w-full bg-panel2 border rounded-md px-4 py-3 text-xl outline-none text-center ${
          result === null ? 'border-line focus:border-amber' : result ? 'border-green text-green' : 'border-red'}`} />
      {result === null && <div className="mt-2 flex justify-center"><UmlautBar targetRef={ref} value={val} onChange={setVal} /></div>}
      {result === null && hint > 0 && <p className="text-amber text-xs mt-2 text-center leading-relaxed">Hint: {rung(hint)}</p>}
      {/* Read back what they typed, wrapped and in full — the input above clips it
          and stays clipped once disabled. Only on a miss: after a correct answer
          there is nothing to compare. */}
      {result === false && val.trim() && canonical && (
        <p className="mt-3 text-sm text-center leading-relaxed" lang="de">
          <span className="text-dim text-xs">You wrote: </span>
          {typedDiff(val, canonical).map((seg, i) => (
            <span key={i} className={seg.ok ? 'text-dim' : 'text-red-txt font-semibold underline decoration-dotted underline-offset-2'}>
              {seg.text}{' '}
            </span>
          ))}
        </p>
      )}
      {result !== null && <Explain text={ex.explain} ok={result} answer={canonical}
        note={near
          ? spellingDiff(val, canonical)
            ? `Right — just the spelling: ${canonical} (${spellingDiff(val, canonical)})`
            // A typo and an umlaut fold are both near-misses and are not the same
            // lesson: one is a slipped finger, the other is a spelling the learner
            // may believe is correct. Naming which is the whole point.
            : `Right — just a typo: ${canonical}`
          // The caller's note only gets a say when there is no near-miss to
          // report, so the umlaut/typo lessons above are never displaced.
          : noteFor?.(val, result)}
        rulePoint={rulePoint} reveal={ex.reveal} />}
      {result === null
        ? <div className="mt-5 flex items-center justify-center gap-3">
            <Button onClick={submit} disabled={!val.trim()}>Check</Button>
            {canonical && hint < rungs && !noHelp && (
              <button onClick={() => setHint((h) => h + 1)} className="text-dim text-xs underline underline-offset-2 hover:text-amber">
                {hint === 0 ? 'Hint' : 'More'}
              </button>
            )}
          </div>
        : <NextBtn onClick={() => onGrade(result)} />}
    </Card>
    </>
  );
}

/** Tap-tile sentence builder. Exported so word-level drills (rebuild the card’s
 *  own example sentence) can reuse it with a fabricated exercise object. */
export function OrderItem({ ex, onGrade, rulePoint, ruleLabel }: {
  ex: GItem['ex']; onGrade: (ok: boolean) => void; rulePoint?: string | null; ruleLabel?: string;
}) {
  const target = useMemo(() => ex.tiles ?? [], [ex]);
  // The tiles the learner sees, in the case each word carries mid-sentence. The
  // pool used to spell the answer: 65% of these sentences open with a word that is
  // lowercase everywhere else — ich, mein, heute, der — so its capital announced
  // position 1 and nothing more. `target` is kept as authored for the answer line.
  const shown = useMemo(() => citationTiles(target), [target]);
  const [pool, setPool] = useState<number[]>(() => shuffle(target.map((_, i) => i)));
  const [built, setBuilt] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const add = (idx: number) => { if (result !== null) return; setBuilt([...built, idx]); setPool(pool.filter((p) => p !== idx)); };
  const removeAt = (pos: number) => { if (result !== null) return; const idx = built[pos]; setBuilt(built.filter((_, i) => i !== pos)); setPool([...pool, idx]); };
  // Case-insensitive, because case is not something the builder lets the learner
  // choose — the tiles arrive with whatever case they were given. Grading it is
  // what forced the pool to spell position 1 in the first place.
  const check = () => setResult(sameOrder(built.map((i) => shown[i]), shown));
  return (
    <>
      {ruleLabel && <DrillHeader pointRef={rulePoint ?? null} label={ruleLabel} />}
    <Card>
      <p className="text-xl sm:text-2xl font-semibold text-center mb-4">{ex.prompt}</p>
      <div className="min-h-[52px] border border-dashed border-line rounded-md p-2 flex flex-wrap gap-2 mb-3">
        {built.map((idx, pos) => (
          <button key={pos} onClick={() => removeAt(pos)} className="bg-panel border border-amber/50 rounded-md px-3 py-1.5 text-base">{shown[idx]}</button>
        ))}
        {built.length === 0 && <span className="text-dim text-xs self-center px-1">Tap tiles to build the sentence…</span>}
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {pool.map((idx) => (
          <button key={idx} onClick={() => add(idx)} className="bg-panel2 border border-line rounded-md px-3 py-1.5 text-base hover:border-amber">{shown[idx]}</button>
        ))}
      </div>
      {result !== null && <Explain text={ex.explain} ok={result} answer={sentenceCase(shown.join(' '))} rulePoint={rulePoint} />}
      {result === null
        ? <div className="mt-5 flex justify-center"><Button onClick={check} disabled={built.length !== target.length}>Check</Button></div>
        : <NextBtn onClick={() => onGrade(result)} />}
    </Card>
    </>
  );
}

function ErrorItem({ ex, onGrade }: { ex: GItem['ex']; onGrade: (ok: boolean) => void }) {
  const tokens = ex.prompt.split(/\s+/);
  const correct = ex.answer ?? 0;
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Card>
      <p className="text-xs text-dim text-center mb-3">Tap the wrong word.</p>
      <div className="flex flex-wrap gap-1.5 justify-center mb-2 text-xl">
        {tokens.map((t, idx) => {
          const state = picked === null ? 'idle' : idx === correct ? 'right' : idx === picked ? 'wrong' : 'idle';
          return (
            <button key={idx} onClick={() => picked === null && setPicked(idx)} disabled={picked !== null}
              className={`px-1.5 py-0.5 rounded-sm transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] text-green'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] text-red line-through'
                : 'hover:bg-panel2'}`}>{t}</button>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <p className="text-center text-base mt-2">→ <span className="text-green font-semibold">{ex.fix}</span></p>
          <Explain text={ex.explain} ok={picked === correct} />
          <NextBtn onClick={() => onGrade(picked === correct)} />
        </>
      )}
    </Card>
  );
}

function Shell({ children, onExit, progress, score }: { children: React.ReactNode; onExit: () => void; progress?: string; score?: number | null }) {
  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="flex items-center gap-2.5 mb-4">
        <IconButton label="Back" pull onClick={onExit}><ArrowLeft size={18} /></IconButton>
        {progress && <span className="text-xs text-dim font-mono ml-1.5">{progress}</span>}
        {score !== null && score !== undefined && <span className="ml-auto text-xs font-mono text-green">{score}% correct</span>}
      </div>
      {children}
    </div>
  );
}
function Empty({ scope }: { scope?: PointScope }) {
  return <Surface pad="none" className="px-8 py-12 text-center">
    <h2 className="text-xl font-bold mb-1">{scope ? 'No exercises yet' : 'Nothing due'}</h2>
    <p className="text-dim">{scope
      ? <>“{scope.title}” has no exercises in the bank yet — the rule above is all there is for now.</>
      : 'No grammar exercises are due for your selected levels.'}</p>
  </Surface>;
}
function Summary({ done, correct }: { done: number; correct: number }) {
  return <Surface pad="none" className="px-8 py-12 text-center">
    <div className="grid place-items-center w-14 h-14 rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}><Check className="text-green" /></div>
    <h2 className="text-2xl font-bold mb-1">Drill complete</h2><p className="text-dim">{correct}/{done} correct. Misses logged to Blind Spots.</p>
  </Surface>;
}
