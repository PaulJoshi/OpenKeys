import { useApp } from '../../store';
import { midiToName } from '../../../core/music';
import type { InputSource } from '../../../core/types';
import { Section } from '../Settings';

export function InputSettings() {
  const s = useApp((x) => x.settings);
  const update = useApp((x) => x.updateSettings);
  return (
    <div className="col" style={{ gap: 20 }}>
      <Section title="How do you play?">
        <div className="seg">
          {(['mic', 'midi', 'virtual'] as InputSource[]).map((src) => (
            <button key={src} aria-pressed={s.inputSource === src} onClick={() => update({ inputSource: src })}>
              {src === 'mic' ? '🎤 Microphone' : src === 'midi' ? '🎹 MIDI keyboard' : '⌨ Computer keys'}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Keyboard range">
        <div className="row">
          <label className="field">
            Lowest key: {midiToName(s.range.low)}
            <input type="range" min={21} max={60} value={s.range.low} onChange={(e) => update({ range: { ...s.range, low: Number(e.target.value) } })} />
          </label>
          <label className="field">
            Highest key: {midiToName(s.range.high)}
            <input type="range" min={60} max={108} value={s.range.high} onChange={(e) => update({ range: { ...s.range, high: Number(e.target.value) } })} />
          </label>
          <button className="btn small" onClick={() => update({ range: { low: 36, high: 96 } })}>
            61 keys (C2–C7)
          </button>
          <button className="btn small" onClick={() => update({ range: { low: 21, high: 108 } })}>
            88 keys
          </button>
        </div>
      </Section>
    </div>
  );
}
