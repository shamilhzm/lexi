// Study session on the Deck surface. A word star is a flip card: the front
// reserves space for a meaning image and shows term / part of speech / IPA; tap
// flips to the back (translation + details). Swipe/drag right = "Knew it" →
// Good, left = "Learn again" → Again. Grammar stars are tap-to-answer exercises
// (correct → Good, wrong → Again). UI copy is German-first (DESIGN-SYSTEM §8);
// every chrome word is itself study material.
import './card.css';
import { dueQueue, forcedQueue, cardFor, enrichedFor, setEnriched, applyRating, snapshot, restore, stats, rememberedStreak, recordBlindspot } from './store.ts';
import { enrichTerm, type Enriched } from './enrich.ts';
import { dueLabel, type Card, type Grade } from './srs.ts';
import { icon } from './icons.ts';
import { hashStr, allStars, type Star, type Exercise } from './model.ts';
import { modeForReps, sampleDistractors, shuffleOptions, matchTerm, termWarmth, type WordMode } from './recall.ts';
import { EMOJI } from './emoji-map.ts';

const GOOD = 3 as Grade;
const AGAIN = 1 as Grade;
const SWIPE_THRESHOLD = 88;

let queue: Star[] = [];
let qi = 0;
let flipped = false;       // word card: showing the back
let answered = false;      // grammar: exercise answered
let curEx: Exercise | null = null;
let last: { id: string; card: Card | undefined } | null = null;
let onExit: () => void = () => {};
let rootEl: HTMLElement;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const chips = (arr?: string[]) => `<div class="cc-chips">${(arr || []).map((s) => `<span class="cc-chip">${esc(s)}</span>`).join('')}</div>`;
function termHead(front: string) { const m = front.match(/^(der|die|das)\s+(.+)$/i); return m ? { art: m[1], word: m[2] } : { art: '', word: front }; }
const STATE_LABEL = ['neu', 'lernen', 'Wiederholung', 'nochmal'];
// Meaning-image: a star's own emoji, else the term/headword in the emoji map.
function emojiFor(c: Star): string { return c.emoji || EMOJI[c.term] || EMOJI[termHead(c.term).word] || ''; }

export function startSession(root: HTMLElement, exit: () => void, ids?: string[], force = false) {
  rootEl = root; onExit = exit;
  queue = force && ids ? forcedQueue(ids) : dueQueue(20, ids);
  qi = 0; flipped = false; answered = false; last = null; skippedOnce.clear();
  if (!queue.length) {
    root.innerHTML = `<div class="session-empty">Nichts fällig — die Karte ist ruhig.<br>Tippe einen Ort an, um ihn zu üben, oder komm morgen wieder.</div>`;
    return;
  }
  renderCurrent();
}

// Die Kopfzeile — the one Karte chrome (DESIGN-SYSTEM §4): elevation chip,
// Feld/point label, position in the stack. Shared by session and gap-check.
export function karteKopf(level: string, label: string, pos: string): string {
  return `<div class="karte-kopf mono"><span class="kk-level" style="color:var(--level-${level})">${esc(level)}</span><span class="kk-label">${esc(label)}</span><span class="kk-pos">${esc(pos)}</span></div>`;
}

function speak(term: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(term.replace(/^(der|die|das)\s+/i, ''));
    u.lang = 'de-DE'; u.rate = 0.95;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { /* no TTS */ }
}

/* ---------- word flip card ---------- */

