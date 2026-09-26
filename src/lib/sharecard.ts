// Share card — the learner's sky as a 1200×630 PNG, with the way back printed on it.
//
// Pride is the only growth channel a free local-first app has, and this is the
// screenshot people already want to take, designed on purpose. It used to draw
// the treemap "market" in the retired glacier palette and sign off "an atlas of
// your German" — a tagline retired with the rooms it described — and it carried
// **no link**: not on the image, not in the share payload. A friend who liked it
// had nowhere to go (panel review 2026-09-25, marketing F3 and GTM F3).
//
// Now it is the sky from Fortschritt (`WordSky`), painted by the same code and the
// same model, so the card can never disagree with the app about what a lit star
// means; the number beside it is every word the learner knows across **all**
// levels, because the sky lights all levels and a filter must not shrink a brag;
// and the address is drawn on the card and sent with it.
//
// It is painted at **night** whatever the app's theme: a link preview of Lexi is
// the night sky (`public/og.jpg`), and a shared card and the page it leads to
// should be one picture. The night inks are read from the stylesheet's
// `html.dark` block rather than typed here, so a palette change reaches the card.
//
// What it does not say: a CEFR letter. "Level B1" on a brag card is a claim about
// competence that a two-minute placement cannot carry — VISION §10 makes PathCard
// say so in words, and a picture made for strangers cannot carry the caveat.
import { levelStats, streak, profileName } from '../store.ts';
import { skyGeometry, looksFor } from '../components/skyModel.ts';
import { paintSky, place, token, withAlpha } from '../components/skyPaint.ts';
import { PUBLIC_ORIGIN } from './publicCopy.ts';
import { fmt } from './ui.ts';

const W = 1200, H = 630, PAD = 64;
/** The sky's diameter on the card, and the coverage rings WordSky draws. */
const SKY = 560;
const RINGS = [100, 500, 1000, 3000];

// ---- pure: what the card says ----------------------------------------------------

export interface CardFacts { known: number; learned: number; recalled: number; streak: number; name: string }

/** The three lines of the card. Pure, so the honesty rules are testable: the
 *  headline is *known* (FSRS Review, the app's own currency), falling back to
 *  *started* only when nothing is known yet; production is its own line, never
 *  blended in; a one-day streak is not a streak worth printing. */
export function cardLines(f: CardFacts): { number: string; label: string; sub: string } {
  const who = f.name.trim();
  const knows = f.known > 0;
  const number = fmt(knows ? f.known : f.learned);
  const label = knows
    ? (who ? `German words ${who} knows` : 'German words I know')
    : (who ? `German words ${who} has started` : 'German words I’ve started');
  const sub = [
    f.recalled > 0 && `${fmt(f.recalled)} I can also write from memory`,
    f.streak >= 2 && `${f.streak}-day streak`,
  ].filter(Boolean).join('  ·  ');
  return { number, label, sub };
}

/** The link the card leads to. `ref=share` is a fixed tag, the same for everyone —
 *  it identifies no one, the app reads nothing from it, and the only place it can
 *  ever be counted is the static host's own request log. */
export function shareUrl(origin = PUBLIC_ORIGIN): string {
  return `${origin.replace(/\/+$/, '')}/?ref=share`;
}

/** What travels with the image in the share sheet. */
export function shareText(f: CardFacts): string {
  const { number } = cardLines(f);
  return f.known > 0
    ? `${number} German words I know, as a sky. Learning with Lexi — free, no account:`
    : `My German, as a sky. Learning with Lexi — free, no account:`;
}

// ---- the night palette, read from the stylesheet --------------------------------------

interface RuleLike { selectorText?: string; style?: { length: number; item(i: number): string; getPropertyValue(p: string): string }; cssRules?: ArrayLike<RuleLike> }

/** Every custom property declared under `html.dark`, walking into `@layer` and
 *  `@media` groups. Duck-typed rather than `instanceof CSSStyleRule`, so it is
 *  testable without a DOM. */
export function darkTokens(sheets: ArrayLike<{ cssRules: ArrayLike<RuleLike> }>): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (rules: ArrayLike<RuleLike>) => {
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (r.selectorText && r.style && r.selectorText.split(',').some((s) => s.trim() === 'html.dark')) {
        for (let j = 0; j < r.style.length; j++) {
          const p = r.style.item(j);
          if (p.startsWith('--')) out.set(p, r.style.getPropertyValue(p).trim());
        }
      } else if (r.cssRules) walk(r.cssRules);
    }
  };
  for (let i = 0; i < sheets.length; i++) {
    // A cross-origin sheet throws on `cssRules`; there is none in this app, but a
    // browser extension can inject one.
    try { walk(sheets[i].cssRules); } catch { /* not ours */ }
  }
  return out;
}

function nightResolver(): (name: string) => string {
  const night = darkTokens(document.styleSheets as unknown as ArrayLike<{ cssRules: ArrayLike<RuleLike> }>);
  // Nothing found (a stylesheet that failed to load) falls back to the live theme:
  // a card in the wrong theme is better than a card in no colour.
  return (name) => night.get(name) || token(name);
}

