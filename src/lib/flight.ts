// The save, made visible *(2026-11-27)*.
//
// Saving a word is the one instruction the feed takes — *teach me this one* — and
// until now it happened in place: the bookmark filled, the word went yellow, and
// where the word went was a sentence under the buttons. The loop (browse → save →
// Üben teaches it) was the thing every new learner had to be told.
//
// So the highlighted word lifts off and drops into Üben's tab, and the tab takes
// it. Continuity, not decoration (DESIGN §7): the object the learner marked is the
// object that arrives where it will be taught. The headword itself stays put and
// stays yellow; what flies is a copy, aria-hidden, pointer-events off, gone on
// landing. Transform-only on the way, so a stalled frame is a word mid-air, never a
// missing one, and reduced motion skips the trip entirely — the save is the same.

const EASE = 'cubic-bezier(.32,.72,0,1)';

/** Üben's tab as it is drawn right now: the bottom bar on a phone, the top bar on
 *  a wide screen. Both carry `data-nav`; only one is laid out. */
function uebenTab(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>('[data-nav="session"]')) {
    if (el.getClientRects().length > 0) return el;
  }
  return null;
}

function reduced(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Fly `text` from `from` into Üben. `delay` staggers several words saved at once. */
export function flyToUeben(from: Element, text: string, delay = 0): void {
  if (typeof document === 'undefined' || reduced()) return;
  const tab = uebenTab();
  if (!tab) return;
  const icon = tab.querySelector<HTMLElement>('.tab-icon') ?? tab;
  const a = from.getBoundingClientRect();
  const b = icon.getBoundingClientRect();
  if (!a.width || !b.width || typeof (HTMLElement.prototype as { animate?: unknown }).animate !== 'function') return;

  const el = document.createElement('span');
  el.className = 'flight';
  el.textContent = text;
  el.lang = 'de';
  el.setAttribute('translate', 'no');
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const x0 = a.left + a.width / 2 - w / 2;
  const y0 = a.top + a.height / 2 - h / 2;
  const x1 = b.left + b.width / 2 - w / 2;
  const y1 = b.top + b.height / 2 - h / 2;
  const anim = el.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(1)` },
    { transform: `translate(${x1}px, ${y1}px) scale(.28)` },
  ], { duration: 560, delay, easing: EASE, fill: 'both' });
  const done = () => { el.remove(); receive(icon); };
  anim.onfinish = done;
  anim.oncancel = () => el.remove();
  // A backstop: a page hidden mid-flight can hold the animation forever.
  window.setTimeout(() => { if (el.isConnected) el.remove(); }, 560 + delay + 400);
}

/** The tab takes the word: a short dip, as if something landed in it. */
function receive(icon: HTMLElement) {
  icon.classList.remove('tab-receive');
  void icon.offsetWidth;
  icon.classList.add('tab-receive');
  icon.addEventListener('animationend', () => icon.classList.remove('tab-receive'), { once: true });
}