function cardMarkup(c: Star): string {
  const e: Enriched = enrichedFor(c.id) || {};
  const isEnriched = enrichedFor(c.id) !== undefined;
  const card = cardFor(c.id);
  const { art, word } = termHead(c.term);
  const pos = e.pos || c.pos || (art ? 'noun' : '');
  const sub = [pos, e.ipa ? `/${e.ipa}/` : ''].filter(Boolean).map(esc).join(' · ');
  const sec = (label: string, body: string) => (body ? `<div class="cc-section"><span class="label-caps">${label}</span>${body}</div>` : '');
  const remembered = rememberedStreak(c.id);
  const dots = Array.from({ length: 5 }, (_, i) => `<span class="stat-dot${i < remembered ? ' on' : ''}"></span>`).join('');
  const learnStats = `<div class="learn-stats"><div class="stat-dots">${dots}</div><span class="remembered">Gemerkt: ${remembered}</span></div>`;
  const statRow = `<div class="cc-stats"><span>Stand <b>${STATE_LABEL[card.state] || 'neu'}</b></span><span>Wdh. <b>${card.reps}</b></span><span>fällig <b>${dueLabel(card)}</b></span></div>`;
  return `<div class="concept-card swipe-card">
    <span class="swipe-flag yes">${icon('check')} Gewusst</span>
    <span class="swipe-flag no">${icon('close')} Nochmal</span>
    <div class="flip${flipped ? ' flipped' : ''}">
      <div class="face front">
        ${emojiFor(c) ? `<div class="cc-image cc-emoji">${emojiFor(c)}</div>` : `<div class="cc-image">${icon('image', 'cc-image-ic')}</div>`}
        <div class="cc-front-main">
          ${art ? `<div class="cc-article">${esc(art)}</div>` : ''}
          <h1 class="cc-head">${esc(word)}</h1>
          ${pos ? `<div class="cc-pos">${esc(pos)}</div>` : ''}
          ${e.ipa ? `<div class="cc-ipa">/${esc(e.ipa)}/</div>` : ''}
        </div>
        <div class="cc-flip-hint">Tippen: umdrehen · Wischen: bewerten</div>
      </div>
      <div class="face back">
        <div class="cc-back-head">
          <div class="cc-back-term">${art ? esc(art) + ' ' : ''}${esc(word)}</div>
          ${sub ? `<div class="cc-back-sub">${sub}</div>` : ''}
        </div>
        <div class="cc-translation">${esc(c.translation || '—')}</div>
        ${sec('Definition', e.definition ? `<p>${esc(e.definition)}</p>` : '')}
        ${sec('Beispiel', (e.example || c.example) ? `<p class="cc-example">${esc(e.example || c.example || '')}</p>` : '')}
        ${sec('Synonyme', e.synonyms && e.synonyms.length ? chips(e.synonyms) : '')}
        ${sec('Antonyme', e.antonyms && e.antonyms.length ? chips(e.antonyms) : '')}
        ${sec('Kollokationen', e.collocations && e.collocations.length ? chips(e.collocations) : '')}
        ${sec('Lernstatistik', learnStats)}
        ${sec('Wiederholung', statRow)}
        ${!isEnriched ? `<div class="cc-enriching"><span class="spin"></span>Aussprache &amp; mehr wird gesammelt …</div>` : ''}
      </div>
    </div>
  </div>`;
}

function renderWordCard(stage: HTMLElement, c: Star) {
  stage.innerHTML = cardMarkup(c);
  bindSwipe(stage, c);
}

function bindSwipe(stage: HTMLElement, c: Star) {
  const card = stage.querySelector('.concept-card') as HTMLElement;
  const flip = card.querySelector('.flip') as HTMLElement;
  const yes = card.querySelector('.swipe-flag.yes') as HTMLElement;
  const no = card.querySelector('.swipe-flag.no') as HTMLElement;
  let sx = 0, sy = 0, pid = -1, candidate = false, dragging = false, moved = false;

  const setHint = (dx: number) => {
    yes.style.opacity = dx > 0 ? String(Math.min(1, dx / SWIPE_THRESHOLD)) : '0';
    no.style.opacity = dx < 0 ? String(Math.min(1, -dx / SWIPE_THRESHOLD)) : '0';
    card.classList.toggle('swiping-yes', dx > SWIPE_THRESHOLD * 0.6);
    card.classList.toggle('swiping-no', dx < -SWIPE_THRESHOLD * 0.6);
  };
  const resetCard = () => { card.style.transition = 'transform .22s ease'; card.style.transform = ''; setHint(0); };

  card.addEventListener('pointerdown', (e) => {
    sx = e.clientX; sy = e.clientY; pid = e.pointerId; candidate = true; dragging = false; moved = false;
  });
  card.addEventListener('pointermove', (e) => {
    if (!candidate) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!dragging) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        dragging = true; try { card.setPointerCapture(pid); } catch { /* ok */ } card.style.transition = 'none';
      } else if (Math.abs(dy) > 10) { candidate = false; return; } else return;
    }
    moved = true;
    card.style.transform = `translateX(${dx}px) rotate(${(dx * 0.03).toFixed(2)}deg)`;
    setHint(dx);
  });
  const end = (e: PointerEvent) => {
    if (!candidate && !dragging) return;
    const dx = e.clientX - sx;
    candidate = false;
    if (dragging) {
      dragging = false;
      if (dx > SWIPE_THRESHOLD) { commitSwipe(card, 1); return; }
      if (dx < -SWIPE_THRESHOLD) { commitSwipe(card, -1); return; }
      resetCard();
    } else if (!moved) {
      flipped = !flipped; flip.classList.toggle('flipped', flipped);
    }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', () => { dragging = false; candidate = false; resetCard(); });
}

