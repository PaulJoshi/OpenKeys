import { useEffect, useRef } from 'react';
import type { HandSelection, Score } from '../../core/types';
import { keyboardLayout } from '../components/PianoKeyboard';
import { midiToName } from '../../core/music';
import { practiceLive, verdictHex } from './live';
import { OK, canvasColors } from '../design/palette';

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
    const col = { ...canvasColors(dark), hit: dark ? OK.white : OK.ink };
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
        ctx.fillStyle = OK.blue;
        ctx.globalAlpha = 0.07;
        const y0 = yOf(loop.endBeat);
        const y1 = yOf(loop.startBeat);
        ctx.fillRect(0, Math.max(0, y0), w, Math.min(h, y1) - Math.max(0, y0));
        ctx.globalAlpha = 1;
      }
      // Measure lines.
      ctx.strokeStyle = col.line;
      ctx.fillStyle = col.text;
      ctx.font = '500 11px Inter, system-ui, sans-serif';
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
        let fill: string = n.hand === 'L' ? col.L : col.R;
        let alpha = practised(n.hand) ? 1 : 0.28;
        if (mark) {
          fill = verdictHex(mark, dark);
          if (mark === 'missed') alpha = 0.45;
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        ctx.fillRect(x, yTop, bw, Math.max(4, yBot - yTop - 1));
        if (k.black) {
          ctx.strokeStyle = OK.ink;
          ctx.strokeRect(x + 0.5, yTop + 0.5, bw - 1, Math.max(4, yBot - yTop - 1) - 1);
        }
        if (showNames && yBot - yTop > 16 && bw > 12) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = fill === col.L ? OK.ink : OK.white;
          ctx.font = '500 10px Inter, system-ui, sans-serif';
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
        ctx.fillStyle = f.kind === 'hit' ? verdictHex('perfect', dark) : f.kind === 'wrong' ? verdictHex('wrong', dark) : OK.stone;
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
