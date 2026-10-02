import { useEffect, useRef } from 'react';
import type { HandSelection, Score } from '../../core/types';
import { keyboardLayout } from '../components/PianoKeyboard';
import { midiToName } from '../../core/music';
import { practiceLive, verdictHex } from './live';

interface Props {
  score: Score;
  low: number;
  high: number;
  hands: HandSelection;
  lookAheadSec: number;
  dark: boolean;
  showNames: boolean;
}

/**
 * Falling-notes view (Synthesia style) on a 2D canvas at display rate, decoupled from React.
 * Bar length = duration; left/right hand in different colours; the hit line flashes per note.
 */
export function FallingNotes({ score, low, high, hands, lookAheadSec, dark, showNames }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const geo = new Map(keyboardLayout(low, high).map((k) => [k.midi, k]));
    const notes = [...score.notes].sort((a, b) => a.startBeat - b.startBeat);
    const maxDur = Math.max(4, ...notes.map((n) => n.durationBeats));
    const col = {
      bg: dark ? '#0f141d' : '#f3f1ec',
      lane: dark ? '#161d29' : '#ebe8e1',
      line: dark ? '#2a3445' : '#d9d4c8',
      R: dark ? '#6b9cff' : '#2f6fde',
      L: dark ? '#f0a050' : '#d9822b',
      text: dark ? '#c7cfdd' : '#3b4252',
      hit: dark ? '#e9eef7' : '#141922',
    };
    const practised = (h: string) => hands === 'both' || h === hands || (h === 'unknown' && hands === 'R');
    let raf = 0;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const lowerBound = (beat: number) => {
      let lo = 0;
      let hi = notes.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (notes[mid].startBeat < beat) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!w || !h) return;
      const beat = practiceLive.getBeat();
      const spb = practiceLive.secPerBeat || 0.5;
      const visBeats = Math.max(0.5, lookAheadSec / spb);
      const hitY = h - 6;
      const pxPerBeat = hitY / visBeats;
      const yOf = (b: number) => hitY - (b - beat) * pxPerBeat;
      ctx.fillStyle = col.bg;
      ctx.fillRect(0, 0, w, h);
      // Black-key lanes for orientation.
      ctx.fillStyle = col.lane;
      for (const k of geo.values()) if (k.black) ctx.fillRect((k.left / 100) * w, 0, (k.width / 100) * w, h);
      // Loop range shading.
      const loop = practiceLive.loop;
      if (loop) {
        ctx.fillStyle = dark ? 'rgba(107,156,255,0.08)' : 'rgba(47,111,222,0.07)';
        const y0 = yOf(loop.endBeat);
        const y1 = yOf(loop.startBeat);
        ctx.fillRect(0, Math.max(0, y0), w, Math.min(h, y1) - Math.max(0, y0));
      }
      // Measure lines.
      ctx.strokeStyle = col.line;
      ctx.fillStyle = col.text;
      ctx.font = '11px system-ui, sans-serif';
      ctx.lineWidth = 1;
      for (const m of score.measures) {
        const y = yOf(m.startBeat);
        if (y < -2 || y > hitY) continue;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.fillText(String(m.number ?? m.index + 1), 4, y - 3);
      }
      // Notes in view.
      const from = lowerBound(beat - maxDur - 1);
      const end = beat + visBeats + 0.1;
      for (let i = from; i < notes.length; i++) {
        const n = notes[i];
        if (n.startBeat > end) break;
        const k = geo.get(n.midi);
        if (!k) continue;
        const yTop = yOf(n.startBeat + n.durationBeats);
        const yBot = yOf(n.startBeat);
        if (yBot < 0 || yTop > h) continue;
        const x = (k.left / 100) * w + 1;
        const bw = Math.max(3, (k.width / 100) * w - 2);
        const mark = practiceLive.marks.get(n.id);
        let fill = n.hand === 'L' ? col.L : col.R;
        let alpha = practised(n.hand) ? 1 : 0.28;
        if (mark) {
          fill = verdictHex(mark, dark);
          if (mark === 'missed') alpha = 0.45;
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        roundRect(ctx, x, yTop, bw, Math.max(4, yBot - yTop - 1), Math.min(5, bw / 3));
        ctx.fill();
        if (k.black) {
          ctx.strokeStyle = dark ? '#000' : 'rgba(0,0,0,0.35)';
          ctx.stroke();
        }
        if (showNames && yBot - yTop > 16 && bw > 12) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(midiToName(n.midi, false, false), x + bw / 2, yBot - 5);
          ctx.textAlign = 'start';
        }
        ctx.globalAlpha = 1;
      }
      // Hit line + flashes.
      ctx.fillStyle = col.hit;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, hitY, w, 2);
      ctx.globalAlpha = 1;
      const now = performance.now();
      for (const [midi, f] of practiceLive.flashes) {
        if (f.until < now) {
          practiceLive.flashes.delete(midi);
          continue;
        }
        const k = geo.get(midi);
        if (!k) continue;
        const a = Math.min(1, (f.until - now) / 200);
        ctx.globalAlpha = a;
        ctx.fillStyle = f.kind === 'hit' ? verdictHex('perfect', dark) : f.kind === 'wrong' ? verdictHex('wrong', dark) : '#8a90a0';
        const x = (k.left / 100) * w;
        ctx.fillRect(x - 2, hitY - 10, (k.width / 100) * w + 4, 16);
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [score, low, high, hands, lookAheadSec, dark, showNames]);

  return (
    <div className="falling-wrap">
      <canvas ref={canvasRef} aria-label="Falling notes" role="img" />
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