function commitSwipe(card: HTMLElement, dir: number) {
  const go = () => rate(dir > 0 ? GOOD : AGAIN);
  if (reduceMotion()) { go(); return; }
  card.style.transition = 'transform .24s ease, opacity .24s ease';
  card.style.transform = `translateX(${dir * 130}%) rotate(${dir * 13}deg)`;
  card.style.opacity = '0';
  setTimeout(go, 220);
}

/* ---------- vocab recall ladder (mc / reverse / type) ----------
   As a word's reps grow it climbs from recognition to production. Built on
   recall.ts; auto-graded and styled like the grammar path (paper card + CTA). */

interface Quiz { mode: WordMode; prompt: string; promptSub: string; options?: string[]; answer?: number; accept?: string[] }
let curQuiz: Quiz | null = null;

function wordPool(c: Star): Star[] {
  const pool = allStars().filter((s) => s.kind === 'word' && s.cefr === c.cefr && s.id !== c.id);
  return pool.length >= 3 ? pool : allStars().filter((s) => s.kind === 'word' && s.id !== c.id);
}
function buildQuiz(c: Star, mode: WordMode): Quiz {
  const seed = hashStr(c.id + ':' + cardFor(c.id).reps);
  const pool = wordPool(c);
  if (mode === 'mc') {
    const distractors = sampleDistractors(pool, 3, seed, (s) => s.translation === c.translation).map((s) => s.translation);
    const { options, answer } = shuffleOptions(c.translation, distractors, seed);
    return { mode, prompt: c.term, promptSub: 'Was bedeutet das?', options, answer };
  }
  if (mode === 'reverse') {
    const distractors = sampleDistractors(pool, 3, seed, (s) => s.term === c.term).map((s) => s.term);
    const { options, answer } = shuffleOptions(c.term, distractors, seed);
    return { mode, prompt: c.translation, promptSub: 'Welches deutsche Wort?', options, answer };
  }
  return { mode, prompt: c.translation, promptSub: 'Schreib das deutsche Wort', accept: [c.term] };
}

export function quizHint(mode: WordMode): string {
  return mode === 'type' ? 'Schreib das Wort (Artikel optional)' : 'Wähle die richtige Antwort';
}

function quizMarkup(c: Star, q: Quiz): string {
  const em = emojiFor(c);
  const head = `${em ? `<div class="cc-image cc-emoji">${em}</div>` : ''}
    <div class="qz-sub label-caps">${esc(q.promptSub)}</div>
    <h1 class="qz-prompt">${esc(q.prompt)}</h1>`;
  let body = '';
  if (q.mode === 'mc' || q.mode === 'reverse') {
    body = `<div class="ex-opts qz-opts">${(q.options || []).map((o, i) => `<button class="ex-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>`;
  } else {
    body = `<div class="ex-type"><input class="ex-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Deutsches Wort"><button class="btn btn-primary ex-check">Prüfen</button></div>`;
  }
  return `<div class="concept-card quiz-card">${head}${body}<div class="ex-feedback" id="ex-feedback" hidden></div></div>`;
}