// ---- the picture -------------------------------------------------------------------------

function facts(): CardFacts {
  const all = levelStats();
  const sum = (k: 'known' | 'learned' | 'recalled') => all.reduce((s, l) => s + l[k], 0);
  return { known: sum('known'), learned: sum('learned'), recalled: sum('recalled'), streak: streak(), name: profileName() };
}

/** Render the card. Exported separately from `shareProgress` for testability. */
export function renderShareCard(f: CardFacts = facts()): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const ink = nightResolver();
  const bg = ink('--color-bg'), txt = ink('--color-txt'), dim = ink('--color-dim');
  const accent = ink('--color-accent'), green = ink('--color-green'), panel = ink('--color-panel');
  // The app's own faces, which `shareProgress` has made sure are loaded.
  const display = token('--font-display') || 'Georgia, serif';
  const sans = token('--font-sans') || 'sans-serif';
  const mono = token('--font-mono') || 'ui-monospace, monospace';

  // Ground, and a glow behind the sky.
  const sx = W - PAD + 16 - SKY, sy = (H - SKY) / 2;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(sx + SKY / 2, sy + SKY / 2, 0, sx + SKY / 2, sy + SKY / 2, SKY * 0.8);
  glow.addColorStop(0, withAlpha(accent, 0.14));
  glow.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // The sky — WordSky's model and painter, memory lens, at night.
  const { order, stars } = skyGeometry();
  const looks = looksFor(order, 'memory');
  ctx.save();
  ctx.translate(sx, sy);
  paintSky(ctx, { size: SKY, stars, looks, dark: true, rings: RINGS }, (i) => looks[i].lit,
    place(SKY, stars), document.createElement('canvas'), ink);
  ctx.restore();

  // The mark and the name, top left — public/icon.svg's geometry on a 44px tile.
  const u = 44 / 150;
  ctx.fillStyle = panel;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(PAD, 56, 44, 44, 10); else ctx.rect(PAD, 56, 44, 44);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(PAD + 52 * u, 56 + 40 * u, 20 * u, 72 * u);
  ctx.fillRect(PAD + 52 * u, 56 + 92 * u, 60 * u, 20 * u);
  ctx.fillRect(PAD + 88 * u, 56 + 40 * u, 20 * u, 22 * u);
  ctx.fillStyle = txt;
  ctx.font = `700 30px ${sans}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Lexi', PAD + 58, 89);

  // The number, what it counts, and the honest second number.
  const lines = cardLines(f);
  const col = sx - PAD - 24;
  ctx.fillStyle = green;
  ctx.font = `600 132px ${display}`;
  ctx.fillText(lines.number, PAD - 4, 292, col);
  ctx.fillStyle = txt;
  ctx.font = `600 34px ${sans}`;
  ctx.fillText(lines.label, PAD, 346, col);
  if (lines.sub) {
    ctx.fillStyle = dim;
    ctx.font = `24px ${sans}`;
    ctx.fillText(lines.sub, PAD, 390, col);
  }

  // The way back: the tagline, then the address.
  ctx.fillStyle = dim;
  ctx.font = `22px ${sans}`;
  ctx.fillText('Scroll German. Save a word. Lexi makes it stick.', PAD, 532, col);
  ctx.fillStyle = accent;
  ctx.font = `24px ${mono}`;
  ctx.fillText(new URL(PUBLIC_ORIGIN).host, PAD, 574, col);
  return canvas;
}

/** Share (mobile) or download (desktop) the rendered card. */
export async function shareProgress(): Promise<void> {
  // Canvas text does not wait for a web font: drawn before Fraunces has loaded, the
  // number would silently set in Georgia. Ask for the faces first; if the network
  // is gone and they never come, the fallbacks are fine.
  const display = token('--font-display'), sans = token('--font-sans'), mono = token('--font-mono');
  await Promise.allSettled([
    document.fonts.load(`600 132px ${display}`), document.fonts.load(`600 34px ${sans}`), document.fonts.load(`24px ${mono}`),
  ]);
  const f = facts();
  const canvas = renderShareCard(f);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'lexi-sky.png', { type: 'image/png' });
  const url = shareUrl(), text = shareText(f);
  // Both are missing on desktop Firefox, whatever lib.dom says.
  const nav = navigator as { share?: Navigator['share']; canShare?: Navigator['canShare'] };
  // With the link where the target takes one; image only where it does not.
  const payloads: ShareData[] = [
    { files: [file], title: 'My German, as a sky', text, url },
    { files: [file], title: 'My German, as a sky', text: `${text} ${url}` },
  ];
  const payload = nav.share ? payloads.find((p) => nav.canShare?.(p)) : undefined;
  if (payload && nav.share) {
    try { await nav.share(payload); return; }
    catch (e) {
      // Closing the share sheet is a decision, not a failure: do nothing. The old
      // version fell through to a download here, so cancelling saved a file.
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lexi-sky.png';
  a.click();
  URL.revokeObjectURL(a.href);
}
