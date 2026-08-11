// Inline emphasis for the exam's explanatory prose.
//
// The answer keys are explained by pointing at a specific word — *bei* takes the
// dative, so the key is **mir** — and an explanation that cannot mark which word
// it means is a worse explanation. Two marks, `**strong**` and `*em*`, applied
// only to authored exam copy, which is why this lives here rather than pulling a
// markdown dependency into a local-first app for two characters.
//
// Text is never interpreted as HTML: the split produces React nodes, so a stray
// angle bracket in a German sentence stays a stray angle bracket.
import type { ReactNode } from 'react';

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

export default function Rich({ children }: { children?: string }): ReactNode {
  if (!children) return null;
  return children.split(TOKEN).map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4) {
      return <strong key={i} className="font-bold">{chunk.slice(2, -2)}</strong>;
    }
    if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length > 2) {
      return <em key={i} className="italic">{chunk.slice(1, -1)}</em>;
    }
    return chunk;
  });
}
