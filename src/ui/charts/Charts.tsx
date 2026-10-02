import { useState } from 'react';
import { useDark } from '../hooks';

/** Series colours validated with the dataviz palette checker (light / dark surfaces). */
export function seriesColors(dark: boolean): [string, string] {
  return dark ? ['#5b8ef5', '#c77a30'] : ['#2f6fde', '#b86a1c'];
}

interface Tip {
  x: number;
  y: number;
  text: string;
}

/** Single-series bar chart (practice minutes per day) with a goal line and hover tooltips. */
export function BarChart({ data, goal, unit, label }: { data: { x: string; y: number; tick: string }[]; goal?: number; unit: string; label: string }) {
  const dark = useDark();
  const [tip, setTip] = useState<Tip | null>(null);
  const W = 640;
  const H = 180;
  const pad = { l: 34, r: 8, t: 10, b: 24 };
  const max = Math.max(goal ?? 0, ...data.map((d) => d.y), 1);
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const color = seriesColors(dark)[0];
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="spark" style={{ height: 'auto' }} role="img" aria-label={label} onMouseLeave={() => setTip(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(max * f) + 4} fontSize={10} textAnchor="end" fill="var(--fg-3)">
              {Math.round(max * f)}
            </text>
          </g>
        ))}
        {goal !== undefined && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--fg-2)" strokeDasharray="4 4" strokeWidth={1} />
            <text x={W - pad.r} y={y(goal) + 12} fontSize={10} textAnchor="end" fill="var(--fg-2)">
              goal {goal} {unit}
            </text>
          </g>
        )}
        {data.map((d, i) => {
          const x0 = pad.l + i * bw + 1;
          const h = Math.max(0, H - pad.b - y(d.y));
          return (
            <g key={d.x}>
              {h > 0 && <path d={roundTop(x0, y(d.y), bw - 2, h, Math.min(4, (bw - 2) / 2))} fill={color} />}
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setTip({ x: ((x0 + bw / 2) / W) * 100, y: y(d.y), text: `${d.x}: ${d.y} ${unit}` })} />
              {(i % 2 === data.length % 2 || data.length <= 8) && (
                <text x={x0 + bw / 2 - 1} y={H - 8} fontSize={10} textAnchor="middle" fill="var(--fg-3)">
                  {d.tick}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tip && <ChartTip tip={tip} />}
    </div>
  );
}

function roundTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function ChartTip({ tip }: { tip: Tip }) {
  return (
    <div
      role="tooltip"
      style={{ position: 'absolute', left: `${tip.x}%`, top: 0, transform: 'translate(-50%, -100%)', background: 'var(--fg)', color: 'var(--bg)', padding: '4px 8px', borderRadius: 6, fontSize: 12, pointerEvents: 'none', whiteSpace: 'pre' }}
    >
      {tip.text}
    </div>
  );
}

/** Two-series line chart (accuracy and timing over sessions) with legend, end labels and crosshair. */
export function TrendChart({ points, label }: { points: { label: string; a: number; b: number }[]; label: string }) {
  const dark = useDark();
  const [hover, setHover] = useState<number | null>(null);
  const [c1, c2] = seriesColors(dark);
  const W = 640;
  const H = 200;
  const pad = { l: 36, r: 70, t: 12, b: 20 };
  const n = points.length;
  if (n < 2) return <p className="muted small">Play a few takes to see your trend.</p>;
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / (n - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v);
  const path = (k: 'a' | 'b') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[k])}`).join('');
  const last = points[n - 1];
  return (
    <div style={{ position: 'relative' }}>
      <div className="row small" style={{ gap: 16 }}>
        <span>
          <span aria-hidden="true" style={{ display: 'inline-block', width: 14, height: 3, background: c1, verticalAlign: 'middle' }} /> Note accuracy
        </span>
        <span>
          <span aria-hidden="true" style={{ display: 'inline-block', width: 14, height: 3, background: c2, verticalAlign: 'middle', borderTop: '1px dashed transparent' }} /> Timing
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="spark"
        style={{ height: 'auto' }}
        role="img"
        aria-label={label}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(n - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1)))));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(f)} y2={y(f)} stroke="var(--line)" />
            <text x={pad.l - 6} y={y(f) + 4} fontSize={10} textAnchor="end" fill="var(--fg-3)">
              {Math.round(f * 100)}%
            </text>
          </g>
        ))}
        <path d={path('a')} fill="none" stroke={c1} strokeWidth={2} />
        <path d={path('b')} fill="none" stroke={c2} strokeWidth={2} strokeDasharray="6 3" />
        <text x={x(n - 1) + 6} y={y(last.a) + 4} fontSize={11} fill="var(--fg-2)">
          Notes {Math.round(last.a * 100)}%
        </text>
        <text x={x(n - 1) + 6} y={y(last.b) + (Math.abs(last.a - last.b) < 0.06 ? 16 : 4)} fontSize={11} fill="var(--fg-2)">
          Timing {Math.round(last.b * 100)}%
        </text>
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--fg-3)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(points[hover].a)} r={4} fill={c1} stroke="var(--bg-2)" strokeWidth={2} />
            <circle cx={x(hover)} cy={y(points[hover].b)} r={4} fill={c2} stroke="var(--bg-2)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && <ChartTip tip={{ x: (x(hover) / W) * 100, y: 0, text: `${points[hover].label}\nNotes ${Math.round(points[hover].a * 100)}% · Timing ${Math.round(points[hover].b * 100)}%` }} />}
    </div>
  );
}
