// Atlas app shell — a desktop web app with a vertical left sidebar over a single
// warm-paper surface. The Atlas maps every card as an ink dot; tapping one
// studies it, tapping a Lektion sector opens its page.
import './theme.css';
import './profile.css';
import { icon } from './icons.ts';
import { renderMap } from './atlas.ts';
import { renderPlacement } from './placement.ts';
import { renderLessons, renderLektion } from './lektion.ts';
import { renderGapCheck } from './gapcheckview.ts';
import { renderExplore } from './explore.ts';
import { galaxies, GALAXY_META, LEVELS, type CEFR } from './model.ts';
import { startSession } from './session.ts';
import { dueCount, stats, progress, masteredByLevel, sealsEarned, sealCount, lessonState, blindspotEvents } from './store.ts';
import { blindspotTally, blindspotTopFocus, BLINDSPOT_TAGS } from './blindspots.ts';
import { lessonsFor } from './curriculum.ts';
import { renderMarginal } from './marginal.ts';
import { renderTagesblatt } from './tagesblattview.ts';
import { railCollapsed, setRailCollapsed, marginalOpen, setMarginalOpen } from './prefs.ts';

const escH = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Recurring miss patterns over the last 30 days — surfaced from session lapses.
function renderBlindspots(): string {
  const tally = blindspotTally(blindspotEvents());
  const top = blindspotTopFocus(tally);
  const total = tally.reduce((n, t) => n + t.recentCount, 0);
  if (!total) {
    return `<h2 class="h2 bs-h">Schwachstellen</h2><div class="bs-empty">Übungssitzungen zeigen hier deine wiederkehrenden Muster.</div>`;
  }
  const maxCount = top[0]?.recentCount || 1;
  const items = top.map((t) => {
    const pct = Math.round((t.recentCount / maxCount) * 100);
    const hint = BLINDSPOT_TAGS.find((b) => b.tag === t.tag)?.hint ?? '';
    return `<div class="bs-item">
      <div class="bs-row"><span class="bs-label">${escH(t.label)}</span><span class="bs-count mono">${t.recentCount}×</span></div>
      ${hint ? `<div class="bs-hint">${escH(hint)}</div>` : ''}
      <div class="bs-bar"><i style="width:${pct}%"></i></div>
    </div>`;
  }).join('');
  return `<div class="bs-head"><h2 class="h2 bs-h">Schwachstellen</h2><span class="bs-window mono">30 Tage · ${total} Fehler</span></div>${items}`;
}

type ScreenId = 'galaxy' | 'review' | 'catalog' | 'explore' | 'tagesblatt' | 'profile';
const TABS: { id: ScreenId; label: string; icon: string }[] = [
  { id: 'galaxy', label: 'Atlas', icon: 'map' },
  { id: 'explore', label: 'Lektionen', icon: 'book' },
  { id: 'review', label: 'Üben', icon: 'practice' },
  { id: 'tagesblatt', label: 'Tagesblatt', icon: 'dispatch' },
  { id: 'catalog', label: 'Katalog', icon: 'explore' },
  { id: 'profile', label: 'Profil', icon: 'profile' }
];

let screen: ScreenId = 'galaxy';
let dossierId: string | null = null;   // star shown in the Marginal
const app = document.createElement('div');
app.className = 'app';

// Left rail: wordmark + vertical nav. Collapsible (224px ↔ icon rail).
function tabbar(): string {
  const due = dueCount();
  return `<nav class="sidebar">
    <div class="brand"><span class="brand-mark">${icon('map')}</span><span class="brand-name">Atlas</span></div>
    <div class="nav-items">${TABS.map((t) => `<button class="tab${t.id === screen ? ' active' : ''}" data-tab="${t.id}" title="${t.label}">${icon(t.icon)}<span>${t.label}</span>${t.id === 'review' && due ? `<span class="tab-badge mono">${due}</span>` : ''}</button>`).join('')}</div>
    <button class="rail-toggle" title="Leiste einklappen ([)" aria-label="Leiste umschalten">${icon(railCollapsed() ? 'panelOpen' : 'panelClose')}</button>
  </nav>`;
}

