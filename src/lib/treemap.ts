// Squarified treemap (Bruls, Huizing, van Wijk). Pure + deterministic:
// given weighted items and a rect, returns laid-out tiles with no gaps/overlap.
export interface TreeItem<T> { value: number; data: T; }
export interface Tile<T> { x: number; y: number; w: number; h: number; data: T; value: number; }

export function squarify<T>(items: TreeItem<T>[], x: number, y: number, w: number, h: number): Tile<T>[] {
  const out: Tile<T>[] = [];
  const sorted = items.slice().filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  if (total <= 0 || w <= 0 || h <= 0) return out;
  const scale = (w * h) / total;

  const area = { x, y, w, h };
  let row: TreeItem<T>[] = [];

  const worst = (r: TreeItem<T>[], len: number) => {
    if (!r.length) return Infinity;
    const areas = r.map((i) => i.value * scale);
    const max = Math.max(...areas), min = Math.min(...areas), sum = areas.reduce((a, b) => a + b, 0);
    return Math.max((len * len * max) / (sum * sum), (sum * sum) / (len * len * min));
  };

  const layout = (r: TreeItem<T>[], rect: typeof area) => {
    const horizontal = rect.w < rect.h;
    const sum = r.reduce((a, i) => a + i.value, 0) * scale;
    let off = 0;
    if (horizontal) {
      const rowH = sum / rect.w;
      for (const i of r) { const tw = (i.value * scale) / rowH; out.push({ x: rect.x + off, y: rect.y, w: tw, h: rowH, data: i.data, value: i.value }); off += tw; }
      rect.y += rowH; rect.h -= rowH;
    } else {
      const rowW = sum / rect.h;
      for (const i of r) { const th = (i.value * scale) / rowW; out.push({ x: rect.x, y: rect.y + off, w: rowW, h: th, data: i.data, value: i.value }); off += th; }
      rect.x += rowW; rect.w -= rowW;
    }
  };

  const queue = sorted.slice();
  while (queue.length) {
    const len = Math.min(area.w, area.h);
    const next = queue[0];
    if (worst(row, len) >= worst([...row, next], len)) { row.push(next); queue.shift(); }
    else { layout(row, area); row = []; }
  }
  if (row.length) layout(row, area);
  return out;
}
