import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { InputMeter } from '../components/InputMeter';
import { InputStatus } from '../components/InputStatus';
import { midiToName } from '../../core/music';
import { liveKeys } from '../live';

/** Free play: no score; detected notes shown live. */
export function FreePlay() {
  const range = useApp((s) => s.settings.range);
  const audioReady = useApp((s) => s.audioReady);
  const progress = useApp((s) => s.pianoProgress);
  const [baseC, setBaseC] = useState(runtime.virtual.baseC);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => runtime.virtual.octaveChange.on(setBaseC), []);
  useEffect(
    () =>
      runtime.bus.events.on((e) => {
        if (e.kind === 'noteOn') setRecent((r) => [...r.slice(-23), midiToName(e.midi)]);
      }),
    [],
  );
  useEffect(() => () => liveKeys.clear(), []);

  return (
    <div className="page">
      <h1>Free play</h1>
      <p className="muted">
        Play anything. Use your instrument, click the keys, or type: <kbd>A</kbd>–<kbd>'</kbd> are white keys, <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd>{' '}
        <kbd>U</kbd> <kbd>O</kbd> <kbd>P</kbd> are black keys, <kbd>Z</kbd>/<kbd>X</kbd> shift the octave (now {midiToName(baseC)}).
      </p>
      {!audioReady && <div className="notice info">Press any key or click to start the sound.</div>}
      {audioReady && progress < 1 && (
        <div className="col" style={{ margin: '8px 0' }}>
          <span className="small muted">Loading piano samples… {Math.round(progress * 100)}% (a light synth plays meanwhile)</span>
          <div className="progress">
            <div style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
      <div className="card" style={{ margin: '16px 0' }}>
        <InputStatus />
        <InputMeter />
      </div>
      <PianoKeyboard
        low={range.low}
        high={range.high}
        height={160}
        labels="c"
        keyHintsBase={baseC}
        onPress={(m, v, t) => {
          void runtime.ensureAudio();
          runtime.virtual.press(m, t, v);
        }}
        onRelease={(m, t) => runtime.virtual.release(m, t)}
      />
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Recent notes</h3>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, minHeight: '2em' }} data-testid="recent-notes">
          {recent.join(' ')}
        </div>
      </div>
    </div>
  );
}
