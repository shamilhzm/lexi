// Einstufung — a short escalating recognition quiz (two items per CEFR level).
// Correct answers mark cards as already-known (seeded into Review), estimate a
// starting level and suggest the matching Lektion. Skippable. Paper overlay.
import './placement.css';
import { allStars, hashStr, LEVELS, type CEFR, type Star } from './model.ts';
import { placementSeed, setPlacement } from './store.ts';
import { icon } from './icons.ts';
import { GALAXY_META } from './model.ts';

// Where the book picks up for an estimated level.
const START_LESSON: Partial<Record<CEFR, number>> = { A1: 1, A2: 9, B1: 19 };

interface Item { star: Star; options: string[]; answer: number; }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildItems(): Item[] {
  const words = allStars().filter((s) => s.kind === 'word' && s.translation);
  const translations = words.map((w) => w.translation);
  const items: Item[] = [];
  for (const lvl of LEVELS) {
    const pool = words.filter((s) => s.cefr === lvl).sort((a, b) => hashStr(a.id) - hashStr(b.id));
    for (const star of pool.slice(0, 2)) {
      const ds = new Set<string>();
      for (let k = 0; ds.size < 3 && k < 80; k++) {
        const t = translations[hashStr(star.id + 'd' + k) % translations.length];
        if (t && t !== star.translation) ds.add(t);
      }
      const options = [star.translation, ...ds].sort((a, b) => hashStr(star.id + a) - hashStr(star.id + b));
      items.push({ star, options, answer: options.indexOf(star.translation) });
    }
  }
  return items;
}

export function renderPlacement(root: HTMLElement, onDone: (level: CEFR) => void) {
  const items = buildItems();
  let idx = 0, miss = 0, answered = false;
  const known: string[] = [];
  const correctByLevel = {} as Record<CEFR, number>;

  function finish() {
    let level: CEFR = 'A1';
    for (const lvl of LEVELS) if ((correctByLevel[lvl] || 0) >= 1) level = lvl;
    placementSeed(known);
    setPlacement(level);
    const startLesson = START_LESSON[level];
    const lessonHint = startLesson
      ? `Einstieg bei <b>Lektion ${startLesson}</b>${startLesson > 1 ? ' — und davor liegende Lektionen per Gap-Check absichern.' : '.'}`
      : 'Das Kursbuch endet bei B1 — die Lektionen 1–30 dienen dir als Wiederholung; per Gap-Check findest du Lücken.';
    root.innerHTML = `<div class="placement placement-done">
      <div>${icon('seal', 'pl-ship')}
        <div class="pl-h">Einstufung abgeschlossen</div>
        <div class="pl-sub">Geschätztes Niveau: <b>${level} · ${esc(GALAXY_META[level].title)}</b><br>${known.length} ${known.length === 1 ? 'Wort' : 'Wörter'} als bekannt markiert.<br>${lessonHint}</div>
        <button class="btn btn-primary" id="pl-done">Zum Atlas →</button>
      </div></div>`;
    root.querySelector('#pl-done')!.addEventListener('click', () => onDone(level));
  }

  function renderItem() {
    if (idx >= items.length) { finish(); return; }
    const it = items[idx];
    const { star } = it;
    const hue = GALAXY_META[star.cefr].hue;
    root.innerHTML = `<div class="placement">
      <div class="pl-top">
        <button class="pl-skip" id="pl-skip">Überspringen</button>
        <div class="pl-prog"><i style="width:${Math.round((idx / items.length) * 100)}%"></i></div>
        <div class="pl-count">${idx + 1}/${items.length}</div>
      </div>
      <div class="pl-stage">
        <div class="pl-card">
          <div class="pl-lvl" style="color:${hue}">${star.cefr}</div>
          <div class="pl-q">Kennst du dieses Wort?</div>
          <h1 class="pl-term">${esc(star.term)}</h1>
        </div>
        <div class="pl-opts">${it.options.map((o, i) => `<button class="pl-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
        <button class="pl-dunno" id="pl-dunno">Weiß ich nicht</button>
      </div>
    </div>`;
    answered = false;
    const advance = () => { idx++; renderItem(); };
    const grade = (correct: boolean, chosen: number) => {
      if (answered) return;
      answered = true;
      root.querySelectorAll('.pl-opt').forEach((o, oi) => {
        (o as HTMLButtonElement).disabled = true;
        if (oi === it.answer) o.classList.add('correct');
        else if (oi === chosen) o.classList.add('wrong');
      });
      if (correct) { known.push(star.id); correctByLevel[star.cefr] = (correctByLevel[star.cefr] || 0) + 1; miss = 0; }
      else { miss++; }
      setTimeout(() => { if (miss >= 2) finish(); else advance(); }, correct ? 650 : 950);
    };
    root.querySelectorAll('.pl-opt').forEach((b) => b.addEventListener('click', () => grade(Number((b as HTMLElement).dataset.i) === it.answer, Number((b as HTMLElement).dataset.i))));
    root.querySelector('#pl-dunno')!.addEventListener('click', () => grade(false, -1));
    root.querySelector('#pl-skip')!.addEventListener('click', () => finish());
  }

  renderItem();
}
