// Lektionen — the curriculum on paper. Two views:
//  renderLessons  — the index: all 30 Lektionen grouped A1/A2/B1 with state.
//  renderLektion  — one lesson's page, modeled on a coursebook closing spread:
//                   header → can-dos → "Auf einen Blick" (Wortschatz in
//                   Feldern, Redemittel, Grammatik with tables) → actions.
import './lektion.css';
import { lektionByN, lessonsFor, type Lektion } from './curriculum.ts';
import { starsForLesson, lessonVocabByFeld, type CEFR, type Star } from './model.ts';
import { dueCount, lessonState, lessonProgress, type LessonState } from './store.ts';
import { icon } from './icons.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const STATE_LABEL: Record<LessonState, string> = { unchecked: 'ungeprüft', gap: 'Lücke', secure: 'sicher', mastered: 'gemeistert' };

function lessonIds(l: Lektion): string[] { return starsForLesson(l.n, l.grammarStarIds).map((s) => s.id); }

/* ---------- index ---------- */

export function renderLessons(root: HTMLElement, onOpen: (n: number) => void) {
  const row = (l: Lektion) => {
    const state = lessonState(l.n);
    const due = dueCount(lessonIds(l));
    return `<button class="lx-row" data-n="${l.n}">
      <span class="lx-state st-${state}" title="${STATE_LABEL[state]}"></span>
      <span class="lx-n mono">${l.n}</span>
      <span class="lx-body"><span class="lx-title">${esc(l.title)}</span>
      <span class="lx-meta">${esc(l.grammatik[0] || l.felder[0] || '')}${l.grammatik.length > 1 ? ` · +${l.grammatik.length - 1}` : ''}</span></span>
      <span class="lx-due mono">${due ? due + ' fällig' : ''}</span>
    </button>`;
  };
  const groups = (['A1', 'A2', 'B1'] as CEFR[]).map((cefr) => {
    const lessons = lessonsFor(cefr);
    if (!lessons.length) return '';
    return `<section class="lx-group">
      <h2 class="lx-group-h" style="--lvl:var(--level-${cefr})"><span class="lx-lvl mono">${cefr}</span> ${lessons.length} Lektionen</h2>
      ${lessons.map(row).join('')}
    </section>`;
  }).join('');
  root.innerHTML = `<div class="screen-pad lessons">
    <h1 class="display-l">Lektionen</h1>
    <p class="muted lx-sub">Der Kursbuch-Pfad A1 → B1, plus deine hochgeladenen Seiten. Gap-Checks zeigen, wo noch Lücken sind.</p>
    ${groups}
  </div>`;
  root.querySelectorAll('.lx-row').forEach((r) => r.addEventListener('click', () => onOpen(Number((r as HTMLElement).dataset.n))));
}

/* ---------- detail ---------- */

export interface LektionCallbacks {
  onBack: () => void;
  onStudy: (ids: string[]) => void;            // lesson-scoped session (due-aware)
  onStar: (id: string) => void;                // forced single-star study
  onGapCheck: (n: number) => void;
}

function vocabRow(s: Star): string {
  const term = s.plural ? `${s.term}, ${s.plural}` : s.term;
  return `<button class="vk-row" data-id="${s.id}">
    <span class="vk-term">${esc(term)}</span>
    ${s.antonym ? `<span class="vk-ant">↔ ${esc(s.antonym)}</span>` : ''}
    <span class="vk-tr">${esc(s.translation)}</span>
  </button>`;
}

