import { diatonicStep } from '../../core/music';

/** Minimal single-note staff for the note-reading game (treble or bass, ledger lines). */
export function Staff({ midi, clef, mark }: { midi: number | null; clef: 'treble' | 'bass'; mark?: 'good' | 'bad' | null }) {
  const sp = 14; // staff space
  const top = 50;
  const bottomStep = clef === 'treble' ? diatonicStep(64) : diatonicStep(43); // E4 / G2 bottom line
  const yOf = (step: number) => top + 4 * sp - ((step - bottomStep) * sp) / 2;
  const w = 260;
  const step = midi !== null ? diatonicStep(midi) : bottomStep + 4;
  const y = yOf(step);
  const ledgers: number[] = [];
  for (let s = bottomStep - 2; s >= step; s -= 2) ledgers.push(yOf(s));
  for (let s = bottomStep + 10; s <= step; s += 2) ledgers.push(yOf(s));
  const sharp = midi !== null && [1, 3, 6, 8, 10].includes(midi % 12);
  const color = mark === 'good' ? '#128a55' : mark === 'bad' ? '#c62f3a' : '#141922';
  return (
    <svg className="mini-staff" width={w} height={top * 2 + 4 * sp} viewBox={`0 0 ${w} ${top * 2 + 4 * sp}`} role="img" aria-label="Note on the staff">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={10} x2={w - 10} y1={top + i * sp} y2={top + i * sp} stroke="#333" strokeWidth={1.2} />
      ))}
      <text x={14} y={clef === 'treble' ? top + 3.6 * sp : top + 2.3 * sp} fontSize={clef === 'treble' ? 62 : 44} fill="#222">
        {clef === 'treble' ? '𝄞' : '𝄢'}
      </text>
      {midi !== null && (
        <g>
          {ledgers.map((ly) => (
            <line key={ly} x1={w / 2 + 20 - 18} x2={w / 2 + 20 + 18} y1={ly} y2={ly} stroke="#333" strokeWidth={1.2} />
          ))}
          {sharp && (
            <text x={w / 2 - 10} y={y + 6} fontSize={22} fill={color}>
              ♯
            </text>
          )}
          <ellipse cx={w / 2 + 20} cy={y} rx={sp * 0.68} ry={sp * 0.48} fill={color} transform={`rotate(-20 ${w / 2 + 20} ${y})`} />
        </g>
      )}
    </svg>
  );
}
