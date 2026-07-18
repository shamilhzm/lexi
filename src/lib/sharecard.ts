// Share card — the learner's market rendered as a 1200×630 PNG (canvas).
// Pride is the only growth channel a free local-first app has; this is the
// screenshot people already want to take, designed on purpose: the treemap
// coloured by how much of each territory is Known, plus the headline number.
// navigator.share where available (mobile), download fallback elsewhere.
import { squarify } from './treemap.ts';
import { groupStats, totals, streak, placementLevel } from '../store.ts';

const W = 1200, H = 630, PAD = 48;

// Fixed glacier palette (the card must look right regardless of app theme).
const BG = '#0b1219', PANEL = '#101a24', LINE = '#1d2a38';
const CYAN = '#38cde8', TXT = '#e6edf3', DIM = '#8b97a7';

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Render the card. Exported separately from share() for testability. */
export function renderShareCard(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const mono = '"SF Mono", "Cascadia Code", ui-monospace, Menlo, monospace';
  const sans = '-apple-system, "Segoe UI", Roboto, sans-serif';

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ---- left column: the headline -----------------------------------------
  const t = totals();
  ctx.fillStyle = CYAN;
  ctx.font = `bold 120px ${mono}`;
  ctx.fillText(String(t.known), PAD, 218);
  ctx.fillStyle = TXT;
  ctx.font = `600 34px ${sans}`;
  ctx.fillText('German words known', PAD, 268);

  const lvl = placementLevel();
  const st = streak();
  ctx.fillStyle = DIM;
  ctx.font = `26px ${sans}`;
  const sub = [lvl && `Level ${lvl}`, st > 0 && `${st}-day streak`, `${t.learned} learning`].filter(Boolean).join('  ·  ');
  ctx.fillText(sub, PAD, 312);

  // wordmark, bottom-left
  ctx.fillStyle = PANEL;
  rounded(ctx, PAD, H - 108, 44, 44, 10); ctx.fill();
  ctx.fillStyle = CYAN;
  ctx.fillRect(PAD + 15, H - 96, 6, 21);
  ctx.fillRect(PAD + 15, H - 81, 18, 6);
  ctx.fillRect(PAD + 26, H - 96, 6, 7);
  ctx.fillStyle = TXT;
  ctx.font = `bold 30px ${sans}`;
  ctx.fillText('Lexi', PAD + 58, H - 76);
  ctx.fillStyle = DIM;
  ctx.font = `22px ${sans}`;
  ctx.fillText('the German vocabulary terminal', PAD + 128, H - 76);

  // ---- right column: the market, coloured by Known -----------------------
  const mx = 560, my = PAD, mw = W - mx - PAD, mh = H - PAD * 2;
  const groups = groupStats();
  const tiles = squarify(groups.map((g) => ({ value: g.count, data: g })), mx, my, mw, mh);
  for (const tile of tiles) {
    const g = tile.data;
    const knownPct = g.count ? g.known / g.count : 0;
    // fill: cyan whose alpha tracks how known the territory is (floor keeps
    // untouched sectors visible as dark territory, not holes)
    ctx.fillStyle = CYAN;
    ctx.globalAlpha = 0.12 + knownPct * 0.75;
    rounded(ctx, tile.x + 2, tile.y + 2, Math.max(1, tile.w - 4), Math.max(1, tile.h - 4), 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = LINE;
    ctx.stroke();
    if (tile.w > 150 && tile.h > 64) {
      ctx.fillStyle = knownPct > 0.45 ? BG : TXT;
      ctx.font = `600 20px ${sans}`;
      ctx.fillText(g.name, tile.x + 14, tile.y + 30, tile.w - 26);
      ctx.font = `16px ${mono}`;
      ctx.fillStyle = knownPct > 0.45 ? BG : DIM;
      ctx.fillText(`${Math.round(knownPct * 100)}% known`, tile.x + 14, tile.y + 54);
    }
  }
  return canvas;
}

/** Share (mobile) or download (desktop) the rendered card. */
export async function shareProgress(): Promise<void> {
  const canvas = renderShareCard();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'lexi-progress.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: 'My German progress' }); return; } catch { /* cancelled → fall through */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lexi-progress.png';
  a.click();
  URL.revokeObjectURL(a.href);
}
