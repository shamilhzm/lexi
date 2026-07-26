// Katalog — its own tab. Browse the deck catalog (vocabulary extracted from
// study sources), open a deck, and add it to the Atlas. Added decks' cards
// become free `xp:` stars: they appear on the map and enter the review queue
// via the daily-new budget. Paper-skinned.
import './explore.css';
import { icon } from './icons.ts';
import { EXPLORE_SECTIONS, allExploreDecks, exploreDeckById, starIdsOf, type ExploreDeck } from './explore-decks.ts';
import { GALAXY_META, LEVELS, hashStr, resetModelCache, type CEFR } from './model.ts';
import { isDeckAdded, setDeckAdded } from './prefs.ts';
import { startSession } from './session.ts';
import { masteredCount } from './store.ts';

let openDeckId: string | null = null;
let query = '';
let selectedTerms: Set<string> = new Set();
let pickMode = false;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const normCefr = (l: string): CEFR => ((LEVELS as string[]).includes((l || '').toUpperCase().slice(0, 2)) ? ((l || '').toUpperCase().slice(0, 2) as CEFR) : 'B1');
const hueOf = (d: ExploreDeck) => GALAXY_META[normCefr(d.defaultLevel)].hue;

// Deterministic ink "route" cover — a few dots joined by hairlines, per deck.
function cover(d: ExploreDeck): string {
  let s = hashStr(d.id);
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pts: [number, number][] = [];
  let dots = '';
  const n = 9 + Math.floor(rnd() * 5);
  for (let i = 0; i < n; i++) {
    const x = 8 + rnd() * 104, y = 8 + rnd() * 64;
    pts.push([x, y]);
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + rnd() * 1.6).toFixed(1)}"/>`;
  }
  let lines = '';
  for (let i = 1; i < Math.min(5, pts.length); i++) {
    lines += `<line x1="${pts[i - 1][0].toFixed(1)}" y1="${pts[i - 1][1].toFixed(1)}" x2="${pts[i][0].toFixed(1)}" y2="${pts[i][1].toFixed(1)}"/>`;
  }
  return `<svg class="xp-constellation" viewBox="0 0 120 80" aria-hidden="true"><g class="xp-lines">${lines}</g><g class="xp-dots">${dots}</g></svg>`;
}

function tile(d: ExploreDeck): string {
  return `<button class="xp-tile" data-deck="${d.id}">
    <div class="xp-cover" style="--deck-hue:${hueOf(d)}">${cover(d)}
      <span class="xp-count mono">${d.cards.length}</span>
      ${isDeckAdded(d.id) ? `<span class="xp-added">${icon('check')}</span>` : ''}
    </div>
    <div class="xp-name">${esc(d.name)}</div>
  </button>`;
}

function matchCard(d: ExploreDeck, q: string) {
  return d.cards.find((c) => c.de.toLowerCase().includes(q) || c.en.toLowerCase().includes(q));
}

function renderCatalog(el: HTMLElement) {
  const q = query.trim().toLowerCase();
  let body: string;
  if (!EXPLORE_SECTIONS.length) {
    body = `<div class="xp-empty">${icon('book')}<p>Der Katalog wird zusammengestellt.</p></div>`;
  } else if (q) {
    const hits = allExploreDecks()
      .map((d) => ({ d, name: d.name.toLowerCase().includes(q), card: matchCard(d, q) }))
      .filter((h) => h.name || h.card);
    body = hits.length
      ? `<div class="xp-hits">${hits.map(({ d, card }) => `
          <button class="xp-hit" data-deck="${d.id}">
            <span class="xp-hit-dot" style="background:${hueOf(d)}"></span>
            <span class="xp-hit-name">${esc(d.name)}</span>
            <span class="xp-hit-sub">${card ? `${esc(card.de)} — ${esc(card.en)}` : `${d.cards.length} Wörter`}</span>
          </button>`).join('')}</div>`
      : `<div class="xp-empty"><p>Kein Deck oder Wort passt zu „${esc(query.trim())}".</p></div>`;
  } else {
    body = EXPLORE_SECTIONS.map((s) => `
      <h2 class="h2 xp-sec">${esc(s.title)}</h2>
      <div class="xp-shelf">${s.decks.map(tile).join('')}</div>`).join('');
  }
  el.innerHTML = `<div class="screen-pad">
    <h1 class="display-l">Katalog</h1>
    <p class="muted xp-sub">Fertige Decks aus Lernquellen. Füge eins hinzu — seine Wörter erscheinen in deinem Atlas.</p>
    <div class="search-field xp-search">${icon('search', 'sf-ic')}<input id="xp-q" type="search" placeholder="Decks oder Wörter suchen…" value="${esc(query)}"></div>
    ${body}
  </div>`;
  const input = el.querySelector('#xp-q') as HTMLInputElement;
  input.addEventListener('input', () => {
    query = input.value;
    renderCatalog(el);
    const i = el.querySelector('#xp-q') as HTMLInputElement;
    i.focus();
    i.setSelectionRange(i.value.length, i.value.length);
  });
  el.querySelectorAll('[data-deck]').forEach((b) =>
    b.addEventListener('click', () => { openDeckId = (b as HTMLElement).dataset.deck!; renderExplore(el); }));
}

