import { useEffect, useMemo, useRef } from 'react';
import { isBlackKey, midiToName, pitchClass } from '../../core/music';
import { midiToKeyLabel } from '../../core/input/virtual/keymap';
import { liveKeys } from '../live';

interface Props {
  low: number;
  high: number;
  height?: number;
  /** Show note names on keys. */
  labels?: 'none' | 'c' | 'all';
  /** Show computer-key hints for the virtual input, relative to this base C. */
  keyHintsBase?: number | null;
  onPress?: (midi: number, velocity: number, perfMs: number) => void;
  onRelease?: (midi: number, perfMs: number) => void;
}

interface KeyGeom {
  midi: number;
  black: boolean;
  left: number; // percent
  width: number; // percent
}

function layout(low: number, high: number): KeyGeom[] {
  // Start and end on white keys.
  let lo = low;
  let hi = high;
  while (isBlackKey(lo)) lo--;
  while (isBlackKey(hi)) hi++;
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlackKey(m)) whites.push(m);
  const ww = 100 / whites.length;
  const out: KeyGeom[] = [];
  whites.forEach((m, i) => out.push({ midi: m, black: false, left: i * ww, width: ww }));
  // Black keys sit between whites, offset by their position in the group for a realistic look.
  const offsets: Record<number, number> = { 1: -0.15, 3: 0.15, 6: -0.2, 8: 0, 10: 0.2 };
  for (let m = lo; m <= hi; m++) {
    if (!isBlackKey(m)) continue;
    const wi = whites.indexOf(m - 1);
    if (wi < 0) continue;
    const bw = ww * 0.62;
    const center = (wi + 1) * ww + offsets[pitchClass(m)] * bw;
    out.push({ midi: m, black: true, left: center - bw / 2, width: bw });
  }
  return out;
}

/**
 * On-screen keyboard. Highlights come from `liveKeys` and are applied directly to the DOM
 * (no React re-render per note). Doubles as the virtual input: pointer presses (with glide),
 * velocity from how far down the key you press.
 */
export function PianoKeyboard({ low, high, height = 120, labels = 'c', keyHintsBase = null, onPress, onRelease }: Props) {
  const keys = useMemo(() => layout(low, high), [low, high]);
  const ref = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const pointerKeys = useRef(new Map<number, number>());

  useEffect(() => {
    const apply = () => {
      for (const [midi, el] of els.current) {
        const mark = liveKeys.pressed.get(midi) ?? (liveKeys.playing.has(midi) ? 'down' : undefined);
        const up = liveKeys.upcoming.get(midi);
        el.classList.toggle('down', mark === 'down');
        el.classList.toggle('hit', mark === 'hit');
        el.classList.toggle('wrong', mark === 'wrong');
        el.classList.toggle('up-R', up === 'R' || up === 'unknown');
        el.classList.toggle('up-L', up === 'L');
        el.setAttribute('aria-pressed', mark ? 'true' : 'false');
      }
    };
    apply();
    return liveKeys.subscribe(apply);
  }, [keys]);

  const keyAt = (x: number, y: number): { midi: number; vel: number } | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const k = el?.closest<HTMLElement>('[data-midi]');
    if (!k || !ref.current?.contains(k)) return null;
    const r = k.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (y - r.top) / r.height));
    return { midi: Number(k.dataset.midi), vel: 0.35 + 0.6 * frac };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!onPress) return;
    e.preventDefault();
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    const k = keyAt(e.clientX, e.clientY);
    if (!k) return;
    pointerKeys.current.set(e.pointerId, k.midi);
    onPress(k.midi, k.vel, e.timeStamp);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const cur = pointerKeys.current.get(e.pointerId);
    if (cur === undefined) return;
    const k = keyAt(e.clientX, e.clientY);
    if (!k || k.midi === cur) return;
    onRelease?.(cur, e.timeStamp);
    pointerKeys.current.set(e.pointerId, k.midi);
    onPress?.(k.midi, k.vel, e.timeStamp);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const cur = pointerKeys.current.get(e.pointerId);
    if (cur === undefined) return;
    pointerKeys.current.delete(e.pointerId);
    onRelease?.(cur, e.timeStamp);
  };

  return (
    <div
      className="keyboard"
      style={{ height }}
      ref={ref}
      role="group"
      aria-label={`Piano keyboard ${midiToName(low)} to ${midiToName(high)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div className="keys">
        {keys.map((k) => {
          const showName = labels === 'all' ? !k.black : labels === 'c' ? pitchClass(k.midi) === 0 : false;
          const hint = keyHintsBase !== null ? midiToKeyLabel(k.midi, keyHintsBase) : null;
          return (
            <div
              key={k.midi}
              data-midi={k.midi}
              ref={(el) => {
                if (el) els.current.set(k.midi, el);
                else els.current.delete(k.midi);
              }}
              className={`key ${k.black ? 'black' : 'white'}${k.midi === 60 ? ' middle-c' : ''}`}
              style={{ left: `${k.left}%`, width: `${k.width}%` }}
              aria-label={midiToName(k.midi)}
            >
              <span className="klabel">
                {hint && <span className="kbd">{hint}</span>}
                {showName && <span>{midiToName(k.midi)}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function keyboardLayout(low: number, high: number) {
  return layout(low, high);
}
