// Tagesblatt screen — paste the day's transcript, survey the new territory,
// then run leveled Karte exercises. Reuses the one Karte chrome
// (karteKopf + exerciseMarkup/bindExercise) per DESIGN-SYSTEM §4.
import './card.css';
import { analyze, buildExercises, type TagesblattAnalysis, type TagesblattExercise } from './tagesblatt.ts';
import { allStars, LEVELS, type CEFR } from './model.ts';
import { reviewStateOf, recordBlindspot } from './store.ts';
import { exerciseMarkup, bindExercise, grammarHint, karteKopf } from './session.ts';
import { icon } from './icons.ts';

const KEY = 'tagesblatt_v1';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function loadText(): string {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}
function saveText(t: string) { try { localStorage.setItem(KEY, t); } catch { /* quota */ } }

export function renderTagesblatt(root: HTMLElement, onOpenStar: (id: string) => void) {
  const saved = loadText();
  root.innerHTML = `<div class="screen-pad tagesblatt">
    <h1 class="display-l">Tagesblatt</h1>
    <p class="muted tb-sub">Die Depesche des Tages: Transkript der <i>tagesschau in Einfacher Sprache</i> einfügen — das Atlas vermisst das neue Gebiet und baut Karten für jede Stufe (A1–C2).</p>
    <textarea class="tb-input" id="tb-input" rows="7" placeholder="Transkript hier einfügen … (YouTube → Beschreibung → Transkript anzeigen → kopieren)">${esc(saved)}</textarea>
    <div class="tb-actions">
      <button class="btn btn-primary" id="tb-analyze">Vermessen →</button>
      ${saved ? `<button class="btn btn-secondary" id="tb-clear">Leeren</button>` : ''}
    </div>
    <div id="tb-result"></div>
  </div>`;
  const input = root.querySelector('#tb-input') as HTMLTextAreaElement;
  root.querySelector('#tb-analyze')!.addEventListener('click', () => {
    const t = input.value.trim();
    if (t.split(/\s+/).length < 10) return;
    saveText(t);
    showAnalysis(root, t, onOpenStar);
  });
  root.querySelector('#tb-clear')?.addEventListener('click', () => { saveText(''); renderTagesblatt(root, onOpenStar); });
  if (saved) showAnalysis(root, saved, onOpenStar);

  // Phase 5b hook: if a scheduled task has delivered today's dispatch
  // (tagesblatt/heute.txt next to the app), offer to load it.
  fetch('tagesblatt/heute.txt').then((r) => (r.ok ? r.text() : '')).then((t) => {
    if (!t || t.trim().split(/\s+/).length < 10 || t.trim() === saved.trim()) return;
    const actions = root.querySelector('.tb-actions') as HTMLElement | null;
    if (!actions) return;
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.textContent = 'Depesche von heute laden';
    btn.addEventListener('click', () => { input.value = t.trim(); saveText(t.trim()); showAnalysis(root, t.trim(), onOpenStar); });
    actions.appendChild(btn);
  }).catch(() => { /* no dispatch today */ });
}

