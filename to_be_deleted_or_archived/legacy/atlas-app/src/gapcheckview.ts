// Gap-check overlay — the per-Lektion diagnostic. Vocab recognition items in
// the Einstufung style + one exercise per linked grammar point via the shared
// exercise widgets. Ends with a verdict (sicher / Lücke) that is stored on the
// lesson and offers the right next step: seed known words or drill the misses.
import './placement.css';
import './card.css';
import { buildGapItems, scoreGapCheck, type GapAnswer } from './gapcheck.ts';
import { lektionByN } from './curriculum.ts';
import { starsForLesson, allStars } from './model.ts';
import { setGapResult, placementSeed, reviewStateOf } from './store.ts';
import { exerciseMarkup, bindExercise, grammarHint, karteKopf } from './session.ts';
import { icon } from './icons.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// One seed per calendar day: re-running the same day shows the same items,
// tomorrow brings a fresh mix.
const daySeed = () => Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));

export function renderGapCheck(root: HTMLElement, n: number, onDone: () => void, onPractice: (ids: string[]) => void) {
  const maybe = lektionByN(n);
  if (!maybe) { onDone(); return; }
  const lesson = maybe;
  const stars = starsForLesson(n, lesson.grammarStarIds);
  const pool = allStars().filter((s) => s.cefr === lesson.cefr && s.kind === 'word');
  const items = buildGapItems(lesson, stars, pool, daySeed());
  let idx = 0;
  const answers: GapAnswer[] = [];

  function finish() {
    if (!answers.length) { onDone(); return; }
    const score = scoreGapCheck(answers);
    setGapResult(n, { correct: score.correct, total: score.total }, score.verdict);
    const pct = (x: number) => Math.round(x * 100) + '%';
    // never reseed stars that already carry FSRS history
    const seedable = score.correctStarIds.filter((id) => reviewStateOf(id) === 'new');
    const secure = score.verdict === 'secure';
    root.innerHTML = `<div class="placement placement-done">
      <div>${icon(secure ? 'seal' : 'info', 'pl-ship')}
        <div class="pl-h">${secure ? 'Sitzt!' : 'Lücke gefunden'}</div>
        <div class="pl-sub">Lektion ${n} · ${esc(lesson.title)}<br>
          ${score.correct}/${score.total} richtig — Wortschatz ${pct(score.vocabPct)} · Grammatik ${pct(score.grammarPct)}</div>
        <div class="gc-actions">
          ${secure && seedable.length ? `<button class="btn btn-primary" id="gc-seed">${seedable.length} Wörter als bekannt markieren</button>` : ''}
          ${!secure && score.missedStarIds.length ? `<button class="btn btn-primary" id="gc-drill">Lücken üben (${score.missedStarIds.length})</button>` : ''}
          <button class="btn btn-secondary" id="gc-done">Fertig</button>
        </div>
      </div></div>`;
    root.querySelector('#gc-done')!.addEventListener('click', () => onDone());
    const seed = root.querySelector('#gc-seed');
    if (seed) seed.addEventListener('click', () => { placementSeed(seedable); onDone(); });
    const drill = root.querySelector('#gc-drill');
    if (drill) drill.addEventListener('click', () => onPractice(score.missedStarIds));
  }

  function frame(inner: string, kopfLabel: string): string {
    return `<div class="placement">
      <div class="pl-top">
        <button class="pl-skip" id="gc-skip">Abbrechen</button>
        <div class="pl-prog"><i style="width:${Math.round((idx / items.length) * 100)}%"></i></div>
      </div>
      ${karteKopf(lesson.cefr, kopfLabel, `${idx + 1} / ${items.length}`)}
      <div class="pl-stage">${inner}</div>
    </div>`;
  }

  function renderItem() {
    if (idx >= items.length) { finish(); return; }
    const item = items[idx];
    const advance = () => { idx++; renderItem(); };

    if (item.kind === 'vocab') {
      root.innerHTML = frame(`
        <div class="pl-card">
          <div class="pl-q">Was bedeutet das?</div>
          <h1 class="pl-term">${esc(item.term)}</h1>
        </div>
        <div class="pl-opts">${item.options.map((o, i) => `<button class="pl-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
        <button class="pl-dunno" id="gc-dunno">Weiß ich nicht</button>`, 'Wortschatz');
      let done = false;
      const grade = (chosen: number) => {
        if (done) return;
        done = true;
        const correct = chosen === item.answer;
        root.querySelectorAll('.pl-opt').forEach((o, oi) => {
          (o as HTMLButtonElement).disabled = true;
          if (oi === item.answer) o.classList.add('correct');
          else if (oi === chosen) o.classList.add('wrong');
        });
        answers.push({ item, correct });
        setTimeout(advance, correct ? 600 : 950);
      };
      root.querySelectorAll('.pl-opt').forEach((b) => b.addEventListener('click', () => grade(Number((b as HTMLElement).dataset.i))));
      root.querySelector('#gc-dunno')!.addEventListener('click', () => grade(-1));
    } else {
      root.innerHTML = frame(`
        <div class="concept-card grammar-card">
          <h1 class="gx-point">${esc(item.title)}</h1>
          ${exerciseMarkup(item.exercise, item.starId + ':' + daySeed())}
          <div class="ex-feedback" id="ex-feedback" hidden></div>
        </div>
        <div class="grammar-cta" id="gc-cta"><div class="ex-hint">${grammarHint(item.exercise)}</div></div>
        <button class="pl-dunno" id="gc-dunno">Überspringen — zu steil</button>`, 'Grammatik');
      const stage = root.querySelector('.concept-card') as HTMLElement;
      let settled = false;
      bindExercise(stage, item.exercise, (correct, extra) => {
        if (settled) return; settled = true;
        answers.push({ item, correct });
        const fb = stage.querySelector('#ex-feedback') as HTMLElement;
        fb.hidden = false;
        fb.innerHTML = `<div class="fb-head ${correct ? 'ok' : 'no'}">${icon(correct ? 'check' : 'close')} ${correct ? 'Richtig' : 'Nicht ganz'}</div>`
          + extra + (item.exercise.explain ? `<p class="fb-explain">${esc(item.exercise.explain)}</p>` : '');
        const cta = root.querySelector('#gc-cta') as HTMLElement;
        cta.innerHTML = `<button class="btn btn-primary" id="gc-next">Weiter →</button>`;
        cta.querySelector('#gc-next')!.addEventListener('click', advance);
        const dunno = root.querySelector('#gc-dunno') as HTMLElement | null;
        if (dunno) dunno.remove();
      });
      // In a diagnostic, "too steep" counts as a gap — honest, not punitive.
      root.querySelector('#gc-dunno')!.addEventListener('click', () => {
        if (settled) return; settled = true;
        answers.push({ item, correct: false });
        advance();
      });
    }
    root.querySelector('#gc-skip')!.addEventListener('click', () => finish());
  }

  renderItem();
}