function renderReview(el: HTMLElement) {
  const due = dueCount();
  const st = stats();
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
  const total = galaxies().reduce((n, g) => n + g.count, 0);
  el.innerHTML = `<div class="screen-pad">
    <h1 class="display-l">${greet}</h1>
    <p class="muted" style="margin-top:8px;font-size:15px;">${total} Karten von A1 bis C2 · Wortschatz + Grammatik.</p>
    <div class="practice-hero">
      <div class="ph-due mono">${due}</div>
      <div class="ph-label">Karten heute fällig</div>
      <button class="btn btn-primary" id="start-session" ${due ? '' : 'disabled'}>${due ? 'Üben starten →' : 'Alles erledigt'}</button>
    </div>
    <div class="practice-stats">
      <div class="pstat"><div class="v">${st.streak}</div><div class="k">Serie</div></div>
      <div class="pstat"><div class="v">${st.reviewedToday}</div><div class="k">Heute</div></div>
      <div class="pstat"><div class="v">${st.totalReviews}</div><div class="k">Gesamt</div></div>
    </div>
  </div>`;
  const start = el.querySelector('#start-session') as HTMLButtonElement | null;
  if (start) start.addEventListener('click', () => startSession(el, () => renderReview(el)));
}

function renderProfile(el: HTMLElement) {
  const p = progress();
  const mbl = masteredByLevel();
  const seals = sealsEarned();
  const seardCount = sealCount();
  const totalMastered = LEVELS.reduce((n, l) => n + mbl[l].mastered, 0);
  const st = stats();
  const startLvl = p.placementLevel || 'A1';
  // Stempelbogen — one slot per Lektion, grouped by level; filled = seal earned.
  const sheet = (['A1', 'A2', 'B1'] as CEFR[]).map((cefr) => {
    const slots = lessonsFor(cefr).map((l) => {
      const earned = seals[l.n];
      const state = lessonState(l.n);
      return `<div class="stamp st-${state}${earned ? ' earned' : ''}" style="--lvl:var(--level-${cefr})" title="Lektion ${l.n}: ${l.title}">${earned ? icon('seal') : `<span class="stamp-n mono">${l.n}</span>`}</div>`;
    }).join('');
    return `<div class="sb-band"><span class="sb-lvl mono" style="color:var(--level-${cefr})">${cefr}</span><div class="sb-slots">${slots}</div></div>`;
  }).join('');
  const bars = LEVELS.map((l) => {
    const m = mbl[l]; const pct = m.total ? Math.round((m.mastered / m.total) * 100) : 0;
    return `<div class="lvl-row"><span class="lvl-tag" style="color:${GALAXY_META[l].hue}">${l}</span><div class="lvl-bar"><i style="width:${pct}%;background:${GALAXY_META[l].hue}"></i></div><span class="lvl-n">${m.mastered}/${m.total}</span></div>`;
  }).join('');
  el.innerHTML = `<div class="screen-pad profile">
    <h1 class="display-l">Profil</h1>
    <div class="placement-cta">
      <div>${p.placementDone
        ? `<div class="pc-title">Einstufung erledigt</div><div class="pc-sub">Start bei ${startLvl} · ${GALAXY_META[startLvl].title}</div>`
        : `<div class="pc-title">Stufe finden</div><div class="pc-sub">Eine kurze Einstufung markiert, was du schon kannst.</div>`}</div>
      <button class="btn ${p.placementDone ? 'btn-secondary' : 'btn-primary'}" id="pl-open">${p.placementDone ? 'Wiederholen' : 'Start →'}</button>
    </div>
    <div class="stempelbogen">
      <div class="sb-head"><span class="sb-title">Stempelbogen</span><span class="sb-count mono">${seardCount}/30 Siegel</span></div>
      ${sheet}
      <div class="sb-sub">Ein Siegel pro gemeisterter Lektion. Gap-Checks markieren Lücken, Üben füllt sie.</div>
    </div>
    ${renderBlindspots()}
    <h2 class="h2" style="margin-top:24px">Fortschritt nach Niveau</h2>
    <div class="lvl-bars">${bars}</div>
    <div class="practice-stats" style="margin-top:20px">
      <div class="pstat"><div class="v">${st.streak}</div><div class="k">Serie</div></div>
      <div class="pstat"><div class="v">${totalMastered}</div><div class="k">Gemeistert</div></div>
      <div class="pstat"><div class="v">${st.totalReviews}</div><div class="k">Wdh.</div></div>
    </div>
  </div>`;
  el.querySelector('#pl-open')!.addEventListener('click', () => renderPlacement(el, () => render()));
}