function finishQuiz(stage: HTMLElement, c: Star, correct: boolean, extra = '') {
  if (answered) return;
  answered = true;
  const fb = stage.querySelector('#ex-feedback') as HTMLElement;
  fb.hidden = false;
  fb.innerHTML = `<div class="fb-head ${correct ? 'ok' : 'no'}">${icon(correct ? 'check' : 'close')} ${correct ? 'Richtig' : 'Nicht ganz'}</div>`
    + extra
    + (c.example ? `<p class="fb-explain">${esc(c.example)}</p>` : '');
  fb.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  const cta = rootEl.querySelector('#grammar-cta') as HTMLElement;
  if (cta) {
    cta.innerHTML = `<button class="btn btn-primary" id="g-continue">Weiter →</button>`;
    cta.querySelector('#g-continue')!.addEventListener('click', () => rate(correct ? GOOD : AGAIN));
  }
}

function bindQuiz(stage: HTMLElement, c: Star, q: Quiz) {
  let done = false;
  const settle = (correct: boolean, extra = '') => { if (done) return; done = true; finishQuiz(stage, c, correct, extra); };
  if (q.mode === 'mc' || q.mode === 'reverse') {
    stage.querySelectorAll('.ex-opt').forEach((b) => b.addEventListener('click', () => {
      if (done) return;
      const chosen = Number((b as HTMLElement).dataset.i);
      stage.querySelectorAll('.ex-opt').forEach((o, oi) => {
        (o as HTMLButtonElement).disabled = true;
        if (oi === q.answer) o.classList.add('correct');
        else if (oi === chosen) o.classList.add('wrong');
      });
      settle(chosen === q.answer);
    }));
  } else {
    const input = stage.querySelector('.ex-input') as HTMLInputElement;
    const check = () => {
      if (done) return;
      const ok = matchTerm(input.value, c.term);
      input.classList.add(ok ? 'correct' : 'wrong'); input.disabled = true;
      const warm = !ok && termWarmth(input.value, c.term) === 'warm';
      settle(ok, ok ? '' : `<p class="fb-answer">${warm ? 'Fast! ' : ''}Antwort: <b>${esc(c.term)}</b></p>`);
    };
    stage.querySelector('.ex-check')!.addEventListener('click', check);
    input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') check(); });
    setTimeout(() => input.focus(), 60);
  }
}

/* ---------- grammar exercise ---------- */

function pickExercise(c: Star): Exercise | null {
  const list = c.exercises;
  if (!list || !list.length) return null;
  return list[cardFor(c.id).reps % list.length];
}

const gap = (s: string) => esc(s).replace('___', '<span class="ex-blank">_____</span>');
const normType = (s: string) => s.trim().toLowerCase().replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/\s+/g, ' ').replace(/[.!?,;:]+$/g, '');
const matchType = (val: string, accept: string[]) => accept.some((a) => normType(a) === normType(val));
function shuffleTiles(arr: string[], seed: string): string[] {
  const a = arr.slice();
  let h = hashStr(seed) || 1;
  for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) & 0x7fffffff; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.length > 1 && a.join(' ') === arr.join(' ')) a.push(a.shift()!); // never start solved
  return a;
}
export function grammarHint(ex: Exercise): string {
  return ex.kind === 'type' ? 'Schreib die Antwort' : ex.kind === 'order' ? 'Setze die Wörter in die richtige Reihenfolge' : ex.kind === 'error' ? 'Tippe auf das falsche Wort' : 'Wähle die richtige Antwort';
}

