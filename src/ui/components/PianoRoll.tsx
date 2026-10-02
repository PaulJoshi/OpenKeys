import { useEffect, useRef } from 'react';
import { isBlackKey, midiToName } from '../../core/music';
import { useDark } from '../hooks';
import { canvasColors } from '../design/palette';

export interface RollNote {
  midi: number;
  start: number;
  duration: number;
  /** CSS colour; default by hand */
  color?: string;
  hand?: 'L' | 'R' | 'unknown';
  label?: string;
}

/**
 * Piano roll: expected notes as outlines, played notes as filled bars on top, so a take can be
 * compared with the reference. `cursor()` (seconds) draws a playhead.
 */
export function PianoRoll({ expected = [], played = [], cursor, height = 220, follow = false, windowSec }: { expected?: RollNote[]; played?: RollNote[]; cursor?: () => number | null; height?: number; follow?: boolean; windowSec?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dark = useDark();
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const c = canvasColors(dark);
    const col = { ...c, grid: c.line };
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const all = [...expected, ...played];
      const lo = Math.min(60, ...all.map((n) => n.midi)) - 2;
      const hi = Math.max(72, ...all.map((n) => n.midi)) + 2;
      const tEnd = Math.max(1, ...all.map((n) => n.start + n.duration));
      const cur = cursor?.() ?? null;
      const span = windowSec ?? tEnd;
      const tStart = follow && cur !== null ? Math.max(0, cur - span * 0.75) : 0;
      const left = 34;
      const x = (t: number) => left + ((t - tStart) / span) * (w - left - 6);
      const rowH = (h - 4) / (hi - lo + 1);
      const y = (m: number) => 2 + (hi - m) * rowH;
      ctx.fillStyle = col.bg;
      ctx.fillRect(0, 0, w, h);
      for (let m = lo; m <= hi; m++) {
        if (isBlackKey(m)) {
          ctx.fillStyle = col.lane;
          ctx.fillRect(left, y(m), w - left, rowH);
        }
        if (m % 12 === 0) {
          ctx.fillStyle = col.text;
          ctx.font = '500 10px Inter, system-ui, sans-serif';
          ctx.fillText(midiToName(m), 2, y(m) + rowH - 1);
          ctx.fillStyle = col.grid;
          ctx.fillRect(left, y(m) + rowH, w - left, 1);
        }
      }
      for (let s = Math.ceil(tStart); s < tStart + span; s++) {
        ctx.fillStyle = col.grid;
        ctx.fillRect(x(s), 0, 1, h);
      }
      for (const n of expected) {
        ctx.strokeStyle = n.color ?? (n.hand === 'L' ? col.L : col.R);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x(n.start) + 0.5, y(n.midi) + 0.5, Math.max(3, x(n.start + n.duration) - x(n.start) - 1), Math.max(2, rowH - 1));
      }
      for (const n of played) {
        ctx.fillStyle = n.color ?? (n.hand === 'L' ? col.L : col.R);
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x(n.start), y(n.midi) + rowH * 0.2, Math.max(3, x(n.start + n.duration) - x(n.start)), Math.max(2, rowH * 0.6));
        ctx.globalAlpha = 1;
      }
      if (cur !== null) {
        ctx.fillStyle = col.head;
        ctx.fillRect(x(cur), 0, 2, h);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [expected, played, cursor, dark, follow, windowSec]);
  return <canvas ref={ref} style={{ width: '100%', height, display: 'block', border: '1px solid var(--line)' }} role="img" aria-label="Piano roll" />;
}
