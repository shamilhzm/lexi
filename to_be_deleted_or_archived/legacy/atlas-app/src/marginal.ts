// Das Marginal — the collapsible right context panel (DESIGN-SYSTEM §5).
// Selecting any term/star anywhere opens its dossier here: headword, article +
// plural, meaning-image, Feld, Lektion, FSRS state, example — like a margin
// note in the atlas. Pure renderer: shell state (open/closed) lives in main.ts.
import { starById, type Star } from './model.ts';
import { reviewStateOf, cardFor, rememberedStreak } from './store.ts';
import { icon } from './icons.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const STATE_LABEL: Record<string, string> = {
  new: 'Unerschlossen',
  learning: 'Auf dem Weg',
  young: 'Kartiert',
  mature: 'Vermessen',
  due: 'Fällig'
};

function dossier(s: Star): string {
  const card = cardFor(s.id);
  const state = reviewStateOf(s.id);
  const streak = rememberedStreak(s.id);
  const dueDate = card?.due ? new Date(card.due) : null;
  const dueTxt = dueDate ? dueDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : '—';
  const headword = s.plural ? `${s.term}, ${s.plural}` : s.term;
  const rows: [string, string][] = [];
  if (s.pos) rows.push(['Wortart', s.pos]);
  if (s.feld) rows.push(['Feld', s.feld]);
  if (s.lektion) rows.push(['Lektion', String(s.lektion)]);
  rows.push(['Stand', STATE_LABEL[state] || state]);
  if (streak > 0) rows.push(['Serie', `${streak}×`]);
  rows.push(['Fällig', dueTxt]);
  return `
    <div class="mg-level mono" style="color:var(--level-${s.cefr})">${s.cefr}${s.kind === 'grammar' ? ' · Grammatik' : ''}</div>
    ${s.emoji ? `<div class="mg-image">${esc(s.emoji)}</div>` : ''}
    <h2 class="mg-headword">${esc(headword)}</h2>
    <div class="mg-translation">${esc(s.translation)}</div>
    ${s.antonym ? `<div class="mg-antonym">${esc(s.term)} ↔ ${esc(s.antonym)}</div>` : ''}
    ${s.summary ? `<p class="mg-summary">${esc(s.summary)}</p>` : ''}
    ${s.rule ? `<p class="mg-rule">${esc(s.rule)}</p>` : ''}
    ${s.example ? `<blockquote class="mg-example">${esc(s.example)}</blockquote>` : ''}
    <dl class="mg-meta">${rows.map(([k, v]) => `<div class="mg-row"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <button class="btn btn-primary mg-study" data-study="${esc(s.id)}">Üben →</button>`;
}

// Renders the Marginal's inner content. Returns false when the id is unknown.
export function renderMarginal(host: HTMLElement, starId: string | null, onStudy: (id: string) => void, onClose: () => void): boolean {
  const s = starId ? starById(starId) : undefined;
  host.innerHTML = `
    <div class="mg-head">
      <span class="mg-title mono">Marginal</span>
      <button class="mg-close" title="Schließen (])" aria-label="Marginal schließen">${icon('close')}</button>
    </div>
    <div class="mg-body">${s ? dossier(s) : `<div class="mg-empty">Wähle einen Ort auf der Karte — sein Steckbrief erscheint hier am Rand.</div>`}</div>`;
  host.querySelector('.mg-close')!.addEventListener('click', onClose);
  const study = host.querySelector('.mg-study') as HTMLElement | null;
  if (study) study.addEventListener('click', () => onStudy(study.dataset.study!));
  return !!s || !starId;
}
