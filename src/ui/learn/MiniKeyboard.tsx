import { keyboardLayout } from '../components/PianoKeyboard';
import { midiToName } from '../../core/music';

/** Static keyboard diagram for lesson cards: highlighted keys with optional finger numbers. */
export function MiniKeyboard({ low = 48, high = 76, keys = [], fingers = [] }: { low?: number; high?: number; keys?: number[]; fingers?: number[] }) {
  const lo = Math.min(low, ...keys.map((k) => k - 2));
  const hi = Math.max(high, ...keys.map((k) => k + 2));
  const layout = keyboardLayout(lo, hi);
  return (
    <div className="keyboard" style={{ height: 90, maxWidth: 640 }} role="img" aria-label={keys.length ? `Keys: ${keys.map((k, i) => `${midiToName(k)}${fingers[i] ? ` finger ${fingers[i]}` : ''}`).join(', ')}` : 'Keyboard'}>
      <div className="keys">
        {layout.map((k) => {
          const i = keys.indexOf(k.midi);
          return (
            <div key={k.midi} className={`key ${k.black ? 'black' : 'white'}${i >= 0 ? (k.midi < 60 ? ' up-L' : ' up-R') : ''}${k.midi === 60 ? ' middle-c' : ''}`} style={{ left: `${k.left}%`, width: `${k.width}%`, background: i >= 0 ? (k.black ? '#3d5fa8' : '#c7d8ff') : undefined }}>
              <span className="klabel">
                {i >= 0 && fingers[i] ? <b style={{ fontSize: 14, color: k.black ? '#fff' : '#1b2433' }}>{fingers[i]}</b> : null}
                {!k.black && k.midi % 12 === 0 && <span>{midiToName(k.midi)}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
