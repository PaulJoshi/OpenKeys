import { useEffect, useRef, useState } from 'react';
import type { OpenSheetMusicDisplay as OSMDType, GraphicalNote, Cursor } from 'opensheetmusicdisplay';
import type { Score } from '../../core/types';
import { exportMusicXml } from '../../core/score/export-musicxml';
import { diatonicStep, midiToName } from '../../core/music';
import { mapMomentsToSteps, momentAt, type OsmdStep, type StepMapping } from './sheetmap';
import { practiceLive, verdictHex } from './live';
import { OK } from '../design/palette';

interface Props {
  score: Score;
  showFingering: boolean;
  /** 0 = hidden, 1 = fully visible beginner note names */
  noteNameOpacity: number;
  dark: boolean;
  zoom?: number;
  /** Performance measure clicked. */
  onMeasureClick?: (measure: number) => void;
  /** Performance measures dragged across (loop). */
  onLoopSelect?: (start: number, end: number) => void;
}

interface StepInfo extends OsmdStep {
  gnotes: GraphicalNote[];
  iter: unknown;
}

const EPS = 1e-4;

/**
 * Sheet music view (OpenSheetMusicDisplay / VexFlow). The cursor follows the current score
 * event, the page auto-scrolls a line ahead, played notes are coloured in place (plus an icon
 * so colour is never the only signal), and wrong pitches show a small red ghost notehead.
 */