// Selecting a star anywhere opens its dossier in the Marginal (DESIGN-SYSTEM §5).
// Studying happens from there — „Üben" runs a forced single-star session.
function openStar(id: string) {
  dossierId = id;
  setMarginalOpen(true);
  syncShell();
}

function studyStar(id: string) {
  const el = app.querySelector('#screen') as HTMLElement;
  // study just this star (bypasses the daily new-card cap), then return
  startSession(el, () => render(), [id], true);
}

// Re-render only the shell chrome (rail/marginal state), not the screen — the
// Atlas keeps its pan/zoom; only panels slide.
function syncShell() {
  app.classList.toggle('rail-min', railCollapsed());
  app.classList.toggle('mg-open', marginalOpen());
  const rail = app.querySelector('.sidebar');
  if (rail) rail.outerHTML = tabbar();
  bindRail();
  const mg = app.querySelector('.marginal') as HTMLElement | null;
  if (mg) renderMarginal(mg, dossierId, studyStar, () => { setMarginalOpen(false); syncShell(); });
}

function bindRail() {
  app.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { screen = (b as HTMLElement).dataset.tab as ScreenId; render(); }));
  app.querySelector('.rail-toggle')?.addEventListener('click', () => { setRailCollapsed(!railCollapsed()); syncShell(); });
}

// One Lektion's page. Study actions return here so the page reflects fresh state.
function openLesson(n: number) {
  const el = app.querySelector('#screen') as HTMLElement;
  renderLektion(el, n, {
    onBack: () => render(),
    onStudy: (ids) => startSession(el, () => openLesson(n), ids),
    onStar: (id) => openStar(id),
    onGapCheck: () => renderGapCheck(el, n,
      () => openLesson(n),
      (missedIds) => startSession(el, () => openLesson(n), missedIds, true))
  });
}

function render() {
  app.setAttribute('data-surface', 'deck');
  app.classList.toggle('rail-min', railCollapsed());
  app.classList.toggle('mg-open', marginalOpen());
  app.innerHTML = `${tabbar()}<div class="screen" id="screen"></div><aside class="marginal"></aside>`;
  const el = app.querySelector('#screen') as HTMLElement;
  if (screen === 'galaxy') {
    renderMap(el, openStar, () => startSession(el, () => render()), openLesson);
  } else if (screen === 'review') {
    renderReview(el);
  } else if (screen === 'catalog') {
    renderExplore(el);
  } else if (screen === 'explore') {
    renderLessons(el, openLesson);
  } else if (screen === 'tagesblatt') {
    renderTagesblatt(el, openStar);
  } else if (screen === 'profile') {
    renderProfile(el);
  }
  bindRail();
  renderMarginal(app.querySelector('.marginal') as HTMLElement, dossierId, studyStar, () => { setMarginalOpen(false); syncShell(); });
}

// Keyboard: `[` left rail, `]` Marginal, `/` Atlas search.
document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.key === '[') { setRailCollapsed(!railCollapsed()); syncShell(); }
  else if (e.key === ']') { setMarginalOpen(!marginalOpen()); syncShell(); }
  else if (e.key === '/') {
    if (screen !== 'galaxy') { screen = 'galaxy'; render(); }
    const inp = app.querySelector('#gx-search') as HTMLInputElement | null;
    if (inp) { e.preventDefault(); inp.focus(); }
  }
});

document.getElementById('app')!.appendChild(app);
render();