function renderDeck(el: HTMLElement, d: ExploreDeck) {
  const added = isDeckAdded(d.id);
  const mastered = added ? masteredCount(starIdsOf(d)) : 0;
  const lvls = [...new Set(d.cards.map((c) => normCefr(c.level || d.defaultLevel)))].sort((a, b) => LEVELS.indexOf(a) - LEVELS.indexOf(b));
  const selCount = pickMode ? selectedTerms.size : 0;

  const wordRows = d.cards.map((c) => {
    const lvl = normCefr(c.level || d.defaultLevel);
    if (pickMode) {
      const checked = selectedTerms.has(c.de);
      return `<label class="xp-word xp-word-pick${checked ? ' picked' : ''}" data-de="${esc(c.de)}">
        <input type="checkbox" class="xp-check" data-de="${esc(c.de)}" ${checked ? 'checked' : ''}>
        <div class="xp-word-main"><span class="xp-de">${esc(c.de)}</span><span class="xp-en">${esc(c.en)}</span></div>
        <span class="xp-lvl mono" style="color:${GALAXY_META[lvl].hue}">${lvl}</span>
      </label>`;
    }
    return `<div class="xp-word">
      <div class="xp-word-main"><span class="xp-de">${esc(c.de)}</span><span class="xp-en">${esc(c.en)}</span></div>
      <span class="xp-lvl mono" style="color:${GALAXY_META[lvl].hue}">${lvl}</span>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="screen-pad xp-detail">
    <button class="xp-back btn btn-secondary">${icon('back')} Katalog</button>
    <div class="xp-hero" style="--deck-hue:${hueOf(d)}">${cover(d)}
      <div class="xp-hero-txt">
        <h1 class="h1">${esc(d.name)}</h1>
        <div class="xp-meta">${d.cards.length} Wörter · ${lvls.join(' – ')}${added ? ` · ${mastered} gemeistert` : ''}</div>
        ${d.description ? `<div class="xp-desc">${esc(d.description)}</div>` : ''}
      </div>
    </div>
    <div class="xp-actions">
      ${pickMode
        ? `<button class="btn btn-primary" id="xp-add-sel" ${selCount === 0 ? 'disabled' : ''}>Auswahl üben (${selCount}) →</button>
           <button class="btn btn-secondary" id="xp-pick-cancel">Abbrechen</button>`
        : added
          ? `<button class="btn btn-primary" id="xp-study">Jetzt üben →</button><button class="btn btn-secondary" id="xp-remove">Aus dem Atlas entfernen</button>`
          : `<button class="btn btn-primary" id="xp-add">Alle ${d.cards.length} hinzufügen →</button>
             <button class="btn btn-secondary" id="xp-pick">Begriffe wählen</button>`}
    </div>
    <div class="xp-words" id="xp-word-list">${wordRows}</div>
  </div>`;

  el.querySelector('.xp-back')!.addEventListener('click', () => { openDeckId = null; pickMode = false; selectedTerms.clear(); renderExplore(el); });
  el.querySelector('#xp-add')?.addEventListener('click', () => { setDeckAdded(d.id, true); resetModelCache(); renderDeck(el, d); });
  el.querySelector('#xp-remove')?.addEventListener('click', () => { setDeckAdded(d.id, false); resetModelCache(); renderDeck(el, d); });
  el.querySelector('#xp-study')?.addEventListener('click', () => startSession(el, () => renderExplore(el), starIdsOf(d), true));
  el.querySelector('#xp-pick')?.addEventListener('click', () => { pickMode = true; selectedTerms.clear(); renderDeck(el, d); });
  el.querySelector('#xp-pick-cancel')?.addEventListener('click', () => { pickMode = false; selectedTerms.clear(); renderDeck(el, d); });

  el.querySelector('#xp-add-sel')?.addEventListener('click', () => {
    if (selectedTerms.size === 0) return;
    setDeckAdded(d.id, true); resetModelCache();
    const selIds = d.cards.filter((c) => selectedTerms.has(c.de)).map((c) => 'xp:' + d.id + ':' + c.de);
    pickMode = false; selectedTerms.clear();
    startSession(el, () => renderExplore(el), selIds, true);
  });

  el.querySelectorAll('.xp-check').forEach((cb) => {
    cb.addEventListener('change', () => {
      const de = (cb as HTMLInputElement).dataset.de!;
      if ((cb as HTMLInputElement).checked) selectedTerms.add(de); else selectedTerms.delete(de);
      const addBtn = el.querySelector('#xp-add-sel') as HTMLButtonElement | null;
      if (addBtn) { addBtn.textContent = `Auswahl üben (${selectedTerms.size}) →`; addBtn.disabled = selectedTerms.size === 0; }
      const row = (cb as HTMLElement).closest('.xp-word-pick');
      if (row) row.classList.toggle('picked', (cb as HTMLInputElement).checked);
    });
  });
}

export function renderExplore(el: HTMLElement) {
  const open = openDeckId ? exploreDeckById(openDeckId) : undefined;
  if (open) renderDeck(el, open);
  else { openDeckId = null; renderCatalog(el); }
}
