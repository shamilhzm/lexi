// The recap's celebration: a riso print, pulled a frame at a time.
//
// Three passes — a yellow burst, a pink disc, a blue check — start out of
// register and step into it (`riso-register`), while a ring of halftone dots
// is thrown outward (`riso-burst`) and the whole sheet boils for a moment.
//
// §7 still holds: every keyframe is transform-only and fill-mode-free, so the
// resting state is the finished print. A stalled or reduced-motion render shows
// the stamp in register with its dots already out — never an empty space.
const DOTS = 10;

export default function RisoStamp({ size = 96 }: { size?: number }) {
  return (
    <div aria-hidden className="riso-stamp relative mx-auto mb-4" style={{ width: size, height: size }}>
      <svg viewBox="-60 -60 120 120" width={size} height={size} className="overflow-visible">
        <g className="riso-plate riso-register" style={{ ['--rx' as string]: '-9px', ['--ry' as string]: '6px' }}>
          <path fill="var(--color-riso-yellow)"
            d={Array.from({ length: 24 }, (_, k) => {
              const r = k % 2 ? 30 : 44, a = (k / 24) * Math.PI * 2;
              return `${k ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
            }).join(' ') + 'Z'} />
        </g>
        <g className="riso-plate riso-register" style={{ ['--rx' as string]: '8px', ['--ry' as string]: '-7px' }}>
          <circle r="27" fill="var(--color-riso-pink)" />
        </g>
        <g className="riso-plate riso-register" style={{ ['--rx' as string]: '-5px', ['--ry' as string]: '-9px' }}>
          <path d="M-13 1 L-4 10 L15 -10" fill="none" stroke="var(--color-riso-blue)" strokeWidth="8"
            strokeLinecap="square" strokeLinejoin="miter" />
        </g>
        {Array.from({ length: DOTS }, (_, k) => {
          const a = (k / DOTS) * Math.PI * 2 + 0.3;
          const x = Math.cos(a) * 54, y = Math.sin(a) * 54;
          return (
            <circle key={k} className="riso-plate riso-burst" cx={x} cy={y} r={k % 3 ? 3 : 4.5}
              fill={k % 2 ? 'var(--color-riso-pink)' : 'var(--color-riso-blue)'}
              style={{ ['--dx' as string]: `${-x}px`, ['--dy' as string]: `${-y}px` }} />
          );
        })}
      </svg>
    </div>
  );
}