function showAnalysis(root: HTMLElement, text: string, onOpenStar: (id: string) => void) {
  const stars = allStars();
  const a = analyze(text, stars, (id) => reviewStateOf(id) !== 'new');
  const exercises = buildExercises(a, stars);
  const unknown = a.matched.filter((m) => !m.known);
  const host = root.querySelector('#tb-result') as HTMLElement;

  const chips = unknown.slice(0, 24).map((m) =>
    `<button class="tb-chip" data-id="${esc(m.star.id)}" style="border-color:var(--level-${m.star.cefr})">${esc(m.star.term)}<span class="mono">${m.star.cefr}</span></button>`).join('');

  const tabs = LEVELS.map((l) => {
    const n = (exercises.get(l) || []).length;
    return `<button class="tb-tab" data-lvl="${l}" ${n ? '' : 'disabled'} style="--lvl:var(--level-${l})">${l}<span class="mono">${n}</span></button>`;
  }).join('');

  host.innerHTML = `
    <div class="tb-stats mono">${a.wordCount} Wörter · ${a.sentences.length} Sätze · ${a.matched.length} im Atlas verzeichnet · ${unknown.length} neu für dich · ${a.uncharted.length} unkartiert</div>
    ${chips ? `<h2 class="h2">Neue Orte im Text</h2><div class="tb-chips">${chips}</div>` : ''}
    <h2 class="h2">Übungen nach Stufe</h2>
    <div class="tb-tabs">${tabs}</div>
    <div id="tb-stage"></div>`;
  host.querySelectorAll('.tb-chip').forEach((c) => c.addEventListener('click', () => onOpenStar((c as HTMLElement).dataset.id!)));
  host.querySelectorAll('.tb-tab').forEach((t) => t.addEventListener('click', () => {
    host.querySelectorAll('.tb-tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    runLevel(host.querySelector('#tb-stage') as HTMLElement, (t as HTMLElement).dataset.lvl as CEFR, exercises.get((t as HTMLElement).dataset.lvl as CEFR) || []);
  }));
}

// A small expedition through one level's exercises — same Karte chrome,
// same Überspringen semantics (zu-steil, never a failure; no FSRS writes).
function runLevel(stage: HTMLElement, lvl: CEFR, list: TagesblattExercise[]) {
  let i = 0; let correct = 0;
  const queue = list.slice();
  const skipped = new Set<number>();

  function renderDone() {
    stage.innerHTML = `<div class="tb-done">
      ${icon('seal', 'tb-done-ic')}
      <div class="tb-done-h">Etappe geschafft</div>
      <div class="muted">${correct}/${queue.length} richtig auf ${lvl}.</div>
    </div>`;
  }

  function renderOne() {
    if (i >= queue.length) { renderDone(); return; }
    const item = queue[i];
    stage.innerHTML = `
      ${karteKopf(lvl, 'Tagesblatt', `${i + 1} / ${queue.length}`)}
      <div class="concept-card grammar-card">
        ${exerciseMarkup(item.ex, 'tb:' + lvl + ':' + i)}
        <div class="ex-feedback" id="ex-feedback" hidden></div>
      </div>
      <div class="grammar-cta" id="tb-cta"><div class="ex-hint">${grammarHint(item.ex)}</div></div>
      <button class="tool tool-skip" id="tb-skip" title="Zu steil — überspringen">Überspringen</button>`;
    let settled = false;
    bindExercise(stage.querySelector('.concept-card') as HTMLElement, item.ex, (ok, extra) => {
      if (settled) return; settled = true;
      if (ok) correct++;
      const fb = stage.querySelector('#ex-feedback') as HTMLElement;
      fb.hidden = false;
      fb.innerHTML = `<div class="fb-head ${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'close')} ${ok ? 'Richtig' : 'Nicht ganz'}</div>` + extra
        + (item.ex.explain ? `<p class="fb-explain">${esc(item.ex.explain)}</p>` : '');
      const cta = stage.querySelector('#tb-cta') as HTMLElement;
      cta.innerHTML = `<button class="btn btn-primary" id="tb-next">Weiter →</button>`;
      cta.querySelector('#tb-next')!.addEventListener('click', () => { i++; renderOne(); });
      (stage.querySelector('#tb-skip') as HTMLElement | null)?.remove();
    });
    stage.querySelector('#tb-skip')!.addEventListener('click', () => {
      if (settled) return; settled = true;
      recordBlindspot({ tag: 'zu-steil', type: 'cloze', ts: Date.now(), snippet: item.ex.prompt.slice(0, 60) });
      const item2 = queue[i];
      queue.splice(i, 1);
      if (!skipped.has(list.indexOf(item2))) { skipped.add(list.indexOf(item2)); queue.push(item2); }
      renderOne();
    });
  }
  renderOne();
}