export function renderLektion(root: HTMLElement, n: number, cb: LektionCallbacks) {
  const l = lektionByN(n);
  if (!l) { cb.onBack(); return; }
  const state = lessonState(n);
  const prog = lessonProgress(n);
  const ids = lessonIds(l);
  const due = dueCount(ids);
  const vocab = lessonVocabByFeld(n);
  const grammarStars = starsForLesson(n, l.grammarStarIds).filter((s) => s.kind === 'grammar');

  // Feld → Wortart tiers: inside each Feld, subheads per Wortart (the book's
  // taxonomy). Subheads only when a Feld actually spans several Wortarten.
  const PLURAL_WORTART: Record<string, string> = { Nomen: 'Nomen', Verb: 'Verben', Adjektiv: 'Adjektive', Adverb: 'Adverbien', 'Präposition': 'Präpositionen', Partikel: 'Partikeln', Wendung: 'Wendungen' };
  const felderHtml = [...vocab.entries()].map(([feld, stars]) => {
    const arten = new Set(stars.map((s) => s.pos || 'Nomen'));
    let body = '';
    if (arten.size < 2) {
      body = stars.map(vocabRow).join('');
    } else {
      let cur = '';
      for (const s of stars) {
        const art = s.pos || 'Nomen';
        if (art !== cur) { cur = art; body += `<div class="vk-wortart mono">${esc(PLURAL_WORTART[art] || art)}</div>`; }
        body += vocabRow(s);
      }
    }
    return `
    <div class="vk-feld">
      <h3 class="label-caps vk-feld-h">${esc(feld)}</h3>
      ${body}
    </div>`;
  }).join('');

  const redemittelHtml = l.redemittel.length ? `
    <h2 class="lk-sec-h">Redemittel</h2>
    ${l.redemittel.map((r) => `
      <div class="rm-block">
        <div class="label-caps rm-sit">${esc(r.situation)}</div>
        <div class="rm-line"><span class="rm-who mono">A</span><span>${esc(r.a)}</span></div>
        ${r.b ? `<div class="rm-line"><span class="rm-who mono">B</span><span>${esc(r.b)}</span></div>` : ''}
      </div>`).join('')}` : '';

  const tablesHtml = (l.tables || []).map((t) => `
    <div class="gr-table-wrap">
      <div class="label-caps">${esc(t.title)}</div>
      <table class="gr-table">
        <thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${t.rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`).join('');

  const grammarHtml = grammarStars.map((s) => `
    <div class="gr-point">
      <div class="gr-point-head">
        <div><div class="gr-point-title">${esc(s.term)}</div><div class="gr-point-sum">${esc(s.summary || '')}</div></div>
        <button class="btn btn-secondary gr-uben" data-id="${s.id}">Üben</button>
      </div>
    </div>`).join('');

  root.innerHTML = `<div class="lektion">
    <div class="lk-top">
      <button class="tool" id="lk-back">${icon('back')}</button>
      <span class="label-caps">Lektion ${l.n} · ${l.cefr}</span>
      <span class="lk-state st-${state}">${state === 'mastered' ? icon('seal') : ''}${STATE_LABEL[state]}</span>
    </div>
    <div class="lk-scroll">
      <h1 class="h1 lk-title" style="--lvl:var(--level-${l.cefr})">${esc(l.title)}</h1>
      <div class="lk-abc">${l.subsections.map((s, i) => `<div class="lk-abc-row"><span class="mono lk-abc-l">${'ABC'[i]}</span><span>${esc(s)}</span></div>`).join('')}</div>
      <div class="lk-chips">${l.handlungsfelder.map((h) => `<span class="lk-chip">${esc(h)}</span>`).join('')}</div>

      <h2 class="lk-sec-h">Das kann ich</h2>
      <ul class="lk-cando">${l.sprachhandlungen.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>

      <div class="lk-blick">
        <h2 class="lk-sec-h lk-blick-h">Auf einen Blick</h2>
        ${felderHtml ? `<h2 class="lk-sec-h">Wortschatz in Feldern</h2>${felderHtml}` : ''}
        ${redemittelHtml}
        ${grammarHtml ? `<h2 class="lk-sec-h">Grammatik</h2><div class="lk-grammatik-list">${l.grammatik.map((g) => `<span class="lk-chip lk-chip-gr">${esc(g)}</span>`).join('')}</div>${grammarHtml}` : ''}
        ${tablesHtml}
      </div>
      ${prog ? `<p class="muted lk-checked">Gap-Check am ${prog.checked}: ${prog.score.correct}/${prog.score.total} richtig → ${prog.verdict === 'secure' ? 'sicher' : 'Lücke'}</p>` : ''}
    </div>
    <div class="lk-actions">
      <button class="btn btn-secondary" id="lk-gap">Gap-Check</button>
      <button class="btn btn-primary" id="lk-study" ${due ? '' : 'disabled'}>${due ? `Lektion üben · ${due} fällig` : 'Nichts fällig'}</button>
    </div>
  </div>`;

  root.querySelector('#lk-back')!.addEventListener('click', () => cb.onBack());
  root.querySelector('#lk-gap')!.addEventListener('click', () => cb.onGapCheck(n));
  const study = root.querySelector('#lk-study') as HTMLButtonElement;
  if (!study.disabled) study.addEventListener('click', () => cb.onStudy(ids));
  root.querySelectorAll('.vk-row').forEach((r) => r.addEventListener('click', () => cb.onStar((r as HTMLElement).dataset.id!)));
  root.querySelectorAll('.gr-uben').forEach((b) => b.addEventListener('click', () => cb.onStar((b as HTMLElement).dataset.id!)));
}