// Exercise widget markup — shared by the study session, the Lektion view and
// the gap check. `seedId` keeps tile shuffles deterministic per star.
export function exerciseMarkup(ex: Exercise, seedId: string): string {
  let body = '';
  if (ex.kind === 'choose' || ex.kind === 'mc') {
    body = `<p class="ex-prompt">${ex.kind === 'choose' ? gap(ex.prompt) : esc(ex.prompt)}</p>
      <div class="ex-opts">${(ex.options || []).map((o, i) => `<button class="ex-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>`;
  } else if (ex.kind === 'type') {
    body = `<p class="ex-prompt">${gap(ex.prompt)}</p>
      <div class="ex-type"><input class="ex-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type the answer"><button class="btn btn-primary ex-check">Prüfen</button></div>`;
  } else if (ex.kind === 'order') {
    const tiles = shuffleTiles(ex.tiles || [], seedId);
    body = `<p class="ex-prompt">${esc(ex.prompt)}</p>
      <div class="ex-slots" id="ex-slots"></div>
      <div class="ex-tiles">${tiles.map((t) => `<button class="ex-tile" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <button class="btn btn-primary ex-check" disabled>Prüfen</button>`;
  } else if (ex.kind === 'error') {
    const toks = ex.prompt.split(' ');
    body = `<p class="ex-instr">Tippe auf das falsche Wort.</p>
      <div class="ex-tokens">${toks.map((t, i) => `<button class="ex-tok" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;
  }
  return `<div class="exercise">${body}</div>`;
}

function grammarMarkup(c: Star, ex: Exercise): string {
  const head = `<h1 class="gx-point">${esc(c.term)}</h1>
    ${c.summary ? `<p class="gx-summary">${esc(c.summary)}</p>` : ''}`;
  return `<div class="concept-card grammar-card">${head}${exerciseMarkup(ex, c.id)}<div class="ex-feedback" id="ex-feedback" hidden></div></div>`;
}

function finishGrammar(stage: HTMLElement, c: Star, ex: Exercise, correct: boolean, extra = '') {
  if (answered) return;
  answered = true;
  const fb = stage.querySelector('#ex-feedback') as HTMLElement;
  fb.hidden = false;
  fb.innerHTML = `<div class="fb-head ${correct ? 'ok' : 'no'}">${icon(correct ? 'check' : 'close')} ${correct ? 'Richtig' : 'Nicht ganz'}</div>`
    + extra
    + (ex.explain ? `<p class="fb-explain">${esc(ex.explain)}</p>` : '')
    + `<div class="fb-rule"><span class="label-caps">Regel</span><p>${esc(c.rule || '')}</p></div>`;
  fb.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  const cta = rootEl.querySelector('#grammar-cta') as HTMLElement;
  if (cta) {
    cta.innerHTML = `<button class="btn btn-primary" id="g-continue">Weiter →</button>`;
    cta.querySelector('#g-continue')!.addEventListener('click', () => rate(correct ? GOOD : AGAIN));
  }
}

// Bind an exercise widget rendered by exerciseMarkup(). Self-guarding: the
// first answer wins; `onAnswer` receives the verdict + extra feedback HTML.
export function bindExercise(stage: HTMLElement, ex: Exercise, onAnswer: (correct: boolean, extra: string) => void) {
  let done = false;
  const settle = (correct: boolean, extra = '') => { if (done) return; done = true; onAnswer(correct, extra); };
  if (ex.kind === 'choose' || ex.kind === 'mc') {
    stage.querySelectorAll('.ex-opt').forEach((b) => b.addEventListener('click', () => {
      if (done) return;
      const chosen = Number((b as HTMLElement).dataset.i);
      const correct = chosen === ex.answer;
      stage.querySelectorAll('.ex-opt').forEach((o, oi) => {
        (o as HTMLButtonElement).disabled = true;
        if (oi === ex.answer) o.classList.add('correct');
        else if (oi === chosen) o.classList.add('wrong');
      });
      settle(correct);
    }));
  } else if (ex.kind === 'type') {
    const input = stage.querySelector('.ex-input') as HTMLInputElement;
    const check = () => {
      if (done) return;
      const ok = matchType(input.value, ex.accept || []);
      input.classList.add(ok ? 'correct' : 'wrong'); input.disabled = true;
      settle(ok, ok ? '' : `<p class="fb-answer">Antwort: <b>${esc((ex.accept || [''])[0])}</b></p>`);
    };
    stage.querySelector('.ex-check')!.addEventListener('click', check);
    input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') check(); });
    setTimeout(() => input.focus(), 60);
  } else if (ex.kind === 'order') {
    const slots = stage.querySelector('#ex-slots') as HTMLElement;
    const checkBtn = stage.querySelector('.ex-check') as HTMLButtonElement;
    const chosen: HTMLElement[] = [];
    const refresh = () => { checkBtn.disabled = chosen.length !== (ex.tiles || []).length; };
    stage.querySelectorAll('.ex-tile').forEach((b) => b.addEventListener('click', () => {
      if (done || b.classList.contains('used')) return;
      const tile = b as HTMLElement;
      tile.classList.add('used');
      const chip = document.createElement('button');
      chip.className = 'ex-slot'; chip.textContent = tile.dataset.t || '';
      chip.addEventListener('click', () => {
        if (done) return;
        chip.remove(); tile.classList.remove('used');
        chosen.splice(chosen.indexOf(chip), 1); refresh();
      });
      slots.appendChild(chip); chosen.push(chip); refresh();
    }));
    checkBtn.addEventListener('click', () => {
      if (done) return;
      const ok = chosen.map((x) => x.textContent).join(' ') === (ex.tiles || []).join(' ');
      checkBtn.disabled = true;
      settle(ok, ok ? '' : `<p class="fb-answer">Antwort: <b>${esc((ex.tiles || []).join(' '))}</b></p>`);
    });
  } else if (ex.kind === 'error') {
    stage.querySelectorAll('.ex-tok').forEach((t) => t.addEventListener('click', () => {
      if (done) return;
      const i = Number((t as HTMLElement).dataset.i);
      const correct = i === ex.answer;
      stage.querySelectorAll('.ex-tok').forEach((tok, ti) => {
        if (ti === ex.answer) tok.classList.add('correct');
        else if (ti === i && !correct) tok.classList.add('wrong');
      });
      settle(correct, ex.fix ? `<p class="fb-answer">Korrektur: <b>${esc(ex.fix)}</b></p>` : '');
    }));
  }
}

function bindGrammar(stage: HTMLElement, c: Star, ex: Exercise) {
  bindExercise(stage, ex, (correct, extra) => finishGrammar(stage, c, ex, correct, extra));
}

/* ---------- shared session frame ---------- */

function renderCurrent() {
  const root = rootEl;
  if (qi >= queue.length) { renderDone(); return; }
  const c = queue[qi];
  flipped = false; answered = false;
  curEx = c.kind === 'grammar' ? pickExercise(c) : null;
  const isGrammar = !!curEx;
  // Word stars climb a recall ladder; mode 'flip' keeps the self-rated swipe card.
  const mode: WordMode = isGrammar ? 'flip' : modeForReps(cardFor(c.id).reps);
  curQuiz = !isGrammar && mode !== 'flip' ? buildQuiz(c, mode) : null;
  const isFlip = !isGrammar && !curQuiz;
  const ctaHint = isGrammar ? grammarHint(curEx!) : quizHint(mode);
  const tools = `<div class="s-tools">
       <button class="tool" id="s-undo" ${last ? '' : 'disabled'} title="Rückgängig">${icon('undo')}</button>
       ${isGrammar ? '' : `<button class="tool" id="s-audio" title="Audio">${icon('sound')}</button>`}
       <button class="tool tool-skip" id="s-skip" title="Zu steil — kommt später wieder">Überspringen</button>
     </div>`;
  const bottom = !isFlip
    ? `${tools}<div class="grammar-cta" id="grammar-cta"><div class="ex-hint">${ctaHint}</div></div>`
    : `${tools}
       <div class="swipe-row">
         <button class="swipe-btn no" id="sw-no">${icon('close')}<span>Nochmal</span></button>
         <button class="swipe-btn yes" id="sw-yes">${icon('check')}<span>Gewusst</span></button>
       </div>`;
  const card = isGrammar ? grammarMarkup(c, curEx!) : curQuiz ? quizMarkup(c, curQuiz) : cardMarkup(c);
  const kopfLabel = c.kind === 'grammar' ? 'Grammatik' : (c.feld || c.category || 'Wortschatz');
  root.innerHTML = `
    <div class="session">
      <div class="session-top">
        <button class="tool" id="s-close" title="Schließen">${icon('close')}</button>
        <div class="s-progress"><i style="width:${Math.round((qi / queue.length) * 100)}%"></i></div>
      </div>
      ${karteKopf(c.cefr, kopfLabel, `${qi + 1} / ${queue.length}`)}
      <div class="card-stage" id="card-stage">${card}</div>
      <div class="session-bottom">${bottom}</div>
    </div>`;
  const stage = root.querySelector('#card-stage') as HTMLElement;
  root.querySelector('#s-close')!.addEventListener('click', () => onExit());
  root.querySelector('#s-skip')!.addEventListener('click', () => skip());
  const undoBtn = root.querySelector('#s-undo'); if (undoBtn) undoBtn.addEventListener('click', () => undo());
  const audioBtn = root.querySelector('#s-audio'); if (audioBtn) audioBtn.addEventListener('click', () => speak(c.term));
  if (isGrammar) {
    bindGrammar(stage, c, curEx!);
  } else if (curQuiz) {
    bindQuiz(stage, c, curQuiz);
  } else {
    bindSwipe(stage, c);
    root.querySelector('#sw-no')!.addEventListener('click', () => commitSwipe(stage.querySelector('.concept-card') as HTMLElement, -1));
    root.querySelector('#sw-yes')!.addEventListener('click', () => commitSwipe(stage.querySelector('.concept-card') as HTMLElement, 1));
    if (enrichedFor(c.id) === undefined) {
      enrichTerm(c.term, !!c.translation).then((e) => {
        setEnriched(c.id, e);
        if (queue[qi] === c) renderWordCard(stage, c);
      });
    }
  }
}

// Map a missed star to a structural blind-spot tag (grammar by its point title,
// words to vocabulary) so the Profil dashboard can surface recurring patterns.
function blindspotTagFor(c: Star): string {
  if (c.kind === 'grammar') {
    const t = c.term.toLowerCase();
    if (/artikel|genus|kasus|deklination|akkusativ|dativ|genitiv|komparativ|adjektiv|n-deklination|possessiv|pronomen/.test(t)) return 'kasus-dekl';
    if (/perfekt|präteritum|tempus|futur|plusquamperf|lassen/.test(t)) return 'verb-tempus';
    if (/nebensatz|relativsatz|infinitiv|weil|dass|wenn|als|seit|bis|damit|sodass|konsekutiv|final|temporal|konditional/.test(t)) return 'nebensatz';
    if (/präposition|wechselpräp|richtungs|ortsangaben|zeitangaben/.test(t)) return 'praepositionen';
    if (/partizip/.test(t)) return 'partizip-attr';
    if (/konjunktiv ii|würde|irreal/.test(t)) return 'konj-ii';
    if (/passiv/.test(t)) return 'passiv';
    if (/konnektor|wortstellung|fragen|vergleich|zweiteilig/.test(t)) return 'konnektoren';
    return 'konnektoren';
  }
  return 'wortschatz';
}

function rate(r: Grade) {
  const c = queue[qi];
  last = { id: c.id, card: snapshot(c.id) };
  applyRating(c.id, r);
  if (r === AGAIN) recordBlindspot({ tag: blindspotTagFor(c), type: c.kind === 'grammar' ? 'transform' : 'cloze', ts: Date.now(), snippet: c.term });
  qi++; flipped = false; answered = false;
  renderCurrent();
}

// Überspringen — "zu steil" (too steep). Not a lapse: FSRS state is untouched.
// First skip requeues the card at the end of today's expedition; a second skip
// lets it go until it is next due. Logged so Schwachstellen can surface it.
const skippedOnce = new Set<string>();
function skip() {
  const c = queue[qi];
  recordBlindspot({ tag: 'zu-steil', type: 'cloze', ts: Date.now(), snippet: c.term });
  queue.splice(qi, 1);
  if (!skippedOnce.has(c.id)) { skippedOnce.add(c.id); queue.push(c); }
  last = null; flipped = false; answered = false;
  renderCurrent();
}
function undo() {
  if (!last) return;
  restore(last.id, last.card);
  qi = Math.max(0, qi - 1); last = null; flipped = false; answered = false;
  renderCurrent();
}
function renderDone() {
  rootEl.innerHTML = `<div class="session-done"><div>${icon('star', 'sd-star')}<div class="sd-h">Gut gemacht</div><div class="sd-sub">${queue.length} ${queue.length === 1 ? 'Karte' : 'Karten'} wiederholt · Serie: ${stats().streak} Tage</div><button class="btn btn-primary" id="sd-back">Zurück zur Karte</button></div></div>`;
  rootEl.querySelector('#sd-back')!.addEventListener('click', () => onExit());
}
