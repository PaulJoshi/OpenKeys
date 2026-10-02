import React from 'react';

const WHITE = ['C','D','E','F','G','A','B'];
const BLACK_AFTER = { C:'C#', D:'D#', F:'F#', G:'G#', A:'A#' };
const STATE_FILL = {
  target:  { white: 'var(--ok-blue)',  black: 'var(--ok-blue)' },
  correct: { white: 'var(--ok-green)', black: 'var(--ok-green)' },
  wrong:   { white: 'var(--ok-red)',   black: 'var(--ok-red)' },
  pressed: { white: 'var(--ok-soft-cloud)', black: 'var(--ok-charcoal)' },
};

export function PianoKeyboard({ startOctave = 4, octaves = 2, keyStates = {}, showLabels = 'c', height = 160, onKeyPress, style }) {
  const [down, setDown] = React.useState(null);
  const whites = [];
  for (let o = 0; o < octaves; o++) WHITE.forEach(n => whites.push({ note: n, octave: startOctave + o }));
  whites.push({ note: 'C', octave: startOctave + octaves });
  const pct = 100 / whites.length;
  const stateOf = id => keyStates[id] || (down === id ? 'pressed' : null);
  const press = id => { setDown(id); onKeyPress && onKeyPress(id); };
  const up = () => setDown(null);
  return (
    <div role="group" aria-label="Piano keyboard" onPointerUp={up} onPointerLeave={up}
      style={{ position: 'relative', height, width: '100%', userSelect: 'none', touchAction: 'none', background: 'var(--ok-ink)', ...style }}>
      <div style={{ display: 'flex', height: '100%', gap: 1, paddingTop: 0 }}>
        {whites.map(({ note, octave }) => {
          const id = note + octave; const s = stateOf(id);
          const fill = s ? STATE_FILL[s].white : 'var(--ok-white)';
          const onFill = s && s !== 'pressed';
          const label = showLabels === 'all' || (showLabels === 'c' && note === 'C');
          return (
            <button key={id} aria-label={id} onPointerDown={() => press(id)}
              style={{ flex: 1, border: 0, padding: '0 0 10px', margin: 0, background: fill, cursor: 'pointer', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', font: '500 12px/1.5 var(--font-sans)', color: onFill ? 'var(--ok-white)' : 'var(--ok-mute)', transition: 'background var(--duration-fast) var(--ease-standard)' }}>
              {label ? (showLabels === 'all' ? note : id) : ''}
            </button>
          );
        })}
      </div>
      {whites.slice(0, -1).map(({ note, octave }, i) => {
        const b = BLACK_AFTER[note]; if (!b) return null;
        const id = b + octave; const s = stateOf(id);
        const fill = s ? STATE_FILL[s].black : 'var(--ok-ink)';
        return (
          <button key={id} aria-label={id} onPointerDown={(e) => { e.stopPropagation(); press(id); }}
            style={{ position: 'absolute', top: 0, left: 'calc(' + ((i + 1) * pct) + '% - ' + (pct * 0.3) + '%)', width: (pct * 0.6) + '%', height: '62%', border: 0, padding: 0, background: fill, cursor: 'pointer', boxShadow: '0 0 0 1px var(--ok-ink)', transition: 'background var(--duration-fast) var(--ease-standard)' }} />
        );
      })}
    </div>
  );
}
