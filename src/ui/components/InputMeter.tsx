import { useEffect, useRef } from 'react';
import { meter, type MeterState } from '../live';

/** Always-visible input meter: level, note, cents and confidence (mic); device and velocity (MIDI). */
export function InputMeter() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const bar = el.querySelector<HTMLDivElement>('.bar > div')!;
    const floor = el.querySelector<HTMLDivElement>('.floor')!;
    const note = el.querySelector<HTMLSpanElement>('.note')!;
    const detail = el.querySelector<HTMLSpanElement>('.detail')!;
    const apply = (m: MeterState) => {
      const pct = Math.max(0, Math.min(100, ((m.levelDb + 80) / 80) * 100));
      bar.style.width = `${m.source === 'mic' ? pct : m.active ? 100 : 0}%`;
      floor.style.left = `${Math.max(0, Math.min(100, ((m.floorDb + 80) / 80) * 100))}%`;
      floor.style.display = m.source === 'mic' ? 'block' : 'none';
      note.textContent = m.noteName ?? '–';
      if (m.source === 'mic') {
        const conf = m.confidence >= 0.75 ? 'sure' : m.confidence >= 0.5 ? 'fairly sure' : m.noteName ? 'unsure' : '';
        detail.textContent = `${m.cents !== null && m.noteName ? `${m.cents > 0 ? '+' : ''}${Math.round(m.cents)}¢` : ''} ${conf}`.trim();
      } else if (m.source === 'midi') {
        detail.textContent = `${m.deviceName ?? 'MIDI'}${m.lastVelocity !== null ? ` · vel ${Math.round(m.lastVelocity * 127)}` : ''}`;
      } else detail.textContent = 'Computer keys / on-screen piano';
    };
    apply(meter.value);
    return meter.subscribe(apply);
  }, []);
  return (
    <div className="meter" ref={ref} aria-label="Input meter">
      <div className="bar" title="Input level">
        <div style={{ width: 0 }} />
        <span className="floor" style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'var(--fg-3)' }} />
      </div>
      <span className="note" aria-live="off">
        –
      </span>
      <span className="detail small muted" />
    </div>
  );
}
