// A tiny bar of German special characters that insert at the caret of a text
// input/textarea. Helps on keyboards without easy umlaut access.
import type { RefObject } from 'react';

const CHARS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];

export default function UmlautBar({ targetRef, value, onChange }: {
  targetRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const insert = (ch: string) => {
    const el = targetRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + ch + value.slice(end);
    onChange(next);
    // restore focus and place caret right after the inserted character
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + ch.length;
      el.setSelectionRange(pos, pos);
    });
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {CHARS.map((ch) => (
        <button key={ch} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(ch)}
          className="w-9 h-8 rounded-md bg-panel2 border border-line text-base text-dim hover:text-amber hover:border-amber transition-colors">
          {ch}
        </button>
      ))}
    </div>
  );
}