export function SheetView({ score, showFingering, noteNameOpacity, dark, zoom = 1, onMeasureClick, onLoopSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const osmdRef = useRef<OSMDType | null>(null);
  const stepsRef = useRef<StepInfo[]>([]);
  const mapRef = useRef<StepMapping>({ beats: [], steps: [] });
  const curStep = useRef(-1);
  const colored = useRef(new Set<Element>());
  const noteStep = useRef(new Map<string, number>());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [renderGen, setRenderGen] = useState(0);
  const dragStart = useRef<number | null>(null);

  // Load + render.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = '';
        const osmd = new OpenSheetMusicDisplay(hostRef.current, {
          autoResize: false,
          backend: 'svg',
          drawTitle: false,
          drawSubtitle: false,
          drawComposer: false,
          drawCredits: false,
          drawPartNames: false,
          drawFingerings: showFingering,
          drawMeasureNumbers: true,
          followCursor: false,
          cursorsOptions: [{ type: 0, color: OK.blue, alpha: 0.3, follow: false }],
        });
        osmdRef.current = osmd;
        await osmd.load(score.musicxml ?? exportMusicXml(score));
        if (cancelled) return;
        osmd.zoom = zoom;
        osmd.render();
        buildSteps(osmd);
        setStatus('ready');
        setRenderGen((g) => g + 1);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError((e as Error).message);
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, showFingering]);

  const buildSteps = (osmd: OSMDType) => {
    const cursor = osmd.cursor as Cursor;
    cursor.show();
    cursor.reset();
    const steps: StepInfo[] = [];
    let guard = 0;
    while (!cursor.Iterator.EndReached && guard++ < 20000) {
      const it = cursor.Iterator;
      const m = it.CurrentMeasure;
      const abs = it.currentTimeStamp.RealValue * 4;
      const mStart = m ? m.AbsoluteTimestamp.RealValue * 4 : 0;
      steps.push({ measureIndex: it.CurrentMeasureIndex, relBeat: abs - mStart, gnotes: cursor.GNotesUnderCursor(), iter: it.clone() });
      cursor.next();
    }
    stepsRef.current = steps;
    mapRef.current = mapMomentsToSteps(score, steps);
    noteStep.current.clear();
    for (const n of score.notes) {
      const k = momentAt(mapRef.current, n.startBeat);
      if (k >= 0) noteStep.current.set(n.id, mapRef.current.steps[k]);
    }
    cursor.reset();
    curStep.current = 0;
    colored.current.clear();
  };

  // Re-render on width changes.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let w = el.clientWidth;
    let timer: number | undefined;
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - w) < 30) return;
      w = el.clientWidth;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const osmd = osmdRef.current;
        if (!osmd || status !== 'ready') return;
        osmd.render();
        buildSteps(osmd);
        setRenderGen((g) => g + 1);
      }, 250);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || status !== 'ready' || Math.abs(osmd.zoom - zoom) < 0.01) return;
    osmd.zoom = zoom;
    osmd.render();
    buildSteps(osmd);
    setRenderGen((g) => g + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Cursor follow + autoscroll at display rate.
  useEffect(() => {
    if (status !== 'ready') return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const osmd = osmdRef.current;
      if (!osmd) return;
      const k = momentAt(mapRef.current, practiceLive.getBeat());
      const step = k < 0 ? 0 : mapRef.current.steps[k];
      if (step === curStep.current || step === undefined) return;
      const cursor = osmd.cursor;
      if (step === curStep.current + 1) cursor.next();
      else {
        const info = stepsRef.current[step];
        if (!info) return;
        (cursor as unknown as { iterator: unknown }).iterator = (info.iter as { clone: () => unknown }).clone();
        cursor.update();
      }
      curStep.current = step;
      scrollToCursor();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, renderGen]);

  const scrollToCursor = () => {
    const wrap = wrapRef.current;
    const el = osmdRef.current?.cursor?.cursorElement;
    if (!wrap || !el) return;
    const top = el.offsetTop;
    const h = el.offsetHeight;
    // Keep the cursor's line in the upper third so the next line is visible ahead.
    const want = top - wrap.clientHeight * 0.18;
    if (top < wrap.scrollTop + 10 || top + h > wrap.scrollTop + wrap.clientHeight * 0.7) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      wrap.scrollTo({ top: Math.max(0, want), behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  // Verdict colouring + overlay.
  useEffect(() => {
    if (status !== 'ready') return;
    const apply = () => drawMarks();
    apply();
    return practiceLive.subscribe(apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, renderGen, dark, noteNameOpacity]);

  const findGNote = (noteId: string, midi: number): GraphicalNote | null => {
    const s = noteStep.current.get(noteId);
    if (s === undefined) return null;
    const info = stepsRef.current[s];
    return info?.gnotes.find((g) => (g.sourceNote as unknown as { halfTone: number }).halfTone + 12 === midi) ?? null;
  };

  const drawMarks = () => {
    const overlay = overlayRef.current;
    const host = hostRef.current;
    if (!overlay || !host) return;
    const hostRect = host.getBoundingClientRect();
    // Reset previously coloured noteheads.
    for (const el of colored.current) {
      el.removeAttribute('fill');
      el.removeAttribute('stroke');
      (el as SVGElement).style.removeProperty('fill');
    }
    colored.current.clear();
    const parts: string[] = [];
    const flats = (score.keySignatures[0]?.fifths ?? 0) < 0;
    const byId = new Map(score.notes.map((n) => [n.id, n]));
    for (const [id, v] of practiceLive.marks) {
      const n = byId.get(id);
      if (!n) continue;
      const g = findGNote(id, n.midi);
      if (!g) continue;
      const hex = verdictHex(v, false); // sheet is drawn light and inverted in dark mode
      const heads = (g as unknown as { getNoteheadSVGs?: () => HTMLElement[] }).getNoteheadSVGs?.() ?? [];
      for (const h of heads) {
        for (const p of [h, ...Array.from(h.querySelectorAll('path'))]) {
          p.setAttribute('fill', hex);
          (p as unknown as SVGElement).style.fill = hex;
          colored.current.add(p);
        }
      }
      const r = heads[0]?.getBoundingClientRect();
      if (r && r.width) {
        const x = r.left - hostRect.left + r.width / 2;
        const y = r.top - hostRect.top;
        const icon = v === 'perfect' || v === 'good' || v === 'ok' ? '' : v === 'early' ? '←' : v === 'late' ? '→' : v === 'missed' ? '○' : v === 'uncertain' ? '?' : '';
        if (icon) parts.push(`<text x="${x}" y="${y - 4}" text-anchor="middle" font-size="13" font-weight="500" fill="${verdictHex(v, dark)}">${icon}</text>`);
      }
    }
    // Ghost noteheads for wrong pitches.
    for (const w of practiceLive.wrongs) {
      if (!w.nearNoteId) continue;
      const n = byId.get(w.nearNoteId);
      if (!n) continue;
      const g = findGNote(n.id, n.midi);
      const head = (g as unknown as { getNoteheadSVGs?: () => HTMLElement[] } | null)?.getNoteheadSVGs?.()[0];
      const r = head?.getBoundingClientRect();
      if (!r || !r.width) continue;
      const steps = diatonicStep(w.midi, flats) - diatonicStep(n.midi, flats);
      const x = r.left - hostRect.left + r.width / 2 + r.width * 0.9;
      const y = r.top - hostRect.top + r.height / 2 - steps * (r.height / 2);
      const col = verdictHex('wrong', dark);
      parts.push(`<ellipse cx="${x}" cy="${y}" rx="${r.width / 2}" ry="${r.height / 2.3}" fill="none" stroke="${col}" stroke-width="2" opacity="0.85" transform="rotate(-20 ${x} ${y})"/>`);
      parts.push(`<text x="${x + r.width}" y="${y + 4}" font-size="11" font-weight="500" fill="${col}">${midiToName(w.midi, flats, false)}</text>`);
    }
    // Beginner note names under noteheads.
    if (noteNameOpacity > 0.02) {
      const seen = new Set<Element>();
      for (const n of score.notes) {
        const g = findGNote(n.id, n.midi);
        const head = (g as unknown as { getNoteheadSVGs?: () => HTMLElement[] } | null)?.getNoteheadSVGs?.()[0];
        if (!head || seen.has(head)) continue;
        seen.add(head);
        const r = head.getBoundingClientRect();
        if (!r.width) continue;
        const x = r.left - hostRect.left + r.width / 2;
        const y = r.bottom - hostRect.top + 11;
        parts.push(
          `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" font-weight="500" fill="${dark ? OK.stone : OK.blue}" opacity="${noteNameOpacity}">${midiToName(n.midi, flats, false)}</text>`,
        );
      }
    }
    // Loop range highlight.
    const osmd = osmdRef.current;
    const loop = practiceLive.loop;
    const svg = host.querySelector('.osmd-host svg');
    if (osmd && loop && svg) {
      const svgRect = svg.getBoundingClientRect();
      const ox = svgRect.left - hostRect.left;
      const oy = svgRect.top - hostRect.top;
      const unit = 10 * osmd.zoom;
      const written = new Set(score.measures.filter((m) => m.startBeat >= loop.startBeat - EPS && m.startBeat < loop.endBeat - EPS).map((m) => m.sourceIndex ?? m.index));
      for (const mi of written) {
        const staves = (osmd.GraphicSheet.MeasureList[mi] ?? []).filter(Boolean);
        if (!staves.length) continue;
        const a = staves[0].PositionAndShape;
        const b = staves[staves.length - 1].PositionAndShape;
        const x = ox + (a.AbsolutePosition.x + a.BorderLeft) * unit;
        const y = oy + (a.AbsolutePosition.y + a.BorderTop - 1) * unit;
        const w = (a.BorderRight - a.BorderLeft) * unit;
        const h = (b.AbsolutePosition.y + b.BorderBottom - a.AbsolutePosition.y - a.BorderTop + 2) * unit;
        parts.unshift(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${OK.blue}" opacity="0.08"/>`);
      }
    }
    overlay.setAttribute('width', String(host.scrollWidth));
    overlay.setAttribute('height', String(host.scrollHeight));
    overlay.innerHTML = parts.join('');
  };

  // Measure hit-testing (click to jump, drag to loop).
  const measureAt = (clientX: number, clientY: number): number | null => {
    const osmd = osmdRef.current;
    const host = hostRef.current;
    if (!osmd || !host) return null;
    const svg = host.querySelector('svg');
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const unit = 10 * osmd.zoom;
    const x = (clientX - rect.left) / unit;
    const y = (clientY - rect.top) / unit;
    const list = osmd.GraphicSheet.MeasureList;
    for (let mi = 0; mi < list.length; mi++) {
      const staves = list[mi].filter(Boolean);
      if (!staves.length) continue;
      const ps0 = staves[0].PositionAndShape;
      const psN = staves[staves.length - 1].PositionAndShape;
      const x0 = ps0.AbsolutePosition.x + ps0.BorderLeft;
      const x1 = ps0.AbsolutePosition.x + ps0.BorderRight;
      const y0 = ps0.AbsolutePosition.y + ps0.BorderTop - 2;
      const y1 = psN.AbsolutePosition.y + psN.BorderBottom + 2;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
        // Written measure -> first performance measure at or after the current position.
        const perf = score.measures.filter((m) => (m.sourceIndex ?? m.index) === mi);
        if (!perf.length) return null;
        const beat = practiceLive.getBeat();
        const after = perf.find((m) => m.startBeat >= beat - EPS);
        return (after ?? perf[0]).index;
      }
    }
    return null;
  };

  return (
    <div
      className={`sheet-wrap${dark ? ' dark-invert' : ''}`}
      ref={wrapRef}
      onPointerDown={(e) => {
        dragStart.current = measureAt(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        const a = dragStart.current;
        dragStart.current = null;
        const b = measureAt(e.clientX, e.clientY);
        if (a === null || b === null) return;
        if (a === b) onMeasureClick?.(a);
        else onLoopSelect?.(Math.min(a, b), Math.max(a, b));
      }}
      aria-label="Sheet music"
    >
      {status === 'loading' && <div className="muted small" style={{ padding: 16 }}>Engraving the score…</div>}
      {status === 'error' && <div className="notice bad" style={{ margin: 16 }}>Could not render this score: {error}. The falling-notes view still works.</div>}
      <div style={{ position: 'relative' }}>
        <div ref={hostRef} className="osmd-host" />
        <svg ref={overlayRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }} aria-hidden="true" />
      </div>
    </div>
  );
}
